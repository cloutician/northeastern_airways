import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Northeastern Airways home">
      <img src="/img/brand-mark.png" alt="" width="42" height="42" />
      <span>Northeastern<span>Airways</span></span>
    </Link>
  );
}
