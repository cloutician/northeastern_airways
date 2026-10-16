import { useEffect, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Brand } from "./Brand";

export function AuthShell({ children }: { children: ReactNode }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  return (
    <div className="auth-page">
      <header className="auth-header"><div className="shell header-inner"><Brand /><Link className="quiet-link" to="/"><ArrowLeft size={16} /> Back to flights</Link></div></header>
      <main className="auth-main">
        <div className="auth-form-wrap">{children}</div>
        <aside className="auth-photo" aria-label="Newquay, Cornwall">
          <img src="/img/destinations/newquay.jpg" alt="Turquoise Atlantic waves along the cliffs at Newquay" />
          <div><span>Somewhere worth going.</span><p>Newquay, Cornwall <span>NQY</span></p></div>
        </aside>
      </main>
      <footer className="auth-footer">Northeastern Airways <span>United Kingdom / GBP</span></footer>
    </div>
  );
}
