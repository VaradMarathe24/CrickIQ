import React, { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { get } from "./api";

const SPONSOR_CATEGORIES = ["Fintech", "Automotive", "Consumer durable"];

export default function MarketIntelligence() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      setData(await get("/market"));
    } catch (e) {
      setError(
        e.message ||
          "Market intelligence could not be generated. Check the backend terminal and open http://localhost:4000/market."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error)
    return (
      <main className="loadError">
        <AlertCircle size={34} />
        <h2>Market intelligence could not load</h2>
        <p>{error}</p>
        <button className="primary" onClick={load}>
          Try again
        </button>
      </main>
    );

  if (!data)
    return (
      <main className="loading">
        <Loader2 className="spin" />
        Generating market intelligence…
      </main>
    );

  return (
    <main>
      <section className="pageHead">
        <div>
          <span className="eyebrow">MARKET INTELLIGENCE</span>
          <h1>Where is the business opportunity?</h1>
          <p>AI-powered market and competitive intelligence to identify the best opportunities for your franchise.</p>
        </div>
        <button className="primary" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Regenerate
        </button>
      </section>

      <section className="aiCallout">
        <Sparkles />
        <div>
          <b>AI recommendation</b>
          <p>
            Prioritise a digital-first franchise launch with owned fan data at its core. Strong
            fan demand and sponsor interest create a compelling entry window.
          </p>
        </div>
        <strong>
          {data.kpis[3].value}
          <small>Opportunity score</small>
        </strong>
      </section>

      <section className="swot">
        {Object.entries(data.swot).map(([key, items]) => (
          <article className="card" key={key}>
            <h3>{key}</h3>
            {items.map((item) => (
              <p key={item}>· {item}</p>
            ))}
            <a>View details →</a>
          </article>
        ))}
      </section>

      <section className="marketRows">
        <article className="card">
          <h3>Competitor benchmark</h3>
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Engagement</th>
                <th>Commercial</th>
              </tr>
            </thead>
            <tbody>
              {data.benchmarks.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.engagement}%</td>
                  <td>{row.commercial}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Sponsor opportunity recommendations</h3>
          {data.recommendations.map((rec, i) => (
            <div className="recommend" key={rec}>
              <b>{SPONSOR_CATEGORIES[i] || "Other"}</b>
              <span>{rec}</span>
              <em>★★★★★</em>
            </div>
          ))}
        </article>
      </section>
    </main>
  );
}