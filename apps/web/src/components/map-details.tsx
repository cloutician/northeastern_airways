import { ArrowRight, Clock3, MapPin, X } from "lucide-react";

export type MapAirport = {
  code: string;
  name: string;
  city?: string;
  country?: string;
  latitude: number | string | null;
  longitude: number | string | null;
};

export type LiveMapFlight = {
  id?: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  from: { lat: number; lon: number; code: string };
  to: { lat: number; lon: number; code: string };
};

export type MapSelection = { kind: "flight"; flight: LiveMapFlight } | { kind: "airport"; airport: MapAirport };

const UK_TZ = "Europe/London";
const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: UK_TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: UK_TZ, day: "numeric", month: "short" });

export function getFlightDetails(flight: LiveMapFlight, scope: "active" | "demo", now = Date.now()) {
  const departure = new Date(flight.departureTime);
  const arrival = new Date(flight.arrivalTime);
  const duration = Math.max(0, Math.ceil((arrival.getTime() - departure.getTime()) / 60_000));
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const depDate = dateFormatter.format(departure);
  const arrDate = dateFormatter.format(arrival);
  return {
    departure: timeFormatter.format(departure),
    arrival: timeFormatter.format(arrival),
    dates: depDate === arrDate ? depDate : `${depDate} - ${arrDate}`,
    duration: hours ? `${hours}h${minutes ? ` ${minutes}m` : ""}` : `${minutes} min`,
    status: scope === "demo" ? "Demo flight" : now < departure.getTime() ? "Scheduled" : now >= arrival.getTime() ? "Landed" : "En route",
  };
}

export function MapDetails({ selection, airports, scope, onClose, now }: {
  selection: MapSelection;
  airports: ReadonlyMap<string, MapAirport>;
  scope: "active" | "demo";
  onClose: () => void;
  now?: number;
}) {
  const close = <button type="button" className="map-details-close" onClick={onClose} aria-label="Close map details" title="Close details"><X size={15} /></button>;

  if (selection.kind === "airport") {
    const airport = selection.airport;
    const country = airport.country === "UK" || airport.country === "GB" ? "United Kingdom" : airport.country;
    return <section className="map-details map-details--airport" aria-label={`${airport.code} airport details`}>
      <MapPin className="map-details-airport-icon" size={16} />
      <div className="map-details-airport-copy"><h3><span>{airport.code}</span>{airport.name}</h3><p>{[airport.city, country].filter(Boolean).join(", ")}</p></div>
      {close}
    </section>;
  }

  const flight = selection.flight;
  const details = getFlightDetails(flight, scope, now);
  const endpoint = (code: string, arrival: boolean) => {
    const airport = airports.get(code);
    return <div className={`map-details-endpoint${arrival ? " map-details-endpoint--arrival" : ""}`}>
      <span className="sr-only">{arrival ? "Arrival" : "Departure"}</span>
      <div className="map-details-endpoint-main"><strong>{code}</strong><time dateTime={arrival ? flight.arrivalTime : flight.departureTime}>{arrival ? details.arrival : details.departure}</time></div>
      <span className="map-details-city" title={airport?.name}>{airport?.city || airport?.name || code}</span>
    </div>;
  };

  return <section className="map-details" aria-label={`Flight ${flight.flightNumber} details`}>
    <header className="map-details-heading"><h3 title={flight.flightNumber}>{flight.flightNumber}</h3><span className={`map-details-status${scope === "demo" ? " map-details-status--demo" : ""}`}>{details.status}</span></header>
    <div className="map-details-route">{endpoint(flight.from.code, false)}<ArrowRight size={14} aria-hidden="true" />{endpoint(flight.to.code, true)}</div>
    <footer className="map-details-footer"><span><Clock3 size={12} />{details.duration}</span><span>{details.dates} &middot; UK time</span></footer>
    {close}
  </section>;
}
