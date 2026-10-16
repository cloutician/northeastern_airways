import { listLiveMapFlights } from "../modules/flights/flights.service.js";
import { getSocketIOServer } from "./io.js";

let intervalId: ReturnType<typeof setInterval> | null = null;

function trackerScope(): "active" | "demo" {
  return process.env.NODE_ENV === "production" ? "active" : "demo";
}

/**
 * One server-wide ticker (legacy app accidentally ran one interval per socket).
 * Emits `flightUpdate` with the same payload shape as the old Leaflet tracker.
 */
export function startFlightTrackerBroadcast(): void {
  if (intervalId !== null) return;

  const tick = async () => {
    const io = getSocketIOServer();
    if (!io) return;
    try {
      const flights = await listLiveMapFlights(trackerScope());
      io.emit("flightUpdate", flights);
    } catch (err) {
      console.error("flight tracker broadcast failed", err);
    }
  };

  void tick();
  intervalId = setInterval(() => void tick(), 10_000);
}

export function stopFlightTrackerBroadcast(): void {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}
