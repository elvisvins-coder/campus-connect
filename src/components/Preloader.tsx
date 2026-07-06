// src/components/Preloader.tsx
import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Connecting to campus…",
  "Loading your profile…",
  "Fetching your feed…",
  "Almost ready…",
];

export const Preloader = ({ onDone }: { onDone?: () => void } = {}) => {
  const [msgIdx,   setMsgIdx]   = useState(0);
  const [barWidth, setBarWidth]  = useState(0);
  const [exiting,  setExiting]   = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ramp = setTimeout(() => setBarWidth(85), 80);
    return () => clearTimeout(ramp);
  }, []);

  useEffect(() => {
    if (!onDone) return;
    setBarWidth(100);
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, 500);
    }, 300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Fraunces:opsz,wght@9..144,700;9..144,800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .cc-pre-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #060d08;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Sora', sans-serif;
          overflow: hidden;
          transition: opacity 0.5s ease, transform 0.5s ease;
          opacity: 1;
        }
        .cc-pre-root.exiting {
          opacity: 0;
          transform: scale(1.03);
          pointer-events: none;
        }
        .cc-pre-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .cc-pre-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(22,163,74,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22,163,74,0.04) 1px, transparent 1px);
          background-size: 52px 52px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 100%);
        }
        .cc-pre-orb-a {
          position: absolute;
          width: 520px; height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(20,83,45,0.45), transparent 70%);
          top: -200px; left: -160px;
          filter: blur(90px);
          animation: cc-pre-drift-a 14s ease-in-out infinite alternate;
        }
        .cc-pre-orb-b {
          position: absolute;
          width: 340px; height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(180,83,9,0.2), transparent 70%);
          bottom: -100px; right: -80px;
          filter: blur(80px);
          animation: cc-pre-drift-b 11s ease-in-out infinite alternate;
        }
        @keyframes cc-pre-drift-a {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.1); }
        }
        @keyframes cc-pre-drift-b {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-30px, -20px) scale(1.08); }
        }
        .cc-pre-logo-wrap {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin-bottom: 48px;
          animation: cc-pre-rise 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes cc-pre-rise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cc-pre-icon-ring {
          position: relative;
          width: 84px; height: 84px;
        }
        .cc-pre-icon-ring::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 26px;
          background: conic-gradient(
            #22c55e 0deg,
            #166534 90deg,
            #f59e0b 180deg,
            #166534 270deg,
            #22c55e 360deg
          );
          animation: cc-pre-spin 3s linear infinite;
        }
        @keyframes cc-pre-spin {
          to { transform: rotate(360deg); }
        }
        .cc-pre-icon-inner {
          position: absolute;
          inset: 3px;
          border-radius: 20px;
          background: linear-gradient(135deg, #0e1e12, #166534);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .cc-pre-wordmark {
          text-align: center;
        }
        .cc-pre-wordmark-main {
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 800;
          color: #f0f4f1;
          letter-spacing: -0.02em;
          line-height: 1;
          margin-bottom: 5px;
        }
        .cc-pre-wordmark-sub {
          font-size: 10px;
          font-weight: 700;
          color: #f59e0b;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .cc-pre-progress-wrap {
          width: min(320px, 80vw);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          animation: cc-pre-rise 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both;
        }
        .cc-pre-bar-track {
          width: 100%;
          height: 3px;
          border-radius: 3px;
          background: rgba(255,255,255,0.07);
          overflow: hidden;
          position: relative;
        }
        .cc-pre-bar-fill {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(90deg, #166534, #22c55e, #f59e0b);
          background-size: 200% 100%;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          animation: cc-pre-bar-shimmer 1.8s linear infinite;
          position: relative;
        }
        .cc-pre-bar-fill::after {
          content: '';
          position: absolute;
          right: -1px; top: -3px;
          width: 8px; height: 9px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 10px 3px rgba(34,197,94,0.6);
        }
        @keyframes cc-pre-bar-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .cc-pre-msg {
          font-size: 12px;
          font-weight: 500;
          color: rgba(240,244,241,0.4);
          letter-spacing: 0.04em;
          height: 18px;
        }
        .cc-pre-msg-inner {
          animation: cc-pre-msg-cycle 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes cc-pre-msg-cycle {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cc-pre-badge {
          position: absolute;
          bottom: 32px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          animation: cc-pre-rise 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
        .cc-pre-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34,197,94,0.7);
          animation: cc-pre-blink 1.4s ease-in-out infinite;
        }
        @keyframes cc-pre-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        .cc-pre-badge-text {
          font-size: 10.5px;
          font-weight: 600;
          color: rgba(240,244,241,0.4);
          letter-spacing: 0.06em;
        }
        .cc-pre-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .cc-pre-particle {
          position: absolute;
          width: 2px; height: 2px;
          border-radius: 50%;
          background: rgba(34,197,94,0.4);
          animation: cc-pre-float linear infinite;
        }
        @keyframes cc-pre-float {
          0%   { transform: translateY(0) scale(0); opacity: 0; }
          10%  { opacity: 1; transform: scale(1); }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-60vh) scale(0.5); opacity: 0; }
        }
      `}</style>

      <div className={`cc-pre-root${exiting ? " exiting" : ""}`}>

        <div className="cc-pre-bg">
          <div className="cc-pre-grid"/>
          <div className="cc-pre-orb-a"/>
          <div className="cc-pre-orb-b"/>
        </div>

        <div className="cc-pre-particles">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="cc-pre-particle"
              style={{
                left:  `${8 + (i * 7.5) % 88}%`,
                bottom: `${-4 + (i * 11) % 20}%`,
                animationDuration: `${4 + (i * 0.7) % 5}s`,
                animationDelay:    `${(i * 0.4) % 4}s`,
                width:  i % 3 === 0 ? "3px" : "2px",
                height: i % 3 === 0 ? "3px" : "2px",
                background: i % 4 === 0
                  ? "rgba(245,158,11,0.5)"
                  : "rgba(34,197,94,0.4)",
              }}
            />
          ))}
        </div>

        <div className="cc-pre-logo-wrap">
          <div className="cc-pre-icon-ring">
            <div className="cc-pre-icon-inner">🎓</div>
          </div>
          <div className="cc-pre-wordmark">
            <div className="cc-pre-wordmark-main">Campus Connect</div>
            <div className="cc-pre-wordmark-sub">Taraba State University · Jalingo</div>
          </div>
        </div>

        <div className="cc-pre-progress-wrap">
          <div className="cc-pre-bar-track">
            <div
              className="cc-pre-bar-fill"
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="cc-pre-msg">
            <div className="cc-pre-msg-inner" key={msgIdx}>
              {LOADING_MESSAGES[msgIdx]}
            </div>
          </div>
        </div>

        <div className="cc-pre-badge">
          <div className="cc-pre-badge-dot"/>
          <span className="cc-pre-badge-text">TASU · Secure Connection</span>
        </div>

      </div>
    </>
  );
};

export default Preloader;