import { useState, useEffect } from "react";
import api from "../lib/api";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [toast, setToast] = useState(null);

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

  useEffect(() => {
    fetchAlerts();
  }, []);

  const createAlert = async (e) => {
    e.preventDefault();
    if (!symbol || !targetPrice) return;

    try {
      await api.post("/alerts", {
        symbol: symbol.toUpperCase(),
        condition,
        target_price: parseFloat(targetPrice),
      });
      setSymbol("");
      setTargetPrice("");
      showToast("Alert created successfully");
      fetchAlerts();
    } catch (err) {
      console.error("Failed to create alert:", err);
      showToast("Failed to create alert");
    }
  };

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      showToast("Alert deleted");
      fetchAlerts();
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const getStatus = (alert) => {
    if (alert.triggered) return "triggered";
    const created = new Date(alert.created_at);
    const now = new Date();
    const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) return "expired";
    return "active";
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Price Alerts</h1>
        <p className="page__subtitle">
          Create unlimited alerts · Get notified when price conditions are met
        </p>
      </div>

      {/* Create Alert Form */}
      <form className="form" onSubmit={createAlert}>
        <div className="form__title">
          <span>+</span> New Alert
        </div>
        <div className="form__row">
          <div className="form__group">
            <label className="form__label">Symbol</label>
            <input
              className="form__input"
              type="text"
              placeholder="e.g. AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              required
            />
          </div>
          <div className="form__group">
            <label className="form__label">Condition</label>
            <select
              className="form__select"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="above">Price Above</option>
              <option value="below">Price Below</option>
            </select>
          </div>
          <div className="form__group">
            <label className="form__label">Target Price</label>
            <input
              className="form__input"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              required
            />
          </div>
          <button className="btn btn--primary" type="submit">
            Create Alert
          </button>
        </div>
      </form>

      {/* Alerts Table */}
      {loading ? (
        <div className="loader">
          <div className="loader__spinner" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">◇</div>
          <span>No alerts yet</span>
          <span style={{ fontSize: "0.7rem" }}>
            Create your first alert above
          </span>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Condition</th>
                <th>Target Price</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const status = getStatus(alert);
                return (
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
                      <span className={`badge badge--${status}`}>
                        <span className="badge__dot" />
                        {status}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
