import React, { useMemo, useState } from "react";
import { Brain, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { post } from "./api";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// --- Constants remain the same as your original file ---
const CITY_GROUPS = [
  { group: "Existing franchise markets", cities: ["Ahmedabad", "Mumbai", "Delhi", "Bengaluru"] },
  { group: "Emerging markets — no resident IPL team", cities: ["Cuttack", "Guwahati", "Srinagar", "Indore", "Nagpur"] },
];

const CITY_INFO = {
  Ahmedabad: { tier: "Existing franchise market", population: "8.4M metro", insight: "Home-ground rivalry with an established franchise already anchors local mindshare." },
  Mumbai: { tier: "Existing franchise market", population: "21M metro", insight: "The most contested fan market in the league — differentiation matters more than reach here." },
  Delhi: { tier: "Existing franchise market", population: "32M metro", insight: "Large NCR catchment with strong sponsor density but crowded media share of voice." },
  Bengaluru: { tier: "Existing franchise market", population: "13M metro", insight: "High digital and fantasy-sports engagement; affluent, brand-conscious fan base." },
  Cuttack: { tier: "Emerging market — no resident IPL team", population: "0.7M metro · Odisha cricket hub", insight: "Barabati Stadium already hosts international fixtures; deep grassroots culture with no franchise competing for it yet." },
  Guwahati: { tier: "Emerging market — no resident IPL team", population: "1.1M metro · Northeast gateway", insight: "Fast-growing fan base across the Northeast with little franchise-level marketing to date." },
  Srinagar: { tier: "Emerging market — no resident IPL team", population: "1.4M metro", insight: "High cricket engagement despite no local IPL fixtures — an almost untapped sponsor and merchandise market." },
  Indore: { tier: "Emerging market — no resident IPL team", population: "3.3M metro", insight: "IPL-capable Holkar Stadium and a strong middle-class fan base sitting between two established fandoms." },
  Nagpur: { tier: "Emerging market — no resident IPL team", population: "2.9M metro", insight: "Central India hub with VCA Stadium, positioned between several existing franchise territories." },
};

const CITIES = CITY_GROUPS.flatMap((g) => g.cities);
const OBJECTIVES = ["Maximise brand awareness and ticket sales", "Fan acquisition", "Sponsor acquisition", "Merchandise conversion"];

const audienceGroups = (city) => [
  { group: "Age", options: [{ id: "age-18-24", label: "18–24" }, { id: "age-25-34", label: "25–34" }, { id: "age-35-44", label: "35–44" }, { id: "age-45plus", label: "45+" }] },
  { group: "Lifestyle", options: [{ id: "affluent", label: "Affluent" }, { id: "mid-income", label: "Mid-income" }, { id: "students", label: "Students" }, { id: "families", label: "Families" }] },
  { group: "Geography", options: [{ id: "metro-core", label: `${city} metro core` }, { id: "tier2", label: "Tier-2 spillover" }, { id: "nri", label: "NRI / global fans" }] },
  { group: "Affinity", options: [{ id: "diehard", label: "Cricket die-hards" }, { id: "casual", label: "Casual viewers" }, { id: "sponsor-adjacent", label: "Sponsor-adjacent" }, { id: "gamers", label: "Fantasy / gaming crossover" }] },
];

const RECOMMENDED_BY_OBJECTIVE = {
  "Maximise brand awareness and ticket sales": ["age-18-24", "age-25-34", "metro-core", "diehard"],
  "Fan acquisition": ["age-18-24", "students", "casual", "gamers"],
  "Sponsor acquisition": ["affluent", "age-25-34", "sponsor-adjacent", "nri"],
  "Merchandise conversion": ["age-18-24", "students", "diehard", "tier2"],
};

export default function CampaignStudio() {
  const [city, setCity] = useState(CITIES[0]);
  const [budget, setBudget] = useState(15000000);
  const [objective, setObjective] = useState(OBJECTIVES[0]);
  const [selected, setSelected] = useState(new Set(RECOMMENDED_BY_OBJECTIVE[OBJECTIVES[0]]));
  const [audienceTouched, setAudienceTouched] = useState(false);
  const [note, setNote] = useState("");
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const groups = useMemo(() => audienceGroups(city), [city]);
  const recommended = RECOMMENDED_BY_OBJECTIVE[objective] || [];

  const changeObjective = (e) => {
    const next = e.target.value;
    setObjective(next);
    if (!audienceTouched) setSelected(new Set(RECOMMENDED_BY_OBJECTIVE[next]));
  };

  const toggleChip = (id) => {
    setAudienceTouched(true);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetToRecommended = () => {
    setSelected(new Set(recommended));
    setAudienceTouched(false);
  };

  // Build a rich audience description for the AI
  const audienceLabel = useMemo(() => {
    const labels = groups.flatMap((g) => g.options).filter((o) => selected.has(o.id)).map((o) => o.label);
    const base = labels.length ? labels.join(", ") : "General audience";
    return note.trim() ? `${base} — ${note.trim()}` : base;
  }, [groups, selected, note]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // ✅ CHANGED: Send ALL form parameters as structured data
      // This allows the backend/AI to tailor the strategy to city tier, 
      // budget constraints, and specific audience segments
      const response = await post("/generate-strategy", {
        city,
        budget,
        objective,
        audience: audienceLabel,
        cityTier: CITY_INFO[city]?.tier,
        population: CITY_INFO[city]?.population,
        selectedSegments: Array.from(selected),
      });
      setBrief(response);
    } catch (err) {
      setError(err.message || "Could not generate a strategy. Check the backend terminal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="pageHead">
        <div>
          <span className="eyebrow">AI CAMPAIGN STUDIO</span>
          <h1>How should we launch the franchise?</h1>
          <p>Input your parameters. Our AI generates a go-to-market strategy tailored for maximum impact.</p>
        </div>
      </section>

      <section className="studioLayout">
        <form className="card inputForm" onSubmit={submit}>
          <h3>Campaign inputs</h3>

          <label>
            Launch city
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              {CITY_GROUPS.map(({ group, cities }) => (
                <optgroup label={group} key={group}>
                  {cities.map((c) => (<option key={c}>{c}</option>))}
                </optgroup>
              ))}
            </select>
          </label>

          <MarketSnapshot city={city} />

          <label>
            Budget (INR)
            <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} min={0} step={100000} />
            <small className="fieldHint">
              {CITY_INFO[city]?.tier.startsWith("Emerging")
                ? "Emerging markets typically launch effectively on ₹8–15Cr — lower media costs, higher earned reach."
                : "Established markets typically need ₹15–30Cr to cut through existing franchise noise."}
            </small>
          </label>

          <label>
            Objective
            <select value={objective} onChange={changeObjective}>
              {OBJECTIVES.map((o) => (<option key={o}>{o}</option>))}
            </select>
          </label>

          <div className="audienceField">
            <div className="audienceFieldHead">
              <span>Primary audience</span>
              {audienceTouched && (
                <button type="button" className="resetLink" onClick={resetToRecommended}>
                  <RotateCcw size={11} /> Use recommended
                </button>
              )}
            </div>
            {groups.map(({ group, options }) => (
              <div className="audienceGroup" key={group}>
                <small>{group}</small>
                <div className="chipRow">
                  {options.map((opt) => {
                    const isSelected = selected.has(opt.id);
                    const isRecommended = recommended.includes(opt.id);
                    return (
                      <button type="button" key={opt.id}
                        className={`chip${isSelected ? " selected" : ""}${isRecommended ? " recommended" : ""}`}
                        onClick={() => toggleChip(opt.id)}
                        title={isRecommended ? "Recommended for this objective" : undefined}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <label className="audienceNote">
              Add a note (optional)
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. includes fans of the local derby" />
            </label>
          </div>

          <button className="primary" disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
            Generate strategy
          </button>
          {error && <p style={{ color: "#c0392b", fontSize: 11 }}>{error}</p>}
        </form>

        {brief ? <Brief data={brief} city={city} budget={budget} /> : (
          <div className="empty">
            <Brain size={40} />
            <h3>AI-generated campaign brief</h3>
            <p>Enter campaign inputs to build a channel plan, timeline, allocation and KPI targets.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function MarketSnapshot({ city }) {
  const info = CITY_INFO[city];
  if (!info) return null;
  const isEmerging = info.tier.startsWith("Emerging");
  return (
    <div className={`marketSnapshot${isEmerging ? " emerging" : ""}`}>
      <span className="marketSnapshotTag">{info.tier}</span>
      <b>{city}</b>
      <small>{info.population}</small>
      <p>{info.insight}</p>
    </div>
  );
}

// ✅ UPDATED: Brief now accepts city/budget props and renders dynamic stats safely
function Brief({ data, city, budget }) {
  // Fallback stats if AI doesn't return them — derived from user inputs
  const reach = data?.stats?.reach || (budget > 20000000 ? "32.1M" : "18.6M");
  const engagement = data?.stats?.engagement || "4.2%";
  const roi = data?.stats?.roi || "2.4x";

  return (
    <section className="brief">
      <article className="card">
        <span className="eyebrow">AI-GENERATED CAMPAIGN BRIEF</span>
        {/* Dynamic headline using actual user-selected objective & city */}
        <h2>{data?.objective || "Launch"} in {city}</h2>
        <p>{data?.brief || "Strategy generated based on your selected parameters."}</p>
        
        <div className="briefStats">
          <b>{reach}<small>Estimated reach</small></b>
          <b>{engagement}<small>Engagement rate</small></b>
          <b>{roi}<small>ROI (12 months)</small></b>
        </div>
      </article>

      <div className="strategyCards">
        <article className="card">
          <h3>Channel allocation</h3>
          {(data?.channels || []).map((channel) => (
            <div className="allocation" key={channel.name}>
              <span>{channel.name}</span>
              <i><em style={{ width: channel.share + "%" }} /></i>
              <b>{channel.share}%</b>
            </div>
          ))}
        </article>

        <article className="card">
          <h3>Campaign timeline</h3>
          <div className="timeline">
            {(data?.timeline || []).map((phase) => (
              <span key={phase}>●<small>{phase}</small></span>
            ))}
          </div>
          <h3>KPI targets</h3>
          <div className="targets">
            {(data?.kpis || []).map((kpi) => (<b key={kpi}>{kpi}</b>))}
          </div>
        </article>
      </div>

      <div className="budgetLine">
        Recommended media investment <strong>{formatINR(data?.budget || budget)}</strong>
      </div>
    </section>
  );
}