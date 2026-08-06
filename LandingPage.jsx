import React, { useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  Brain,
  FileText,
  Megaphone,
} from "lucide-react";
import logo from "./assets/Logo.png"; // update path to match your project structure

const FEATURES = [
  [
    Brain,
    "Market intelligence",
    "Uncover market sizing, fan insights, and competitive benchmarks in one place.",
  ],
  [
    Megaphone,
    "AI campaign studio",
    "Generate a launch strategy tailored to city, audience, and budget in minutes.",
  ],
  [
    FileText,
    "Executive reporting",
    "Get board-ready reports with financial impact and clear next steps.",
  ],
];

const STEPS = [
  [
    "01",
    "Upload IPL data",
    BarChart3,
    "Bring in ticketing, fan and commercial data as-is.",
  ],
  [
    "02",
    "Analyse signals",
    Brain,
    "AI surfaces the patterns that actually move revenue.",
  ],
  [
    "03",
    "Generate strategy",
    Megaphone,
    "Turn findings into a channel plan and budget.",
  ],
  [
    "04",
    "Export report",
    FileText,
    "Ship a board-ready PDF with the recommendation.",
  ],
];

const STATS = [
  ["12+", "franchises analysed"],
  ["₹450Cr+", "commercial value modelled"],
  ["4.6x", "average faster than manual review"],
];

export default function Homepage({ go }) {
  useEffect(() => {
    document.title = "CricketIQ | Homepage";
  }, []);

  return (
    <main className="landing homepage" aria-label="Homepage">
      <section className="hero">
        <div className="heroContent">
          <img src={logo} alt="CricketIQ logo" className="heroLogo" />

          <span className="eyebrow">
            HOMEPAGE · IPL FRANCHISE CONSULTING PLATFORM
          </span>

          <h1>
            Turn cricket data
            <br />
            into <em>board-ready</em>
            <br />
            decisions.
          </h1>

          <p className="heroText">
            CricketIQ combines market intelligence, AI strategy and financial
            modelling to help IPL franchises grow revenue, build stronger
            brands and win on and off the field.
          </p>

          <div className="heroActions">
            <button className="primary" onClick={() => go("dashboard")}>
              Start analysis <ArrowRight size={17} />
            </button>

            <button className="secondary" onClick={() => go("report")}>
              See a sample report
            </button>
          </div>

          <div className="trustStrip">
            {STATS.map(([value, label]) => (
              <div className="stat" key={label}>
                <b>{value}</b>
                <small>{label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="heroCards">
          {FEATURES.map(([Icon, title, text]) => (
            <article key={title} className="featureCard">
              <Icon size={28} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow">
        <div className="workflowHead">
          <span className="eyebrow">OUR 4-STEP WORKFLOW</span>
          <h2>From dataset to management decision</h2>
        </div>

        <div className="steps">
          {STEPS.map(([n, t, Icon, text]) => (
            <article key={n} className="stepCard">
              <b>{n}</b>
              <Icon size={26} />
              <h3>{t}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <div className="footer">
          2025 CricketIQ. All rights reserved. <br />
          Designed by Varad Marathe.
        </div>
      </section>
    </main>
  );
}