import { Plane } from "lucide-react";
import { orderedFlights, tripDate, tripTime, type TripFlight } from "../lib/bookings";

export function Itinerary({ flights }: { flights: TripFlight[] }) {
  return (
    <ol className="trip-itinerary">
      {orderedFlights(flights).map((flight, index) => (
        <li key={flight.id}>
          <div className="trip-leg-label"><span><img src="/img/brand-mark.png" alt="" width="20" height="20" /> Flight {index + 1} / {flight.flightNumber}</span><span>{tripDate(flight.departureTime)}</span></div>
          <div className="trip-leg-route">
            <div><strong>{tripTime(flight.departureTime)}</strong><span>{flight.Path?.fromAirport?.code ?? "Departure"}</span><small>{flight.Path?.fromAirport?.name}</small></div>
            <div className="trip-connector" aria-hidden="true"><Plane size={18} /></div>
            <div><strong>{tripTime(flight.arrivalTime)}</strong><span>{flight.Path?.toAirport?.code ?? "Arrival"}</span><small>{flight.Path?.toAirport?.name}</small></div>
          </div>
          {tripDate(flight.arrivalTime) !== tripDate(flight.departureTime) && <p className="trip-muted">Arrives {tripDate(flight.arrivalTime)}</p>}
        </li>
      ))}
    </ol>
  );
}
