import { expect, it } from "vitest";

// Proves the Vitest + jsdom toolchain runs. Delete once you have real tests.
it("toolchain runs", () => {
  expect(document.createElement("div")).toBeInstanceOf(HTMLElement);
});
