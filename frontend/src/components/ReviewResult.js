import React from "react";
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
        <button className="reset-btn" onClick={onReset}>
          ← New review
        </button>
      </div>

      {/* Review Confidence */}
      {review_confidence && (
        <section className="confidence-banner">
          <div className="confidence-banner-left">
            <span className="confidence-banner-label">Review Confidence</span>
            <span className="confidence-banner-score">{review_confidence.score}%</span>
          </div>
          {review_confidence.missing && review_confidence.missing.length > 0 && (
            <ul className="confidence-missing-list">
              {review_confidence.missing.map((m, i) => (
                <li key={i} className="confidence-missing-item">{m}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Killer Insight — visually distinct, first */}
      {killer_insight.insight && (
        <section className="killer-section">
          <div className="killer-label">Killer Insight</div>
          <p className="killer-insight">{killer_insight.insight}</p>
          {killer_insight.why_it_matters && (
            <p className="killer-why">{killer_insight.why_it_matters}</p>
          )}
        </section>
      )}

      {/* Scorecard */}
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

      {/* Assumptions */}
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

      {/* Critical Risks */}
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
                    <span className="risk-trigger-label">Trigger: </span>
                    {r.trigger}
                  </p>
                )}
                {r.reasoning && (
                  <p className="risk-reasoning">{r.reasoning}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strengths */}
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

      {/* Key Unresolved Decisions */}
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

      {/* Recommended Changes */}
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
