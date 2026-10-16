import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDownUp, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleCheck, Clock3, MapPin, Plane, PlaneLanding, PlaneTakeoff, Radio, Search, SlidersHorizontal, UsersRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { BookingSteps } from "../components/BookingSteps";
import { API_URL, apiFetch } from "../lib/api";
import { money, tripDate, tripTime, type TripFlight } from "../lib/bookings";

type Airport = { id: number; code: string; name: string; city?: string | null };
const FlightMap = lazy(() => import("../components/FlightMap").then((module) => ({ default: module.FlightMap })));
type RouteLeg = { fromId: number; toId: number; flight: TripFlight | null };
type RouteResult = { flights: RouteLeg[]; totalDistance: number; durationMs: number | null; routeCost: number };
type SearchSuccess = { outboundRoutes: RouteResult[]; returnRoutes: RouteResult[]; airports: Record<string, string> };
type ScheduleRow = {
  id: string; status: string; scheduledDeparture: string; scheduledArrival: string;
  Flight?: { flightNumber?: string; Path?: { fromAirport?: { code?: string }; toAirport?: { code?: string } } };
};
const destinations = [
  { code: "EDI", city: "Edinburgh", region: "Scotland", image: "edinburgh", description: "Old streets. New perspectives.", alt: "Edinburgh's clock tower and historic rooftops" },
  { code: "NQY", city: "Newquay", region: "Cornwall", image: "newquay", description: "A breath of Atlantic air.", alt: "Waves rolling into the beaches of Newquay" },
  { code: "BFS", city: "Belfast", region: "Northern Ireland", image: "belfast", description: "A city with a story to tell.", alt: "Belfast City Hall and its green copper dome" },
];
const durationLabel = (ms: number | null) => ms == null ? "" : `${Math.floor(ms / 3600000)}h ${Math.floor(ms % 3600000 / 60000)}m`;
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function FlightLegRow({ leg, airports }: { leg: RouteLeg; airports: Airport[] }) {
  const from = airports.find((airport) => airport.id === leg.fromId);
  const to = airports.find((airport) => airport.id === leg.toId);
  const flight = leg.flight;
  if (!flight) return null;
  return (
    <div className="result-leg">
      <div className="result-airport"><strong>{tripTime(flight.departureTime)}</strong><span>{from?.code}</span><small>{from?.city || from?.name}</small></div>
      <div className="result-flight-path"><span>{flight.flightNumber}</span><div><i /><Plane size={17} /><i /></div><span>{durationLabel(Date.parse(flight.arrivalTime) - Date.parse(flight.departureTime))}</span></div>
      <div className="result-airport result-arrival"><strong>{tripTime(flight.arrivalTime)}</strong><span>{to?.code}</span><small>{to?.city || to?.name}</small></div>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airportReload, setAirportReload] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [tripType, setTripType] = useState<"return" | "oneway">("return");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [todayMin] = useState(localDate);
  const [departureDate, setDepartureDate] = useState(localDate);
  const [returnDate, setReturnDate] = useState(localDate);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResult, setSearchResult] = useState<SearchSuccess | null>(null);
  const [resultsTab, setResultsTab] = useState<"outbound" | "return">("outbound");
  const [schedules, setSchedules] = useState<Record<string, ScheduleRow>>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [boardError, setBoardError] = useState(false);
  const [connected, setConnected] = useState(false);
  const [needsReturn, setNeedsReturn] = useState(false);
  const [selectedOutbound, setSelectedOutbound] = useState<number | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [directOnly, setDirectOnly] = useState(false);
  const [sortBy, setSortBy] = useState("price");
  const [searchSummary, setSearchSummary] = useState("");
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => { setSelectedOutbound(null); setSelectedReturn(null); }, [maxPrice, maxDuration, preferredTime, directOnly]);

  useEffect(() => {
    let active = true;
    setLoadError("");
    apiFetch<Airport[]>("/api/airports")
      .then((rows) => { if (active) setAirports(rows.sort((a, b) => a.code.localeCompare(b.code))); })
      .catch(() => { if (active) setLoadError("We couldn't load the airports. Please try again."); });
    return () => { active = false; };
  }, [airportReload]);

  useEffect(() => {
    let active = true;
    let timeout: number | undefined;
    apiFetch<ScheduleRow[]>("/api/flight-schedules")
      .then((rows) => { if (active) setSchedules(Object.fromEntries(rows.map((row) => [String(row.id), row]))); })
      .catch(() => { if (active) setBoardError(true); });
    const socket = io(API_URL, { transports: ["websocket"] });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("flightStatusUpdate", (schedule: ScheduleRow) => {
      if (!schedule || typeof schedule !== "object" || !schedule.id) return;
      setSchedules((previous) => ({ ...previous, [String(schedule.id)]: schedule }));
      setStatusMessage(`${schedule.Flight?.flightNumber ?? "Flight"} is now ${schedule.status}`);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setStatusMessage(""), 5000);
    });
    return () => { active = false; window.clearTimeout(timeout); socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (searchResult || searchError) resultsRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }, [searchResult, searchError]);

  const scheduleList = useMemo(() => Object.values(schedules).sort((a, b) => Date.parse(a.scheduledDeparture) - Date.parse(b.scheduledDeparture)), [schedules]);
  const visibleSchedules = scheduleList.filter((schedule) => `${schedule.Flight?.flightNumber ?? ""} ${schedule.Flight?.Path?.fromAirport?.code ?? ""} ${schedule.Flight?.Path?.toAirport?.code ?? ""}`.toLowerCase().includes(statusFilter.toLowerCase())).slice(0, 8);

  const onSubmitSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (searching) return;
    setSearchError(""); setSearchResult(null); setSelectedOutbound(null); setSelectedReturn(null); setSearching(true);
    try {
      const data = await apiFetch<SearchSuccess>("/api/flights/search", {
        method: "POST", json: { fromAirportId: Number(fromId), toAirportId: Number(toId), departureDate, returnDate: tripType === "return" ? returnDate : null, passengerInfo: "1-economy" },
      });
      const from = airports.find((airport) => String(airport.id) === fromId);
      const to = airports.find((airport) => String(airport.id) === toId);
      setSearchSummary(`${from?.city || from?.code} to ${to?.city || to?.code} / ${tripDate(departureDate + "T12:00:00Z")}`);
      setSearchResult(data); setNeedsReturn(tripType === "return"); setResultsTab("outbound");
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      setSearchError(status === 404 ? "There isn't a route between these airports. Try a different destination." : "We couldn't search for flights. Please check your dates and try again.");
    } finally { setSearching(false); }
  };

  const isBookable = (route: RouteResult) => route.flights.length > 0 && route.flights.length <= 8 && route.flights.every((leg) => leg.flight && Date.parse(leg.flight.departureTime) > Date.now());
  const outbound = selectedOutbound == null ? null : searchResult?.outboundRoutes[selectedOutbound];
  const inbound = selectedReturn == null ? null : searchResult?.returnRoutes[selectedReturn];
  const canConnect = (out: RouteResult, back: RouteResult) => {
    const last = out.flights[out.flights.length - 1];
    const first = back.flights[0];
    return out.flights.length + back.flights.length <= 8 && last && first && last.toId === first.fromId && Date.parse(String(first.flight?.departureTime)) >= Date.parse(String(last.flight?.arrivalTime)) + 3600000;
  };
  const directionRoutes = (resultsTab === "outbound" ? searchResult?.outboundRoutes : searchResult?.returnRoutes) ?? [];
  const routesToShow = directionRoutes.map((route, index) => ({ route, index })).filter(({ route }) => {
    if (!isBookable(route) || (resultsTab === "return" && outbound && !canConnect(outbound, route))) return false;
    if (maxPrice && route.routeCost > Number(maxPrice)) return false;
    if (maxDuration && (route.durationMs == null || route.durationMs > Number(maxDuration) * 3600000)) return false;
    if (directOnly && route.flights.length !== 1) return false;
    if (preferredTime) {
      const hour = Number(tripTime(String(route.flights[0]?.flight?.departureTime)).split(":")[0]);
      if (preferredTime === "morning" && (hour < 6 || hour >= 12)) return false;
      if (preferredTime === "afternoon" && (hour < 12 || hour >= 18)) return false;
      if (preferredTime === "evening" && hour < 18) return false;
    }
    return true;
  }).sort((a, b) => sortBy === "duration" ? (a.route.durationMs ?? Infinity) - (b.route.durationMs ?? Infinity) : a.route.routeCost - b.route.routeCost);
  const selectedTotal = (outbound?.routeCost ?? 0) + (inbound?.routeCost ?? 0);
  const selectionReady = outbound && isBookable(outbound) && (!needsReturn || (inbound && isBookable(inbound) && canConnect(outbound, inbound)));
  const activeFilters = Number(Boolean(maxPrice)) + Number(Boolean(maxDuration)) + Number(Boolean(preferredTime)) + Number(directOnly);
  const clearFilters = () => { setMaxPrice(""); setMaxDuration(""); setPreferredTime(""); setDirectOnly(false); };
  const continueBooking = () => {
    if (!selectionReady || !outbound) return;
    const params = new URLSearchParams();
    for (const leg of [...outbound.flights, ...(needsReturn && inbound ? inbound.flights : [])]) params.append("flight", leg.flight!.id);
    navigate(`/checkout?${params.toString()}`);
  };
  const chooseDestination = (code: string) => {
    const destination = airports.find((airport) => airport.code === code);
    if (destination) { setToId(String(destination.id)); if (fromId === String(destination.id)) setFromId(""); }
    document.getElementById("search")?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById(destination && fromId && fromId !== String(destination.id) ? "departure-date" : "from-airport")?.focus({ preventScroll: true });
  };

  return (
    <main className="home-page">
      <section className="hero" aria-labelledby="hero-heading">
        <img className="hero-image" src="/img/aircraft-hero.jpg" alt="An aircraft on the runway under an evening sky" fetchPriority="high" />
        <div className="shell hero-inner">
          <div className="hero-copy"><p className="hero-kicker"><span /> YOUR NEXT CHAPTER, A LITTLE CLOSER</p><h1 id="hero-heading">Northeastern<br />Airways<span>.</span></h1><p>Familiar places. Fresh perspectives.<br />Find your next journey across the UK.</p></div>
          <span className="hero-caption"><PlaneTakeoff size={17} /> A little closer to everywhere.</span>
        </div>
      </section>

      <section className="search-section" id="search" aria-label="Find flights">
        <div className="shell">
          <form className="flight-search" onSubmit={(event) => void onSubmitSearch(event)}>
            <div className="search-topline">
              <fieldset className="trip-type-options"><legend className="sr-only">Journey type</legend>{(["return", "oneway"] as const).map((type) => <label key={type}><input type="radio" name="tripType" checked={tripType === type} onChange={() => setTripType(type)} /><span>{type === "return" ? "Return" : "One way"}</span></label>)}</fieldset>
              <span className="passenger-summary"><UsersRound size={15} /> 1 passenger <span>/</span> Standard fare</span>
            </div>
            {loadError && <div className="trip-notice trip-error" role="alert">{loadError} <button type="button" className="trip-text-link" onClick={() => setAirportReload((value) => value + 1)}>Retry</button></div>}
            <div className="search-fields">
              <div className="airport-fields">
                <label className="search-field"><span><PlaneTakeoff size={15} /> From</span><select id="from-airport" aria-label="Departure airport" value={fromId} onChange={(event) => { setFromId(event.target.value); if (toId === event.target.value) setToId(""); }} required><option value="">Where from?</option>{airports.map((airport) => <option key={airport.id} value={airport.id}>{airport.city || airport.name} ({airport.code})</option>)}</select></label>
                <button type="button" className="icon-button swap-airports" title="Swap airports" aria-label="Swap airports" disabled={!fromId && !toId} onClick={() => { setFromId(toId); setToId(fromId); }}><ArrowDownUp size={16} /></button>
                <label className="search-field"><span><PlaneLanding size={15} /> To</span><select aria-label="Destination airport" value={toId} onChange={(event) => setToId(event.target.value)} required><option value="">Where to?</option>{airports.map((airport) => <option key={airport.id} value={airport.id} disabled={String(airport.id) === fromId}>{airport.city || airport.name} ({airport.code})</option>)}</select></label>
              </div>
              <div className="date-fields">
                <label className="search-field"><span>Departure</span><input id="departure-date" type="date" aria-label="Departure date" value={departureDate} min={todayMin} onChange={(event) => { setDepartureDate(event.target.value); if (returnDate < event.target.value) setReturnDate(event.target.value); }} required /></label>
                <label className={`search-field ${tripType === "oneway" ? "is-disabled" : ""}`}><span>Return</span><input type="date" aria-label="Return date" value={returnDate} min={departureDate} disabled={tripType === "oneway"} onChange={(event) => setReturnDate(event.target.value)} required={tripType === "return"} /></label>
              </div>
              <button className="trip-button search-submit" disabled={searching || !airports.length} type="submit">{searching ? <><span className="spinner" /> Searching</> : <>Search flights <ArrowRight size={18} /></>}</button>
            </div>
            <div className="search-bottomline"><span><CircleCheck size={14} /> All flight times shown in UK local time</span><button className="filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="advanced-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={15} /> Filters{activeFilters > 0 && <b>{activeFilters}</b>}<ChevronDown size={14} className={filtersOpen ? "rotated" : ""} /></button></div>
            {filtersOpen && <div className="filter-panel" id="advanced-filters">
              <label>Max price per direction<input type="number" aria-label="Maximum price in pounds" min={0} step={1} placeholder="Any price (GBP)" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label>
              <label>Departure time<select value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)}><option value="">Any time</option><option value="morning">Morning, 06:00 - 12:00</option><option value="afternoon">Afternoon, 12:00 - 18:00</option><option value="evening">Evening, 18:00 - 00:00</option></select></label>
              <label>Max duration<input type="number" min={0.5} max={48} step={0.5} placeholder="Any duration (hours)" value={maxDuration} onChange={(event) => setMaxDuration(event.target.value)} /></label>
              <div className="filter-options"><label><input type="checkbox" checked={directOnly} onChange={(event) => setDirectOnly(event.target.checked)} /> Direct flights only</label><button className="trip-text-link" type="button" onClick={clearFilters}>Clear filters</button></div>
            </div>}
          </form>
        </div>
      </section>

      {(searchResult || searchError) && <section className="results-section shell" ref={resultsRef} aria-labelledby="results-heading">
        {searchError ? <div className="trip-notice trip-error" role="alert">{searchError}</div> : searchResult && <>
          <BookingSteps current={1} />
          <div className="section-heading"><div><p className="eyebrow">MAKE IT YOUR JOURNEY</p><h2 id="results-heading">Choose your flights</h2><p>{searchSummary}</p></div><label className="result-sort">Sort by<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="price">Lowest price</option><option value="duration">Shortest duration</option></select></label></div>
          <div className="trip-results-toolbar"><div className="trip-tabs" aria-label="Flight direction"><button aria-pressed={resultsTab === "outbound"} onClick={() => setResultsTab("outbound")}>Outbound {outbound && <Check size={14} />}</button>{needsReturn && <button aria-pressed={resultsTab === "return"} onClick={() => setResultsTab("return")}>Return {inbound && <Check size={14} />}</button>}</div><span className="trip-muted">{routesToShow.length} flight option{routesToShow.length === 1 ? "" : "s"}</span></div>
          {!routesToShow.length && <div className="trip-empty"><Search size={30} /><h3>No flights match this search</h3><p>Try another date or adjust your filters.</p>{activeFilters > 0 && <button className="trip-button trip-button-secondary" onClick={clearFilters}>Clear filters</button>}</div>}
          <div className="route-results">{routesToShow.map(({ route, index }) => {
            const selected = (resultsTab === "outbound" ? selectedOutbound : selectedReturn) === index;
            return <article className={`route-ticket ${selected ? "is-selected" : ""}`} key={`${resultsTab}-${index}`}>
              <div className="route-ticket-main"><div className="route-airline"><img src="/img/brand-mark.png" width="24" height="24" alt="" /><span>Northeastern Airways</span><span>{route.flights.length === 1 ? "Direct" : `${route.flights.length - 1} connection(s)`}</span></div>{route.flights.map((leg, legIndex) => <FlightLegRow key={legIndex} leg={leg} airports={airports} />)}</div>
              <div className="route-ticket-aside"><span className="trip-muted">{durationLabel(route.durationMs)} total</span><strong>{money(route.routeCost)}</strong><span className="trip-muted">per passenger</span><label className="route-select"><input type="radio" name={`select-${resultsTab}`} checked={selected} aria-label={`Select ${resultsTab} option ${index + 1}`} onChange={() => { if (resultsTab === "outbound") { setSelectedOutbound(index); setSelectedReturn(null); if (needsReturn) setResultsTab("return"); } else setSelectedReturn(index); }} /><span>{selected ? "Selected" : "Select flight"}</span></label></div>
            </article>;
          })}</div>
          <div className="trip-selection-bar"><div><span className="eyebrow">YOUR TRIP TOTAL</span><strong>{money(selectedTotal)}</strong><span className="trip-muted">{!outbound ? "Choose an outbound flight" : needsReturn && !inbound ? "Choose a return flight" : "1 passenger / Standard fare"}</span></div><button className="trip-button" disabled={!selectionReady} onClick={continueBooking}>Review booking <ArrowRight size={17} /></button></div>
        </>}
      </section>}

      <section className="destinations-section shell" id="destinations" aria-labelledby="destinations-heading">
        <div className="section-heading"><div><p className="eyebrow">A CHANGE OF SCENERY</p><h2 id="destinations-heading">Closer than you think.</h2></div><p>City streets, coastal air, a new favourite place.<br />There's more to explore, a little closer to home.</p></div>
        <div className="destination-grid">{destinations.map((destination) => <button className="destination-card" key={destination.code} onClick={() => chooseDestination(destination.code)} disabled={!airports.some((airport) => airport.code === destination.code)} aria-label={`Find flights to ${destination.city}`}>
          <div className="destination-image"><img src={`/img/destinations/${destination.image}.jpg`} alt={destination.alt} loading="lazy" width="900" height="650" /><span>{destination.code}</span></div>
          <div className="destination-content"><div><span>{destination.region}</span><h3>{destination.city}</h3><p>{destination.description}</p></div><span className="destination-arrow"><ArrowUpRight size={21} /></span></div>
        </button>)}</div>
      </section>

      <section className="network-section" id="flight-status" aria-labelledby="network-heading"><div className="shell">
        <div className="section-heading"><div><p className="eyebrow">ACROSS THE UK</p><h2 id="network-heading">Every journey, in view.</h2></div><span className={`connection-status ${connected ? "is-connected" : ""}`}><span />{connected ? "Connected to flight updates" : "Connecting to flight updates"}</span></div>
        <div className="network-layout">
          <section className="status-panel" aria-label="Flight status board"><div className="panel-heading"><h3><PlaneTakeoff size={18} /> Flight status</h3><span>{scheduleList.length} scheduled</span></div><label className="status-search"><Search size={16} /><input type="search" aria-label="Find a flight by number or airport" placeholder="Flight number or airport" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} /></label>
            {visibleSchedules.length ? <div className="status-table-scroll"><table className="status-table"><thead><tr><th>Flight / Route</th><th>Departure</th><th>Status</th></tr></thead><tbody>{visibleSchedules.map((schedule) => <tr key={schedule.id}><td><strong>{schedule.Flight?.flightNumber || "-"}</strong><span>{schedule.Flight?.Path?.fromAirport?.code} <ArrowRight size={11} /> {schedule.Flight?.Path?.toAirport?.code}</span></td><td>{tripTime(schedule.scheduledDeparture)}</td><td><span className={`flight-status status-${schedule.status.toLowerCase()}`}>{schedule.status}</span></td></tr>)}</tbody></table></div> : <div className="status-empty"><Clock3 size={26} /><h4>{boardError ? "Flight board unavailable" : statusFilter ? "No matching flights" : "No schedules posted yet"}</h4><p>{boardError ? "Please check back in a moment." : statusFilter ? "Try a different flight number or airport." : "Departure updates will appear here."}</p></div>}
            <div className="status-footnote"><Radio size={13} /> Flight times are shown in UK local time</div>
          </section>
          <section className="network-map-panel" aria-label="UK flight map"><div className="panel-heading"><h3><MapPin size={17} /> Our network</h3><span>{import.meta.env.PROD ? "Scheduled flights" : "Demo replay"}</span></div><Suspense fallback={<div className="map-loading skeleton" role="status" aria-label="Loading flight map" />}><FlightMap apiBaseUrl={API_URL} /></Suspense><div className="map-legend"><span><i /> Airports</span><span><Plane size={13} /> Flights</span><span>{airports.length || "-"} UK airports</span></div></section>
        </div>
      </div></section>
      {statusMessage && <div className="status-toast" role="status"><CircleCheck size={18} /><span>{statusMessage}</span><button className="icon-button" title="Dismiss update" aria-label="Dismiss update" onClick={() => setStatusMessage("")}><X size={15} /></button></div>}
    </main>
  );
}
