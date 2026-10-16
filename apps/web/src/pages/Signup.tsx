import { useState, type FormEvent } from "react";
import { ArrowRight, CircleCheck, Eye, EyeOff } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { safeReturnTo } from "../lib/bookings";
import { apiFetch } from "../lib/api";

export function Signup() {
  const [params] = useSearchParams();
  const loginPath = `/login?returnTo=${encodeURIComponent(safeReturnTo(params.get("returnTo")))}`;
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/auth/register", { method: "POST", json: { firstName, lastName, email, password, role: "passenger" } });
      setDone(true);
    } catch (err: unknown) {
      setError((err as { status?: number })?.status === 409 ? "That email is already registered. You can sign in instead." : "We couldn't create your account. Please check your details and try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <AuthShell>
      {done ? <div className="auth-success" role="status"><CircleCheck size={40} /><p className="eyebrow">YOU'RE ONE OF US</p><h1>Welcome aboard, {firstName}.</h1><p className="auth-intro">Your account is ready. Sign in to continue your journey.</p><Link className="trip-button" to={loginPath}>Continue to sign in <ArrowRight size={17} /></Link></div> : <>
        <p className="eyebrow">YOUR NORTHEASTERN ACCOUNT</p><h1>A good place to start.</h1><p className="auth-intro">Create your account. Your next trip is waiting.</p>
        {error && <div className="trip-notice trip-error" role="alert">{error}</div>}
        <form onSubmit={(event) => void onSubmit(event)} className="auth-form">
          <div className="auth-name-fields"><label htmlFor="firstName">First name<input id="firstName" name="given-name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label><label htmlFor="lastName">Last name<input id="lastName" name="family-name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label></div>
          <label htmlFor="email">Email address<input id="email" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label htmlFor="password">Password<span className="password-field"><input id="password" type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" value={password} minLength={8} onChange={(event) => setPassword(event.target.value)} required /><button className="icon-button" type="button" title={showPassword ? "Hide password" : "Show password"} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span><small>At least 8 characters.</small></label>
          <button type="submit" className="trip-button" disabled={submitting}>{submitting ? <><span className="spinner" /> Creating account</> : <>Create account <ArrowRight size={17} /></>}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to={loginPath}>Sign in</Link></p>
      </>}
    </AuthShell>
  );
}
