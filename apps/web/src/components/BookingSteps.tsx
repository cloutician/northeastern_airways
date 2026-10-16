import { Check } from "lucide-react";

export function BookingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="booking-steps" aria-label="Booking progress">
      {["Choose flights", "Review trip", "Confirmation"].map((label, index) => (
        <li key={label} className={index + 1 < current ? "is-complete" : index + 1 === current ? "is-current" : ""} aria-current={index + 1 === current ? "step" : undefined}>
          <span className="step-number">{index + 1 < current ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}
