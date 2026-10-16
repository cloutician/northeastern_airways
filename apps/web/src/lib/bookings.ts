export type TripFlight = {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  cost: string | number;
  Path?: {
    fromAirport?: { code: string; name: string };
    toAirport?: { code: string; name: string };
  };
};

export type TripBooking = {
  id: number;
  price: number;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
  Flights: TripFlight[];
};

export const money = (value: number | string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
export const tripTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
export const tripDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
export const reference = (id: number) => `NE${String(id).padStart(6, "0")}`;
export function demoPaymentLabel(status: string, bookingStatus?: string): string {
  if (bookingStatus === "cancelled" || status === "refunded") return "Demo cancellation recorded";
  if (status === "paid") return "Demo confirmed";
  return "Awaiting demo confirmation";
}
export const orderedFlights = (flights: TripFlight[]) =>
  [...flights].sort((a, b) => Date.parse(a.departureTime) - Date.parse(b.departureTime));

export function bookingError(err: unknown): string {
  const code = (err as { body?: { error?: string } })?.body?.error;
  const messages: Record<string, string> = {
    flight_departed: "This trip has already started. Please choose a future flight.",
    invalid_flights: "These flights are no longer available. Please search again.",
    invalid_itinerary: "These flights do not connect, or leave less than an hour to transfer. Please choose another route.",
    booking_cancelled: "This booking has been cancelled and cannot be confirmed.",
    forbidden: "You do not have access to this booking.",
    not_found: "This booking could not be found.",
    unauthorized: "Your session has expired. Please log in again.",
  };
  return (code && messages[code]) || "We couldn't complete that request. Please try again.";
}

export function safeReturnTo(value: string | null): string {
  // Keep login redirects inside this app, including checkout's query string.
  return value && /^\/(?:checkout|dashboard|bookings\/\d+)(?:\?|$)/.test(value) ? value : "/dashboard";
}
