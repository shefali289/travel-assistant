import { HotelAssistant } from "@/components/HotelAssistant";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Hotel recommendation assistant</h1>
      <HotelAssistant />
    </main>
  );
}
