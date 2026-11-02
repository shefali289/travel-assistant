import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import type { Hotel } from "@/lib/types";

const BREAKFAST_INCLUDED = "bg-green-100 text-green-900";
const BREAKFAST_NOT_INCLUDED = "bg-slate-200 text-slate-900";

// Renders an <li>, so it belongs inside a list. Task 05 passes the Choose button as children.
export function HotelCard({ hotel, children }: { hotel: Hotel; children?: ReactNode }) {
  return (
    <li className="flex flex-col rounded border border-slate-400 bg-white p-4">
      <h3 className="text-lg font-semibold text-slate-900">{hotel.name}</h3>
      <p className="mt-1 text-slate-900">
        <span className="font-semibold">{formatPrice(hotel.nightlyPrice, hotel.currency)}</span> per night
      </p>
      <p className="mt-2">
        <span
          className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${
            hotel.breakfastIncluded ? BREAKFAST_INCLUDED : BREAKFAST_NOT_INCLUDED
          }`}
        >
          {hotel.breakfastIncluded ? "Breakfast included" : "Breakfast not included"}
        </span>
      </p>
      <p className="mt-2 text-slate-800">{hotel.explanation}</p>
      {children}
    </li>
  );
}
