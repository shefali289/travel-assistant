import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Hotel } from "@/lib/types";
import { HotelCard } from "./HotelCard";
import { HOTELS } from "./test-utils";

const [withBreakfast, , withoutBreakfast] = HOTELS;

function renderCard(hotel: Hotel) {
  render(
    <ul>
      <HotelCard hotel={hotel} />
    </ul>,
  );
  return screen.getByRole("listitem");
}

describe("HotelCard", () => {
  it("AC4.3 shows the name as an h3", () => {
    renderCard(withBreakfast);

    expect(screen.getByRole("heading", { level: 3, name: "Harbour House" })).toBeVisible();
  });

  it("AC4.3 shows the price with its currency and per night", () => {
    expect(renderCard(withBreakfast)).toHaveTextContent(/NZD 220\s+per night/);
  });

  it("AC4.3 shows a non-whole price with two decimals", () => {
    expect(renderCard({ ...withBreakfast, nightlyPrice: 220.5 })).toHaveTextContent(/NZD 220\.50\s+per night/);
  });

  it("AC4.3 shows Breakfast included when breakfast is included", () => {
    renderCard(withBreakfast);

    expect(screen.getByText("Breakfast included")).toBeVisible();
    expect(screen.queryByText("Breakfast not included")).not.toBeInTheDocument();
  });

  it("AC4.3 shows Breakfast not included when breakfast is not included", () => {
    renderCard(withoutBreakfast);

    expect(screen.getByText("Breakfast not included")).toBeVisible();
    expect(screen.queryByText("Breakfast included")).not.toBeInTheDocument();
  });

  it("AC4.3 shows the explanation", () => {
    renderCard(withoutBreakfast);

    expect(screen.getByText("Lower price; breakfast costs extra.")).toBeVisible();
  });
});
