import React, { useState } from "react";
import "./InputPanel.css";

const CONTACT_EMAIL = "emailofaseem@gmail.com";

export default function InputPanel({
  input, setInput,
  accessCode, setAccessCode,
  onDemoSubmit, onCustomSubmit,
  loading, error, setError,
  unlocked, onUnlock,
}) {
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  function handleKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    setVerifying(true);
    setCodeError(false);

    // Verify by attempting a minimal review — server rejects 401 if code is wrong
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Code": code,
        },
        body: JSON.stringify({ input: "verify" }),
      });
      if (res.status === 401) {
        setCodeError(true);
      } else {
        // 400 (input too short) means the code was accepted — gate opens
        setAccessCode(code);
        onUnlock();
      }
    } catch {
      setCodeError(true);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit() {
    if (!input.trim() || loading) return;
    setError(null);
    const result = await onCustomSubmit(input, accessCode);
    if (result?.invalidCode) {
      setCodeError(true);
    }
  }

  return (
    <div className="input-panel">
      <div className="input-intro">
        <span className="input-eyebrow">Powered by AWS Bedrock</span>
        <h1 className="input-heading">Senior-level critique,<br />instantly.</h1>
        <p className="input-subheading">
          Describe your GenAI system — RAG pipeline, agent workflow, LLM integration, or any AI architecture.
          Get a structured critique backed by real architectural judgment.
        </p>
        <div className="intro-badges">
          {[
            "Scorecard across 4 dimensions",
            "Risks with confidence scores",
            "Concrete tradeoffs, no invented metrics",
            "One killer insight a mid-level would miss",
          ].map((t) => (
            <div key={t} className="intro-badge">
              <span className="intro-badge-dot" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="input-form">
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
            {codeError && <div className="error-banner">Access code rejected. Contact Aseem for a valid code.</div>}

            <button
              className="submit-btn"
              onClick={handleSubmit}
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
                disabled={verifying}
              />
              <button className="gate-btn" type="submit" disabled={verifying}>
                {verifying ? "Checking…" : "Unlock"}
              </button>
            </form>
            {codeError && <p className="gate-error">Incorrect code.</p>}
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
