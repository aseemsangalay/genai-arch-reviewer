import React, { useEffect, useRef } from "react";
import "./ReviewResult.css";

function ScoreBar({ score }) {
  return (
    <div className="score-bar" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`score-pip ${n <= score ? "filled" : ""}`} />
      ))}
    </div>
  );
}

function ConfidenceBadge({ level }) {
  return <span className={`confidence-badge confidence-${level}`}>{level}</span>;
}

function ArchitectureDiagram({ mermaidSrc }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!mermaidSrc || !ref.current) return;
    let cancelled = false;

    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        themeVariables: {
          primaryColor: "#f8f9fb",
          primaryTextColor: "#111111",
          primaryBorderColor: "#d1d5db",
          lineColor: "#71717a",
          secondaryColor: "#f3f4f6",
          tertiaryColor: "#ffffff",
          fontFamily: "Inter, -apple-system, sans-serif",
          fontSize: "13px",
        },
      });
      const id = `mermaid-${Date.now()}`;
      mermaid.render(id, mermaidSrc).then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      }).catch(() => {});
    });

    return () => { cancelled = true; };
  }, [mermaidSrc]);

  if (!mermaidSrc) return null;

  return (
    <div className="diagram-section">
      <h3 className="section-title">Architecture Map</h3>
      <div className="diagram-wrap">
        <div ref={ref} />
      </div>
    </div>
  );
}

export default function ReviewResult({ result, onReset }) {
  const {
    assumptions = [],
    scorecard = {},
    critical_risks = [],
    strengths = [],
    recommended_changes = [],
    killer_insight = {},
    key_unresolved_decisions = [],
    review_confidence = null,
    architecture_diagram = null,
  } = result;

  const scorecardLabels = {
    scalability: "Scalability",
    reliability: "Reliability",
    security: "Security",
    cost_efficiency: "Cost Efficiency",
  };

  return (
    <div className="result">
      <div className="result-header">
        <div className="result-header-left">
          <h2 className="result-title">Architecture Review</h2>
          <span className="result-subtitle">Senior-level critique</span>
        </div>
        <button className="reset-btn" onClick={onReset}>← New review</button>
      </div>

      {review_confidence && (
        <section className="confidence-banner">
          <div className="confidence-banner-left">
            <span className="confidence-banner-label">Review Confidence</span>
            <span className="confidence-banner-score">{review_confidence.score}%</span>
          </div>
          {review_confidence.missing?.length > 0 && (
            <ul className="confidence-missing-list">
              {review_confidence.missing.map((m, i) => (
                <li key={i} className="confidence-missing-item">{m}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {killer_insight.insight && (
        <section className="killer-section">
          <div className="killer-label">Killer Insight</div>
          <p className="killer-insight">{killer_insight.insight}</p>
          {killer_insight.why_it_matters && (
            <p className="killer-why">{killer_insight.why_it_matters}</p>
          )}
        </section>
      )}

      {architecture_diagram?.mermaid && (
        <ArchitectureDiagram mermaidSrc={architecture_diagram.mermaid} />
      )}

      <section className="section">
        <h3 className="section-title">Scorecard</h3>
        <div className="scorecard-grid">
          {Object.entries(scorecardLabels).map(([key, label]) => {
            const item = scorecard[key];
            if (!item) return null;
            return (
              <div key={key} className="scorecard-item">
                <div className="scorecard-top">
                  <span className="scorecard-label">{label}</span>
                  <div className="scorecard-right">
                    <ScoreBar score={item.score} />
                    <span className="scorecard-score">{item.score}/5</span>
                  </div>
                </div>
                <p className="scorecard-justification">{item.justification}</p>
              </div>
            );
          })}
        </div>
      </section>

      {assumptions.length > 0 && (
        <section className="section">
          <h3 className="section-title">Assumptions Made</h3>
          <ul className="assumption-list">
            {assumptions.map((a, i) => (
              <li key={i} className="assumption-item">{a}</li>
            ))}
          </ul>
        </section>
      )}

      {critical_risks.length > 0 && (
        <section className="section">
          <h3 className="section-title">Critical Risks</h3>
          <div className="risk-list">
            {critical_risks.map((r, i) => (
              <div key={i} className={`risk-item risk-${r.confidence}`}>
                <div className="risk-header">
                  <span className="risk-title">{r.risk}</span>
                  <ConfidenceBadge level={r.confidence} />
                </div>
                {r.trigger && (
                  <p className="risk-trigger">
                    <span className="risk-trigger-label">Trigger: </span>{r.trigger}
                  </p>
                )}
                {r.reasoning && <p className="risk-reasoning">{r.reasoning}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {strengths.length > 0 && (
        <section className="section">
          <h3 className="section-title">Strengths</h3>
          <ul className="strength-list">
            {strengths.map((s, i) => (
              <li key={i} className="strength-item">{s}</li>
            ))}
          </ul>
        </section>
      )}

      {key_unresolved_decisions.length > 0 && (
        <section className="section">
          <h3 className="section-title">Key Unresolved Decisions</h3>
          <ul className="unresolved-list">
            {key_unresolved_decisions.map((d, i) => (
              <li key={i} className="unresolved-item">{d}</li>
            ))}
          </ul>
        </section>
      )}

      {recommended_changes.length > 0 && (
        <section className="section">
          <h3 className="section-title">Recommended Changes</h3>
          <div className="rec-list">
            {recommended_changes.map((r, i) => (
              <div key={i} className="rec-item">
                <div className="rec-number">{String(i + 1).padStart(2, "0")}</div>
                <div className="rec-body">
                  <p className="rec-change">{r.change}</p>
                  {r.reasoning && <p className="rec-reasoning">{r.reasoning}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
