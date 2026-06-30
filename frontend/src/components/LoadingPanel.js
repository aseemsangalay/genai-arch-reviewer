import React, { useState, useEffect } from "react";
import "./LoadingPanel.css";

const PHASES = [
  "Reading your architecture…",
  "Mapping component dependencies…",
  "Stress-testing at scale…",
  "Identifying failure modes…",
  "Evaluating tradeoffs…",
  "Formulating killer insight…",
];

const PHASE_DURATION = 2400; // ms per phase

export default function LoadingPanel() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const total = PHASES.length * PHASE_DURATION;
    const tick = 80;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += tick;
      const pct = Math.min((elapsed / total) * 92, 92); // cap at 92 until done
      setProgress(pct);
      setPhaseIndex(Math.min(Math.floor(elapsed / PHASE_DURATION), PHASES.length - 1));
    }, tick);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-panel">
      <div className="loading-inner">
        <div className="loading-icon">
          <span className="loading-ring" />
        </div>

        <div className="loading-phases">
          {PHASES.map((phase, i) => (
            <span
              key={i}
              className={`loading-phase ${i === phaseIndex ? "active" : i < phaseIndex ? "done" : "pending"}`}
            >
              {i < phaseIndex ? "✓ " : ""}{phase}
            </span>
          ))}
        </div>

        <div className="loading-bar-wrap">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <p className="loading-note">Senior-level critique takes a moment. No shortcuts.</p>
      </div>
    </div>
  );
}
