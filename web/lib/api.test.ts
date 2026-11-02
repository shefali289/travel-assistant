import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchRecommendations } from "./api";

const NETWORK_MESSAGE = "We could not reach the recommendation service. Please try again.";
const GENERIC_MESSAGE = "Something went wrong while finding hotels. Please try again.";
const SERVER_TEXT = "server-only-text";
const request = { message: "A quiet hotel", scenario: "success" as const };
const body = {
  message: "Here are some hotels.",
  hotels: [
    {
      id: "h1",
      name: "Harbour House",
      nightlyPrice: 220,
      currency: "NZD",
      breakfastIncluded: true,
      explanation: "Near the water.",
    },
  ],
  source: "fixture",
};

const fetchMock = vi.fn<typeof fetch>();
const json = (value: unknown, status: number) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

async function failure(): Promise<ApiError> {
  const error = await fetchRecommendations(request).then(
    () => {
      throw new Error("expected fetchRecommendations to reject");
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchRecommendations", () => {
  it("AC3.1 POSTs JSON to the default base URL and returns the typed body on 200", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);
    fetchMock.mockResolvedValue(json(body, 200));

    await expect(fetchRecommendations(request)).resolves.toEqual(body);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/recommendations");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init?.body as string)).toEqual(request);
  });

  it("AC3.1 uses NEXT_PUBLIC_API_BASE_URL when it is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test:9000");
    fetchMock.mockResolvedValue(json(body, 200));

    await fetchRecommendations(request);

    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test:9000/recommendations");
  });

  it("AC3.2 throws ApiError with the server's message and retryable true on a 503", async () => {
    fetchMock.mockResolvedValue(
      json({ code: "service_unavailable", message: "Service is down.", retryable: true }, 503),
    );

    const error = await failure();

    expect(error.message).toBe("Service is down.");
    expect(error.status).toBe(503);
    expect(error.retryable).toBe(true);
  });

  it("AC3.2 throws ApiError with the server's message and retryable false on a 422", async () => {
    fetchMock.mockResolvedValue(
      json({ code: "validation_error", message: "The message field is too long.", retryable: false }, 422),
    );

    const error = await failure();

    expect(error.message).toBe("The message field is too long.");
    expect(error.status).toBe(422);
    expect(error.retryable).toBe(false);
  });

  it("AC3.2 keeps the server's message and retryable when the code is outside the contract's enum", async () => {
    fetchMock.mockResolvedValue(json({ code: "x", message: "Try a shorter request.", retryable: false }, 500));

    const error = await failure();

    expect(error.message).toBe("Try a shorter request.");
    expect(error.status).toBe(500);
    expect(error.retryable).toBe(false);
  });

  it("AC3.3 turns a network failure into a retryable ApiError with no status and the agreed message", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await failure();

    expect(error.message).toBe(NETWORK_MESSAGE);
    expect(error.status).toBeNull();
    expect(error.retryable).toBe(true);
  });

  it.each<[string, () => Response, number]>([
    ["a non-JSON error body", () => new Response(`<html>${SERVER_TEXT}</html>`, { status: 502 }), 502],
    ["a non-2xx JSON body with another shape", () => json({ detail: SERVER_TEXT }, 404), 404],
    ["a non-2xx JSON null body", () => json(null, 500), 500],
    ["a non-2xx body with no retryable", () => json({ code: "x", message: SERVER_TEXT }, 500), 500],
    ["a non-2xx body with no code", () => json({ message: SERVER_TEXT, retryable: false }, 500), 500],
    [
      "a non-2xx body with a non-boolean retryable",
      () => json({ code: "x", message: SERVER_TEXT, retryable: "no" }, 500),
      500,
    ],
    [
      "a non-2xx body with a non-string message",
      () => json({ code: "x", message: 42, retryable: false }, 500),
      500,
    ],
    ["a 200 that is not JSON", () => new Response(`<html>${SERVER_TEXT}</html>`, { status: 200 }), 200],
    ["a 200 with a JSON null body", () => json(null, 200), 200],
    ["a 200 with no message", () => json({ hotels: [], source: "fixture" }, 200), 200],
    ["a 200 with a non-string message", () => json({ message: 42, hotels: [] }, 200), 200],
    ["a 200 with no hotels", () => json({ message: SERVER_TEXT, source: "fixture" }, 200), 200],
    ["a 200 with non-array hotels", () => json({ message: SERVER_TEXT, hotels: {} }, 200), 200],
  ])("AC3.3 turns %s into a retryable ApiError with a generic message", async (_name, response, status) => {
    fetchMock.mockResolvedValue(response());

    const error = await failure();

    expect(error.message).toBe(GENERIC_MESSAGE);
    expect(error.message).not.toContain(SERVER_TEXT);
    expect(error.message).not.toBe(NETWORK_MESSAGE);
    expect(error.status).toBe(status);
    expect(error.retryable).toBe(true);
  });
});
