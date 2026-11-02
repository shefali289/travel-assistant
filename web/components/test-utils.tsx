import type { Hotel, RecommendationResponse } from "@/lib/types";

export const HOTELS: Hotel[] = [
  {
    id: "h1",
    name: "Harbour House",
    nightlyPrice: 220,
    currency: "NZD",
    breakfastIncluded: true,
    explanation: "Within budget; breakfast included.",
  },
  {
    id: "h2",
    name: "City Garden",
    nightlyPrice: 245,
    currency: "NZD",
    breakfastIncluded: true,
    explanation: "Near the meeting district.",
  },
  {
    id: "h3",
    name: "Quay Rooms",
    nightlyPrice: 195,
    currency: "NZD",
    breakfastIncluded: false,
    explanation: "Lower price; breakfast costs extra.",
  },
];

export const SUCCESS: RecommendationResponse = {
  message: "Here are three hotels that fit your request.",
  hotels: HOTELS,
  source: "fixture",
};

export const EMPTY: RecommendationResponse = {
  message: "I could not find a hotel that fits your request.",
  hotels: [],
  source: "fixture",
};

export function deferred() {
  let resolve!: (value: RecommendationResponse) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<RecommendationResponse>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
