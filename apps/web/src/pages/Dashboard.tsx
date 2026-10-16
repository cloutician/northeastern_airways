import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, LogOut, Plane, Plus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { bookingError, demoPaymentLabel, money, orderedFlights, reference, tripDate, tripTime, type TripBooking } from "../lib/bookings";

type Filter = "all" | "upcoming" | "past" | "cancelled";

export function Dashboard() {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    apiFetch<TripBooking[]>("/api/bookings")
      .then((data) => { if (active) setBookings(data); })
      .catch((err: unknown) => { if (active) setError(bookingError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload, user?.id]);

  const category = (booking: TripBooking) => {
    if (booking.bookingStatus === "cancelled") return "cancelled";
    return booking.Flights.some((flight) => Date.parse(flight.arrivalTime) > Date.now()) ? "upcoming" : "past";
  };
  const visible = bookings.filter((booking) => filter === "all" || category(booking) === filter);
  const upcoming = bookings.filter((booking) => category(booking) === "upcoming").length;
  const pending = bookings.filter((booking) => category(booking) === "upcoming" && booking.bookingStatus === "pending").length;

  return (
    <main className="travel-page">
      <div className="trip-page-heading"><div><p className="trip-eyebrow">WELCOME BACK, {user?.firstName}</p><h1>My trips</h1><p className="trip-muted">{user?.email}</p></div><Link className="trip-button" to="/"><Plus size={16} /> Book a flight</Link></div>
      {user?.role !== "passenger" && <p className="trip-muted">Account: {user?.role}{user?.personnelType ? ` / ${user.personnelType}` : ""}</p>}
      {!loading && !error && <div className="trip-statistics"><span><strong>{upcoming}</strong> Upcoming trips</span><span><strong>{pending}</strong> Awaiting confirmation</span><span><strong>{bookings.length}</strong> Total bookings</span></div>}
      <div className="trip-toolbar"><div className="trip-tabs" aria-label="Filter trips">{(["all", "upcoming", "past", "cancelled"] as const).map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === "all" ? "All trips" : item.charAt(0).toUpperCase() + item.slice(1)} <span>{item === "all" ? bookings.length : bookings.filter((booking) => category(booking) === item).length}</span></button>)}</div><button className="icon-button" title="Refresh trips" aria-label="Refresh trips" disabled={loading} onClick={() => setReload((value) => value + 1)}><RefreshCw size={15} /></button></div>
      {error && <div className="trip-notice trip-error" role="alert">{error}</div>}
      {loading ? <div className="trip-loading" role="status" aria-label="Loading trips"><div className="skeleton" /><div className="skeleton" /></div> : !error && <>
        {!visible.length && <div className="trip-empty"><Plane size={32} /><h2>{filter === "all" ? "An open itinerary. Endless possibilities." : `No ${filter} trips`}</h2><p>{filter === "all" ? "Your next adventure belongs here." : "Your other bookings are just a tab away."}</p><Link className="trip-button trip-button-secondary" to="/">Find your next flight <ArrowRight size={16} /></Link></div>}
        <div className="trip-list">{visible.map((booking) => {
          const flights = orderedFlights(booking.Flights);
          const first = flights[0];
          const routeCodes = [first?.Path?.fromAirport?.code, ...flights.map((flight) => flight.Path?.toAirport?.code)].filter(Boolean);
          return <article className="trip-item" key={booking.id}>
            <div className="trip-item-top"><span className="trip-reference"><img src="/img/brand-mark.png" alt="" width="22" height="22" /> {reference(booking.id)}</span><span className={`trip-status trip-status-${booking.bookingStatus}`}>{booking.bookingStatus}</span></div>
            <div className="trip-item-body"><h2>{routeCodes.length ? routeCodes.join(" \u2192 ") : "Flight details"}</h2><p className="trip-item-date"><CalendarDays size={15} />{first ? `${tripDate(first.departureTime)} at ${tripTime(first.departureTime)}` : "Flight details unavailable"}</p><span className="trip-muted">{flights.length} flight{flights.length === 1 ? "" : "s"} / 1 passenger / {demoPaymentLabel(booking.paymentStatus, booking.bookingStatus)}</span></div>
            <div className="trip-item-bottom"><div><small>EXAMPLE FARE</small><strong>{money(booking.price)}</strong></div><Link className="trip-button trip-button-secondary" to={`/bookings/${booking.id}`}>{booking.bookingStatus === "pending" && category(booking) === "upcoming" ? "Complete booking" : "View itinerary"} <ArrowRight size={15} /></Link></div>
          </article>;
        })}</div>
      </>}
      <div className="trip-account"><span className="trip-muted">{user?.firstName} {user?.lastName} / {user?.email}</span><button className="trip-text-link" onClick={logout}><LogOut size={14} /> Sign out</button></div>
    </main>
  );
}
