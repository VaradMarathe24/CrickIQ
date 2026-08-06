import React, { useEffect, useState } from "react";
import { BarChart3, Brain, FileText, Home, Landmark, Megaphone } from "lucide-react";
import LandingPage from "./LandingPage";
import Dashboard from "./Dashboard";
import MarketIntelligence from "./MarketIntelligence";
import CampaignStudio from "./CampaignStudio";
import ExecutiveReport from "./ExecutiveReport";
import FinancialPlanning from "./FinancialPlanning";

const TABS = [
  ["landing", "Home", Home],
  ["dashboard", "Dashboard", BarChart3],
  ["market", "Market Intelligence", Brain],
  ["studio", "AI Campaign Studio", Megaphone],
  ["financial", "Financial Planning", Landmark],
  ["report", "Executive Report", FileText],
];

const PAGES = {
  landing: LandingPage,
  dashboard: Dashboard,
  market: MarketIntelligence,
  studio: CampaignStudio,
  financial: FinancialPlanning,
  report: ExecutiveReport,
};

export default function App() {
  const [page, setPage] = useState("landing");
  const Page = PAGES[page];

  const go = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    document.title =
      page === "landing" ? "CricketIQ — IPL franchise consulting" : `CricketIQ · ${TABS.find(([id]) => id === page)?.[1] ?? ""}`;
  }, [page]);

  return (
    <>
      <header>
        <button className="brand" onClick={() => go("landing")}>
          <span>CI</span>
          <b>
            Cricket<span>IQ</span>
          </b>
        </button>
        <nav>
          {TABS.map(([id, label, Icon]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => go(id)}>
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <Page go={go} />

      <footer className="siteFooter">
        <span>
          <b>CricketIQ</b> — market intelligence, AI strategy and financial modelling for IPL franchises.
        </span>
        <span>Built for board-level decisions.</span>
      </footer>
    </>
  );
}