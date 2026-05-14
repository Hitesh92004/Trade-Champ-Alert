import { useState, useEffect, useMemo } from "react";
import api from "../lib/api";

export default function DashboardPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get("/alerts");
        setAlerts(res.data);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  // ── Compute status for each alert ──
  const getStatus = (alert) => {
    if (alert.triggered) return "triggered";
    const created = new Date(alert.created_at);
    const now = new Date();
    const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) return "expired";
    return "active";
  };

  const alertsWithStatus = useMemo(
    () => alerts.map((a) => ({ ...a, status: getStatus(a) })),
    [alerts]
  );

  // ── Metrics ──
  const totalAlerts = alerts.length;
  const activeCount = alertsWithStatus.filter((a) => a.status === "active").length;
  const triggeredToday = alertsWithStatus.filter((a) => {
    if (!a.triggered || !a.triggered_at) return false;
    const t = new Date(a.triggered_at);
    const now = new Date();
    return (
      t.getFullYear() === now.getFullYear() &&
      t.getMonth() === now.getMonth() &&
      t.getDate() === now.getDate()
    );
  }).length;
  const triggeredTotal = alertsWithStatus.filter((a) => a.status === "triggered").length;
  const hitRate = totalAlerts > 0 ? ((triggeredTotal / totalAlerts) * 100).toFixed(1) : "0.0";

  // ── Filtered alerts ──
  const filteredAlerts = useMemo(() => {
    if (filter === "all") return alertsWithStatus;
    return alertsWithStatus.filter((a) => a.status === filter);
  }, [alertsWithStatus, filter]);

  // ── Triggered feed (most recent first) ──
  const triggeredFeed = useMemo(
    () =>
      alertsWithStatus
        .filter((a) => a.status === "triggered")
        .sort((a, b) => new Date(b.triggered_at) - new Date(a.triggered_at))
        .slice(0, 20),
    [alertsWithStatus]
  );

  if (loading) {
    return (
      <div className="page">
        <div className="loader">
          <div className="loader__spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Dashboard</h1>
        <p className="page__subtitle">
          Analytics overview · Alert history · Triggered log feed
        </p>
      </div>

      {/* ── Metric Cards ── */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-card__label">Total Alerts</span>
          <span className="metric-card__value">{totalAlerts}</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Active</span>
          <span className="metric-card__value metric-card__value--green">
            {activeCount}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Triggered Today</span>
          <span className="metric-card__value metric-card__value--accent">
            {triggeredToday}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Hit Rate</span>
          <span className="metric-card__value metric-card__value--yellow">
            {hitRate}%
          </span>
        </div>
      </div>

      {/* ── Alert History ── */}
      <div className="section">
        <div className="section__title">Alert History</div>

        {/* Filter tabs */}
        <div className="filter-tabs">
          {["all", "active", "triggered", "expired"].map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? "filter-tab--active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">◇</div>
            <span>No {filter === "all" ? "" : filter} alerts</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Condition</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Trigger Price</th>
                  <th>Triggered At</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td style={{ fontWeight: 700 }}>{alert.symbol}</td>
                    <td>
                      <span
                        style={{
                          color:
                            alert.condition === "above"
                              ? "var(--green)"
                              : "var(--red)",
                        }}
                      >
                        {alert.condition === "above" ? "↑" : "↓"}{" "}
                        {alert.condition}
                      </span>
                    </td>
                    <td>${parseFloat(alert.target_price).toFixed(2)}</td>
                    <td>
                      <span className={`badge badge--${alert.status}`}>
                        <span className="badge__dot" />
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      {alert.trigger_price
                        ? `$${parseFloat(alert.trigger_price).toFixed(2)}`
                        : "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {alert.triggered_at
                        ? new Date(alert.triggered_at).toLocaleString()
                        : "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Triggered Feed ── */}
      <div className="feed">
        <div className="feed__title">
          <span>🔔</span> Triggered Log
        </div>
        {triggeredFeed.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <span>No triggered alerts yet</span>
          </div>
        ) : (
          <div className="feed__list">
            {triggeredFeed.map((alert) => (
              <div className="feed__item" key={alert.id}>
                <span className="feed__item-icon">◆</span>
                <span className="feed__item-symbol">{alert.symbol}</span>
                <span className="feed__item-detail">
                  {alert.condition} ${parseFloat(alert.target_price).toFixed(2)}
                  {alert.trigger_price && (
                    <>
                      {" "}
                      → hit at{" "}
                      <span style={{ color: "var(--accent)" }}>
                        ${parseFloat(alert.trigger_price).toFixed(2)}
                      </span>
                    </>
                  )}
                </span>
                <span className="feed__item-time">
                  {alert.triggered_at
                    ? new Date(alert.triggered_at).toLocaleString()
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
