import React, { useState } from "react";
import "./App.css";
import InputPanel from "./components/InputPanel";
import ReviewResult from "./components/ReviewResult";
import LoadingPanel from "./components/LoadingPanel";

const CANONICAL = `I'm building a RAG-based customer support platform for 1M users, using OpenAI embeddings + Pinecone + GPT-4 for generation, expecting 10K daily active users, sub-2-second response requirement.`;

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unlocked, setUnlocked] = useState(false);

  async function submitInput(text) {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review failed");
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    submitInput(input);
  }

  function handleDemoSubmit() {
    setInput(CANONICAL);
    submitInput(CANONICAL);
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
          <span className="header-tag">Powered by Claude on AWS Bedrock</span>
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
            onSubmit={handleSubmit}
            onDemoSubmit={handleDemoSubmit}
            loading={loading}
            error={error}
            unlocked={unlocked}
            onUnlock={() => setUnlocked(true)}
          />
        )}
      </main>
    </div>
  );
}
