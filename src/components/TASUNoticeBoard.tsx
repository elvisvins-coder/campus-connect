// ─────────────────────────────────────────────────────────────────────────────
// TASUNoticeBoard.tsx
// Drop-in replacement for the "notices" and "events" nav panels in AppShell.
// Uses the Anthropic API (web_search tool) to fetch live TASU news, then
// parses the response into typed Notice / Event objects for display.
//
// USAGE in AppShell — inside <main className="main-feed">:
//
//   import { TASUNoticeBoard } from "./TASUNoticeBoard";
//
//   {activeNav === "notices" && <TASUNoticeBoard mode="notices" />}
//   {activeNav === "events"  && <TASUNoticeBoard mode="events"  />}
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Notice = {
  id: string;
  title: string;
  body: string;
  category: "academic" | "exam" | "admin" | "strike" | "hostel" | "general";
  date: string;
  source: string;
  urgent: boolean;
};

type TASUEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  type: "academic" | "social" | "admin" | "sport";
};

type Mode = "notices" | "events";

// ── Category config ───────────────────────────────────────────────────────────
const CAT_CONFIG: Record<Notice["category"], { label: string; color: string; bg: string; icon: string }> = {
  academic: { label: "Academic",  color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  icon: "📚" },
  exam:     { label: "Exams",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "📝" },
  admin:    { label: "Admin",     color: "#a78bfa", bg: "rgba(167,139,250,0.1)", icon: "🏛️" },
  strike:   { label: "Strike",    color: "#f43f5e", bg: "rgba(244,63,94,0.1)",   icon: "⚠️" },
  hostel:   { label: "Hostel",    color: "#34d399", bg: "rgba(52,211,153,0.1)",  icon: "🏠" },
  general:  { label: "General",   color: "#22c55e", bg: "rgba(34,197,94,0.1)",   icon: "📋" },
};

const EVENT_TYPE_CONFIG: Record<TASUEvent["type"], { color: string; icon: string }> = {
  academic: { color: "#60a5fa", icon: "🎓" },
  social:   { color: "#f59e0b", icon: "🎉" },
  admin:    { color: "#a78bfa", icon: "📋" },
  sport:    { color: "#34d399", icon: "⚽" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Main component ────────────────────────────────────────────────────────────
export function TASUNoticeBoard({ mode }: { mode: Mode }) {
  const [notices, setNotices]   = useState<Notice[]>([]);
  const [events,  setEvents]    = useState<TASUEvent[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [filter, setFilter]           = useState<string>("all");

  // ── Fetch from Anthropic API with web_search ──────────────────────────────
  const fetchTASUData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = mode === "notices"
      ? `You are a campus news parser for Taraba State University (TASU), Jalingo, Nigeria.
Search for the latest TASU notices, announcements, and news from tsuniversity.edu.ng, myschool.ng, and allschool.ng.
Return ONLY a valid JSON array (no markdown, no preamble) of notice objects with this exact shape:
[{
  "id": "unique_string",
  "title": "Notice title",
  "body": "2-3 sentence summary of the notice",
  "category": one of ["academic","exam","admin","strike","hostel","general"],
  "date": "e.g. Apr 21, 2026",
  "source": "source website name",
  "urgent": true or false
}]
Include 6-10 of the most recent and relevant notices. Today is ${today}.`
      : `You are a campus events parser for Taraba State University (TASU), Jalingo, Nigeria.
Search for upcoming TASU events, academic calendar dates, ceremonies, and campus activities.
Return ONLY a valid JSON array (no markdown, no preamble) of event objects with this exact shape:
[{
  "id": "unique_string",
  "title": "Event title",
  "description": "1-2 sentence description",
  "date": "e.g. Apr 26, 2026",
  "venue": "e.g. Senate Hall, ICT Centre, Main Auditorium",
  "type": one of ["academic","social","admin","sport"]
}]
Include 5-8 upcoming or recent events. Today is ${today}.`;

    const userMessage = mode === "notices"
      ? "Search for the latest official notices and announcements from Taraba State University TASU 2026"
      : "Search for upcoming events and academic calendar activities at Taraba State University TASU 2026";

    try {
     const response = await fetch("/api/anthropic/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);

      const data = await response.json();

      // Extract text from content blocks (could be after tool_use blocks)
      let jsonText = "";
      for (const block of data.content ?? []) {
        if (block.type === "text" && block.text) {
          jsonText = block.text;
          break;
        }
      }

      // Strip any accidental markdown fences
      jsonText = jsonText.replace(/```json|```/g, "").trim();

      // Find the JSON array
      const start = jsonText.indexOf("[");
      const end   = jsonText.lastIndexOf("]");
      if (start === -1 || end === -1) throw new Error("No JSON array found in response");
      const clean = jsonText.slice(start, end + 1);

      const parsed = JSON.parse(clean);

      // Stamp IDs in case model forgot
      if (mode === "notices") {
        setNotices(parsed.map((n: Notice) => ({ ...n, id: n.id || uid() })));
      } else {
        setEvents(parsed.map((e: TASUEvent) => ({ ...e, id: e.id || uid() })));
      }
      setLastFetched(new Date());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch TASU data.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchTASUData();
  }, [fetchTASUData]);

  // ── Filter pills (notices only) ───────────────────────────────────────────
  const noticeCategories = ["all", ...Array.from(new Set(notices.map(n => n.category)))];
  const filteredNotices  = filter === "all" ? notices : notices.filter(n => n.category === filter);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 40px" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <h2 style={{
            fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700,
            color: "var(--text)", margin: 0, letterSpacing: "-0.02em",
          }}>
            {mode === "notices" ? "📋 Notice Board" : "📅 Campus Events"}
          </h2>
          <p style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>
            {mode === "notices"
              ? "Live TASU announcements · Powered by AI"
              : "Upcoming events at Taraba State University"}
            {lastFetched && (
              <span style={{ marginLeft: 8, color: "var(--green-glow)", fontWeight: 600 }}>
                · Updated {lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchTASUData}
          disabled={loading}
          style={{
            padding: "8px 16px", borderRadius: 100,
            background: loading ? "rgba(22,163,74,0.05)" : "rgba(22,163,74,0.1)",
            border: "1.5px solid rgba(22,163,74,0.25)",
            color: loading ? "var(--text-3)" : "var(--green-glow)",
            fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 7,
            transition: "all 0.2s",
          }}
        >
          <span style={{
            display: "inline-block",
            animation: loading ? "spin 0.8s linear infinite" : "none",
            fontSize: 14,
          }}>🔄</span>
          {loading ? "Fetching…" : "Refresh"}
        </button>
      </div>

      {/* ── AI badge ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
        borderRadius: 10, marginBottom: 18,
        background: "rgba(96,165,250,0.06)",
        border: "1px solid rgba(96,165,250,0.15)",
      }}>
        <span style={{ fontSize: 14 }}>🤖</span>
        <span style={{ fontSize: 11.5, color: "rgba(96,165,250,0.85)", lineHeight: 1.5 }}>
          <strong style={{ color: "#93c5fd" }}>AI-powered</strong> — notices are fetched live from TASU official sources
          and summarised by Claude. Always verify urgent notices at <strong style={{ color: "#93c5fd" }}>tsuniversity.edu.ng</strong>.
        </span>
      </div>

      {/* ── Filter pills (notices only) ── */}
      {mode === "notices" && !loading && notices.length > 0 && (
        <div style={{
          display: "flex", gap: 6, marginBottom: 18,
          overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none",
        }}>
          {noticeCategories.map(cat => {
            const cfg = cat !== "all" ? CAT_CONFIG[cat as Notice["category"]] : null;
            const active = filter === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: "5px 14px", borderRadius: 100, border: "1px solid",
                  borderColor: active
                    ? (cfg?.color ?? "var(--green-glow)")
                    : "rgba(255,255,255,0.08)",
                  background: active
                    ? (cfg?.bg ?? "rgba(34,197,94,0.1)")
                    : "transparent",
                  color: active
                    ? (cfg?.color ?? "var(--green-glow)")
                    : "var(--text-3)",
                  fontSize: 11.5, fontWeight: 600,
                  fontFamily: "'Sora',sans-serif", cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {cat === "all" ? "All" : `${cfg?.icon} ${cfg?.label}`}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16, padding: 18,
              animation: "post-in 0.4s cubic-bezier(0.16,1,0.3,1) both",
              animationDelay: `${i * 0.07}s`,
            }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
                <div className="skeleton" style={{ width: 32, height: 20, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: "45%", height: 13, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 70, height: 10, borderRadius: 6, marginLeft: "auto" }} />
              </div>
              <div className="skeleton" style={{ width: "90%", height: 12, borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "70%", height: 11, borderRadius: 6 }} />
            </div>
          ))}
          <div style={{
            textAlign: "center", padding: "12px 0",
            fontSize: 12, color: "var(--text-3)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: 14 }}>🔄</span>
            Searching TASU official sources…
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {error && !loading && (
        <div style={{
          padding: "20px 24px", borderRadius: 16,
          background: "rgba(244,63,94,0.06)",
          border: "1px solid rgba(244,63,94,0.2)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f43f5e", marginBottom: 6 }}>
            Could not fetch TASU notices
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, lineHeight: 1.6 }}>
            {error}
          </div>
          <button onClick={fetchTASUData} style={{
            padding: "8px 20px", borderRadius: 100,
            background: "rgba(244,63,94,0.1)",
            border: "1px solid rgba(244,63,94,0.25)",
            color: "#f43f5e", fontSize: 12, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
          }}>Try Again</button>
        </div>
      )}

      {/* ── NOTICES LIST ── */}
      {mode === "notices" && !loading && filteredNotices.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredNotices.map((notice, idx) => {
            const cfg     = CAT_CONFIG[notice.category];
            const isOpen  = expandedId === notice.id;
            return (
              <article
                key={notice.id}
                onClick={() => setExpandedId(isOpen ? null : notice.id)}
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${notice.urgent ? "rgba(244,63,94,0.25)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 16, padding: "16px 18px",
                  cursor: "pointer", transition: "border-color 0.2s, background 0.2s",
                  animation: "post-in 0.4s cubic-bezier(0.16,1,0.3,1) both",
                  animationDelay: `${idx * 0.05}s`,
                  position: "relative", overflow: "hidden",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
              >
                {/* Urgent left bar */}
                {notice.urgent && (
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: 4, background: "linear-gradient(to bottom,#f43f5e,#f59e0b)",
                    borderRadius: "16px 0 0 16px",
                  }} />
                )}

                {/* Top row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 10, paddingLeft: notice.urgent ? 8 : 0,
                }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 100, fontSize: 10.5, fontWeight: 700,
                    background: cfg.bg, color: cfg.color,
                    border: `1px solid ${cfg.color}33`,
                    display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  {notice.urgent && (
                    <span style={{
                      padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 800,
                      background: "rgba(244,63,94,0.1)", color: "#f43f5e",
                      border: "1px solid rgba(244,63,94,0.25)", flexShrink: 0,
                      letterSpacing: "0.05em", textTransform: "uppercase",
                    }}>🔴 Urgent</span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    {notice.date}
                  </span>
                </div>

                {/* Title */}
                <div style={{
                  fontSize: 13.5, fontWeight: 700, color: "var(--text)",
                  lineHeight: 1.4, marginBottom: isOpen ? 10 : 0,
                  paddingLeft: notice.urgent ? 8 : 0,
                }}>
                  {notice.title}
                </div>

                {/* Expandable body */}
                {isOpen && (
                  <div style={{ paddingLeft: notice.urgent ? 8 : 0 }}>
                    <div style={{
                      fontSize: 13, lineHeight: 1.75,
                      color: "rgba(240,244,241,0.78)",
                      marginBottom: 12, marginTop: 4,
                    }}>
                      {notice.body}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 10.5, color: "var(--text-3)",
                    }}>
                      <span>🌐 Source: <strong style={{ color: "var(--text-2)" }}>{notice.source}</strong></span>
                      <span style={{ marginLeft: "auto" }}>
                        <a
                          href="https://www.tsuniversity.edu.ng"
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            color: "var(--gold-light)", fontSize: 11, fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          Verify on TASU website →
                        </a>
                      </span>
                    </div>
                  </div>
                )}

                {/* Chevron */}
                <div style={{
                  position: "absolute", right: 14, bottom: 14,
                  fontSize: 12, color: "var(--text-3)",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>
                  ▼
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── EVENTS LIST ── */}
      {mode === "events" && !loading && events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {events.map((ev, idx) => {
            const cfg    = EVENT_TYPE_CONFIG[ev.type];
            const isOpen = expandedId === ev.id;

            // Parse date parts for the visual pill
            const dateParts = ev.date.split(/[\s,]+/).filter(Boolean);
            const mon = dateParts[0] ?? "";
            const day = dateParts[1] ?? dateParts[0] ?? "";

            return (
              <article
                key={ev.id}
                onClick={() => setExpandedId(isOpen ? null : ev.id)}
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "16px 18px",
                  cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start",
                  transition: "border-color 0.2s, background 0.2s",
                  animation: "post-in 0.4s cubic-bezier(0.16,1,0.3,1) both",
                  animationDelay: `${idx * 0.06}s`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
              >
                {/* Date pill */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "8px 12px", borderRadius: 12, flexShrink: 0,
                  background: `${cfg.color}12`,
                  border: `1px solid ${cfg.color}30`,
                  minWidth: 52,
                }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em", color: cfg.color,
                  }}>{mon}</span>
                  <span style={{
                    fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 800,
                    color: "var(--text)", lineHeight: 1.1,
                  }}>{day}</span>
                  <span style={{ fontSize: 14, marginTop: 2 }}>{cfg.icon}</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13.5, fontWeight: 700, color: "var(--text)",
                    lineHeight: 1.35, marginBottom: 5,
                  }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: isOpen ? 10 : 0 }}>
                    📍 {ev.venue}
                  </div>
                  {isOpen && (
                    <>
                      <div style={{
                        fontSize: 13, lineHeight: 1.7,
                        color: "rgba(240,244,241,0.78)",
                        marginTop: 8,
                      }}>
                        {ev.description}
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700,
                          background: `${cfg.color}12`, color: cfg.color,
                          border: `1px solid ${cfg.color}30`,
                          textTransform: "capitalize",
                        }}>
                          {cfg.icon} {ev.type}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Chevron */}
                <span style={{
                  fontSize: 11, color: "var(--text-3)", flexShrink: 0,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s", marginTop: 4,
                }}>▼</span>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && (
        (mode === "notices" && filteredNotices.length === 0) ||
        (mode === "events"  && events.length === 0)
      ) && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-3)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>
            {mode === "notices" ? "📋" : "📅"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>
            No {mode === "notices" ? "notices" : "events"} found
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            Try refreshing or check back later.
          </div>
          <button onClick={fetchTASUData} style={{
            marginTop: 16, padding: "8px 20px", borderRadius: 100,
            background: "rgba(22,163,74,0.08)",
            border: "1px solid rgba(22,163,74,0.2)",
            color: "var(--green-glow)", fontSize: 12, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
          }}>Refresh</button>
        </div>
      )}

      {/* ── Footer note ── */}
      {!loading && ((mode === "notices" && notices.length > 0) || (mode === "events" && events.length > 0)) && (
        <div style={{
          marginTop: 24, padding: "12px 16px", borderRadius: 12,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          fontSize: 11, color: "var(--text-3)", textAlign: "center", lineHeight: 1.7,
        }}>
          Data sourced via AI web search from <strong style={{ color: "var(--text-2)" }}>tsuniversity.edu.ng</strong>,{" "}
          myschool.ng &amp; allschool.ng. For official confirmation visit the university portal.
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
