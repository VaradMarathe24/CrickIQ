import React, { useMemo, useState } from "react";
import { CircleDollarSign, TrendingUp, WalletCards } from "lucide-react";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(n);

const CRORE = 10000000;

const ASSUMPTIONS = [
  { key: "ticket", label: "Ticketing & hospitality", unit: "₹ crore", min: 0, max: 100 },
  { key: "sponsor", label: "Sponsorship", unit: "₹ crore", min: 0, max: 150 },
  { key: "merch", label: "Merchandise", unit: "₹ crore", min: 0, max: 60 },
  { key: "media", label: "Media / broadcast share", unit: "₹ crore", min: 0, max: 120 },
  { key: "cost", label: "Operating cost", unit: "₹ crore", min: 0, max: 200 },
  { key: "growth", label: "Annual revenue growth", unit: "%", min: 0, max: 40 },
];

const DEFAULTS = { ticket: 18, sponsor: 42, merch: 8, media: 32, cost: 68, growth: 12 };

export default function FinancialPlanning() {
  const [inputs, setInputs] = useState(DEFAULTS);

  const update = (e) => setInputs({ ...inputs, [e.target.name]: Number(e.target.value) });

  const model = useMemo(() => {
    const revenue = (inputs.ticket + inputs.sponsor + inputs.merch + inputs.media) * CRORE;
    const cost = inputs.cost * CRORE;
    const ebitda = revenue - cost;
    const year2Revenue = revenue * (1 + inputs.growth / 100);
    const year3Revenue = revenue * Math.pow(1 + inputs.growth / 100, 3);
    const year2Cost = cost * 1.08;
    const year3Cost = cost * 1.16;
    const roi = Math.round((ebitda / cost) * 100);
    return {
      revenue,
      cost,
      ebitda,
      roi,
      year2Revenue,
      year3Revenue,
      year2Cost,
      year3Cost,
      year2Ebitda: year2Revenue - year2Cost,
      year3Ebitda: year3Revenue - year3Cost,
    };
  }, [inputs]);

  const isAttractive = model.roi > 15;

  return (
    <main>
      <section className="pageHead">
        <div>
          <span className="eyebrow">FINANCIAL PLANNING</span>
          <h1>Is the franchise investment attractive?</h1>
          <p>Adjust commercial assumptions to generate an indicative three-year investment case.</p>
        </div>
      </section>

      <section className="financialLayout">
        <article className="card assumptions">
          <h3>Business-case assumptions</h3>
          {ASSUMPTIONS.map(({ key, label, unit, min, max }) => (
            <label key={key}>
              {label}
              <input type="number" name={key} value={inputs[key]} onChange={update} min={min} max={max} />
              <input
                type="range"
                name={key}
                value={inputs[key]}
                onChange={update}
                min={min}
                max={max}
                aria-label={`${label} slider`}
              />
              <small>{unit}</small>
            </label>
          ))}
        </article>

        <section>
          <div className="financeKpis">
            <Metric icon={CircleDollarSign} label="Year 1 revenue" value={formatINR(model.revenue)} />
            <Metric icon={WalletCards} label="Operating cost" value={formatINR(model.cost)} />
            <Metric icon={TrendingUp} label="EBITDA" value={formatINR(model.ebitda)} />
            <Metric icon={TrendingUp} label="Investment ROI" value={`${model.roi}%`} />
          </div>

          <article className="card pnl">
            <h3>Indicative 3-year P&amp;L outlook</h3>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Year 1</th>
                  <th>Year 2</th>
                  <th>Year 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Revenue</td>
                  <td>{formatINR(model.revenue)}</td>
                  <td>{formatINR(model.year2Revenue)}</td>
                  <td>{formatINR(model.year3Revenue)}</td>
                </tr>
                <tr>
                  <td>Operating cost</td>
                  <td>{formatINR(model.cost)}</td>
                  <td>{formatINR(model.year2Cost)}</td>
                  <td>{formatINR(model.year3Cost)}</td>
                </tr>
                <tr>
                  <td>EBITDA</td>
                  <td>{formatINR(model.ebitda)}</td>
                  <td>{formatINR(model.year2Ebitda)}</td>
                  <td>{formatINR(model.year3Ebitda)}</td>
                </tr>
              </tbody>
            </table>
          </article>

          <article className="decision">
            <span className="eyebrow">RECOMMENDED DECISION</span>
            <h2>
              {isAttractive
                ? "Proceed with a phased franchise launch."
                : "Refine the commercial case before committing capital."}
            </h2>
            <p>
              Prioritise sponsorship packaging, first-party fan data and merchandise conversion to
              improve long-term franchise value.
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <article>
      <Icon />
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}