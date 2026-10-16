import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Globe2, Menu, UserRound, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Brand } from "./Brand";

export function Layout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    if (location.hash) {
      requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.key, location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="app-header">
        <div className="shell header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link to="/#search" className={location.pathname === "/" && (!location.hash || location.hash === "#search") ? "active" : ""}>Book a flight</Link>
            <NavLink to="/dashboard">My trips</NavLink>
            <Link to="/#destinations" className={location.hash === "#destinations" ? "active" : ""}>Destinations</Link>
            <Link to="/#flight-status" className={location.hash === "#flight-status" ? "active" : ""}>Flight status</Link>
          </nav>
          <div className="header-account">
            {!loading && <Link className="account-link" to={user ? "/dashboard" : "/login"}><UserRound size={18} /><span>{user?.firstName ?? "Sign in"}</span><ArrowUpRight size={14} /></Link>}
            <button className="icon-button mobile-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)} title={menuOpen ? "Close navigation" : "Open navigation"}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>
        {menuOpen && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation" onClick={() => setMenuOpen(false)}>
          <Link to="/#search">Book a flight</Link><Link to="/dashboard">My trips</Link><Link to="/#destinations">Destinations</Link><Link to="/#flight-status">Flight status</Link>
          <Link to={user ? "/dashboard" : "/login"}>{user ? "Your account" : "Sign in"}<ArrowRight size={16} /></Link>
        </nav>}
      </header>
      <div id="main-content" className="app-content">{children}</div>
      <footer className="site-footer">
        <div className="shell footer-main"><div><Brand /><p>A little closer to everywhere.</p></div><nav aria-label="Footer navigation"><Link to="/">Find a flight <ArrowUpRight size={14} /></Link><Link to="/dashboard">Manage your trip <ArrowUpRight size={14} /></Link><Link to="/#flight-status">Flight status <ArrowUpRight size={14} /></Link></nav></div>
        <div className="shell footer-bottom"><span>&copy; {new Date().getFullYear()} Northeastern Airways</span><span><Globe2 size={14} /> United Kingdom <span className="footer-divider">/</span> GBP</span></div>
      </footer>
    </div>
  );
}
