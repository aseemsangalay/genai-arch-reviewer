import React, { useState } from "react";
import "./InputPanel.css";

const CONTACT_EMAIL = "emailofaseem@gmail.com";
const ACCESS_CODE = process.env.REACT_APP_ACCESS_CODE || "";

export default function InputPanel({ input, setInput, onSubmit, onPreset, onDemoSubmit, loading, error, unlocked, onUnlock }) {
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);

  function handleKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
  }

  function handleCodeSubmit(e) {
    e.preventDefault();
    if (codeInput.trim() === ACCESS_CODE) {
      setCodeError(false);
      onUnlock();
    } else {
      setCodeError(true);
    }
  }

  return (
    <div className="input-panel">
      <div className="input-intro">
        <span className="input-eyebrow">Powered by Claude on AWS Bedrock</span>
        <h1 className="input-heading">Senior-level critique,<br />instantly.</h1>
        <p className="input-subheading">
          Describe your GenAI system — RAG pipeline, agent workflow, LLM integration, or any AI architecture.
          Get a structured critique backed by real architectural judgment.
        </p>
        <div className="intro-badges">
          {["Scorecard across 4 dimensions", "Risks with confidence scores", "Concrete tradeoffs, no invented metrics", "One killer insight a mid-level would miss"].map((t) => (
            <div key={t} className="intro-badge">
              <span className="intro-badge-dot" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="input-form">
        {/* Demo block — always visible */}
        <div className="demo-block">
          <div className="demo-block-left">
            <span className="demo-label">Try the demo</span>
            <p className="demo-desc">
              See a full review for a canonical RAG system — no code needed.
            </p>
          </div>
          <button
            className="demo-btn"
            onClick={onDemoSubmit}
            disabled={loading}
            type="button"
          >
            Run Demo
          </button>
        </div>

        <div className="divider-row">
          <span className="divider-line" />
          <span className="divider-text">or review your own architecture</span>
          <span className="divider-line" />
        </div>

        {/* Custom input — gated */}
        {unlocked ? (
          <>
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
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <button
              className="submit-btn"
              onClick={onSubmit}
              disabled={loading || !input.trim()}
              type="button"
            >
              Review Architecture
            </button>

            <p className="submit-hint">⌘ + Enter to submit</p>
          </>
        ) : (
          <div className="gate-block">
            <p className="gate-desc">Enter your access code to review your own architecture.</p>
            <form className="gate-form" onSubmit={handleCodeSubmit}>
              <input
                className={`gate-input ${codeError ? "gate-input-error" : ""}`}
                type="text"
                placeholder="Access code"
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value); setCodeError(false); }}
                autoComplete="off"
                spellCheck={false}
              />
              <button className="gate-btn" type="submit">Unlock</button>
            </form>
            {codeError && (
              <p className="gate-error">Incorrect code.</p>
            )}
            <p className="gate-contact">
              Don't have a code?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="gate-link">
                Contact Aseem
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
