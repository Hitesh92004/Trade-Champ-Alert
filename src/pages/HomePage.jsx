import { useState, useEffect, useRef, useCallback } from "react";
import InteractiveChart from "../components/InteractiveChart";
import api from "../lib/api";

/**
 * HomePage — Interactive chart with optimized real-time search.
 */
export default function HomePage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const cacheRef = useRef({}); // search result cache

  const popular = [
    "AAPL", "GOOGL", "MSFT", "TSLA", "AMZN",
    "NVDA", "META", "BTC-USD", "ETH-USD",
  ];

  // ── Debounced search with caching ──
  const searchSymbols = useCallback(async (query) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Check cache first
    const cacheKey = query.toUpperCase();
    if (cacheRef.current[cacheKey]) {
      setSuggestions(cacheRef.current[cacheKey]);
      setShowSuggestions(true);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await api.get(`/search/${encodeURIComponent(query)}`);
      const results = res.data || [];
      const filtered = results.filter((r) => r.symbol && r.symbol.length > 0);
      cacheRef.current[cacheKey] = filtered;
      setSuggestions(filtered);
      setShowSuggestions(true);
    } catch {
      // Fallback to popular tickers
      const filtered = popular
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
        .map((s) => ({ symbol: s, name: "", type: "EQUITY", exchange: "" }));
      setSuggestions(filtered);
      setShowSuggestions(true);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (searchInput.length > 0) {
      debounceRef.current = setTimeout(() => {
        searchSymbols(searchInput);
      }, 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setHighlightIdx(-1);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, searchSymbols]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectSymbol = (sym) => {
    if (!sym) return;
    setSymbol(sym.toUpperCase());
    setSearchInput("");
    setShowSuggestions(false);
    setHighlightIdx(-1);
  };

  // ── Keyboard navigation ──
  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showSuggestions && suggestions.length > 0) {
        setShowSuggestions(true);
      }
      setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
        selectSymbol(suggestions[highlightIdx].symbol);
      } else if (suggestions.length > 0) {
        selectSymbol(suggestions[0].symbol);
      } else if (searchInput.length > 0) {
        triggerSearchAndSelect(searchInput);
      }
    }
  };

  const triggerSearchAndSelect = async (query) => {
    try {
      const res = await api.get(`/search/${encodeURIComponent(query)}`);
      const results = (res.data || []).filter((r) => r.symbol);
      if (results.length > 0) {
        selectSymbol(results[0].symbol);
      } else {
        showToastMsg(`No results for "${query}"`);
      }
    } catch {
      showToastMsg("Search failed — try again");
    }
  };

  // ── Alert from chart ──
  const handleAlertFromChart = async (price, condition) => {
    try {
      await api.post("/alerts", {
        symbol: symbol.toUpperCase(),
        condition,
        target_price: price,
      });
      showToastMsg(`✓ Alert: ${symbol} crossing $${price.toFixed(2)}`);
    } catch (err) {
      console.error("Failed to create alert:", err);
      showToastMsg("Failed to create alert — check backend");
    }
  };

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const tickerTapeHtml = `
    <div class="tradingview-widget-container">
      <div class="tradingview-widget-container__widget"></div>
      <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js" async>
      {
        "symbols": [
          {"proName": "FOREXCOM:SPXUSD", "title": "S&P 500"},
          {"proName": "NASDAQ:AAPL", "title": "Apple"},
          {"proName": "NASDAQ:GOOGL", "title": "Google"},
          {"proName": "NASDAQ:TSLA", "title": "Tesla"},
          {"proName": "NASDAQ:NVDA", "title": "NVIDIA"},
          {"proName": "BITSTAMP:BTCUSD", "title": "Bitcoin"},
          {"proName": "BITSTAMP:ETHUSD", "title": "Ethereum"}
        ],
        "showSymbolLogo": true,
        "colorTheme": "dark",
        "isTransparent": true,
        "displayMode": "adaptive",
        "locale": "en"
      }
      </script>
    </div>
  `;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Market Overview</h1>
        <p className="page__subtitle">
          Search any symbol · Double-click chart to set alerts · Drag line to adjust
        </p>
      </div>

      {/* Ticker Tape */}
      <div
        className="symbol-search"
        style={{ height: "52px", marginBottom: "1rem" }}
        dangerouslySetInnerHTML={{ __html: tickerTapeHtml }}
      />

      {/* ── Symbol Search ── */}
      <div ref={searchRef} style={{ position: "relative", marginBottom: "1rem" }}>
        <div className="form" style={{ marginBottom: 0, padding: "0.75rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>⌕</span>
            <input
              className="form__input"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: 0,
                fontSize: window.innerWidth < 768 ? "1rem" : "0.85rem", // Larger font on mobile to prevent zoom
              }}
              type="text"
              placeholder={window.innerWidth < 768 ? "Search symbol..." : "Search symbol or company… (e.g. AAPL, Tesla)"}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "0.2rem",
                  fontSize: "0.8rem",
                }}
              >
                ✕
              </button>
            )}
            {searchLoading && (
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid var(--border)",
                  borderTopColor: "var(--accent)",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
            )}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                color: "var(--accent)",
                background: "var(--accent-dim)",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                fontWeight: 700,
              }}
            >
              {symbol}
            </span>
          </div>
        </div>

        {/* ── Suggestions Dropdown ── */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#161616",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--radius)",
              marginTop: "4px",
              zIndex: 50,
              overflow: "hidden",
              maxHeight: "320px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((s, idx) => (
              <button
                key={s.symbol + idx}
                onClick={() => selectSymbol(s.symbol)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.65rem 1rem",
                  background:
                    idx === highlightIdx
                      ? "rgba(0, 229, 255, 0.08)"
                      : "transparent",
                  border: "none",
                  color: "var(--text)",
                  cursor: "pointer",
                  borderBottom: "0.5px solid var(--border)",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    minWidth: "90px",
                    color: "var(--accent)",
                  }}
                >
                  {s.symbol}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.55rem",
                    color: "var(--text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "0.15rem 0.4rem",
                    border: "0.5px solid var(--border)",
                    borderRadius: "3px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.exchange || s.type || "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick pills */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        {popular.map((s) => (
          <button
            key={s}
            className={`btn btn--sm ${s === symbol ? "btn--primary" : ""}`}
            onClick={() => selectSymbol(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="home-chart">
        <InteractiveChart symbol={symbol} onAlertCreate={handleAlertFromChart} />
      </div>

      {/* Hints */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          marginTop: "1rem",
          fontFamily: "var(--font-mono)",
          fontSize: "0.6rem",
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          flexWrap: "wrap",
        }}
      >
        <span>📊 Full TradingView chart</span>
        <span>📐 Indicators &amp; drawings built-in</span>
        <span>⚡ Set alerts via panel below chart</span>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
