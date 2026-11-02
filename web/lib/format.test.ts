import { describe, expect, it } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("AC4.3 shows a whole price with the currency code and no decimals", () => {
    expect(formatPrice(220, "NZD")).toBe("NZD 220");
  });

  it("AC4.3 shows a non-whole price with two decimals", () => {
    expect(formatPrice(220.5, "NZD")).toBe("NZD 220.50");
    expect(formatPrice(220.75, "AUD")).toBe("AUD 220.75");
  });
});
