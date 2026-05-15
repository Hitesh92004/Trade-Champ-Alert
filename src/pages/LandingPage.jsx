import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

/* ── Animated counter hook ────────────────────────────────────────── */
function useCountUp(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, startOnView]);

  return [count, ref];
}

/* ── Ticker data (simulated live) ─────────────────────────────────── */
const TICKER_DATA = [
  { symbol: "AAPL", price: "189.84", change: "+1.25%", up: true },
  { symbol: "GOOGL", price: "141.80", change: "+0.68%", up: true },
  { symbol: "TSLA", price: "248.42", change: "-0.92%", up: false },
  { symbol: "NVDA", price: "875.28", change: "+2.14%", up: true },
  { symbol: "MSFT", price: "420.55", change: "+0.34%", up: true },
  { symbol: "AMZN", price: "185.07", change: "-0.18%", up: false },
  { symbol: "META", price: "505.75", change: "+1.87%", up: true },
  { symbol: "BTC-USD", price: "67,842", change: "+3.42%", up: true },
  { symbol: "ETH-USD", price: "3,521", change: "+2.05%", up: true },
  { symbol: "NFLX", price: "628.34", change: "+0.91%", up: true },
];

/* ── Feature data ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "⚡",
    title: "Instant Price Alerts",
    desc: "Set target prices and get notified the moment your conditions are met. Never miss a breakout or dip again.",
    accent: "var(--accent)",
  },
  {
    icon: "📊",
    title: "Interactive Charts",
    desc: "Professional-grade charts powered by TradingView. Double-click to set alerts directly on the chart.",
    accent: "var(--green)",
  },
  {
    icon: "🔔",
    title: "Push Notifications",
    desc: "Real-time browser push notifications ensure you're always informed, even when you're away from the dashboard.",
    accent: "var(--yellow)",
  },
  {
    icon: "🎯",
    title: "Smart Dashboard",
    desc: "Track active, triggered, and expired alerts with full analytics. See your hit rate, history, and triggered log.",
    accent: "#7c4dff",
  },
  {
    icon: "🔍",
    title: "Symbol Search",
    desc: "Search any stock, crypto, or asset with instant autocomplete powered by Yahoo Finance API.",
    accent: "var(--red)",
  },
  {
    icon: "🛡️",
    title: "Secure & Private",
    desc: "JWT-authenticated sessions with encrypted credentials. Your data stays yours — no selling, no tracking.",
    accent: "var(--accent)",
  },
];

/* ── Steps data ───────────────────────────────────────────────────── */
const STEPS = [
  {
    num: "01",
    title: "Create your account",
    desc: "Sign up in seconds. No credit card, no hidden fees — completely free.",
  },
  {
    num: "02",
    title: "Search & chart assets",
    desc: "Find any stock, crypto, or index. Open interactive charts and analyze market trends.",
  },
  {
    num: "03",
    title: "Set your price alerts",
    desc: "Double-click on the chart or use the form — set above/below conditions on any asset.",
  },
  {
    num: "04",
    title: "Get notified instantly",
    desc: "Receive push notifications and dashboard alerts the moment your target price is hit.",
  },
];

/* ── Testimonials ─────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "Arjun Mehta",
    role: "Swing Trader",
    text: "Finally a clean, no-BS alert tool. I set my levels and forget — it pings me when it matters. Saves me hours of screen time.",
    initials: "AM",
  },
  {
    name: "Priya Sharma",
    role: "Crypto Investor",
    text: "The interactive chart + one-click alerts is genius. I've caught 3 major BTC dips this month thanks to this platform.",
    initials: "PS",
  },
  {
    name: "Rahul Verma",
    role: "Day Trader",
    text: "Dashboard analytics are surprisingly deep for a free tool. The hit-rate tracking keeps me honest about my alert strategy.",
    initials: "RV",
  },
];

/* ══════════════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [stat1, stat1Ref] = useCountUp(12500, 2200);
  const [stat2, stat2Ref] = useCountUp(98, 1800);
  const [stat3, stat3Ref] = useCountUp(4700, 2000);

  /* parallax mouse effect for hero */
  const heroRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 20,
      });
    };
    const el = heroRef.current;
    if (el) el.addEventListener("mousemove", handler);
    return () => el?.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="lp">
      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="lp-hero" ref={heroRef}>
        {/* Animated background orbs */}
        <div className="lp-hero__orb lp-hero__orb--1" style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }} />
        <div className="lp-hero__orb lp-hero__orb--2" style={{ transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)` }} />
        <div className="lp-hero__orb lp-hero__orb--3" style={{ transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)` }} />

        {/* Grid overlay */}
        <div className="lp-hero__grid" />

        <div className="lp-hero__content">
          <div className="lp-hero__badge">
            <span className="lp-hero__badge-dot" />
            Trade Champ Alert — Free & Open Source
          </div>

          <h1 className="lp-hero__title">
            Catch market moves<br />
            <span className="lp-hero__title-accent">before they happen.</span>
          </h1>

          <p className="lp-hero__subtitle">
            Build custom price alerts, track your favorite assets with interactive charts,
            and receive instant push notifications — all from a clean dashboard
            designed for active traders.
          </p>

          <div className="lp-hero__cta-row">
            <Link to="/auth?mode=register" className="lp-btn lp-btn--primary" id="hero-signup-btn">
              <span>Get Started Free</span>
              <span className="lp-btn__arrow">→</span>
            </Link>
            <Link to="/auth?mode=login" className="lp-btn lp-btn--outline" id="hero-signin-btn">
              Sign In
            </Link>
          </div>

          <p className="lp-hero__hint">No credit card required · Setup in 30 seconds</p>
        </div>

        {/* Hero visual — floating mock dashboard */}
        <div className="lp-hero__visual">
          <div className="lp-hero__mockup">
            <div className="lp-hero__mockup-bar">
              <span className="lp-hero__mockup-dots">
                <i /><i /><i />
              </span>
              <span className="lp-hero__mockup-url">tradechampalert.com/dashboard</span>
            </div>
            <div className="lp-hero__mockup-body">
              <div className="lp-hero__mock-row">
                <div className="lp-hero__mock-card">
                  <span className="lp-hero__mock-label">Active Alerts</span>
                  <span className="lp-hero__mock-value" style={{ color: "var(--green)" }}>12</span>
                </div>
                <div className="lp-hero__mock-card">
                  <span className="lp-hero__mock-label">Triggered Today</span>
                  <span className="lp-hero__mock-value" style={{ color: "var(--accent)" }}>3</span>
                </div>
                <div className="lp-hero__mock-card">
                  <span className="lp-hero__mock-label">Hit Rate</span>
                  <span className="lp-hero__mock-value" style={{ color: "var(--yellow)" }}>87.5%</span>
                </div>
              </div>
              <div className="lp-hero__mock-chart">
                <svg viewBox="0 0 400 120" className="lp-hero__mock-svg">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 Q40,60 80,70 T160,40 T240,55 T320,25 T400,35"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    className="lp-hero__chart-line"
                  />
                  <path
                    d="M0,80 Q40,60 80,70 T160,40 T240,55 T320,25 T400,35 V120 H0 Z"
                    fill="url(#chartGrad)"
                    className="lp-hero__chart-fill"
                  />
                  {/* Alert line */}
                  <line x1="0" y1="45" x2="400" y2="45" stroke="var(--yellow)" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />
                  <text x="360" y="42" fill="var(--yellow)" fontSize="8" fontFamily="monospace">$189.50</text>
                </svg>
              </div>
              <div className="lp-hero__mock-feed">
                <div className="lp-hero__mock-feed-item">
                  <span style={{ color: "var(--accent)" }}>◆</span>
                  <span style={{ fontWeight: 700 }}>AAPL</span>
                  <span style={{ color: "var(--text-muted)", flex: 1 }}>crossed above $189.50</span>
                  <span style={{ color: "var(--text-dim)" }}>2m ago</span>
                </div>
                <div className="lp-hero__mock-feed-item">
                  <span style={{ color: "var(--green)" }}>◆</span>
                  <span style={{ fontWeight: 700 }}>BTC</span>
                  <span style={{ color: "var(--text-muted)", flex: 1 }}>hit target $68,000</span>
                  <span style={{ color: "var(--text-dim)" }}>15m ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER STRIP ──────────────────────────────────────── */}
      <div className="lp-ticker">
        <div className="lp-ticker__track">
          {[...TICKER_DATA, ...TICKER_DATA].map((t, i) => (
            <div className="lp-ticker__item" key={i}>
              <span className="lp-ticker__symbol">{t.symbol}</span>
              <span className="lp-ticker__price">${t.price}</span>
              <span className={`lp-ticker__change ${t.up ? "lp-ticker__change--up" : "lp-ticker__change--down"}`}>
                {t.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="lp-section" id="features">
        <div className="lp-section__container">
          <div className="lp-section__header">
            <span className="lp-section__eyebrow">Features</span>
            <h2 className="lp-section__title">Everything you need to trade smarter</h2>
            <p className="lp-section__subtitle">
              Professional-grade tools, zero complexity. Built for traders who value speed and clarity.
            </p>
          </div>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <article className="lp-feature-card" key={i} style={{ "--card-accent": f.accent }}>
                <div className="lp-feature-card__icon">{f.icon}</div>
                <h3 className="lp-feature-card__title">{f.title}</h3>
                <p className="lp-feature-card__desc">{f.desc}</p>
                <div className="lp-feature-card__glow" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="lp-section lp-section--dark" id="how-it-works">
        <div className="lp-section__container">
          <div className="lp-section__header">
            <span className="lp-section__eyebrow">How It Works</span>
            <h2 className="lp-section__title">From signup to alert in under a minute</h2>
          </div>

          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div className="lp-step" key={i}>
                <div className="lp-step__num">{s.num}</div>
                <div className="lp-step__content">
                  <h3 className="lp-step__title">{s.title}</h3>
                  <p className="lp-step__desc">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && <div className="lp-step__connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="lp-section" id="stats">
        <div className="lp-section__container">
          <div className="lp-stats">
            <div className="lp-stat" ref={stat1Ref}>
              <span className="lp-stat__value">{stat1.toLocaleString()}+</span>
              <span className="lp-stat__label">Alerts Created</span>
            </div>
            <div className="lp-stat" ref={stat2Ref}>
              <span className="lp-stat__value">{stat2}%</span>
              <span className="lp-stat__label">Uptime Reliability</span>
            </div>
            <div className="lp-stat" ref={stat3Ref}>
              <span className="lp-stat__value">{stat3.toLocaleString()}+</span>
              <span className="lp-stat__label">Active Traders</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section className="lp-section lp-section--dark" id="testimonials">
        <div className="lp-section__container">
          <div className="lp-section__header">
            <span className="lp-section__eyebrow">Testimonials</span>
            <h2 className="lp-section__title">Loved by traders worldwide</h2>
          </div>

          <div className="lp-testimonials">
            {TESTIMONIALS.map((t, i) => (
              <div className="lp-testimonial" key={i}>
                <p className="lp-testimonial__text">"{t.text}"</p>
                <div className="lp-testimonial__author">
                  <div className="lp-testimonial__avatar">{t.initials}</div>
                  <div>
                    <div className="lp-testimonial__name">{t.name}</div>
                    <div className="lp-testimonial__role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="lp-cta-section">
        <div className="lp-cta-section__orb lp-cta-section__orb--1" />
        <div className="lp-cta-section__orb lp-cta-section__orb--2" />
        <div className="lp-section__container" style={{ position: "relative", zIndex: 2 }}>
          <h2 className="lp-cta-section__title">
            Ready to catch the next big move?
          </h2>
          <p className="lp-cta-section__subtitle">
            Join thousands of traders using Trade Champ Alert to stay ahead of the market.
          </p>
          <Link to="/auth?mode=register" className="lp-btn lp-btn--primary lp-btn--lg" id="cta-signup-btn">
            <span>Start Trading Smarter</span>
            <span className="lp-btn__arrow">→</span>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <span className="lp-footer__logo">◆</span>
            <span className="lp-footer__name">Trade Champ Alert</span>
          </div>
          <div className="lp-footer__links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#testimonials">Reviews</a>
            <Link to="/auth?mode=login">Sign In</Link>
          </div>
          <p className="lp-footer__copy">
            © {new Date().getFullYear()} Trade Champ Alert. Built with passion for traders.
          </p>
        </div>
      </footer>
    </div>
  );
}
