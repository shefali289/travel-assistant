import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchRecommendations } from "@/lib/api";
import type { RecommendationResponse } from "@/lib/types";
import { HotelAssistant } from "./HotelAssistant";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  fetchRecommendations: vi.fn(),
}));

const fetchMock = vi.mocked(fetchRecommendations);
const WELLINGTON = "Find a Wellington hotel for two nights, up to NZD 250 per night; breakfast preferred.";
const BLANK_ERROR = "Please describe the hotel you need.";
const response: RecommendationResponse = { message: "Here you go.", hotels: [], source: "fixture" };

const field = () => screen.getByRole("textbox", { name: "Your request" });
const scenario = () => screen.getByRole("combobox", { name: "Demo scenario" });
const submit = () => screen.getByRole("button", { name: /find(ing)? hotels/i });

function deferred() {
  let resolve!: (value: RecommendationResponse) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<RecommendationResponse>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(response);
});

describe("request field", () => {
  it("AC3.4 is labelled Your request and prefilled with the Wellington example", () => {
    render(<HotelAssistant />);

    expect(field()).toHaveValue(WELLINGTON);
  });

  it.each([
    ["blank", ""],
    ["whitespace-only", "  \n\t "],
  ])("AC3.4 a %s submit shows the linked inline error, moves focus to the field and sends no request", async (_name, value) => {
    const user = userEvent.setup();
    render(<HotelAssistant />);

    await user.clear(field());
    if (value) await user.paste(value);
    await user.click(submit());

    expect(screen.getByText(BLANK_ERROR)).toBeVisible();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription(BLANK_ERROR);
    expect(field()).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AC3.4 the error clears once the traveller types", async () => {
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await user.clear(field());
    await user.click(submit());
    expect(screen.getByText(BLANK_ERROR)).toBeVisible();

    await user.type(field(), "A");

    expect(screen.queryByText(BLANK_ERROR)).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid", "true");
    expect(field()).not.toHaveAttribute("aria-describedby");
  });
});

describe("demo control", () => {
  it("AC3.5 is a select labelled Demo scenario offering success, empty and error, defaulting to success", () => {
    render(<HotelAssistant />);

    const options = within(scenario())
      .getAllByRole<HTMLOptionElement>("option")
      .map((option) => option.value);
    expect(options).toEqual(["success", "empty", "error"]);
    expect(scenario()).toHaveValue("success");
  });

  it("AC3.5 has visible Demo control hint text linked with aria-describedby", () => {
    render(<HotelAssistant />);

    const hint = screen.getByText(/^Demo control: /);
    expect(hint).toBeVisible();
    expect(scenario()).toHaveAccessibleDescription(hint.textContent ?? "");
  });
});

describe("submit", () => {
  it("AC3.6 sends the trimmed message and the chosen scenario", async () => {
    const user = userEvent.setup();
    render(<HotelAssistant />);

    await user.clear(field());
    await user.type(field(), "  A quiet hotel  ");
    await user.selectOptions(scenario(), "empty");
    await user.click(submit());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith({ message: "A quiet hotel", scenario: "empty" });
  });
});

describe("while waiting", () => {
  it("AC3.7 shows progress, a busy disabled button and disabled inputs while waiting", async () => {
    const pending = deferred();
    fetchMock.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<HotelAssistant />);

    await user.click(submit());

    expect(screen.getByRole("status")).toHaveTextContent("Finding hotels for you…");
    const button = screen.getByRole("button", { name: "Finding hotels…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(field()).toBeDisabled();
    expect(scenario()).toBeDisabled();
  });

  it("AC3.7 keeps the status region mounted and empty before and after waiting", async () => {
    const pending = deferred();
    fetchMock.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<HotelAssistant />);
    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();

    await user.click(submit());
    expect(region).toHaveTextContent("Finding hotels for you…");

    pending.resolve(response);
    await waitFor(() => expect(region).toBeEmptyDOMElement());
    expect(screen.getByRole("status")).toBe(region);
  });

  it.each<[string, (pending: ReturnType<typeof deferred>) => void]>([
    ["a response", (pending) => pending.resolve(response)],
    ["a failure", (pending) => pending.reject(new ApiError("Service is down.", 503, true))],
  ])("AC3.7 re-enables everything and returns focus to the submit button after %s", async (_name, settle) => {
    const pending = deferred();
    fetchMock.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(
      <>
        <button>Elsewhere</button>
        <HotelAssistant />
      </>,
    );
    await user.click(submit());
    // jsdom keeps focus on a disabled button but browsers drop it, so move focus away to prove it comes back.
    act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());

    settle(pending);

    const button = await screen.findByRole("button", { name: "Find hotels" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).not.toHaveAttribute("aria-busy", "true");
    expect(field()).toBeEnabled();
    expect(scenario()).toBeEnabled();
    expect(button).toHaveFocus();
  });
});

describe("keyboard", () => {
  it("AC3.8 Tab reaches the field, the select and the button in that order", async () => {
    const user = userEvent.setup();
    render(<HotelAssistant />);

    await user.tab();
    expect(field()).toHaveFocus();
    await user.tab();
    expect(scenario()).toHaveFocus();
    await user.tab();
    expect(submit()).toHaveFocus();
  });

  it("AC3.8 Enter on the button submits", async () => {
    const user = userEvent.setup();
    render(<HotelAssistant />);
    submit().focus();

    await user.keyboard("{Enter}");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith({ message: WELLINGTON, scenario: "success" });
  });

  it("AC3.8 Enter in the field adds a new line and does not submit", async () => {
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await user.clear(field());

    await user.type(field(), "First{Enter}Second");

    expect(field()).toHaveValue("First\nSecond");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
