import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchRecommendations } from "@/lib/api";
import { HotelAssistant } from "./HotelAssistant";
import { deferred, HOTELS, SUCCESS } from "./test-utils";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  fetchRecommendations: vi.fn(),
}));

const fetchMock = vi.mocked(fetchRecommendations);
const NOTE = "Fixture data for this demo. No booking has been made.";
const unavailable = () => new ApiError("The recommendation service is unavailable. Please try again.", 503, true);

type User = ReturnType<typeof userEvent.setup>;

const field = () => screen.getByRole("textbox", { name: "Your request" });
const scenario = () => screen.getByRole("combobox", { name: "Demo scenario" });
const submit = () => screen.getByRole("button", { name: /find(ing)? hotels/i });
const chooseButton = (name: string) => screen.getByRole("button", { name: `Choose ${name}` });
const chooseButtons = () => screen.getAllByRole("button", { name: /^Choose / });
const summary = () => screen.getByRole("region", { name: "Your choice" });
const querySummary = () => screen.queryByRole("region", { name: "Your choice" });
const cardFor = (name: string) => chooseButton(name).closest("li") as HTMLElement;
const pressed = () => chooseButtons().filter((button) => button.getAttribute("aria-pressed") === "true");

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(SUCCESS);
});

async function search(user: User) {
  await user.click(submit());
  await screen.findByRole("button", { name: "Find hotels" });
}

async function renderWithResults() {
  const user = userEvent.setup();
  render(<HotelAssistant />);
  await search(user);
  return user;
}

function expectNoChoice() {
  expect(querySummary()).not.toBeInTheDocument();
  expect(pressed()).toEqual([]);
  expect(screen.queryByText("Chosen")).not.toBeInTheDocument();
}

function expectChoiceKept(name: string) {
  expect(within(summary()).getByText(name)).toBeVisible();
  expect(pressed()).toEqual([chooseButton(name)]);
}

describe("before a choice", () => {
  it("AC5.1 each card has a Choose button that is not pressed", async () => {
    await renderWithResults();

    for (const hotel of HOTELS) {
      const button = within(cardFor(hotel.name)).getByRole("button", { name: `Choose ${hotel.name}` });
      expect(button).toHaveAttribute("aria-pressed", "false");
      expect(button).toHaveAttribute("type", "button");
    }
    expect(chooseButtons()).toHaveLength(3);
  });

  it("AC5.1 shows no summary", async () => {
    await renderWithResults();

    expect(chooseButtons()).toHaveLength(3);
    expect(querySummary()).not.toBeInTheDocument();
    expect(screen.queryByText("Chosen")).not.toBeInTheDocument();
  });
});

describe("choosing", () => {
  it("AC5.2 sets aria-pressed on that button only", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));

    expect(chooseButton("City Garden")).toHaveAttribute("aria-pressed", "true");
    expect(chooseButton("Harbour House")).toHaveAttribute("aria-pressed", "false");
    expect(chooseButton("Quay Rooms")).toHaveAttribute("aria-pressed", "false");
  });

  it("AC5.2 keeps exactly one hotel chosen when the choice changes", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));
    await user.click(chooseButton("Quay Rooms"));

    expect(pressed()).toEqual([chooseButton("Quay Rooms")]);
    expect(within(cardFor("Quay Rooms")).getByText("Chosen")).toBeVisible();
    expect(screen.getAllByText("Chosen")).toHaveLength(1);
  });

  it("AC5.2 shows a Chosen badge on that card only, outside the button", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));

    expect(within(cardFor("City Garden")).getByText("Chosen")).toBeVisible();
    expect(within(chooseButton("City Garden")).queryByText("Chosen")).not.toBeInTheDocument();
    expect(within(cardFor("Harbour House")).queryByText("Chosen")).not.toBeInTheDocument();
    expect(within(cardFor("Quay Rooms")).queryByText("Chosen")).not.toBeInTheDocument();
  });

  it("AC5.2 keeps the button text and name when chosen", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));

    expect(chooseButton("City Garden")).toHaveTextContent(/^Choose City Garden$/);
  });

  it("AC5.2 pressing the chosen button again changes nothing", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));
    const before = summary().textContent;
    await user.click(chooseButton("City Garden"));

    expect(chooseButton("City Garden")).toHaveAttribute("aria-pressed", "true");
    expect(pressed()).toHaveLength(1);
    expect(within(cardFor("City Garden")).getByText("Chosen")).toBeVisible();
    expect(summary().textContent).toBe(before);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("summary", () => {
  it("AC5.3 shows the name, price, breakfast, explanation and note", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("Harbour House"));

    const region = within(summary());
    expect(region.getByText("Harbour House")).toBeVisible();
    expect(region.getByText("NZD 220 per night")).toBeVisible();
    expect(region.getByText("Breakfast included")).toBeVisible();
    expect(region.getByText("Within budget; breakfast included.")).toBeVisible();
    expect(region.getByText(NOTE)).toBeVisible();
  });

  it("AC5.3 shows Breakfast not included for a hotel without breakfast", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("Quay Rooms"));

    expect(within(summary()).getByText("NZD 195 per night")).toBeVisible();
    expect(within(summary()).getByText("Breakfast not included")).toBeVisible();
  });

  it("AC5.3 sits below the list", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));

    const list = screen.getByRole("list", { name: "Recommended hotels" });
    expect(list.compareDocumentPosition(summary()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list).not.toContainElement(summary());
  });

  it("AC5.3 has no nightly total", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("Harbour House"));

    expect(summary()).not.toHaveTextContent(/total/i);
    expect(summary()).not.toHaveTextContent("440");
  });

  it("AC5.3 is not a live region and is not inside one", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));

    expect(summary().closest("[aria-live]")).toBeNull();
  });
});

describe("focus", () => {
  it("AC5.4 moves to the summary after a choice", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));

    expect(summary()).toHaveFocus();
    expect(summary()).toHaveAttribute("tabindex", "-1");
  });

  it("AC5.4 moves to the summary again when the choice changes, and the summary updates", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));
    await user.click(chooseButton("Quay Rooms"));

    expect(summary()).toHaveFocus();
    expect(within(summary()).getByText("Quay Rooms")).toBeVisible();
    expect(within(summary()).getByText("NZD 195 per night")).toBeVisible();
    expect(within(summary()).queryByText("City Garden")).not.toBeInTheDocument();
    expect(within(summary()).queryByText("Near the meeting district.")).not.toBeInTheDocument();
  });

  it("AC5.4 stays on the button when the chosen button is pressed again", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));
    await user.click(chooseButton("City Garden"));

    expect(chooseButton("City Garden")).toHaveFocus();
  });

  it("AC5.4 does not move back to the summary when the page re-renders for another reason", async () => {
    const user = await renderWithResults();

    await user.click(chooseButton("City Garden"));
    await user.click(field());
    await user.keyboard("x");

    expect(field()).toHaveFocus();
  });
});

describe("keyboard", () => {
  it("AC5.5 Tab reaches the first Choose button from Find hotels", async () => {
    const user = await renderWithResults();
    expect(submit()).toHaveFocus();

    await user.tab();

    expect(chooseButton("Harbour House")).toHaveFocus();
  });

  it("AC5.5 Enter on a focused Choose button shows the summary", async () => {
    const user = await renderWithResults();

    await user.tab();
    await user.keyboard("{Enter}");

    expect(chooseButton("Harbour House")).toHaveAttribute("aria-pressed", "true");
    expect(within(summary()).getByText("Harbour House")).toBeVisible();
    expect(summary()).toHaveFocus();
  });

  it("AC5.5 Space on a focused Choose button shows the summary", async () => {
    const user = await renderWithResults();

    await user.tab();
    await user.tab();
    await user.keyboard(" ");

    expect(chooseButton("City Garden")).toHaveAttribute("aria-pressed", "true");
    expect(within(summary()).getByText("City Garden")).toBeVisible();
    expect(summary()).toHaveFocus();
  });
});

describe("clearing the choice", () => {
  it("AC5.6 Find hotels clears it, even when the same hotels come back", async () => {
    const user = await renderWithResults();
    await user.click(chooseButton("City Garden"));

    await search(user);

    expect(chooseButtons()).toHaveLength(3);
    expectNoChoice();
    expect(submit()).toHaveFocus();
  });

  it("AC5.6 Find hotels removes the summary while the new request is loading", async () => {
    const user = await renderWithResults();
    await user.click(chooseButton("City Garden"));
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);

    await user.click(submit());

    expect(screen.getByRole("button", { name: "Finding hotels…" })).toBeDisabled();
    expect(querySummary()).not.toBeInTheDocument();

    pending.resolve(SUCCESS);
    await screen.findByRole("button", { name: "Find hotels" });
    expectNoChoice();
  });

  it("AC5.6 a hotel can be chosen again after the choice was cleared", async () => {
    const user = await renderWithResults();
    await user.click(chooseButton("City Garden"));
    await search(user);

    await user.click(chooseButton("City Garden"));

    expect(chooseButton("City Garden")).toHaveAttribute("aria-pressed", "true");
    expect(summary()).toHaveFocus();
  });

  it("AC5.6 Retry leaves no choice after it recovers", async () => {
    const user = await renderWithResults();
    await user.click(chooseButton("City Garden"));
    fetchMock.mockRejectedValueOnce(unavailable());
    await search(user);
    expect(querySummary()).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(chooseButtons()).toHaveLength(3));

    expectNoChoice();
  });

  it("AC5.6 a blocked blank submit keeps it", async () => {
    const user = await renderWithResults();
    await user.click(chooseButton("City Garden"));

    await user.clear(field());
    await user.click(submit());

    expect(screen.getByText(/describe the hotel/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectChoiceKept("City Garden");
  });

  it("AC5.6 editing the field keeps it", async () => {
    const user = await renderWithResults();
    await user.click(chooseButton("City Garden"));

    await user.type(field(), " Near the waterfront.");

    expectChoiceKept("City Garden");
  });

  it("AC5.6 changing the demo scenario keeps it", async () => {
    const user = await renderWithResults();
    await user.click(chooseButton("City Garden"));

    await user.selectOptions(scenario(), "empty");

    expectChoiceKept("City Garden");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
