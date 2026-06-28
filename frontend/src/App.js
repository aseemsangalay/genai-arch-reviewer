import React, { useState } from "react";
import "./App.css";
import InputPanel from "./components/InputPanel";
import ReviewResult from "./components/ReviewResult";

const CANONICAL = `I'm building a RAG-based customer support platform for 1M users, using OpenAI embeddings + Pinecone + GPT-4 for generation, expecting 10K daily active users, sub-2-second response requirement.`;

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
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
        {!result ? (
          <InputPanel
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            onPreset={() => setInput(CANONICAL)}
            loading={loading}
            error={error}
          />
        ) : (
          <ReviewResult result={result} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
