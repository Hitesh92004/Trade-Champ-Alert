import { useEffect, useRef, useState, useCallback, memo } from "react";

/**
 * InteractiveChart — TradingView Advanced Chart Widget
 * Full-featured TradingView chart with built-in:
 *   - Timeframe selector (1m to Monthly)
 *   - 100+ indicators
 *   - Drawing tools
 *   - Fullscreen mode
 *
 * Alert creation is handled via a compact panel below the chart.
 */
function InteractiveChart({ symbol, onAlertCreate }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(0);

  // Alert panel state
  const [alertPrice, setAlertPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState("above");
  const [toast, setToast] = useState(null);

  // ── Embed TradingView widget ──
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";
    widgetIdRef.current += 1;
    const currentId = widgetIdRef.current;

    // Map our symbol format to TradingView format
    const tvSymbol = mapToTradingViewSymbol(symbol);

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)";
    widgetDiv.style.width = "100%";
    wrapper.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(13, 13, 13, 1)",
      gridColor: "rgba(255, 255, 255, 0.03)",
      withdateranges: true,
      hide_side_panel: false,
      allow_symbol_change: true,
      watchlist: [
        "NASDAQ:AAPL",
        "NASDAQ:GOOGL",
        "NASDAQ:MSFT",
        "NASDAQ:TSLA",
        "NASDAQ:NVDA",
        "NASDAQ:META",
        "NASDAQ:AMZN",
      ],
      details: true,
      hotlist: true,
      calendar: false,
      studies: ["STD;RSI", "STD;MACD"],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
      support_host: "https://www.tradingview.com",
    });

    wrapper.appendChild(script);

    // Only append if this is still the current render
    if (widgetIdRef.current === currentId && containerRef.current) {
      containerRef.current.appendChild(wrapper);
    }

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol]);

  // ── Map symbols to TradingView format ──
  const mapToTradingViewSymbol = (sym) => {
    const upper = sym.toUpperCase();
    // Crypto pairs
    if (upper === "BTC-USD" || upper === "BTCUSD")
      return "BITSTAMP:BTCUSD";
    if (upper === "ETH-USD" || upper === "ETHUSD")
      return "BITSTAMP:ETHUSD";
    if (upper.endsWith("-USD") && upper.length <= 8) {
      const base = upper.replace("-USD", "");
      return `BITSTAMP:${base}USD`;
    }
    // Forex
    if (upper.includes("/")) return `FX:${upper.replace("/", "")}`;
    // Indian stocks
    if (upper.endsWith(".NS")) return `NSE:${upper.replace(".NS", "")}`;
    if (upper.endsWith(".BO")) return `BSE:${upper.replace(".BO", "")}`;
    // Default to NASDAQ (works for most US stocks)
    return upper;
  };

  // ── Set alert handler ──
  const handleSetAlert = useCallback(
    (e) => {
      e.preventDefault();
      const price = parseFloat(alertPrice);
      if (!price || price <= 0 || !onAlertCreate) return;

      onAlertCreate(price, alertCondition);
      showToast(
        `✓ Alert set: ${symbol} ${alertCondition} $${price.toFixed(2)}`
      );
      setAlertPrice("");
    },
    [alertPrice, alertCondition, symbol, onAlertCreate]
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Chart container */}
      <div
        ref={containerRef}
        style={{
          height: "clamp(400px, 60vh, 620px)",
          borderRadius: "10px 10px 0 0",
          overflow: "hidden",
          background: "#0d0d0d",
        }}
      />

      {/* ── Quick Alert Panel ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.6rem 0.85rem",
          background: "#111",
          borderTop: "0.5px solid rgba(255,255,255,0.06)",
          borderRadius: "0 0 10px 10px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          Quick Alert
        </span>

        <form
          onSubmit={handleSetAlert}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flex: 1,
            minWidth: "0",
            flexWrap: "wrap",
          }}
        >
          {/* Symbol badge */}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--accent)",
              background: "var(--accent-dim)",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              whiteSpace: "nowrap",
            }}
          >
            {symbol}
          </span>

          {/* Condition toggle */}
          <div
            style={{
              display: "flex",
              borderRadius: "4px",
              overflow: "hidden",
              border: "0.5px solid var(--border)",
            }}
          >
            {["above", "below"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAlertCondition(c)}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.6rem",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  border: "none",
                  cursor: "pointer",
                  background:
                    alertCondition === c
                      ? c === "above"
                        ? "var(--green-dim)"
                        : "var(--red-dim)"
                      : "transparent",
                  color:
                    alertCondition === c
                      ? c === "above"
                        ? "var(--green)"
                        : "var(--red)"
                      : "var(--text-dim)",
                  fontWeight: alertCondition === c ? 700 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                {c === "above" ? "↑" : "↓"} {c}
              </button>
            ))}
          </div>

          {/* Price input */}
          <div style={{ position: "relative", flex: "1 1 100px", minWidth: "80px" }}>
            <span
              style={{
                position: "absolute",
                left: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                pointerEvents: "none",
              }}
            >
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={alertPrice}
              onChange={(e) => setAlertPrice(e.target.value)}
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem 0.35rem 1.2rem",
                background: "var(--bg-input)",
                border: "0.5px solid var(--border)",
                borderRadius: "4px",
                color: "var(--text)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                outline: "none",
              }}
              required
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            style={{
              padding: "0.35rem 0.75rem",
              background: "rgba(0, 229, 255, 0.1)",
              border: "0.5px solid rgba(0, 229, 255, 0.35)",
              borderRadius: "4px",
              color: "#00e5ff",
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "rgba(0, 229, 255, 0.22)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "rgba(0, 229, 255, 0.1)")
            }
          >
            Set Alert
          </button>
        </form>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "absolute",
            bottom: "4rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--accent)",
            color: "var(--bg)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "0.5rem 1.25rem",
            borderRadius: "6px",
            zIndex: 30,
            animation: "alertPanelIn 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes alertPanelIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default memo(InteractiveChart);
