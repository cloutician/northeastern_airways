import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Itinerary } from "../components/Itinerary";
import { ArrowLeft, ArrowRight, Clock3, PlaneTakeoff, ShieldCheck, UserRound } from "lucide-react";
import { BookingSteps } from "../components/BookingSteps";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { bookingError, money, type TripBooking, type TripFlight } from "../lib/bookings";

type Quote = { flights: TripFlight[]; price: number };

export function Checkout() {
  const [params] = useSearchParams();
  const flightQuery = params.toString();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setQuote(null);
    setLoading(true);
    setError("");
    const flightIds = new URLSearchParams(flightQuery).getAll("flight");
    if (!flightIds.length || flightIds.length > 8) {
      setError("Your flight selection is empty or invalid. Please search again.");
      setLoading(false);
      return;
    }
    apiFetch<Quote>("/api/bookings/quote", { method: "POST", json: { flightIds } })
      .then((data) => { if (active) setQuote(data); })
      .catch((err: unknown) => { if (active) setError(bookingError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [flightQuery]);

  const reserve = async () => {
    if (!quote || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const data = await apiFetch<{ booking: TripBooking }>("/api/bookings", {
        method: "POST", json: { flightIds: quote.flights.map((flight) => flight.id) },
      });
      navigate(`/bookings/${data.booking.id}`, { replace: true });
    } catch (err) {
      setError(bookingError(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="travel-page">
      <Link className="trip-back" to="/"><ArrowLeft size={14} /> Flight search</Link>
      <BookingSteps current={2} />
      <div className="trip-page-heading"><div><p className="trip-eyebrow">YOUR JOURNEY</p><h1>Review your trip</h1></div><span className="trip-status">1 passenger / Standard fare</span></div>
      {loading && <p role="status">Checking your flights and fare...</p>}
      {error && <div className="trip-notice trip-error" role="alert">{error}</div>}
      {quote && <div className="trip-detail-layout">
        <section aria-label="Selected flights"><h2 className="trip-section-label"><PlaneTakeoff size={18} /> Your flight itinerary</h2><p className="trip-muted"><Clock3 size={12} /> All times are local to the UK.</p><Itinerary flights={quote.flights} /></section>
        <aside className="trip-summary" aria-label="Booking summary">
          <div className="summary-brand"><img src="/img/brand-mark.png" width="25" height="25" alt="" /> Northeastern Airways</div>
          <h2>Your trip summary</h2>
          <div className="summary-passenger"><UserRound size={17} /><div><strong>{user?.firstName} {user?.lastName}</strong><span>{user?.email}</span></div></div>
          <dl className="trip-fare"><div><dt>Flights</dt><dd>{quote.flights.length}</dd></div><div><dt>Passengers</dt><dd>1</dd></div><div className="trip-total"><dt>Example fare</dt><dd>{money(quote.price)}</dd></div></dl>
          <p className="trip-muted">This is a demo reservation. No card details are collected, no money is charged, and no real ticket is issued.</p>
          <button className="trip-button" disabled={saving} onClick={() => void reserve()}>{saving ? <><span className="spinner" /> Reserving</> : <>Reserve trip <ArrowRight size={16} /></>}</button>
          <p className="summary-note"><ShieldCheck size={15} /> Review and confirm your reservation on the next step.</p>
        </aside>
      </div>}
    </main>
  );
}
