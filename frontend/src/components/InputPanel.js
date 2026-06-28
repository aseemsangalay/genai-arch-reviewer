import React from "react";
import "./InputPanel.css";

export default function InputPanel({ input, setInput, onSubmit, onPreset, loading, error }) {
  function handleKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
  }

  return (
    <div className="input-panel">
      <div className="input-intro">
        <h1 className="input-heading">Architecture Review</h1>
        <p className="input-subheading">
          Describe your GenAI system — RAG pipeline, agent workflow, LLM integration, or any AI architecture.
          Get a structured senior-level critique: scorecard, risks, tradeoffs, and one standout insight.
        </p>
      </div>

      <div className="input-form">
        <div className="textarea-wrap">
          <textarea
            className="input-textarea"
            placeholder="Describe your GenAI architecture. Include stack components, scale targets, and any constraints you're designing around..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={8}
            disabled={loading}
            autoFocus
          />
          <div className="textarea-footer">
            <span className="char-count">{input.length} / 5000</span>
            <button
              className="preset-btn"
              onClick={onPreset}
              disabled={loading}
              type="button"
            >
              Try canonical example
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <button
          className="submit-btn"
          onClick={onSubmit}
          disabled={loading || !input.trim()}
          type="button"
        >
          {loading ? (
            <span className="loading-state">
              <span className="loading-dots">
                <span /><span /><span />
              </span>
              Reviewing architecture…
            </span>
          ) : (
            "Review Architecture"
          )}
        </button>

        <p className="submit-hint">⌘ + Enter to submit</p>
      </div>
    </div>
  );
}
