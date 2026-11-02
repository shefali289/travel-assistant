import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchRecommendations } from "@/lib/api";
import { HotelAssistant } from "./HotelAssistant";
import { deferred, EMPTY, SUCCESS } from "./test-utils";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  fetchRecommendations: vi.fn(),
}));

const fetchMock = vi.mocked(fetchRecommendations);
const EMPTY_TEXT = "No hotels to show. Try changing your request or the demo scenario.";
const BLANK_ERROR = "Please describe the hotel you need.";
const SERVICE_DOWN = "The recommendation service is unavailable. Please try again.";
const unavailable = () => new ApiError(SERVICE_DOWN, 503, true);

const field = () => screen.getByRole("textbox", { name: "Your request" });
const scenario = () => screen.getByRole("combobox", { name: "Demo scenario" });
const submit = () => screen.getByRole("button", { name: /find(ing)? hotels/i });
const reply = () => screen.queryByRole("heading", { level: 2, name: "Assistant's reply" });
const hotelList = () => screen.queryByRole("list", { name: "Recommended hotels" });
const retry = () => screen.queryByRole("button", { name: "Retry" });
const liveRegion = () => document.querySelector<HTMLElement>('[aria-live="polite"]');

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(SUCCESS);
});

async function search(user: ReturnType<typeof userEvent.setup>) {
  await user.click(submit());
  await screen.findByRole("button", { name: "Find hotels" });
}

describe("success", () => {
  it("AC4.1 shows the assistant message under an h2 reading Assistant's reply", async () => {
    render(<HotelAssistant />);
    expect(reply()).not.toBeInTheDocument();

    await search(userEvent.setup());

    const heading = reply();
    expect(heading).toBeVisible();
    const message = screen.getByText(SUCCESS.message);
    expect(message).toBeVisible();
    expect(heading!.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("AC4.1 shows a visible Fixture data label", async () => {
    render(<HotelAssistant />);
    expect(screen.queryByText("Fixture data")).not.toBeInTheDocument();

    await search(userEvent.setup());

    expect(screen.getByText("Fixture data")).toBeVisible();
  });

  it("AC4.2 lists one listitem per hotel in API order", async () => {
    render(<HotelAssistant />);

    await search(userEvent.setup());

    const items = within(hotelList()!).getAllByRole("listitem");
    expect(items.map((item) => within(item).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "Harbour House",
      "City Garden",
      "Quay Rooms",
    ]);
    expect(screen.queryByText(/no hotels to show/i)).not.toBeInTheDocument();
  });

  it("AC4.3 each card shows its own hotel's price, breakfast and explanation", async () => {
    render(<HotelAssistant />);

    await search(userEvent.setup());

    const [first, second, third] = within(hotelList()!).getAllByRole("listitem");
    expect(first).toHaveTextContent(/NZD 220\s+per night/);
    expect(within(first).getByText("Breakfast included")).toBeVisible();
    expect(within(first).getByText("Within budget; breakfast included.")).toBeVisible();
    expect(second).toHaveTextContent(/NZD 245\s+per night/);
    expect(within(second).getByText("Breakfast included")).toBeVisible();
    expect(within(second).getByText("Near the meeting district.")).toBeVisible();
    expect(third).toHaveTextContent(/NZD 195\s+per night/);
    expect(within(third).getByText("Breakfast not included")).toBeVisible();
    expect(within(third).getByText("Lower price; breakfast costs extra.")).toBeVisible();
  });
});

describe("empty", () => {
  it("AC4.4 shows the message under the heading, the Fixture data label, the empty text and no list", async () => {
    fetchMock.mockResolvedValue(EMPTY);
    render(<HotelAssistant />);

    await search(userEvent.setup());

    const heading = reply();
    expect(heading).toBeVisible();
    const message = screen.getByText(EMPTY.message);
    expect(message).toBeVisible();
    expect(heading!.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Fixture data")).toBeVisible();
    expect(screen.getByText(EMPTY_TEXT)).toBeVisible();
    expect(hotelList()).not.toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});

describe("error", () => {
  it("AC4.5 shows the API message in role=alert with a Retry button when retryable", async () => {
    fetchMock.mockRejectedValue(unavailable());
    render(<HotelAssistant />);

    await search(userEvent.setup());

    expect(screen.getByRole("alert")).toHaveTextContent(SERVICE_DOWN);
    expect(retry()).toBeVisible();
    expect(within(screen.getByRole("alert")).queryByRole("button")).not.toBeInTheDocument();
    expect(reply()).not.toBeInTheDocument();
    expect(hotelList()).not.toBeInTheDocument();
  });

  it("AC4.5 shows the message only, with no Retry button, when not retryable", async () => {
    const invalid = "The message field must be 500 characters or fewer.";
    fetchMock.mockRejectedValue(new ApiError(invalid, 422, false));
    render(<HotelAssistant />);

    await search(userEvent.setup());

    expect(screen.getByRole("alert")).toHaveTextContent(invalid);
    expect(retry()).not.toBeInTheDocument();
  });
});

describe("retry", () => {
  it("AC4.6 resends the message from the failed request with the current scenario and leaves the field unchanged", async () => {
    fetchMock.mockRejectedValueOnce(unavailable());
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await user.clear(field());
    await user.type(field(), "  A quiet hotel  ");
    await user.selectOptions(scenario(), "error");
    await search(user);

    await user.clear(field());
    await user.type(field(), "Edited afterwards");
    await user.selectOptions(scenario(), "success");
    await user.click(retry()!);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith({ message: "A quiet hotel", scenario: "success" });
    await screen.findByRole("list", { name: "Recommended hotels" });
    expect(field()).toHaveValue("Edited afterwards");
  });

  it("AC4.6 a second Retry still resends the message from the failed request", async () => {
    fetchMock.mockRejectedValueOnce(unavailable()).mockRejectedValueOnce(unavailable());
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await user.clear(field());
    await user.type(field(), "First message");
    await search(user);

    await user.clear(field());
    await user.type(field(), "Edited afterwards");
    await user.click(retry()!);
    await screen.findByRole("button", { name: "Retry" });
    await user.click(retry()!);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenLastCalledWith({ message: "First message", scenario: "success" });
  });

  it("AC4.6 a successful Retry removes the alert, shows the cards and returns focus to Find hotels", async () => {
    fetchMock.mockRejectedValueOnce(unavailable());
    const user = userEvent.setup();
    render(
      <>
        <button>Elsewhere</button>
        <HotelAssistant />
      </>,
    );
    await search(user);
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);

    await user.click(retry()!);
    // jsdom keeps focus on a disabled button but browsers drop it, so move focus away to prove it comes back.
    act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());
    pending.resolve(SUCCESS);

    await screen.findByRole("list", { name: "Recommended hotels" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(retry()).not.toBeInTheDocument();
    await waitFor(() => expect(submit()).toHaveFocus());
  });

  it("AC4.6 Retry is the next Tab stop after Find hotels and works with Enter", async () => {
    fetchMock.mockRejectedValueOnce(unavailable());
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await search(user);
    await waitFor(() => expect(submit()).toHaveFocus());

    await user.tab();
    expect(retry()).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("AC4.6 Retry clears the inline blank error and the field's invalid state", async () => {
    fetchMock.mockRejectedValueOnce(unavailable());
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await search(user);
    await user.clear(field());
    await user.click(submit());
    expect(screen.getByText(BLANK_ERROR)).toBeVisible();

    await user.click(retry()!);

    await screen.findByRole("list", { name: "Recommended hotels" });
    expect(screen.queryByText(BLANK_ERROR)).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(field()).not.toHaveAttribute("aria-describedby");
    expect(field()).toHaveValue("");
  });
});

describe("a new search", () => {
  it("AC4.7 clears the cards as soon as it starts and shows none next to a new error", async () => {
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await search(user);
    expect(hotelList()).toBeVisible();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);

    await user.click(submit());
    expect(hotelList()).not.toBeInTheDocument();
    expect(reply()).not.toBeInTheDocument();
    expect(screen.queryByText("Fixture data")).not.toBeInTheDocument();

    pending.reject(unavailable());
    expect(await screen.findByRole("alert")).toHaveTextContent(SERVICE_DOWN);
    expect(hotelList()).not.toBeInTheDocument();
    expect(screen.queryByText(SUCCESS.message)).not.toBeInTheDocument();
  });

  it("AC4.7 clears the error as soon as it starts and shows none next to new cards", async () => {
    fetchMock.mockRejectedValueOnce(unavailable());
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await search(user);
    expect(screen.getByRole("alert")).toBeVisible();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);

    await user.click(submit());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(retry()).not.toBeInTheDocument();

    pending.resolve(SUCCESS);
    await screen.findByRole("list", { name: "Recommended hotels" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("AC4.7 replaces an empty result with the new cards", async () => {
    fetchMock.mockResolvedValueOnce(EMPTY);
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await search(user);
    expect(screen.getByText(EMPTY_TEXT)).toBeVisible();

    await search(user);

    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY.message)).not.toBeInTheDocument();
    expect(hotelList()).toBeVisible();
  });

  it("AC4.7 a blocked blank submit keeps the results and only adds the inline error", async () => {
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await search(user);

    await user.clear(field());
    await user.click(submit());

    expect(screen.getByText(BLANK_ERROR)).toBeVisible();
    expect(screen.getByText(SUCCESS.message)).toBeVisible();
    expect(within(hotelList()!).getAllByRole("listitem")).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("AC4.7 a blocked blank submit keeps the error and Retry and only adds the inline error", async () => {
    fetchMock.mockRejectedValueOnce(unavailable());
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await search(user);

    await user.clear(field());
    await user.click(submit());

    expect(screen.getByText(BLANK_ERROR)).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(SERVICE_DOWN);
    expect(retry()).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("announcing the reply", () => {
  it("AC4.8 the same polite live container stays mounted across idle, loading and results and holds the message", async () => {
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<HotelAssistant />);
    const region = liveRegion();
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();

    await user.click(submit());
    expect(liveRegion()).toBe(region);
    expect(region).toBeEmptyDOMElement();

    pending.resolve(SUCCESS);
    expect(await within(region!).findByText(SUCCESS.message)).toBeVisible();
    expect(liveRegion()).toBe(region);
  });

  it("AC4.8 the live container holds the message and the empty text on an empty result", async () => {
    fetchMock.mockResolvedValue(EMPTY);
    render(<HotelAssistant />);

    await search(userEvent.setup());

    const region = liveRegion()!;
    expect(within(region).getByText(EMPTY.message)).toBeVisible();
    expect(within(region).getByText(EMPTY_TEXT)).toBeVisible();
  });

  it("AC4.8 the live container empties while a new search runs, so the next reply is announced", async () => {
    const user = userEvent.setup();
    render(<HotelAssistant />);
    await search(user);
    const region = liveRegion();
    expect(within(region!).getByText(SUCCESS.message)).toBeVisible();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);

    await user.click(submit());

    expect(liveRegion()).toBe(region);
    expect(region).toBeEmptyDOMElement();
  });

  it("AC4.8 the status region is empty while the reply is on screen", async () => {
    render(<HotelAssistant />);

    await search(userEvent.setup());

    expect(within(liveRegion()!).getByText(SUCCESS.message)).toBeVisible();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
