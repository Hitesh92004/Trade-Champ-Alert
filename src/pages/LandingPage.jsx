import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="landing">
      <section className="landing__hero">
        <p className="landing__eyebrow">Trade Champ Alert</p>
        <h1 className="landing__title">Catch market moves before they happen.</h1>
        <p className="landing__subtitle">
          Build custom price alerts, track your favorite assets, and get instant
          notifications from a clean dashboard built for active traders.
        </p>
        <div className="landing__cta-row">
          <Link to="/auth?mode=register" className="landing__cta landing__cta--primary">Sign Up</Link>
          <Link to="/auth?mode=login" className="landing__cta">Sign In</Link>
        </div>
      </section>

      <section className="landing__grid">
        <article className="landing__card">
          <h3>All-in-one Alerts</h3>
          <p>Set target price, crossing, and trend alerts in seconds.</p>
        </article>
        <article className="landing__card">
          <h3>Dashboard Access</h3>
          <p>After sign in, open your dashboard and manage alerts in one place.</p>
        </article>
        <article className="landing__card">
          <h3>Market Overview</h3>
          <p>Follow symbols, chart movement, and discover opportunities fast.</p>
        </article>
      </section>
    </div>
  );
}
