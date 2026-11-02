"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { fetchRecommendations, type ApiError } from "@/lib/api";
import type { RecommendationResponse, Scenario } from "@/lib/types";

const EXAMPLE_REQUEST = "Find a Wellington hotel for two nights, up to NZD 250 per night; breakfast preferred.";
const SCENARIOS: Scenario[] = ["success", "empty", "error"];
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
const INPUT_CLASSES = `mt-1 block w-full rounded border border-slate-500 bg-white px-3 py-2 text-slate-900 disabled:bg-slate-100 disabled:text-slate-600 ${FOCUS_RING}`;

// Task 04 renders the success and error outcomes.
type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: RecommendationResponse }
  | { status: "error"; error: ApiError };

export function HotelAssistant() {
  const [message, setMessage] = useState(EXAMPLE_REQUEST);
  const [scenario, setScenario] = useState<Scenario>("success");
  const [blankError, setBlankError] = useState(false);
  const [request, setRequest] = useState<RequestState>({ status: "idle" });

  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const wasLoading = useRef(false);
  const id = useId();
  const fieldId = `${id}-request`;
  const errorId = `${id}-request-error`;
  const scenarioId = `${id}-scenario`;
  const hintId = `${id}-scenario-hint`;

  const loading = request.status === "loading";

  // Runs after the render that re-enables the button, because a disabled button cannot take focus.
  useEffect(() => {
    if (wasLoading.current && !loading) submitRef.current?.focus();
    wasLoading.current = loading;
  }, [loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setBlankError(true);
      fieldRef.current?.focus();
      return;
    }

    setRequest({ status: "loading" });
    try {
      const data = await fetchRecommendations({ message: trimmed, scenario });
      setRequest({ status: "success", data });
    } catch (error) {
      // fetchRecommendations turns every failure into an ApiError.
      setRequest({ status: "error", error: error as ApiError });
    }
  }

  return (
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
  );
}
