// Mirrors components/schemas in openapi/openapi.yaml, which is the source of truth.
export type Scenario = "success" | "empty" | "error";

export interface RecommendationRequest {
  message: string;
  scenario?: Scenario;
}

export interface Hotel {
  id: string;
  name: string;
  nightlyPrice: number;
  currency: string;
  breakfastIncluded: boolean;
  explanation: string;
}

export interface RecommendationResponse {
  message: string;
  hotels: Hotel[];
  source: "fixture";
}

export interface ErrorResponse {
  code: "validation_error" | "service_unavailable";
  message: string;
  retryable: boolean;
}
