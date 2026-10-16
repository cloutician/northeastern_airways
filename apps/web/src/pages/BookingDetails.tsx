import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Itinerary } from "../components/Itinerary";
import { ArrowLeft, ArrowRight, CircleCheck, Clock3, PlaneTakeoff, ShieldCheck, TriangleAlert } from "lucide-react";
import { BookingSteps } from "../components/BookingSteps";
import { apiFetch } from "../lib/api";
import { bookingError, demoPaymentLabel, money, reference, type TripBooking } from "../lib/bookings";

export function BookingDetails() {
  const { id } = useParams();
  const [booking, setBooking] = useState<TripBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    setBooking(null);
    setLoading(true);
    setError("");
    setMessage("");
    apiFetch<{ booking: TripBooking }>(`/api/bookings/${id}`)
      .then((data) => { if (active) setBooking(data.booking); })
      .catch((err: unknown) => { if (active) setError(bookingError(err)); })
      .finally(() => { if (active) setLoading(false); });
    apiFetch<{ demoPaymentEnabled: boolean }>("/api/payments")
      .then((data) => { if (active) setDemoEnabled(data.demoPaymentEnabled); })
      .catch(() => { if (active) setDemoEnabled(false); });
    return () => { active = false; };
  }, [id]);

  const action = async (type: "cancel" | "confirm-payment") => {
    if (!booking || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/api/bookings/${booking.id}/${type}`, { method: "POST" });
      // Mutation responses omit nested flight details.
      const data = await apiFetch<{ booking: TripBooking }>(`/api/bookings/${booking.id}`);
      setBooking(data.booking);
      setMessage(type === "cancel" ? "Your demo booking has been cancelled." : "Your demo booking is confirmed. No ticket was issued and no money was charged.");
    } catch (err) {
      setError(bookingError(err));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const cancelled = booking?.bookingStatus === "cancelled";
  const started = booking?.Flights.some((f) => Date.parse(f.departureTime) <= Date.now());
  return (
    <main className="travel-page">
      <Link className="trip-back" to="/dashboard"><ArrowLeft size={14} /> My trips</Link>
      {loading && <p role="status">Loading your booking...</p>}
      {error && <div className="trip-notice trip-error" role="alert">{error}</div>}
      {message && <div className="trip-notice trip-success" role="status">{message}</div>}
      {booking && <>
        <BookingSteps current={3} />
        {!cancelled && <div className={`booking-confirmation-icon ${booking.bookingStatus === "pending" ? "is-pending" : ""}`}>{booking.bookingStatus === "confirmed" ? <CircleCheck size={26} /> : <Clock3 size={26} />}</div>}
        <div className="trip-page-heading"><div><p className="trip-eyebrow">DEMO BOOKING {reference(booking.id)}</p><h1>{cancelled ? "Demo booking cancelled" : booking.bookingStatus === "confirmed" ? "Demo booking confirmed" : "Confirm your demo booking"}</h1><p className="trip-muted">No real ticket is issued, no card details are collected, and no money is charged.</p></div><span className={`trip-status trip-status-${booking.bookingStatus}`}>{booking.bookingStatus}</span></div>
        <div className="trip-detail-layout">
          <section aria-label="Booked flights"><h2 className="trip-section-label"><PlaneTakeoff size={18} /> Your itinerary</h2><p className="trip-muted">All times are local to the UK.</p><Itinerary flights={booking.Flights} /></section>
          <aside className="trip-summary" aria-label="Demo booking summary">
            <div className="summary-brand"><img src="/img/brand-mark.png" width="25" height="25" alt="" /> Northeastern Airways</div>
            <h2>Booking summary</h2>
            <dl className="trip-fare"><div><dt>Passenger</dt><dd>1</dd></div><div><dt>Demo status</dt><dd>{demoPaymentLabel(booking.paymentStatus, booking.bookingStatus)}</dd></div><div className="trip-total"><dt>Example fare</dt><dd>{money(booking.price)}</dd></div></dl>
            {!cancelled && !started && booking.bookingStatus === "pending" && <>
              <p className="trip-muted">{demoEnabled ? "Confirm this demonstration booking without entering any payment information." : "Demo confirmation is temporarily unavailable."}</p>
              <button className="trip-button" disabled={busy || !demoEnabled} onClick={() => void action("confirm-payment")}>{busy ? <><span className="spinner" /> Updating</> : <>Confirm demo booking <ArrowRight size={15} /></>}</button>
            </>}
            {!cancelled && !started && <button className="trip-button trip-button-secondary" disabled={busy} onClick={() => dialogRef.current?.showModal()}>Cancel trip</button>}
            {started && !cancelled && <p className="trip-muted">This trip has started. Online changes are closed.</p>}
            <Link className="trip-text-link" to="/dashboard">Back to my trips</Link>
            <p className="summary-note"><ShieldCheck size={15} /> Your booking reference is {reference(booking.id)}.</p>
          </aside>
        </div>
        <dialog className="trip-dialog" ref={dialogRef} aria-labelledby="cancel-title">
          <TriangleAlert size={26} />
          <h2 id="cancel-title">Cancel {reference(booking.id)}?</h2>
          <p>All flights in this booking will be cancelled. This cannot be undone.</p>
          {booking.paymentStatus === "paid" && <p>Only the demonstration record changes. No money was charged and no real refund is made.</p>}
          <div className="trip-actions"><button className="trip-button trip-button-secondary" autoFocus onClick={() => dialogRef.current?.close()}>Keep trip</button><button className="trip-button" onClick={() => { dialogRef.current?.close(); void action("cancel"); }}>Cancel booking</button></div>
        </dialog>
      </>}
    </main>
  );
}
