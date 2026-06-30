import React, { useState } from "react";
import "./App.css";
import InputPanel from "./components/InputPanel";
import ReviewResult from "./components/ReviewResult";
import LoadingPanel from "./components/LoadingPanel";

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  async function submitDemo() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/review/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review failed");
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitCustom(text, code) {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Code": code,
        },
        body: JSON.stringify({ input: text.trim() }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setLoading(false);
        return { invalidCode: true };
      }
      if (!res.ok) throw new Error(data.error || "Review failed");
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    return {};
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setInput("");
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <span className="header-logo">◈</span>
            <span className="header-title">GenAI Architecture Review</span>
          </div>
          <a href="mailto:emailofaseem@gmail.com" className="header-contact">Request access</a>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <LoadingPanel />
        ) : result ? (
          <ReviewResult result={result} onReset={handleReset} />
        ) : (
          <InputPanel
            input={input}
            setInput={setInput}
            accessCode={accessCode}
            setAccessCode={setAccessCode}
            onDemoSubmit={submitDemo}
            onCustomSubmit={submitCustom}
            loading={loading}
            error={error}
            setError={setError}
            unlocked={unlocked}
            onUnlock={() => setUnlocked(true)}
          />
        )}
      </main>
    </div>
  );
}
