import type { ReactNode } from "react";
import { formatBreakfast, formatPrice } from "@/lib/format";
import type { Hotel } from "@/lib/types";

const BREAKFAST_INCLUDED = "bg-green-100 text-green-900";
const BREAKFAST_NOT_INCLUDED = "bg-slate-200 text-slate-900";

// The chosen padding is 3px less, to absorb the 3px of extra border, so the border does not move the contents. The "Chosen" badge does add a line.
const UNCHOSEN_CARD = "border border-slate-400 p-4";
const CHOSEN_CARD = "border-4 border-blue-700 p-[13px]";

// Renders an <li>, so it belongs inside a list.
export function HotelCard({ hotel, chosen = false, children }: { hotel: Hotel; chosen?: boolean; children?: ReactNode }) {
  return (
    <li className={`flex flex-col rounded bg-white ${chosen ? CHOSEN_CARD : UNCHOSEN_CARD}`}>
      <h3 className="text-lg font-semibold text-slate-900">{hotel.name}</h3>
      {chosen && (
        <p className="mt-1">
          <span className="inline-block rounded bg-blue-700 px-2 py-0.5 text-sm font-medium text-white">Chosen</span>
        </p>
      )}
      <p className="mt-1 text-slate-900">
        <span className="font-semibold">{formatPrice(hotel.nightlyPrice, hotel.currency)}</span> per night
      </p>
      <p className="mt-2">
        <span
          className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${
            hotel.breakfastIncluded ? BREAKFAST_INCLUDED : BREAKFAST_NOT_INCLUDED
          }`}
        >
          {formatBreakfast(hotel.breakfastIncluded)}
        </span>
      </p>
      <p className="mt-2 text-slate-800">{hotel.explanation}</p>
      {children}
    </li>
  );
}
