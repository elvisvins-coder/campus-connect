// src/App.tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import Auth from "./components/Auth";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import logo from "./assets/logo.png";
import campusBg from "./assets/studentpix2.png";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import { Preloader } from "./components/Preloader";
function useLiveStats() {
  const [stats, setStats] = useState({ students: 0, departments: 0, activeNow: 0 });
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), snap => {
      const users = snap.docs.map(d => d.data());
      const depts = new Set(users.map((u: any) => u.department).filter(Boolean));
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const active = users.filter((u: any) => {
        if (!u.lastSeen) return false;
        const t = u.lastSeen instanceof Timestamp ? u.lastSeen.toDate() : new Date(u.lastSeen);
        return t >= fiveMinAgo;
      }).length;
      setStats({ students: snap.size, departments: depts.size, activeNow: active });
    });
    return () => unsub();
  }, []);
  return stats;
}

function fmt(n: number): { num: string; sup: string } {
  if (n >= 1000) return { num: (n / 1000).toFixed(1).replace(/\.0$/, ""), sup: "k+" };
  return { num: String(n), sup: "+" };
}
function AppContent() {
  const location = useLocation();
  const stats = useLiveStats();
const studentFmt = fmt(stats.students);
const deptFmt = { num: String(stats.departments || "—"), sup: stats.departments ? "+" : "" };

  useEffect(() => {
    if (location.pathname === "/") {
      document.body.style.background = "#060d08";
      document.body.style.color = "#f8fafc";
    }
  }, [location.pathname]);

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,300;1,9..144,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --green:        #14532d;
          --green-mid:    #166534;
          --green-light:  #16a34a;
          --green-glow:   #22c55e;
          --gold:         #b45309;
          --gold-mid:     #d97706;
          --gold-light:   #f59e0b;
          --gold-pale:    #fde68a;
          --dark:         #060d08;
          --dark-2:       #0a1510;
          --dark-card:    rgba(6,13,8,0.82);
          --surface:      rgba(255,255,255,0.04);
          --surface-2:    rgba(255,255,255,0.07);
          --border:       rgba(255,255,255,0.08);
          --border-gold:  rgba(245,158,11,0.2);
          --text:         #f8fafc;
          --text-2:       rgba(248,250,252,0.6);
          --text-3:       rgba(248,250,252,0.35);
          --radius-lg:    20px;
          --radius-xl:    28px;
          --nav-h:        68px;
          --transition:   all 0.25s cubic-bezier(0.4,0,0.2,1);
        }

        html, body { height: 100%; scroll-behavior: smooth; background: #060d08 !important; }
        body {
          font-family: 'Sora', sans-serif;
          background: #060d08 !important;
          color: var(--text);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── ANIMATED BACKGROUND ─── */
        .scene {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: var(--dark);
        }

        .scene::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(22,163,74,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22,163,74,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 20%, black 30%, transparent 100%);
        }

        .scene::after {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 256px 256px;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          will-change: transform;
          animation: orb-drift linear infinite alternate;
        }
        .orb-1 {
          width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(20,83,45,0.55), transparent 70%);
          top: -200px; left: -180px;
          animation-duration: 18s;
          animation-delay: 0s;
        }
        .orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(180,83,9,0.2), transparent 70%);
          bottom: -120px; right: -100px;
          animation-duration: 14s;
          animation-delay: -6s;
        }
        .orb-3 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(22,163,74,0.12), transparent 70%);
          top: 40%; left: 50%;
          animation-duration: 22s;
          animation-delay: -11s;
        }

        @keyframes orb-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.1); }
        }

        /* ─── NAVBAR ─── */
        .navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 200;
          height: var(--nav-h);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          background: rgba(6,13,8,0.7);
          backdrop-filter: blur(28px) saturate(1.4);
          -webkit-backdrop-filter: blur(28px) saturate(1.4);
          border-bottom: 1px solid var(--border);
          animation: nav-in 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }

        .navbar::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34,197,94,0.3), transparent);
        }

        @keyframes nav-in {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          text-decoration: none;
          flex-shrink: 0;
        }

        .nav-logo-mark {
          position: relative;
          width: 40px; height: 40px;
          border-radius: 12px;
          background: #ffffff;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(245,158,11,0.3);
          box-shadow: 0 0 0 1px rgba(22,163,74,0.3), 0 8px 24px rgba(14,83,45,0.5);
          overflow: hidden;
          transition: var(--transition);
        }
        .nav-logo-mark:hover { transform: scale(1.05); box-shadow: 0 0 0 1px rgba(22,163,74,0.5), 0 12px 32px rgba(14,83,45,0.6); }
        .nav-logo-mark img {
          width: 41px; height: 26px; object-fit: contain;
          filter: brightness(1.1);
        }

        .nav-wordmark { display: flex; flex-direction: column; gap: 1px; }
        .nav-name {
          font-family: 'Fraunces', serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
          line-height: 1;
        }
        .nav-sub {
          font-size: 10px;
          font-weight: 500;
          color: var(--gold-light);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          line-height: 1;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .nav-link {
          padding: 7px 16px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: var(--transition);
          white-space: nowrap;
        }
        .nav-link:hover {
          color: var(--text);
          background: var(--surface);
          border-color: var(--border);
        }

        .nav-cta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 8px;
        }
@media (max-width: 640px) {
          .navbar {
            padding: 0 14px;
          }
          .nav-wordmark {
            display: none;
          }
          .nav-cta {
            gap: 6px;
            margin-left: 4px;
          }
          .btn-pill {
            padding: 7px 14px;
            font-size: 12px;
          }
        }

        @media (max-width: 380px) {
          .btn-pill-outline {
            display: none;
          }
        }
        .btn-pill {
          padding: 9px 22px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: var(--transition);
          white-space: nowrap;
          border: none;
        }
        .btn-pill-outline {
          background: transparent;
          color: var(--text-2);
          border: 1px solid var(--border);
        }
        .btn-pill-outline:hover {
          color: var(--text);
          border-color: rgba(255,255,255,0.2);
          background: var(--surface);
        }
        .btn-pill-primary {
          background: linear-gradient(135deg, var(--gold), var(--gold-light));
          color: #1a0a00;
          font-weight: 700;
          box-shadow: 0 4px 20px rgba(180,83,9,0.4), 0 0 0 1px rgba(245,158,11,0.3);
        }
        .btn-pill-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(180,83,9,0.55), 0 0 0 1px rgba(245,158,11,0.4);
        }

        .nav-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          padding: 8px;
          cursor: pointer;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .nav-hamburger span {
          display: block;
          width: 20px; height: 2px;
          background: var(--text-2);
          border-radius: 2px;
          transition: var(--transition);
        }

        /* ─── LAYOUT ─── */
        .page {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          padding-top: var(--nav-h);
          display: flex;
          align-items: stretch;
        }

        /* ─── LEFT PANEL ─── */
        .left-panel {
          flex: 1.2;
          padding: 56px 52px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0;
          animation: slide-left 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both;
          position: relative;
        }
        @keyframes slide-left {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(22,163,74,0.1);
          border: 1px solid rgba(22,163,74,0.25);
          margin-bottom: 24px;
          width: fit-content;
        }
        .eyebrow-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--green-glow);
          box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
          animation: pulse-dot 2.5s ease-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.2); }
          50%       { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
        }
        .eyebrow-text {
          font-size: 11px;
          font-weight: 600;
          color: var(--green-glow);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          line-height: 1;
        }

        .hero-headline {
          font-family: 'Fraunces', serif;
          font-size: clamp(32px, 3.8vw, 56px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 32px;
        }
        .hero-headline em {
          font-style: italic;
          font-weight: 300;
          color: transparent;
          background: linear-gradient(120deg, var(--green-glow) 0%, var(--gold-light) 100%);
          -webkit-background-clip: text;
          background-clip: text;
        }

        /* ─── PORTRAIT CARD ─── */
        .portrait-card {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 4;
          max-height: 420px;
          border-radius: var(--radius-xl);
          overflow: hidden;
          border: 1px solid var(--border-gold);
          box-shadow:
            0 0 0 1px rgba(22,163,74,0.08),
            0 32px 80px rgba(0,0,0,0.65),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .portrait-img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center 20%;
          display: block;
          transition: transform 10s ease;
        }
        .portrait-card:hover .portrait-img { transform: scale(1.04); }
        .portrait-scrim {
          position: absolute; inset: 0;
          background:
            linear-gradient(to top, rgba(6,13,8,0.92) 0%, rgba(6,13,8,0.25) 50%, rgba(6,13,8,0.1) 100%),
            linear-gradient(135deg, rgba(14,83,45,0.25), rgba(180,83,9,0.1));
          pointer-events: none;
        }
        .portrait-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 28px 24px;
        }
        .portrait-desc {
          font-size: 12.5px;
          color: var(--text-2);
          line-height: 1.7;
          font-weight: 400;
          margin-bottom: 14px;
        }
        .portrait-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .portrait-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: rgba(6,13,8,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid var(--border-gold);
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.75);
        }
        .portrait-badge-live {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: rgba(6,13,8,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(22,163,74,0.3);
          border-radius: 100px;
          font-size: 10px;
          font-weight: 700;
          color: var(--green-glow);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
          margin-top: 32px;
        }
        .stat-cell {
          padding: 20px;
          text-align: center;
          position: relative;
        }
        .stat-cell + .stat-cell::before {
          content: '';
          position: absolute;
          left: 0; top: 25%; bottom: 25%;
          width: 1px;
          background: var(--border);
        }
        .stat-num {
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .stat-num sup {
          font-size: 14px;
          font-weight: 600;
          color: var(--gold-light);
          vertical-align: super;
          font-family: 'Sora', sans-serif;
        }
        .stat-label {
          font-size: 10.5px;
          color: var(--text-3);
          margin-top: 5px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .float-badge {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 16px;
          background: rgba(6,13,8,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-gold);
          border-radius: 14px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          pointer-events: none;
          z-index: 10;
        }
        .float-a {
          top: 90px; left: -8px;
          animation: float-up 5s ease-in-out infinite alternate;
        }
        .float-b {
          bottom: 120px; left: 0;
          animation: float-up 6s ease-in-out infinite alternate-reverse;
          animation-delay: -2s;
        }
        @keyframes float-up {
          from { transform: translateY(0); }
          to   { transform: translateY(-14px); }
        }

        .float-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--green-mid), var(--gold-mid));
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
        }

        .dot-live {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--green-glow);
          box-shadow: 0 0 0 0 rgba(34,197,94,0.5);
          animation: pulse-ring 2s ease-out infinite;
          flex-shrink: 0;
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }

        /* ─── RIGHT PANEL ─── */
        .right-panel {
          flex: 0.85;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 56px 56px 56px 12px;
          animation: slide-right 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both;
        }
        @keyframes slide-right {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 960px) {
          .page { flex-direction: column; }
          .nav-links { display: none; }
          .nav-hamburger { display: flex; }
          .left-panel { padding: 28px 24px 20px; flex: none; }
          .float-badge { display: none; }
          .hero-headline { font-size: clamp(24px,6vw,36px); margin-bottom: 20px; }
          .portrait-card { max-height: 260px; aspect-ratio: 16/9; }
          .stats-row { display: none; }
          .right-panel { flex: 1; padding: 24px 24px 40px; align-items: flex-start; }
        }
        @media (max-width: 480px) {
          .navbar { padding: 0 20px; }
          .left-panel { padding: 20px 16px 16px; }
          .right-panel { padding: 16px 16px 32px; }
          .portrait-card { max-height: 220px; }
          .btn-pill { padding: 8px 16px; font-size: 12px; }
          .nav-name { font-size: 14px; }
        }
      `}</style>

      {/* Scene / background */}
      <div className="scene">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <a className="nav-logo">
          <div className="nav-logo-mark">
            <img src={logo} alt="TASU" />
          </div>
          <div className="nav-wordmark">
            <span className="nav-name">Campus Connect</span>
            <span className="nav-sub">Exclusive for TSU Students</span>
          </div>
        </a>
       
        <div className="nav-cta">
          <button className="btn-pill btn-pill-outline"
            onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}>
            Sign In
          </button>
          <button className="btn-pill btn-pill-primary"
            onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}>
            Join Free →
          </button>
        </div>
        
      </nav>

      {/* Main layout */}
      <div className="page">

        {/* LEFT */}
        <div className="left-panel">
          
          {stats.activeNow > 0 && (
  <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:100,background:"rgba(22,163,74,0.08)",border:"1px solid rgba(22,163,74,0.2)",marginBottom:20,width:"fit-content"}}>
    <div className="dot-live" />
    <span style={{fontSize:12,fontWeight:600,color:"#22c55e",fontFamily:"'Sora',sans-serif"}}>
      {stats.activeNow} TASU student{stats.activeNow !== 1 ? "s" : ""} online now
    </span>
  </div>
)}
          <div className="eyebrow">
            <div className="eyebrow-dot" />
            <span className="eyebrow-text">Exclusively for TSU Student</span>
          </div>

          <h1 className="hero-headline">
            One Campus,<br />
            <em>Every Connection</em><br />
            You'll Ever Need
          </h1>

          <div className="portrait-card">
            <img src={campusBg} alt="Taraba State University campus" className="portrait-img" />
            <div className="portrait-scrim" />
            <div className="portrait-overlay">
              <p className="portrait-desc">
                The exclusive hub for TSU students — ideas, notices, and community in one place.
              </p>
              <div className="portrait-badge-row">
                <div className="portrait-badge">
                  <div className="dot-live" />
                  Campus Connect
                </div>
                <div className="portrait-badge-live">
                  <div className="dot-live" />
                  Live
                </div>
              </div>
            </div>
          </div>

          <div className="stats-row">
           <div className="stat-cell">
  <div className="stat-num">
    {stats.students > 0 ? studentFmt.num : "—"}
    {stats.students > 0 && <sup>{studentFmt.sup}</sup>}
  </div>
  <div className="stat-label">Registered Students</div>
</div>
<div className="stat-cell">
  <div className="stat-num">
    {deptFmt.num}
    {stats.departments > 0 && <sup>{deptFmt.sup}</sup>}
  </div>
  <div className="stat-label">Departments</div>
</div>
<div className="stat-cell">
  <div className="stat-num">100<sup>%</sup></div>
  <div className="stat-label">TASU Exclusive</div>
</div>
          </div>
        </div>

        {/* RIGHT — Auth form */}
        <div className="right-panel" id="auth-section">
          <Auth />
        </div>

      </div>
    </div>
  );
}

function ProtectedRoute() {
  const [authUser, setAuthUser] = useState<import("firebase/auth").User | null | undefined>(undefined);
  const [preloaderDone, setPreloaderDone] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      user => setAuthUser(user),
      (err) => console.error("Auth state error:", (err as any).code, err.message)
    );
    return () => unsub();
  }, []);

  // Wait for BOTH the real auth result AND the preloader's own animation to finish
  if (authUser === undefined || !preloaderDone) {
    return <Preloader onDone={() => setPreloaderDone(true)} />;
  }

  return authUser ? <AppShell currentUser={authUser} /> : <AppContent />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}