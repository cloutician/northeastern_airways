import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { safeReturnTo } from "../lib/bookings";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      navigate(returnTo, { replace: true });
    } catch {
      setError("We couldn't sign you in. Check your email and password. Staff accounts must be approved.");
    } finally { setSubmitting(false); }
  };

  return (
    <AuthShell>
      <p className="eyebrow">YOUR NORTHEASTERN ACCOUNT</p>
      <h1>Good to see you again.</h1>
      <p className="auth-intro">Sign in and pick up where you left off.</p>
      {error && <div className="trip-notice trip-error" role="alert">{error}</div>}
      <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="email">Email address<input id="email" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label htmlFor="password">Password<span className="password-field"><input id="password" type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="icon-button" type="button" title={showPassword ? "Hide password" : "Show password"} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
        <button type="submit" className="trip-button" disabled={submitting}>{submitting ? <><span className="spinner" /> Signing in</> : <>Sign in <ArrowRight size={17} /></>}</button>
      </form>
      <p className="auth-switch">New to Northeastern? <Link to={`/signup?returnTo=${encodeURIComponent(returnTo)}`}>Create an account</Link></p>
    </AuthShell>
  );
}
