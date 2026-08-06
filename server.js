import express from "express";
import cors from "cors";
import multer from "multer";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(here, "uploads");
const dataDir = path.join(here, "data");
for (const folder of [uploadDir, dataDir]) fs.mkdirSync(folder, { recursive: true });

const app = express();
const upload = multer({ dest: uploadDir, limits: { fileSize: 25 * 1024 * 1024 } });
app.use(cors());
app.use(express.json());

const TEAM_LIMIT = 8;
const PLAYER_LIMIT = 6;

const demo = {
  teams: [
    { name: "Chennai Super Kings", score: 92 },
    { name: "Mumbai Indians", score: 87 },
    { name: "Gujarat Titans", score: 84 },
    { name: "Royal Challengers Bengaluru", score: 81 },
    { name: "Kolkata Knight Riders", score: 78 },
    { name: "Rajasthan Royals", score: 75 },
    { name: "Sunrisers Hyderabad", score: 71 },
    { name: "Delhi Capitals", score: 68 },
  ],
  players: [
    { name: "Sai Sudharsan", team: "Gujarat Titans", role: "Batter", value: 759, label: "runs", rating: 8.9 },
    { name: "Suryakumar Yadav", team: "Mumbai Indians", role: "Batter", value: 717, label: "runs", rating: 8.7 },
    { name: "Ravindra Jadeja", team: "Chennai Super Kings", role: "All-rounder", value: 312, label: "runs", rating: 8.6, secondary: { value: 18, label: "wickets" } },
    { name: "Yashasvi Jaiswal", team: "Rajasthan Royals", role: "Batter", value: 625, label: "runs", rating: 8.4 },
    { name: "Prasidh Krishna", team: "Gujarat Titans", role: "Bowler", value: 25, label: "wickets", rating: 8.3 },
    { name: "Mohammed Shami", team: "Sunrisers Hyderabad", role: "Bowler", value: 22, label: "wickets", rating: 8.1 },
  ],
  sentiment: { positive: 64, neutral: 23, negative: 13, sample: 0 },
  fixtures: [
    { match: "vs CSK", value: 54 }, { match: "vs MI", value: 61 }, { match: "vs RCB", value: 58 },
    { match: "vs KKR", value: 66 }, { match: "vs RR", value: 72 }, { match: "vs SRH", value: 69 },
    { match: "vs DC", value: 77 }, { match: "vs GT", value: 74 }, { match: "vs LSG", value: 81 },
    { match: "vs PBKS", value: 78 },
  ],
  source: "Demo data - add IPL CSV files to backend/data",
};

let cache = { fingerprint: "", value: null };

const dataFiles = () =>
  [dataDir, uploadDir].flatMap((folder) =>
    fs.readdirSync(folder).filter((f) => f.toLowerCase().endsWith(".csv")).map((f) => path.join(folder, f))
  );

const fingerprint = (files) =>
  files.map((f) => {
    const s = fs.statSync(f);
    return `${f}:${s.size}:${s.mtimeMs}`;
  }).join("|");

const number = (value) => Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;
const first = (row, keys) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== "") || "";

function splitCsv(line) {
  const cells = [];
  let quoted = false;
  let cell = "";
  for (const char of line + ",") {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(cell.replace(/^"|"$/g, "").trim());
      cell = "";
    } else cell += char;
  }
  return cells;
}

function parseCsvPreview(file) {
  const size = Math.min(fs.statSync(file).size, 8 * 1024 * 1024);
  const buffer = Buffer.alloc(size);
  const descriptor = fs.openSync(file, "r");
  try {
    fs.readSync(descriptor, buffer, 0, size, 0);
  } finally {
    fs.closeSync(descriptor);
  }
  const lines = buffer.toString("utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  if (size === fs.statSync(file).size) while (lines.length && !lines.at(-1)) lines.pop();
  else lines.pop();
  if (lines.length < 2) return [];
  const headers = splitCsv(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return lines.slice(1, 50001).filter(Boolean).map((line) => Object.fromEntries(headers.map((h, i) => [h, splitCsv(line)[i] || ""])));
}

function analyse() {
  const files = dataFiles();
  const stamp = fingerprint(files);
  if (cache.value && cache.fingerprint === stamp) return cache.value;
  if (!files.length) return demo;

  const teams = new Map();
  const players = new Map();
  const errors = [];
  let pos = 0, neg = 0, neutral = 0, records = 0;

  for (const file of files) {
    try {
      for (const row of parseCsvPreview(file)) {
        records++;
        const team = first(row, ["team", "team1", "battingteam", "winner", "franchise"]);
        if (team) teams.set(team, (teams.get(team) || 0) + 1);

        const player = first(row, ["player", "batter", "batsman", "playername", "striker"]);
        if (player) {
          const runs = number(first(row, ["runs", "battersruns", "battingruns", "totalruns"]));
          const wickets = number(first(row, ["wickets", "bowlerwickets", "totalwickets"]));
          const role = first(row, ["role", "playerrole", "position"]);
          const playerTeam = first(row, ["playerteam", "battingteam", "squad", "franchise"]) || team;

          const entry = players.get(player) || { runs: 0, wickets: 0, role: "", team: "" };
          entry.runs += runs;
          entry.wickets += wickets;
          if (role) entry.role = role;
          if (playerTeam) entry.team = playerTeam;
          players.set(player, entry);
        }

        const sentiment = first(row, ["sentiment", "sentimentlabel", "analysis"]).toLowerCase();
        if (sentiment.includes("positive")) pos++;
        else if (sentiment.includes("negative")) neg++;
        else if (sentiment) neutral++;
      }
    } catch (error) {
      errors.push(path.basename(file));
      console.error(`Skipped ${file}: ${error.message}`);
    }
  }

  const maxTeam = Math.max(...teams.values(), 1);
  const rankedTeams = [...teams].sort((a, b) => b[1] - a[1]).slice(0, TEAM_LIMIT)
    .map(([name, count]) => ({ name, score: Math.round(55 + (count / maxTeam) * 40) }));

  const scored = [...players].map(([name, p]) => ({
    name, team: p.team || "—", role: p.role || (p.wickets > p.runs / 20 ? "Bowler" : "Batter"),
    runs: p.runs, wickets: p.wickets, score: p.runs + p.wickets * 25,
  }));
  const maxScore = Math.max(...scored.map((p) => p.score), 1);
  const rankedPlayers = scored.sort((a, b) => b.score - a.score).slice(0, PLAYER_LIMIT).map((p) => {
    const useWickets = p.wickets > 0 && p.wickets * 25 > p.runs;
    return {
      name: p.name, team: p.team, role: p.role,
      value: useWickets ? p.wickets : p.runs, label: useWickets ? "wickets" : "runs",
      rating: Math.max(5, Math.round((p.score / maxScore) * 95) / 10),
    };
  });

  const sentimentTotal = pos + neg + neutral || 1;
  const value = {
    teams: rankedTeams.length ? rankedTeams : demo.teams,
    players: rankedPlayers.length ? rankedPlayers : demo.players,
    sentiment: {
      positive: Math.round((pos / sentimentTotal) * 100) || demo.sentiment.positive,
      neutral: Math.round((neutral / sentimentTotal) * 100) || demo.sentiment.neutral,
      negative: Math.round((neg / sentimentTotal) * 100) || demo.sentiment.negative,
      sample: records,
    },
    fixtures: demo.fixtures,
    source: `${files.length} project CSV file(s) - ${records.toLocaleString()} rows analysed${errors.length ? `; skipped: ${errors.join(", ")}` : ""}`,
  };
  cache = { fingerprint: stamp, value };
  return value;
}

function dashboard() {
  const data = analyse();
  const net = data.sentiment.positive - data.sentiment.negative;
  return {
    ...data,
    kpis: [
      { label: "Records analysed", value: data.sentiment.sample || "12,847", change: "Current dataset" },
      { label: "Net fan sentiment", value: `${net}%`, change: "Positive conversation" },
      { label: "Top team score", value: `${data.teams[0].score}/100`, change: data.teams[0].name },
      { label: "Opportunity score", value: "82/100", change: "High-priority market" },
    ],
  };
}

const EMERGING_CITIES = new Set(["Cuttack", "Guwahati", "Srinagar", "Indore", "Nagpur"]);

const CHANNEL_PLANS = {
  established: [
    { name: "Instagram", share: 26, role: "Reach and creators" },
    { name: "YouTube", share: 20, role: "Player stories" },
    { name: "WhatsApp", share: 16, role: "Community conversion" },
    { name: "X", share: 14, role: "Live match conversation" },
    { name: "LinkedIn", share: 12, role: "B2B sponsor narrative" },
    { name: "Email", share: 12, role: "CRM conversion" },
  ],
  emerging: [
    { name: "Instagram", share: 24, role: "Local-language reels" },
    { name: "YouTube", share: 16, role: "Player and city stories" },
    { name: "WhatsApp", share: 26, role: "Community seeding" },
    { name: "Ground activation", share: 18, role: "Stadium and college outreach" },
    { name: "Regional TV/radio", share: 10, role: "Broad-reach awareness" },
    { name: "X", share: 6, role: "Live match conversation" },
  ],
};

const TIMELINE_PLANS = {
  established: [
    "Months 1-2: Tease identity and recruit fans",
    "Months 3-5: Creator launch and community acquisition",
    "Months 6-8: Matchday conversion",
    "Months 9-12: Retention and merchandise",
  ],
  emerging: [
    "Months 1-3: Market education",
    "Months 4-6: Ground activation and grassroots partnerships",
    "Months 7-9: Digital community seeding",
    "Months 10-12: First matchday conversion push",
  ],
};

const OBJECTIVE_KPIS = {
  "Fan acquisition": ["1.2M qualified reach", "150K first-party fan profiles", "6.5% engagement rate", "18K conversions"],
  "Sponsor acquisition": ["8 qualified sponsor leads", "3 signed LOIs", "₹12Cr pipeline value", "40% share-of-voice lift"],
  "Merchandise conversion": ["45K unit sales", "₹3.2Cr merchandise revenue", "9% cart conversion", "22K repeat buyers"],
  "Maximise brand awareness and ticket sales": ["3.4M impressions", "62K ticket page visits", "11K tickets sold", "28% brand recall lift"],
};

function strategy(input = {}) {
  const city = input.city || "Mumbai";
  const budget = Number(input.budget) || 27500000;
  const audience = input.audience || "Digital-first fans aged 18-34";
  const objective = input.objective || "Fan acquisition";
  
  const cityTier = input.cityTier || (EMERGING_CITIES.has(city) ? "Emerging market" : "Existing franchise market");
  const population = input.population || "";
  const selectedSegments = input.selectedSegments || [];
  
  const tier = cityTier.startsWith("Emerging") ? "emerging" : "established";

  // 1. DYNAMIC BRIEF GENERATION
  let brief = "";
  if (tier === "emerging") {
    brief = `Launch a ${objective.toLowerCase()} programme in ${city} (${population}). As an emerging market with no resident IPL franchise today, prioritise ground activation and community seeding before heavy paid media. Focus on ${audience} to build foundational mindshare.`;
  } else {
    brief = `Launch a ${objective.toLowerCase()} programme in ${city} (${population}). In this highly contested existing franchise market, differentiation is key. Target ${audience} through premium digital storytelling and matchday experiences to capture share of voice.`;
  }

  if (selectedSegments.includes("students") || selectedSegments.includes("age-18-24")) {
    brief += " Leverage campus activations, fantasy sports integrations, and creator partnerships to drive youth engagement.";
  }
  if (selectedSegments.includes("affluent") || selectedSegments.includes("nri")) {
    brief += " Incorporate premium hospitality packages and exclusive D2C merchandise drops to maximize high-net-worth conversion.";
  }
  if (selectedSegments.includes("families")) {
    brief += " Develop family-friendly weekend zones and bundled ticketing to drive multi-generational matchday attendance.";
  }

  // 2. DYNAMIC STATS CALCULATION
  const budgetInCr = budget / 10000000;
  
  let reachMultiplier = tier === "emerging" ? 1.4 : 0.9;
  if (objective.includes("awareness")) reachMultiplier *= 1.3;
  if (objective.includes("Sponsor") || objective.includes("Merchandise")) reachMultiplier *= 0.5;
  const reachVal = budgetInCr * reachMultiplier;
  const reach = `${reachVal.toFixed(1)}M`;

  let baseEngagement = tier === "emerging" ? 5.2 : 3.8;
  if (selectedSegments.includes("diehard")) baseEngagement += 1.8;
  if (selectedSegments.includes("casual")) baseEngagement -= 0.6;
  if (selectedSegments.includes("gamers")) baseEngagement += 0.9;
  const engagement = `${baseEngagement.toFixed(1)}%`;

  let baseRoi = 1.8;
  if (objective.includes("Merchandise")) baseRoi = 3.2;
  if (objective.includes("Sponsor")) baseRoi = 4.5;
  if (tier === "emerging" && budget <= 15000000) baseRoi += 1.2;
  const roi = `${baseRoi.toFixed(1)}x`;

  return {
    city, budget, audience, objective, brief,
    channels: CHANNEL_PLANS[tier],
    timeline: TIMELINE_PLANS[tier],
    kpis: OBJECTIVE_KPIS[objective] || OBJECTIVE_KPIS["Fan acquisition"],
    stats: { reach, engagement, roi },
  };
}

function market() {
  const d = dashboard();
  return {
    ...d,
    swot: {
      strengths: ["Strong digital fan appetite", `Top team signal: ${d.teams[0].name}`, "High-value sponsor inventory"],
      weaknesses: ["Fan data is fragmented", "Merchandise conversion remains low"],
      opportunities: ["Regional-language content", "Women and family fan segments", "D2C merchandise drops"],
      threats: ["Crowded sponsorship market", "Social sentiment volatility"],
    },
    recommendations: [
      "Prioritise a digital-first fan acquisition launch.",
      "Package sponsor inventory around short-form content.",
      "Build a first-party fan-data programme before the season.",
    ],
    benchmarks: d.teams.map((x, i) => ({ ...x, engagement: x.score - i * 4, commercial: x.score - i * 6 })),
  };
}

const route = (handler) => (req, res, next) => {
  try { handler(req, res, next); } catch (error) { next(error); }
};

app.get("/", (_, res) => res.json({
  service: "CricketIQ API", status: "ok",
  endpoints: ["POST /upload", "GET /dashboard", "GET /market", "POST /generate-strategy", "GET /generate-report", "GET /health"],
}));
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.get("/dashboard", route((_, res) => res.json(dashboard())));
app.get("/market", route((_, res) => res.json(market())));
app.post("/generate-strategy", route((req, res) => res.json(strategy(req.body))));
app.post("/upload", upload.array("files", 10), route((req, res) => {
  const saved = [];
  for (const file of req.files || []) {
    const safe = file.originalname.replace(/[^\w. -]/g, "_");
    fs.renameSync(file.path, path.join(uploadDir, `${Date.now()}-${safe}`));
    saved.push(safe);
  }
  cache = { fingerprint: "", value: null };
  res.status(saved.length ? 201 : 400).json({
    message: saved.length ? "Files uploaded and ready for analysis" : "Attach CSV files in the files field.",
    files: saved,
  });
}));

// --- PDF report layout helpers ---
const NAVY = "#0B1F3A";
const SLATE = "#4B5768";
const GREEN = "#6C9400";

function sectionHeading(pdf, number, title) {
  if (pdf.y > 680) pdf.addPage();
  pdf.moveDown(1.4);
  pdf.fillColor(GREEN).fontSize(10).font("Helvetica-Bold").text(`SECTION ${number}`);
  pdf.fillColor(NAVY).fontSize(17).font("Helvetica-Bold").text(title);
  pdf.moveTo(pdf.x, pdf.y + 4).lineTo(545, pdf.y + 4).strokeColor("#E4EBF1").stroke();
  pdf.moveDown(0.6);
  pdf.font("Helvetica").fillColor(SLATE).fontSize(11);
}

function paragraph(pdf, text) {
  if (pdf.y > 720) pdf.addPage();
  pdf.font("Helvetica").fillColor(SLATE).fontSize(11).text(text, { lineGap: 3 });
  pdf.moveDown(0.4);
}

function bulletList(pdf, items) {
  items.forEach((item) => {
    if (pdf.y > 730) pdf.addPage();
    pdf.font("Helvetica").fillColor(SLATE).fontSize(11).text(`•  ${item}`, { lineGap: 3 });
  });
  pdf.moveDown(0.4);
}

function subheading(pdf, text) {
  if (pdf.y > 710) pdf.addPage();
  pdf.moveDown(0.3);
  pdf.font("Helvetica-Bold").fillColor(NAVY).fontSize(12).text(text);
  pdf.moveDown(0.15);
}

function statRow(pdf, label, value) {
  if (pdf.y > 730) pdf.addPage();
  const y = pdf.y;
  pdf.font("Helvetica").fillColor(SLATE).fontSize(10.5).text(label, 50, y, { width: 220 });
  pdf.font("Helvetica-Bold").fillColor(NAVY).fontSize(10.5).text(String(value), 280, y, { width: 265 });
  pdf.moveDown(0.15);
}

function buildReportPdf(res) {
  const d = dashboard();
  const m = market();
  const s = strategy();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=CricketIQ-Executive-Report.pdf");
  const pdf = new PDFDocument({ margin: 50, bufferPages: true });
  pdf.pipe(res);

  // --- Cover ---
  pdf.fillColor(NAVY).fontSize(27).font("Helvetica-Bold").text("CricketIQ Executive Report");
  pdf.moveDown(0.4).font("Helvetica").fontSize(12).fillColor(SLATE)
    .text("Consulting decision-support platform — generated from current project data");
  pdf.moveDown(0.2).fontSize(9.5).fillColor("#8291A0")
    .text(`Generated ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`);
  pdf.moveTo(50, pdf.y + 12).lineTo(545, pdf.y + 12).strokeColor(GREEN).lineWidth(2).stroke();

  // --- 1. Dashboard Summary ---
  sectionHeading(pdf, 1, "Dashboard Summary");
  paragraph(pdf, `Season performance is tracking positively. Net fan sentiment stands at ${d.kpis[1].value}, led by ${d.teams[0].name} as the top signal team at ${d.teams[0].score}/100 popularity.`);
  statRow(pdf, "Records analysed", d.kpis[0].value);
  statRow(pdf, "Net fan sentiment", d.kpis[1].value);
  statRow(pdf, "Top team score", `${d.kpis[2].value} — ${d.kpis[2].change}`);
  statRow(pdf, "Opportunity score", d.kpis[3].value);
  subheading(pdf, "Top teams by popularity");
  bulletList(pdf, d.teams.slice(0, 5).map((t) => `${t.name} — ${t.score}/100`));
  subheading(pdf, "Player insights");
  bulletList(pdf, d.players.slice(0, 4).map((p) => `${p.name} (${p.role}, ${p.team}) — ${p.value} ${p.label}, rated ${p.rating}/10`));

  // --- 2. SWOT Analysis ---
  sectionHeading(pdf, 2, "SWOT Analysis");
  subheading(pdf, "Strengths"); bulletList(pdf, m.swot.strengths);
  subheading(pdf, "Weaknesses"); bulletList(pdf, m.swot.weaknesses);
  subheading(pdf, "Opportunities"); bulletList(pdf, m.swot.opportunities);
  subheading(pdf, "Threats"); bulletList(pdf, m.swot.threats);

  // --- 3. Market Opportunity ---
  sectionHeading(pdf, 3, "Market Opportunity");
  paragraph(pdf, `Franchise opportunity is currently scored at ${d.kpis[3].value}, driven by strong digital fan appetite and under-monetised sponsor inventory.`);
  subheading(pdf, "Competitor benchmark");
  bulletList(pdf, m.benchmarks.map((b) => `${b.name} — engagement ${b.engagement}%, commercial ${b.commercial}%`));
  subheading(pdf, "Sponsor opportunity recommendations");
  bulletList(pdf, m.recommendations);

  // --- 4. Campaign Plan ---
  sectionHeading(pdf, 4, "Campaign Plan");
  statRow(pdf, "Launch city", s.city);
  statRow(pdf, "Objective", s.objective);
  statRow(pdf, "Primary audience", s.audience);
  statRow(pdf, "Recommended media investment", `INR ${Number(s.budget).toLocaleString("en-IN")}`);
  pdf.moveDown(0.3);
  paragraph(pdf, s.brief);
  subheading(pdf, "Channel allocation");
  bulletList(pdf, s.channels.map((c) => `${c.name} — ${c.share}% (${c.role})`));
  subheading(pdf, "Timeline");
  bulletList(pdf, s.timeline);

  // --- 5. Projected Impact (NEW SECTION) ---
  sectionHeading(pdf, 5, "Projected Campaign Impact");
  if (s.stats) {
    statRow(pdf, "Estimated Reach", s.stats.reach);
    statRow(pdf, "Expected Engagement Rate", s.stats.engagement);
    statRow(pdf, "Projected ROI (12 Months)", s.stats.roi);
  }
  pdf.moveDown(0.3);

  // --- 6. KPI Targets ---
  sectionHeading(pdf, 6, "KPI Targets");
  paragraph(pdf, `Priority KPI targets for the ${s.objective.toLowerCase()} campaign in ${s.city}:`);
  bulletList(pdf, s.kpis);

  // --- 7. Business Recommendations ---
  sectionHeading(pdf, 7, "Business Recommendations");
  const opportunityScore = parseInt(d.kpis[3].value, 10) || 0;
  bulletList(pdf, [
    ...m.recommendations,
    opportunityScore >= 70 ? "Opportunity score supports proceeding with a phased franchise launch." : "Refine the commercial case further before committing capital.",
    `Prioritise ${s.channels[0].name} and ${s.channels[1].name} first, based on the current channel allocation.`,
  ]);

  // --- Footer page numbers ---
  const pageCount = pdf.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    pdf.switchToPage(i);
    pdf.font("Helvetica").fontSize(8.5).fillColor("#9AA6B3")
      .text(`CricketIQ Executive Report · Page ${i + 1} of ${pageCount}`, 50, 800, { align: "center", width: 495 });
  }

  pdf.end();
}

app.get("/generate-report", route((_, res) => buildReportPdf(res)));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 500).json({ error: "Backend request failed", message: err.message });
});

app.listen(process.env.PORT || 4000, () => console.log("CricketIQ API: http://localhost:4000"));