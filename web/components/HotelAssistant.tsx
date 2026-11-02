"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { fetchRecommendations, type ApiError } from "@/lib/api";
import { formatBreakfast, formatPrice } from "@/lib/format";
import type { RecommendationResponse, Scenario } from "@/lib/types";
import { HotelCard } from "./HotelCard";

const EXAMPLE_REQUEST = "Find a Wellington hotel for two nights, up to NZD 250 per night; breakfast preferred.";
const SCENARIOS: Scenario[] = ["success", "empty", "error"];
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
const INPUT_CLASSES = `mt-1 block w-full rounded border border-slate-500 bg-white px-3 py-2 text-slate-900 disabled:bg-slate-100 disabled:text-slate-600 ${FOCUS_RING}`;

type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: RecommendationResponse }
  | { status: "error"; error: ApiError; sentMessage: string };

export function HotelAssistant() {
  const [message, setMessage] = useState(EXAMPLE_REQUEST);
  const [scenario, setScenario] = useState<Scenario>("success");
  const [blankError, setBlankError] = useState(false);
  const [request, setRequest] = useState<RequestState>({ status: "idle" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const wasLoading = useRef(false);
  const id = useId();
  const fieldId = `${id}-request`;
  const errorId = `${id}-request-error`;
  const scenarioId = `${id}-scenario`;
  const hintId = `${id}-scenario-hint`;
  const summaryHeadingId = `${id}-summary-heading`;

  const loading = request.status === "loading";
  const result = request.status === "success" ? request.data : null;
  const chosenHotel = result?.hotels.find((hotel) => hotel.id === selectedId);

  // Runs after the render that re-enables the button, because a disabled button cannot take focus.
  useEffect(() => {
    if (wasLoading.current && !loading) submitRef.current?.focus();
    wasLoading.current = loading;
  }, [loading]);

  // Runs only when the choice changes, so re-renders and pressing the chosen button again leave focus alone.
  useEffect(() => {
    if (selectedId) summaryRef.current?.focus();
  }, [selectedId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setBlankError(true);
      fieldRef.current?.focus();
      return;
    }

    await search(trimmed);
  }

  // Retry calls this too, with the message from the failed request and the scenario selected now.
  async function search(sentMessage: string) {
    setBlankError(false);
    setSelectedId(null);
    setRequest({ status: "loading" });
    try {
      const data = await fetchRecommendations({ message: sentMessage, scenario });
      setRequest({ status: "success", data });
    } catch (error) {
      // fetchRecommendations turns every failure into an ApiError.
      setRequest({ status: "error", error: error as ApiError, sentMessage });
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl">
        <label htmlFor={fieldId} className="block font-medium text-slate-900">
          Your request
        </label>
        <textarea
          id={fieldId}
          ref={fieldRef}
          rows={3}
          value={message}
          disabled={loading}
          aria-invalid={blankError || undefined}
          aria-describedby={blankError ? errorId : undefined}
          onChange={(event) => {
            setMessage(event.target.value);
            setBlankError(false);
          }}
          className={INPUT_CLASSES}
        />
        {blankError && (
          <p id={errorId} className="mt-1 text-sm text-red-800">
            Please describe the hotel you need.
          </p>
        )}

        <div className="mt-4 rounded border border-dashed border-slate-500 bg-white p-3">
          <label htmlFor={scenarioId} className="block font-medium text-slate-900">
            Demo scenario
          </label>
          <select
            id={scenarioId}
            value={scenario}
            disabled={loading}
            aria-describedby={hintId}
            onChange={(event) => setScenario(event.target.value as Scenario)}
            className={INPUT_CLASSES}
          >
            {SCENARIOS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p id={hintId} className="mt-1 text-sm text-slate-700">
            Demo control: chooses which fixture outcome the API returns. It is here to show each state and is not part of
            a real search.
          </p>
        </div>

        <button
          ref={submitRef}
          type="submit"
          disabled={loading}
          aria-busy={loading || undefined}
          className={`mt-4 w-full rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:bg-slate-500 sm:w-auto ${FOCUS_RING}`}
        >
          {loading ? "Finding hotels…" : "Find hotels"}
        </button>

        <div role="status" className="mt-4 text-slate-800">
          {loading ? "Finding hotels for you…" : null}
        </div>
      </form>

      {/* Stays mounted and empty until a reply arrives, so screen readers announce the reply. */}
      <div aria-live="polite">
        {result && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">Assistant&apos;s reply</h2>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-900">Fixture data</span>
            </div>
            <p className="mt-2 text-slate-900">{result.message}</p>
            {result.hotels.length === 0 && (
              <p className="mt-4 text-slate-900">No hotels to show. Try changing your request or the demo scenario.</p>
            )}
          </>
        )}
      </div>

      {result && result.hotels.length > 0 && (
        // role="list" because Tailwind removes the list style, and Safari then stops announcing a list.
        <ul role="list" aria-label="Recommended hotels" className="mt-4 grid gap-4 md:grid-cols-3">
          {result.hotels.map((hotel) => {
            const chosen = hotel.id === selectedId;
            return (
              <HotelCard key={hotel.id} hotel={hotel} chosen={chosen}>
                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => setSelectedId(hotel.id)}
                    className={`w-full rounded border border-blue-700 px-4 py-2 font-medium ${
                      chosen ? "bg-blue-700 text-white" : "bg-white text-blue-800 hover:bg-blue-50"
                    } ${FOCUS_RING}`}
                  >
                    Choose {hotel.name}
                  </button>
                </div>
              </HotelCard>
            );
          })}
        </ul>
      )}

      {chosenHotel && (
        // A focus: outline, not focus-visible:, because focus-visible may not match after a mouse click.
        <section
          ref={summaryRef}
          aria-labelledby={summaryHeadingId}
          tabIndex={-1}
          className="mt-6 rounded border border-slate-400 bg-white p-4 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
        >
          <h2 id={summaryHeadingId} className="text-xl font-semibold text-slate-900">
            Your choice
          </h2>
          <dl className="mt-2 text-slate-900">
            <dt className="mt-2 font-medium">Hotel</dt>
            <dd>{chosenHotel.name}</dd>
            <dt className="mt-2 font-medium">Price</dt>
            <dd>{`${formatPrice(chosenHotel.nightlyPrice, chosenHotel.currency)} per night`}</dd>
            <dt className="mt-2 font-medium">Breakfast</dt>
            <dd>{formatBreakfast(chosenHotel.breakfastIncluded)}</dd>
            <dt className="mt-2 font-medium">Why this hotel</dt>
            <dd>{chosenHotel.explanation}</dd>
          </dl>
          <p className="mt-4 text-sm text-slate-700">Fixture data for this demo. No booking has been made.</p>
        </section>
      )}

      {request.status === "error" && (
        <div className="mt-6 rounded border border-red-800 bg-red-50 p-4">
          <p role="alert" className="text-red-900">
            {request.error.message}
          </p>
          {request.error.retryable && (
            <button
              type="button"
              onClick={() => search(request.sentMessage)}
              className={`mt-3 rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 ${FOCUS_RING}`}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </>
  );
}
