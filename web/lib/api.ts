import type { ErrorResponse, RecommendationRequest, RecommendationResponse } from "./types";

const NETWORK_MESSAGE = "We could not reach the recommendation service. Please try again.";
const GENERIC_MESSAGE = "Something went wrong while finding hotels. Please try again.";

export class ApiError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    typeof value.retryable === "boolean"
  );
}

function isRecommendationResponse(value: unknown): value is RecommendationResponse {
  return isRecord(value) && typeof value.message === "string" && Array.isArray(value.hotels);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function fetchRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiError(NETWORK_MESSAGE, null, true);
  }

  const body = await readJson(response);
  if (!response.ok) {
    if (isErrorResponse(body)) throw new ApiError(body.message, response.status, body.retryable);
    throw new ApiError(GENERIC_MESSAGE, response.status, true);
  }
  if (!isRecommendationResponse(body)) throw new ApiError(GENERIC_MESSAGE, response.status, true);
  return body;
}
