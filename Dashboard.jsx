import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, TrendingUp, Upload, Users } from "lucide-react";
import { get, upload } from "./api";

const METRIC_ICONS = [Users, TrendingUp, TrendingUp, Users];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setError("");
    setSyncing(true);
    try {
      setData(await get("/dashboard"));
    } catch (e) {
      setError(
        e.message ||
          "The API did not return dashboard data. Check http://localhost:4000/dashboard and the backend terminal."
      );
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e) => {
    try {
      const result = await upload(e.target.files);
      setMessage(result.message);
      load();
    } catch {
      setMessage("Upload failed.");
    }
  };

  if (error) return <LoadFailed message={error} retry={load} />;
  if (!data)
    return (
      <main className="loading">
        <Loader2 className="spin" />
        Loading data intelligence…
      </main>
    );

  return (
    <main>
      <section className="pageHead">
        <div>
          <span className="eyebrow">DASHBOARD · DATA TO DECISION</span>
          <h1>Season performance overview</h1>
        </div>
        <div className="actions">
          <label className="button">
            <Upload size={16} />
            Upload CSV
            <input type="file" accept=".csv" multiple onChange={handleUpload} />
          </label>
          <button className="primary" onClick={load} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? "spin" : ""} />
            Sync data
          </button>
        </div>
      </section>

      <p className="source">
        {data.source}
        {message && ` · ${message}`}
      </p>

      <section className="kpis">
        {data.kpis.map((kpi, i) => {
          const Icon = METRIC_ICONS[i] || Users;
          return (
            <article key={kpi.label}>
              <span className="metricIcon">
                <Icon size={20} />
              </span>
              <div>
                <small>{kpi.label}</small>
                <strong>{kpi.value}</strong>
                <em>↑ {kpi.change}</em>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashGrid">
        <Card title="Team popularity" hint={`${data.teams.length} teams`}>
          <div className={`teamBars${data.teams.length > 6 ? " scroll" : ""}`}>
            {data.teams.map((team) => (
              <div key={team.name}>
                <label>
                  {team.name}
                  <b>{team.score}%</b>
                </label>
                <i>
                  <em style={{ width: team.score + "%" }} />
                </i>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Fan sentiment">
          <div className="sentiment">
            <div>
              <b>{data.sentiment.positive}%</b>
              <small>Net sentiment</small>
            </div>
          </div>
          <p className="key">
            <span />
            Positive <b>{data.sentiment.positive}%</b>
            <span />
            Neutral <b>{data.sentiment.neutral}%</b>
            <span />
            Negative <b>{data.sentiment.negative}%</b>
          </p>
        </Card>

        <Card title="Player insights" hint={`${data.players.length} players`}>
          <PlayerInsights players={data.players} />
        </Card>

        <Card title="Engagement trend">
          <EngagementTrend fixtures={data.fixtures} />
        </Card>
      </section>
    </main>
  );
}

function Card({ title, hint, children }) {
  return (
    <article className="card dashCard">
      <h3>
        {title}
        {hint && <small>{hint}</small>}
      </h3>
      {children}
    </article>
  );
}

function LoadFailed({ message, retry }) {
  return (
    <main className="loadError">
      <AlertCircle size={34} />
      <h2>Dashboard data could not load</h2>
      <p>{message}</p>
      <button className="primary" onClick={retry}>
        Try again
      </button>
    </main>
  );
}

// Player insights: every field the backend sends (name, role, team, stat,
// rating, and any secondary stat) is shown directly — nothing hidden behind
// a click, so it's clear at a glance what data actually came back.
function PlayerInsights({ players }) {
  return (
    <div className={`playerList${players.length > 4 ? " scroll" : ""}`}>
      {players.map((player) => (
        <div className="player" key={player.name}>
          <div className="playerTop">
            <Users size={15} />
            <span className="playerName">{player.name}</span>
            <span className="roleBadge">{player.role || "Player"}</span>
          </div>
          <div className="playerStats">
            <span className="team">{player.team || "—"}</span>
            <span className="primary">
              {player.value} {player.label}
            </span>
            {player.secondary && (
              <span className="secondary">
                + {player.secondary.value} {player.secondary.label}
              </span>
            )}
          </div>
          <RatingBar value={player.rating} />
        </div>
      ))}
    </div>
  );
}

function RatingBar({ value }) {
  const rating = value ?? 0;
  return (
    <span className="ratingBar">
      <i>
        <em style={{ width: `${(rating / 10) * 100}%` }} />
      </i>
      <b>{rating.toFixed(1)}/10</b>
    </span>
  );
}

// --- Engagement trend: hoverable points plus a computed narrative summary. ---
function EngagementTrend({ fixtures }) {
  const [hover, setHover] = useState(null);

  const points = useMemo(
    () =>
      fixtures.map((f, i) => ({
        ...f,
        x: i * (400 / Math.max(fixtures.length - 1, 1)),
        y: 155 - f.value * 1.25,
      })),
    [fixtures]
  );

  const description = useMemo(() => {
    if (!fixtures.length) return "";
    const first = fixtures[0];
    const last = fixtures[fixtures.length - 1];
    const peak = fixtures.reduce((a, b) => (b.value > a.value ? b : a));
    const low = fixtures.reduce((a, b) => (b.value < a.value ? b : a));
    const change = first.value ? Math.round(((last.value - first.value) / first.value) * 100) : 0;
    const direction = change >= 0 ? "up" : "down";
    return `Engagement is ${direction} ${Math.abs(change)}% from the season opener (${first.match}) to the latest fixture (${last.match}), peaking at ${peak.match} (${peak.value}) and dipping lowest at ${low.match} (${low.value}).`;
  }, [fixtures]);

  return (
    <>
      <div className="trendChart">
        <svg viewBox="0 0 400 170" onMouseLeave={() => setHover(null)}>
          <line x1="0" y1="155" x2="400" y2="155" stroke="#dce3e9" />
          <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#96c700" strokeWidth="4" />
          {points.map((p, i) => (
            <circle
              key={p.match}
              cx={p.x}
              cy={p.y}
              r={hover === i ? 6 : 4}
              fill={hover === i ? "#ffb703" : "#96c700"}
              stroke="#fff"
              strokeWidth="1.5"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </svg>
        {hover !== null && (
          <div
            className="trendTooltip"
            style={{ left: `${(points[hover].x / 400) * 100}%`, top: `${(points[hover].y / 170) * 100}%` }}
          >
            <b>{points[hover].match}</b>
            <span>{points[hover].value} engagement index</span>
          </div>
        )}
      </div>
      <p className="trendDescription">{description}</p>
    </>
  );
}