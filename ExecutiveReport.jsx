import React, { useState } from "react";
import { BarChart3, Brain, ChevronDown, Download, FileText, Users } from "lucide-react";
import { reportUrl } from "./api";

const SECTIONS = [
  [
    Users,
    "Business summary",
    "Key findings on market opportunity, financial outlook, and value drivers.",
    "Covers headline commercial KPIs, the three-year P&L outlook, and the top three levers for franchise value — sponsorship packaging, fan-data ownership, and merchandise conversion.",
  ],
  [
    Brain,
    "AI recommendations",
    "Prioritised recommendations with impact, effort and timeline.",
    "Each recommendation is scored on expected revenue impact and delivery effort, then sequenced into a 90-day, 6-month and season-long roadmap for management sign-off.",
  ],
  [
    BarChart3,
    "Charts and visuals",
    "Explore key charts, dashboards and supporting visuals.",
    "Includes the fan-engagement trend, sponsorship benchmark table, channel allocation chart and the full three-year revenue and EBITDA build used in this report.",
  ],
];

export default function ExecutiveReport() {
  const [open, setOpen] = useState(null);

  return (
    <main>
      <section className="pageHead">
        <div>
          <span className="eyebrow">EXECUTIVE REPORT</span>
          <h1>What should management decide next?</h1>
          <p>Download the board-ready report with key insights, financial impact and clear recommendations.</p>
        </div>
      </section>

      <section className="reportHero">
        <div className="pdfCover">
          <b>
            Cricket<span>IQ</span>
          </b>
          <FileText size={68} />
          <strong>
            IPL Franchise
            <br />
            Opportunity Report
          </strong>
          <small>Executive Summary</small>
        </div>
        <div>
          <h2>Board-ready executive report</h2>
          <p>
            Comprehensive analysis of market opportunity, commercial projections, risks and
            AI-powered recommendations to support board-level decisions.
          </p>
          <div className="reportMeta">
            <span>
              Report type
              <br />
              <b>Executive Summary</b>
            </span>
            <span>
              Pages
              <br />
              <b>42</b>
            </span>
            <span>
              Generated
              <br />
              <b>Live</b>
            </span>
          </div>
          <a href={reportUrl} className="primary">
            <Download size={17} />
            Download PDF report
          </a>
        </div>
      </section>

      <section className="reportCards">
        {SECTIONS.map(([Icon, title, summary, detail], i) => {
          const isOpen = open === i;
          return (
            <article className="card" key={title} onClick={() => setOpen(isOpen ? null : i)}>
              <Icon />
              <h3>{title}</h3>
              <p>{isOpen ? detail : summary}</p>
              <a>
                {isOpen ? "Show less" : `View ${title.toLowerCase()}`}{" "}
                <ChevronDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
              </a>
            </article>
          );
        })}
      </section>
    </main>
  );
}