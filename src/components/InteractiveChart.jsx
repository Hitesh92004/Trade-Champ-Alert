import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, CrosshairMode } from "lightweight-charts";
import api from "../lib/api";

/**
 * InteractiveChart — TradingView Lightweight Charts v5 with:
 *   - DOUBLE-CLICK to pin price → "Set Alert on Price Crossing" panel
 *   - Draggable alert line — drag vertically to adjust price
 *   - Mobile: touch-end pins automatically
 *   - Escape or ✕ to dismiss
 */
export default function InteractiveChart({ symbol, onAlertCreate }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Crosshair / pin state
  const [hoverPrice, setHoverPrice] = useState(null);
  const hoverPriceRef = useRef(null);
  const [pinnedPrice, setPinnedPrice] = useState(null);
  const [pinnedY, setPinnedY] = useState(null);
  const [lastPrice, setLastPrice] = useState(null);
  const [toast, setToast] = useState(null);

  // Timeframe state
  const [timeframe, setTimeframe] = useState("1Y");
  const timeframes = {
    "1D": { period: "1d", interval: "1m" },
    "1W": { period: "5d", interval: "15m" },
    "1M": { period: "1mo", interval: "1h" },
    "6M": { period: "6mo", interval: "1d" },
    "1Y": { period: "1y", interval: "1d" },
  };

  // Drag state
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    hoverPriceRef.current = hoverPrice;
  }, [hoverPrice]);

  // ── Chart initialization ──
  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(null);
    setPinnedPrice(null);
    setHoverPrice(null);
    setDragging(false);

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 350 : 500;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { color: "#0d0d0d" },
        textColor: "#666",
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(0, 229, 255, 0.3)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#00e5ff",
        },
        horzLine: {
          color: "rgba(0, 229, 255, 0.3)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#00e5ff",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00e676",
      downColor: "#ff1744",
      borderUpColor: "#00e676",
      borderDownColor: "#ff1744",
      wickUpColor: "#00e676",
      wickDownColor: "#ff1744",
    });
    seriesRef.current = candleSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.point || !param.time) {
        setHoverPrice(null);
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (data) setHoverPrice(data.close);
    });

    const { period, interval } = timeframes[timeframe];
    api
      .get(`/history/${symbol}?period=${period}&interval=${interval}`)
      .then((res) => {
        const ohlc = res.data;
        if (ohlc && ohlc.length > 0) {
          candleSeries.setData(ohlc);
          chart.timeScale().fitContent();
          setLastPrice(ohlc[ohlc.length - 1].close);
        } else {
          setError(`No chart data available for ${symbol}`);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load chart data:", err);
        setError(`Could not load data for "${symbol}" — try a different symbol`);
        setLoading(false);
      });

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chart.applyOptions({ 
          width: containerRef.current.clientWidth,
          height: window.innerWidth < 768 ? 350 : 500
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, timeframe]);

  // ── DOUBLE-CLICK to pin ──
  const handleChartDoubleClick = useCallback((e) => {
    if (!seriesRef.current || !chartRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const price = seriesRef.current.coordinateToPrice(y);
    if (price != null && !isNaN(price) && price > 0) {
      setPinnedPrice(parseFloat(price.toFixed(2)));
      setPinnedY(y);
    }
  }, []);

  // ── Mobile: touch-end pins ──
  const handleTouchEnd = useCallback(() => {
    const currentHover = hoverPriceRef.current;
    if (currentHover != null) {
      setPinnedPrice(parseFloat(currentHover.toFixed(2)));
      if (seriesRef.current) {
        const y = seriesRef.current.priceToCoordinate(currentHover);
        if (y != null) setPinnedY(y);
      }
    }
  }, []);

  // ── Escape to unpin ──
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setPinnedPrice(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── DRAG the alert line vertically ──
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { clientY };
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handleDragMove = (e) => {
      if (!seriesRef.current || !containerRef.current) return;
      const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current.getBoundingClientRect();
      const y = clientY - rect.top;
      const clampedY = Math.max(10, Math.min(y, 490));
      const price = seriesRef.current.coordinateToPrice(clampedY);
      if (price != null && !isNaN(price) && price > 0) {
        setPinnedPrice(parseFloat(price.toFixed(2)));
        setPinnedY(clampedY);
      }
    };

    const handleDragEnd = () => {
      setDragging(false);
    };

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [dragging]);

  // ── Set alert — auto-determine condition from current price ──
  const handleSetAlert = useCallback(() => {
    if (pinnedPrice == null || !onAlertCreate || lastPrice == null) return;
    // Auto-determine: if target > current → "above", else → "below"
    const condition = pinnedPrice >= lastPrice ? "above" : "below";
    onAlertCreate(pinnedPrice, condition);
    showToast(
      `Alert set: ${symbol} crossing $${pinnedPrice.toFixed(2)}`
    );
    setPinnedPrice(null);
  }, [pinnedPrice, symbol, onAlertCreate, lastPrice]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Header height for offset calculations
  const HEADER_H = 44;

  return (
    <div style={{ position: "relative" }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          borderBottom: "0.5px solid rgba(255,255,255,0.08)",
          background: "#111",
          borderRadius: "10px 10px 0 0",
          height: HEADER_H,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "1rem",
              fontWeight: 700,
            }}
          >
            {symbol}
          </span>
          {lastPrice != null && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                color: "var(--accent)",
              }}
            >
              ${lastPrice.toFixed(2)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {hoverPrice != null && !pinnedPrice && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              ${hoverPrice.toFixed(2)}
            </span>
          )}
          
          {/* Timeframe Selector */}
          <div style={{ display: "flex", gap: "0.15rem", margin: "0 0.5rem" }}>
            {Object.keys(timeframes).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  background: tf === timeframe ? "var(--accent)" : "transparent",
                  color: tf === timeframe ? "var(--bg)" : "var(--text-muted)",
                  border: "none",
                  borderRadius: "3px",
                  padding: "0.15rem 0.35rem",
                  fontSize: "0.6rem",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  fontWeight: tf === timeframe ? 700 : 400,
                  transition: "all 0.2s ease"
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6rem",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Double-click to set alert
          </span>
        </div>
      </div>

      {/* Chart container — uses onDoubleClick */}
      <div
        ref={containerRef}
        onDoubleClick={handleChartDoubleClick}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "relative",
          cursor: dragging ? "ns-resize" : "crosshair",
          borderRadius: "0 0 10px 10px",
          overflow: "hidden",
        }}
      />

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(13,13,13,0.9)",
            zIndex: 10,
            borderRadius: "10px",
          }}
        >
          <div className="loader__spinner" />
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(13,13,13,0.95)",
            zIndex: 10,
            borderRadius: "10px",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem", opacity: 0.3 }}>⚠</span>
          <span
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              textAlign: "center",
              maxWidth: "340px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </span>
        </div>
      )}

      {/* ── Draggable Alert Line ── */}
      {pinnedPrice != null && pinnedY != null && (
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            position: "absolute",
            top: pinnedY + HEADER_H - 8,
            left: 0,
            right: 60,
            height: "17px",
            cursor: "ns-resize",
            zIndex: 16,
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* The visible line */}
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: 0,
              right: 0,
              height: "1px",
              background: dragging
                ? "rgba(0,229,255,0.7)"
                : "rgba(0,229,255,0.4)",
              pointerEvents: "none",
            }}
          />
          {/* Drag handle (diamond) */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,229,255,0.15)",
              border: "0.5px solid rgba(0,229,255,0.4)",
              borderRadius: "3px",
              color: "var(--accent)",
              fontSize: "0.55rem",
              pointerEvents: "none",
            }}
          >
            ◆
          </div>
          {/* Price label on the line */}
          <div
            style={{
              position: "absolute",
              right: "-60px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "#00e5ff",
              color: "#0d0d0d",
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "3px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            ${pinnedPrice.toFixed(2)}
          </div>
        </div>
      )}

      {/* ── Alert Panel ── */}
      {pinnedPrice != null && (
        <div
          style={{
            position: "absolute",
            top: Math.min(
              Math.max((pinnedY || 80) + HEADER_H - 30, HEADER_H + 10),
              480
            ),
            right: 80,
            zIndex: 20,
            animation: "alertPanelIn 0.15s ease",
          }}
        >
          <div
            style={{
              background: "#161616",
              border: "0.5px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              minWidth: "240px",
              fontFamily: "var(--font-mono)",
              position: "relative",
            }}
          >
            {/* Close */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPinnedPrice(null);
              }}
              style={{
                position: "absolute",
                top: "6px",
                right: "8px",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.8rem",
                padding: "2px 6px",
              }}
            >
              ✕
            </button>

            {/* Price */}
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "var(--accent)",
                marginBottom: "0.5rem",
                marginTop: "0.15rem",
              }}
            >
              ${pinnedPrice.toFixed(2)}
            </div>

            {/* Single "Set Alert on Price Crossing" button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSetAlert();
              }}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                background: "rgba(0, 229, 255, 0.1)",
                border: "0.5px solid rgba(0, 229, 255, 0.35)",
                borderRadius: "5px",
                color: "#00e5ff",
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(0, 229, 255, 0.22)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "rgba(0, 229, 255, 0.1)")
              }
            >
              Set Alert on Price Crossing
            </button>

            {/* Drag hint */}
            <div
              style={{
                fontSize: "0.5rem",
                color: "var(--text-dim)",
                marginTop: "0.5rem",
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Drag line to adjust · ESC to dismiss
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
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
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
