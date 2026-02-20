"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ======= PALETTE (cambiala qui e basta) =======
const CHART = {
  reps: "#2563eb",        // blu
  kg: "#16a34a",          // verde
  rpeAthlete: "#f97316",  // arancio (RPE atleta - opzionale)
  rpePt: "#a855f7",       // viola (RPE PT target)
  target: "#111827",      // quasi nero (target kg/reps)
  grid: "#e5e7eb",
  text: "#334155",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e5e7eb",
};

// ======= Helpers =======
const n = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const t = String(v).trim().toLowerCase().replace("kg", "").replace(",", ".");
  if (!t) return null;
  const num = Number(t);
  return Number.isFinite(num) ? num : null;
};

const hasAny = (arr, key) => (arr || []).some((x) => n(x?.[key]) !== null);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const rows = payload
    .filter((p) => p && p.value !== undefined && p.value !== null && p.value !== "")
    .map((p) => ({
      name: p.name,
      value: p.value,
      color: p.color,
    }));

  if (!rows.length) return null;

  return (
    <div
      style={{
        background: CHART.tooltipBg,
        border: `1px solid ${CHART.tooltipBorder}`,
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontWeight: 800, color: CHART.text, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "grid", gap: 4 }}>
        {rows.map((r, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: r.color,
                display: "inline-block",
              }}
            />
            <span style={{ color: CHART.text, fontWeight: 700 }}>{r.name}:</span>
            <span style={{ color: CHART.text, fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ExerciseCharts({
  data = [],

  // se vuoi spegnere/accendere le linee:
  showPtRpe = true,
  showAthleteRpe = true,
  showTargets = true,
  height = 260,
}) {
  // Normalizza e pulisci: niente NaN
  const cleaned = useMemo(() => {
    return (data || []).map((d) => ({
      // IMPORTANTISSIMO: qui deve essere "label"
      label: String(d.label ?? d.day ?? ""),
      reps: n(d.reps),
      kg: n(d.kg),

      // atleta
      rpe: n(d.rpe),

      // PT target RPE (quello che vuoi tu)
      pt_rpe: n(d.pt_rpe),

      // target opzionali (se un domani li passi)
      pt_target_kg: n(d.pt_target_kg),
      pt_target_reps: n(d.pt_target_reps),
    }));
  }, [data]);

  const canReps = useMemo(() => hasAny(cleaned, "reps"), [cleaned]);
  const canKg = useMemo(() => hasAny(cleaned, "kg"), [cleaned]);

  const hasPtRpe = useMemo(() => hasAny(cleaned, "pt_rpe"), [cleaned]);
  const hasAthleteRpe = useMemo(() => hasAny(cleaned, "rpe"), [cleaned]);

  const hasTargetKg = useMemo(() => hasAny(cleaned, "pt_target_kg"), [cleaned]);
  const hasTargetReps = useMemo(() => hasAny(cleaned, "pt_target_reps"), [cleaned]);

  // Se non hai nessun dato reps/kg, non ha senso renderizzare i grafici
  const hasAnyChartData = canReps || canKg;

  if (!cleaned.length || !hasAnyChartData) {
    return (
      <div className="text-sm text-slate-400 italic">
        Nessun dato disponibile per i grafici.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ====== REPS ====== */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-white">
        <div className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
          Reps (per set)
        </div>

        {!canReps ? (
          <div className="text-sm text-slate-400 italic">Nessun dato reps.</div>
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer>
              <ComposedChart data={cleaned}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: CHART.text, fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: CHART.text, fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 10]}
                  tick={{ fill: CHART.text, fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Bar
                  yAxisId="left"
                  dataKey="reps"
                  name="Reps"
                  fill={CHART.reps}
                  radius={[10, 10, 0, 0]}
                  maxBarSize={46}
                />

                {showTargets && hasTargetReps && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="pt_target_reps"
                    name="Target Reps (PT)"
                    stroke={CHART.target}
                    strokeWidth={2}
                    dot={false}
                  />
                )}

                {showPtRpe && hasPtRpe && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pt_rpe"
                    name="RPE (PT)"
                    stroke={CHART.rpePt}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                )}

                {showAthleteRpe && hasAthleteRpe && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rpe"
                    name="RPE (Atleta)"
                    stroke={CHART.rpeAthlete}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ====== KG ====== */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-white">
        <div className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
          Carico (kg per set)
        </div>

        {!canKg ? (
          <div className="text-sm text-slate-400 italic">Nessun dato kg.</div>
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer>
              <ComposedChart data={cleaned}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: CHART.text, fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: CHART.text, fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 10]}
                  tick={{ fill: CHART.text, fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Bar
                  yAxisId="left"
                  dataKey="kg"
                  name="Kg"
                  fill={CHART.kg}
                  radius={[10, 10, 0, 0]}
                  maxBarSize={46}
                />

                {showTargets && hasTargetKg && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="pt_target_kg"
                    name="Target Kg (PT)"
                    stroke={CHART.target}
                    strokeWidth={2}
                    dot={false}
                  />
                )}

                {showPtRpe && hasPtRpe && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pt_rpe"
                    name="RPE (PT)"
                    stroke={CHART.rpePt}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                )}

                {showAthleteRpe && hasAthleteRpe && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rpe"
                    name="RPE (Atleta)"
                    stroke={CHART.rpeAthlete}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
