"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, use, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Info,
  History,
  Edit2,
  AlertTriangle,
  Coffee,
  CheckCircle2,
  Check,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  ArrowRight,
  Unlink,
} from "lucide-react";

/* ----------------------------- PURE HELPERS (OUTSIDE) ----------------------------- */

const makeKey = (exName, dayName, index = 0) =>
  `${String(exName || "").trim()}_${String(dayName || "").trim()}_${Number(index ?? 0)}`;

const toNullableNumber = (val) => {
  const t = String(val ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== "";
const ensureObj = (x) => (x && typeof x === "object" ? x : {});

const getExerciseDisplay = (ex, activeWeek) => {
  if (!ex) return ex;
  if (activeWeek === 1 || !ex?.progression) return ex;
  const override = ex.progression?.[activeWeek] || ex.progression?.[String(activeWeek)];
  return override ? { ...ex, ...override } : ex;
};

const getDayNotesDisplay = (day, activeWeek) => {
  if (!day) return "";
  if (activeWeek === 1) return day?.notes || "";
  const override = day?.progression?.[activeWeek] || day?.progression?.[String(activeWeek)];
  return override?.notes ?? day?.notes ?? "";
};

const parseSetData = (reps, weight) => {
  const r = String(reps ?? "").trim();
  const w = String(weight ?? "").trim();
  if (!r && !w) return [{ reps: "", weight: "" }];

  const rr = r ? r.split("-") : [];
  const ww = w ? w.split("-") : [];
  const maxLen = Math.max(rr.length, ww.length, 1);
  return Array.from({ length: maxLen }, (_, i) => ({ reps: rr[i] ?? "", weight: ww[i] ?? "" }));
};

const safeObjFromRows = (rows) => {
  const out = {};
  (rows || []).forEach(({ k, v }) => {
    const kk = String(k ?? "").trim();
    const vv = String(v ?? "").trim();
    if (!kk) return;
    out[kk] = vv;
  });
  return out;
};

const rowsFromObj = (obj) => {
  if (!obj || typeof obj !== "object") return [{ k: "", v: "" }];
  const entries = Object.entries(obj);
  if (!entries.length) return [{ k: "", v: "" }];
  return entries.map(([k, v]) => ({ k: String(k), v: String(v ?? "") })).concat([{ k: "", v: "" }]);
};

// ✅ RPE ATLETA ELIMINATA
const isLogEmpty = (log) => {
  const r = String(log?.actual_reps ?? "").trim();
  const w = String(log?.actual_weight ?? "").trim();
  const nA = String(log?.athlete_notes ?? "").trim();

  const nP = String(log?.pt_notes ?? "").trim();
  const rpeP = log?.pt_rpe;
  const mP = log?.pt_metrics && typeof log.pt_metrics === "object" ? Object.keys(log.pt_metrics).length : 0;

  const rpePEmpty = rpeP === null || rpeP === undefined || String(rpeP).trim() === "";
  return !r && !w && !nA && !nP && rpePEmpty && !mP;
};

// ✅ Build groups ma preserva l’indice originale (fondamentale per key log)
const buildGroups = (items) => {
  const groups = [];
  let i = 0;

  while (i < (items || []).length) {
    const ssid = items[i]?.ex?.superset_id || null;

    if (ssid) {
      const block = [];
      let j = i;
      while (j < items.length && (items[j]?.ex?.superset_id || null) === ssid) {
        block.push(items[j]);
        j++;
      }
      groups.push({ type: "superset", superset_id: ssid, items: block });
      i = j;
    } else {
      groups.push({ type: "single", items: [items[i]] });
      i++;
    }
  }

  return groups;
};

// ✅ Target PT: niente "carico" qui (evita ridondanza)
const getPtTargetsFromExercise = (rawEx, activeWeek) => {
  const ex = getExerciseDisplay(rawEx, activeWeek);
  const ptm = ensureObj(ex?.pt_metrics);

  const targetRpe =
    toNullableNumber(ptm?.target_rpe) ??
    toNullableNumber(ptm?.pt_rpe) ??
    toNullableNumber(ptm?.rpe) ??
    null;

  const targetRir = hasValue(ptm?.rir) ? String(ptm.rir) : "";

  const extras = Object.entries(ptm).filter(
    ([k]) => !["target_rpe", "pt_rpe", "rpe", "rir"].includes(String(k))
  );

  return { targetRpe, targetRir, extras };
};

/* ----------------------------- COMPONENTS (OUTSIDE) ----------------------------- */

function TargetsBox({ rawEx, activeWeek }) {
  const { targetRpe, targetRir, extras } = getPtTargetsFromExercise(rawEx, activeWeek);

  const hasAny = targetRpe !== null || !!targetRir || extras.length > 0;
  if (!hasAny) return null;

  return (
    <div className="mt-3 rounded-2xl border border-fuchsia-800/25 bg-fuchsia-900/10 p-3">
      <div className="text-[10px] font-black text-fuchsia-200 uppercase tracking-widest mb-2">
        Target PT
      </div>

      {(targetRpe !== null || targetRir) ? (
        <div className="flex flex-wrap gap-2">
          {targetRpe !== null ? (
            <span className="text-[10px] font-black text-fuchsia-200 bg-fuchsia-900/20 px-2 py-1 rounded-xl border border-fuchsia-800/30">
              RPE PT: {String(targetRpe)}
            </span>
          ) : null}

          {targetRir ? (
            <span className="text-[10px] font-black text-amber-200 bg-amber-900/20 px-2 py-1 rounded-xl border border-amber-800/30">
              RIR: {String(targetRir)}
            </span>
          ) : null}
        </div>
      ) : null}

      {extras.length ? (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {extras.map(([k, v]) => (
            <div key={String(k)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">
                {String(k)}
              </div>
              <div className="text-sm font-black text-white truncate">{String(v)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ExerciseItem({
  rawEx,
  exIndex,
  activeWeek,
  activeDayName,

  logs,
  historyLogs,
  editingKey,
  confirmFlash,

  inputClass,
  inputKgClass,
  textareaClass,

  setLogsData,
  noteInput,
  ptRpeInput,
  ptNoteInput,
  ptMetricsRows,

  setNoteInput,
  setPtRpeInput,
  setPtNoteInput,
  setPtMetricsRows,

  openLastModal,
  closeEdit,
  openEdit,
  toggleConfirm,
  copySetsFromLast,
  saveEntry,

  updateRow,
  addSetRow,
  removeSetRow,

  onAdvanceIfGroupComplete,
}) {
  const ex = getExerciseDisplay(rawEx, activeWeek);
  const key = makeKey(ex.name, activeDayName, exIndex);

  const currentLog = logs[key] || null;
  const lastLog = historyLogs[key] || null;

  const isCompleted = !!currentLog && currentLog.completed === true;
  const isEditing = editingKey === key;

  const isModified =
    rawEx?.progression && (rawEx.progression[activeWeek] || rawEx.progression[String(activeWeek)]);

  const hasSomeSavedData = currentLog && !isLogEmpty(currentLog);

  // ✅ Feedback PT (dal LOG): una sola volta, solo se valorizzati
  const fbPtRpe = currentLog && hasValue(currentLog.pt_rpe) ? String(currentLog.pt_rpe) : "";
  const fbRir =
    currentLog?.pt_metrics &&
    typeof currentLog.pt_metrics === "object" &&
    hasValue(currentLog.pt_metrics.rir)
      ? String(currentLog.pt_metrics.rir)
      : "";

  const showFeedbackPills = !!fbPtRpe || !!fbRir;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* ✅ Nome verde se completato */}
          <div className={`text-base font-black truncate ${isCompleted ? "text-emerald-300" : "text-white"}`}>
            {ex.name}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {isModified && activeWeek > 1 ? (
              <span className="text-[9px] font-black text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-800/30">
                W{activeWeek} TARGET
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastLog && !isEditing ? (
            <button
              type="button"
              onClick={() => openLastModal(lastLog)}
              className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 transition text-[10px] font-black flex items-center gap-2 text-slate-200"
            >
              <History size={14} /> LAST
            </button>
          ) : null}

          {isEditing ? (
            <button
              onClick={closeEdit}
              className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 flex items-center justify-center"
              type="button"
              title="Chiudi"
            >
              <X size={18} />
            </button>
          ) : null}

          <button
            onClick={async () => {
              const completedNow = await toggleConfirm(ex.name, activeDayName, exIndex);
              if (completedNow && typeof onAdvanceIfGroupComplete === "function") {
                setTimeout(() => onAdvanceIfGroupComplete(key), 220);
              }
            }}
            type="button"
            className={[
              "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
              confirmFlash ? "ring-4 ring-emerald-300/30" : "",
              isCompleted
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-slate-950 border-slate-800 text-white hover:bg-slate-800",
            ].join(" ")}
            title="Completa / annulla"
          >
            <Check size={18} />
          </button>
        </div>
      </div>

      {/* ✅ RIGA TARGET: Serie / Reps / Rec (+ Carico solo se valorizzato) */}
      {(() => {
        const showLoadCol = hasValue(ex.load);

        return (
          <div
            className={[
              "grid border-b border-slate-800",
              showLoadCol ? "grid-cols-4" : "grid-cols-3",
            ].join(" ")}
          >
            <div className="p-3 text-center">
              <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Serie</div>
              <div className="text-lg font-black text-white">{hasValue(ex.sets) ? ex.sets : "-"}</div>
            </div>

            <div className="p-3 text-center border-x border-slate-800">
              <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Reps</div>
              <div className="text-lg font-black text-white">{hasValue(ex.reps) ? ex.reps : "-"}</div>
            </div>

            <div className={["p-3 text-center", showLoadCol ? "border-r border-slate-800" : ""].join(" ")}>
              <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Rec</div>
              <div className="text-lg font-black text-blue-300">{hasValue(ex.rest) ? ex.rest : "-"}</div>
            </div>

            {showLoadCol ? (
              <div className="p-3 text-center">
                <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Carico</div>
                <div className="text-lg font-black text-emerald-300">{String(ex.load)}</div>
              </div>
            ) : null}
          </div>
        );
      })()}

      {/* ✅ TARGET PT (DALLA SCHEDA): SEMPRE VISIBILI SE ESISTONO */}
      <div className="px-4 pb-3">
        <TargetsBox rawEx={rawEx} activeWeek={activeWeek} />
      </div>

      {/* ✅ FEEDBACK PT (DAL LOG): UNA SOLA VOLTA, SOLO SE VALORIZZATO */}
      {showFeedbackPills ? (
        <div className="px-4 pb-4 -mt-1 flex gap-2 flex-wrap">
          {fbPtRpe ? (
            <span className="text-[10px] font-black text-fuchsia-200 bg-fuchsia-900/20 px-2 py-1 rounded-xl border border-fuchsia-800/30">
              RPE PT: {fbPtRpe}
            </span>
          ) : null}

          {fbRir ? (
            <span className="text-[10px] font-black text-amber-200 bg-amber-900/20 px-2 py-1 rounded-xl border border-amber-800/30">
              RIR: {fbRir}
            </span>
          ) : null}
        </div>
      ) : null}

      {isEditing ? (
        <div className="p-4 bg-slate-950/40">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-black text-blue-200">Inserisci serie / kg</div>
            <button
              onClick={closeEdit}
              className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 flex items-center justify-center"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          {lastLog ? (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => openLastModal(lastLog)}
                className="w-full py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-black text-xs hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <History size={14} /> VEDI LAST
              </button>
              <button
                type="button"
                onClick={() => copySetsFromLast(ex.name, activeDayName, exIndex)}
                className="w-full py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-black text-xs hover:bg-slate-800"
              >
                COPIA
              </button>
            </div>
          ) : null}

          <div className="space-y-2 mb-4">
            {setLogsData.map((row, i) => (
              <div key={i} className="grid grid-cols-[40px_1fr_1fr_44px] gap-2 items-center">
                <div className="text-slate-400 font-black text-sm text-center">{i + 1}</div>

                <div className="flex justify-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={ex.reps}
                    value={row.reps}
                    onChange={(e) => updateRow(i, "reps", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex justify-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={"Kg"}
                    value={row.weight}
                    onChange={(e) => updateRow(i, "weight", e.target.value)}
                    className={inputKgClass}
                  />
                </div>

                <button
                  onClick={() => removeSetRow(i)}
                  className="w-11 h-12 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 flex items-center justify-center text-slate-300 hover:text-red-300 transition"
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSetRow}
            className="w-full py-3 mb-4 border border-dashed border-slate-700 rounded-2xl text-slate-200 text-xs font-black hover:bg-slate-900 transition flex items-center justify-center gap-2"
            type="button"
          >
            <Plus size={14} /> AGGIUNGI SERIE
          </button>

          <textarea
            placeholder="Note atleta..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            className={textareaClass}
            rows={3}
          />

          {/* ✅ SEZIONE PT (feedback) */}
          <div className="mt-4 rounded-3xl border border-fuchsia-800/25 bg-fuchsia-900/10 p-4">
            <div className="text-[10px] font-black text-fuchsia-200 uppercase tracking-widest mb-2">
              PT (feedback)
            </div>

            <div className="mb-3">
              <div className="text-[10px] font-black text-fuchsia-200 uppercase tracking-widest mb-2">
                RPE PT (0-10)
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Es. 8"
                value={ptRpeInput}
                onChange={(e) => setPtRpeInput(e.target.value)}
                className="caret-white w-full h-12 bg-slate-950 border border-slate-700 rounded-2xl px-4 text-white font-black text-lg outline-none
                           focus:border-fuchsia-500 focus:ring-1 ring-fuchsia-500/20 placeholder:text-white/20 hover:border-slate-600 transition"
              />
            </div>

            <textarea
              placeholder="Note PT..."
              value={ptNoteInput}
              onChange={(e) => setPtNoteInput(e.target.value)}
              className={
                "w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-sm text-white outline-none " +
                "focus:border-fuchsia-500 focus:ring-1 ring-fuchsia-500/20 placeholder:text-white/20 resize-none min-h-[72px]"
              }
              rows={2}
            />

            <div className="mt-3">
              <div className="text-[10px] font-black text-fuchsia-200 uppercase tracking-widest mb-2">
                PARAMETRI EXTRA (chiave / valore)
              </div>

              <div className="space-y-2">
                {ptMetricsRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
                    <input
                      value={row.k}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPtMetricsRows((prev) => {
                          const copy = [...prev];
                          copy[i] = { ...copy[i], k: val };
                          if (i === copy.length - 1 && (val.trim() || copy[i].v.trim())) {
                            copy.push({ k: "", v: "" });
                          }
                          return copy;
                        });
                      }}
                      placeholder="es. rir"
                      className="min-w-0 w-full h-11 bg-slate-950 border border-slate-700 rounded-2xl px-3 text-sm text-white font-black outline-none focus:border-fuchsia-500"
                    />
                    <input
                      value={row.v}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPtMetricsRows((prev) => {
                          const copy = [...prev];
                          copy[i] = { ...copy[i], v: val };
                          if (i === copy.length - 1 && (copy[i].k.trim() || val.trim())) {
                            copy.push({ k: "", v: "" });
                          }
                          return copy;
                        });
                      }}
                      placeholder="es. 2"
                      className="min-w-0 w-full h-11 bg-slate-950 border border-slate-700 rounded-2xl px-3 text-sm text-white font-black outline-none focus:border-fuchsia-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPtMetricsRows((prev) => {
                          const copy = prev.filter((_, idx) => idx !== i);
                          return copy.length ? copy : [{ k: "", v: "" }];
                        });
                      }}
                      className="h-11 rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-red-300 transition flex items-center justify-center"
                      title="Rimuovi riga"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => saveEntry(ex.name, activeDayName, exIndex)}
            className="mt-4 w-full bg-blue-600 text-white font-black py-3 rounded-2xl flex justify-center items-center gap-2 hover:bg-blue-500 active:scale-[0.99] transition"
            type="button"
          >
            <Edit2 size={18} /> SALVA
          </button>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/20">
          <button
            onClick={() => openEdit(ex.name, activeDayName, exIndex, currentLog)}
            className={`w-full py-3 rounded-2xl font-black transition border ${
              hasSomeSavedData
                ? "bg-slate-950 text-white border-slate-800 hover:bg-slate-800"
                : "bg-blue-600 text-white border-blue-500 hover:bg-blue-500"
            }`}
            type="button"
          >
            {hasSomeSavedData ? "MODIFICA DATI" : "INSERISCI DATI"}
          </button>
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  gIndex,
  groupsLen,
  isFocused,

  onPrev,
  onNext,
  disablePrev,
  disableNext,

  exerciseProps,
}) {
  const isSuperset = group.type === "superset";

  return (
    <div
      className={[
        "rounded-3xl border overflow-hidden transition",
        isSuperset ? "border-purple-700/30 bg-purple-900/10" : "border-slate-800 bg-slate-950/20",
        isFocused ? "ring-2 ring-white/30" : "",
      ].join(" ")}
    >
      <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          {isSuperset ? (
            <span className="text-purple-200 inline-flex items-center gap-2">
              <LinkIcon size={14} /> SUPER SERIE
            </span>
          ) : (
            <span className="text-slate-300">ESERCIZIO</span>
          )}
          <span className="text-slate-500">
            {gIndex + 1}/{groupsLen}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={disablePrev}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition ${
              disablePrev
                ? "border-slate-800 text-slate-700 bg-slate-950"
                : "border-slate-800 text-white bg-slate-950 hover:bg-slate-800"
            }`}
            title="Precedente"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={disableNext}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition ${
              disableNext
                ? "border-slate-800 text-slate-700 bg-slate-950"
                : "border-blue-500 bg-blue-600 text-white hover:bg-blue-500"
            }`}
            title="Successivo"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {group.items.map(({ ex, originalIndex }) => (
          <ExerciseItem key={`ex-${originalIndex}`} rawEx={ex} exIndex={originalIndex} {...exerciseProps} />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- PAGE ----------------------------- */

export default function LivePage({ params }) {
  const { id } = use(params);

  // --- SUPABASE ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => createClient(supabaseUrl, supabaseKey), [supabaseUrl, supabaseKey]);

  // --- STATE ---
  const [program, setProgram] = useState(null);
  const [clientName, setClientName] = useState("");

  const [logs, setLogs] = useState({});
  const [historyLogs, setHistoryLogs] = useState({});

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const [editingKey, setEditingKey] = useState(null);

  // serie atleta
  const [setLogsData, setSetLogsData] = useState([{ reps: "", weight: "" }]);

  // note atleta
  const [noteInput, setNoteInput] = useState("");

  // PT fields (feedback)
  const [ptRpeInput, setPtRpeInput] = useState("");
  const [ptNoteInput, setPtNoteInput] = useState("");
  const [ptMetricsRows, setPtMetricsRows] = useState([{ k: "", v: "" }]);

  // review
  const [reviewMode, setReviewMode] = useState(false);

  // last modal
  const [showLastModal, setShowLastModal] = useState(false);
  const [lastModalLog, setLastModalLog] = useState(null);

  // UX
  const [confirmFlash, setConfirmFlash] = useState(false);

  // weeks scroller ref
  const weeksRef = useRef(null);

  // focus navigation (su gruppi)
  const [focusGroupIndex, setFocusGroupIndex] = useState(0);

  // ✅ per auto-selezione settimana solo al primo load
  const didAutoPickWeekRef = useRef(false);

  /* ----------------------------- DERIVED (NO HOOKS AFTER RETURNS) ----------------------------- */

  const days = useMemo(() => (program?.days_structure && Array.isArray(program.days_structure) ? program.days_structure : []), [program]);

  const activeDay = useMemo(() => days[activeDayIndex], [days, activeDayIndex]);

  const activeDayNotes = useMemo(
    () => (activeDay ? getDayNotesDisplay(activeDay, activeWeek) : ""),
    [activeDay, activeWeek]
  );

  // ✅ NON visualizzare esercizi “vuoti”: qui criterio semplice e robusto: name obbligatorio
  const visibleExercises = useMemo(() => {
    const list = activeDay?.exercises || [];
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const raw = list[i];
      const ex = getExerciseDisplay(raw, activeWeek);
      const nameOk = hasValue(ex?.name);
      if (!nameOk) continue;
      out.push({ ex: raw, originalIndex: i });
    }
    return out;
  }, [activeDay, activeWeek]);

  const groups = useMemo(() => buildGroups(visibleExercises), [visibleExercises]);

  // ✅ clamp focusGroupIndex sempre (HOOK PRIMA DEI RETURN)
  useEffect(() => {
    setFocusGroupIndex((prev) => {
      const max = Math.max(0, (groups?.length || 1) - 1);
      return Math.min(prev, max);
    });
  }, [groups?.length]);

  /* ----------------------------- FETCH ----------------------------- */

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeWeek]);

  const closeEdit = useCallback(() => {
    setEditingKey(null);
    setSetLogsData([{ reps: "", weight: "" }]);
    setNoteInput("");
    setPtNoteInput("");
    setPtRpeInput("");
    setPtMetricsRows([{ k: "", v: "" }]);
  }, []);

  useEffect(() => {
    setReviewMode(false);
    closeEdit();
    setFocusGroupIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeek, activeDayIndex]);

  const computeWeekComplete = (prog, allLogsByWeek, week) => {
    const ds = prog?.days_structure || [];
    for (let d = 0; d < ds.length; d++) {
      const day = ds[d];
      const dayName = day?.name || "";
      const exs = Array.isArray(day?.exercises) ? day.exercises : [];

      for (let i = 0; i < exs.length; i++) {
        const raw = exs[i];
        const ex = getExerciseDisplay(raw, week);
        if (!hasValue(ex?.name)) continue; // ✅ stessi esercizi visibili della live

        const k = makeKey(ex?.name, dayName, i);
        const log = allLogsByWeek?.[week]?.[k];
        if (!log || log.completed !== true) return false;
      }
    }
    return true;
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data: prog, error } = await supabase.from("programs").select("*").eq("id", id).single();

    if (error || !prog) {
      setErrorMsg("Scheda non trovata o eliminata.");
      setLoading(false);
      return;
    }

    if (!prog.days_structure || !Array.isArray(prog.days_structure)) prog.days_structure = [];
    setProgram(prog);

    if (prog.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("full_name")
        .eq("id", prog.client_id)
        .single();
      if (client?.full_name) setClientName(client.full_name);
    }

    // ✅ auto-pick: prima settimana non completata (una sola volta)
    if (!didAutoPickWeekRef.current) {
      didAutoPickWeekRef.current = true;

      const { data: allLogs } = await supabase
        .from("workout_logs")
        .select("exercise_name, day_label, exercise_index, week_number, completed, actual_reps, actual_weight, athlete_notes, pt_notes, pt_rpe, pt_metrics, id")
        .eq("program_id", id);

      const byWeek = {};
      (allLogs || []).forEach((log) => {
        const w = Number(log.week_number) || 1;
        if (!byWeek[w]) byWeek[w] = {};
        const exIdx = Number.isFinite(Number(log.exercise_index)) ? Number(log.exercise_index) : 0;
        const k = makeKey(log.exercise_name, log.day_label, exIdx);
        byWeek[w][k] = {
          ...log,
          athlete_notes: log.athlete_notes ?? "",
          pt_notes: log.pt_notes ?? "",
          pt_rpe: log.pt_rpe ?? null,
          pt_metrics: log.pt_metrics ?? null,
        };
      });

      const dur = Number(prog.duration) || 4;
      let pick = dur; // se tutte complete: resta sull’ultima
      for (let w = 1; w <= dur; w++) {
        const complete = computeWeekComplete(prog, byWeek, w);
        if (!complete) {
          pick = w;
          break;
        }
      }

      if (pick !== activeWeek) {
        // setto e poi il resto verrà ricaricato dal useEffect
        setActiveWeek(pick);
        setLoading(false);
        return;
      }
    }

    // logs settimana attiva
    const { data: savedLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("program_id", id)
      .eq("week_number", activeWeek);

    const logsMap = {};
    if (savedLogs?.length) {
      savedLogs.forEach((log) => {
        const exIdx = Number.isFinite(Number(log.exercise_index)) ? Number(log.exercise_index) : 0;
        const k = makeKey(log.exercise_name, log.day_label, exIdx);

        logsMap[k] = {
          ...log,
          athlete_notes: log.athlete_notes ?? "",
          pt_notes: log.pt_notes ?? "",
          pt_rpe: log.pt_rpe ?? null,
          pt_metrics: log.pt_metrics ?? null,
        };
      });
    }
    setLogs(logsMap);

    // history settimana precedente
    if (activeWeek > 1) {
      const { data: prevLogs } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("program_id", id)
        .eq("week_number", activeWeek - 1);

      const historyMap = {};
      if (prevLogs?.length) {
        prevLogs.forEach((log) => {
          const exIdx = Number.isFinite(Number(log.exercise_index)) ? Number(log.exercise_index) : 0;
          const k = makeKey(log.exercise_name, log.day_label, exIdx);

          historyMap[k] = {
            ...log,
            athlete_notes: log.athlete_notes ?? "",
            pt_notes: log.pt_notes ?? "",
            pt_rpe: log.pt_rpe ?? null,
            pt_metrics: log.pt_metrics ?? null,
          };
        });
      }
      setHistoryLogs(historyMap);
    } else {
      setHistoryLogs({});
    }

    setLoading(false);
  };

  /* ----------------------------- EDIT ----------------------------- */

  const openEdit = useCallback(
    (exName, dayName, exIndex, existingData) => {
      const key = makeKey(exName, dayName, exIndex);
      setEditingKey(key);

      const hist = historyLogs[key];

      const initialNotes =
        String(existingData?.athlete_notes ?? "").trim() || String(hist?.athlete_notes ?? "").trim() || "";

      const initialPtNotes =
        String(existingData?.pt_notes ?? "").trim() || String(hist?.pt_notes ?? "").trim() || "";

      const initialPtRpe =
        (existingData?.pt_rpe !== null && existingData?.pt_rpe !== undefined
          ? String(existingData.pt_rpe).trim()
          : "") ||
        (hist?.pt_rpe !== null && hist?.pt_rpe !== undefined ? String(hist.pt_rpe).trim() : "") ||
        "";

      const initialPtMetrics = existingData?.pt_metrics ?? hist?.pt_metrics ?? null;

      setNoteInput(initialNotes);
      setPtNoteInput(initialPtNotes);
      setPtRpeInput(initialPtRpe);
      setPtMetricsRows(rowsFromObj(initialPtMetrics));

      setSetLogsData(
        existingData
          ? parseSetData(existingData.actual_reps, existingData.actual_weight)
          : [{ reps: "", weight: "" }]
      );
    },
    [historyLogs]
  );

  const updateRow = useCallback((i, f, v) => {
    setSetLogsData((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], [f]: v };
      return c;
    });
  }, []);

  const addSetRow = useCallback(() => setSetLogsData((prev) => [...prev, { reps: "", weight: "" }]), []);

  const removeSetRow = useCallback((i) => {
    setSetLogsData((prev) => {
      if (prev.length <= 1) return [{ reps: "", weight: "" }];
      return prev.filter((_, idx) => idx !== i);
    });
  }, []);

  const copySetsFromLast = useCallback(
    (exName, dayName, exIndex) => {
      const key = makeKey(exName, dayName, exIndex);
      const hist = historyLogs[key];
      if (!hist) return;
      const parsed = parseSetData(hist.actual_reps, hist.actual_weight);
      setSetLogsData(parsed.length ? parsed : [{ reps: "", weight: "" }]);
    },
    [historyLogs]
  );

  const safeUpsertWorkoutLog = async ({ existingId, payload }) => {
    if (existingId) {
      const res = await supabase.from("workout_logs").update(payload).eq("id", existingId).select("*").single();
      if (!res.error) return res;

      const msg = String(res.error.message || "").toLowerCase();
      if (msg.includes("column") || msg.includes("schema cache")) {
        const { pt_rpe, pt_metrics, pt_notes, ...reduced } = payload;
        return await supabase.from("workout_logs").update(reduced).eq("id", existingId).select("*").single();
      }
      return res;
    } else {
      const res = await supabase.from("workout_logs").insert([payload]).select("*").single();
      if (!res.error) return res;

      const msg = String(res.error.message || "").toLowerCase();
      if (msg.includes("column") || msg.includes("schema cache")) {
        const { pt_rpe, pt_metrics, pt_notes, ...reduced } = payload;
        return await supabase.from("workout_logs").insert([reduced]).select("*").single();
      }
      return res;
    }
  };

  const saveEntry = useCallback(
    async (exName, dayName, exIndex) => {
      const key = makeKey(exName, dayName, exIndex);

      const normalized = setLogsData.map((s) => ({
        reps: String(s?.reps ?? "").trim(),
        weight: String(s?.weight ?? "").trim(),
      }));

      const nonEmpty = normalized.filter((s) => s.reps !== "" || s.weight !== "");
      const finalSets = nonEmpty.length ? nonEmpty : [{ reps: "", weight: "" }];

      const repsString = finalSets.map((s) => s.reps).join("-");
      const weightString = finalSets.map((s) => s.weight).join("-");

      const existing = logs[key];
      const ptMetricsObj = safeObjFromRows(ptMetricsRows);

      const payload = {
        program_id: id,
        exercise_name: exName,
        week_number: activeWeek,
        day_label: dayName,
        exercise_index: exIndex,
        actual_sets: String(finalSets.length),
        actual_reps: repsString,
        actual_weight: weightString,
        athlete_notes: String(noteInput ?? ""),

        // PT feedback
        pt_notes: String(ptNoteInput ?? ""),
        pt_rpe: toNullableNumber(ptRpeInput),
        pt_metrics: ptMetricsObj,

        completed: existing?.completed === true,
      };

      const res = await safeUpsertWorkoutLog({ existingId: existing?.id, payload });
      if (res.error) return alert("Errore salvataggio: " + res.error.message);

      const data = res.data;
      setLogs((prev) => ({
        ...prev,
        [key]: {
          ...data,
          athlete_notes: data.athlete_notes ?? "",
          pt_notes: data.pt_notes ?? "",
          pt_rpe: data.pt_rpe ?? null,
          pt_metrics: data.pt_metrics ?? null,
        },
      }));

      closeEdit();
    },
    [activeWeek, closeEdit, id, logs, noteInput, ptMetricsRows, ptNoteInput, ptRpeInput, setLogsData, supabase]
  );

  // ✅ ritorna true solo quando COMPLETI (per auto-advance)
  const toggleConfirm = useCallback(
    async (exName, dayName, exIndex) => {
      const key = makeKey(exName, dayName, exIndex);
      const current = logs[key];

      closeEdit();

      if (current?.completed === true) {
        if (isLogEmpty(current)) {
          const { error } = await supabase
            .from("workout_logs")
            .delete()
            .eq("program_id", id)
            .eq("week_number", activeWeek)
            .eq("day_label", dayName)
            .eq("exercise_name", exName)
            .eq("exercise_index", exIndex);

          if (error) {
            alert("Errore rimozione conferma: " + error.message);
            return false;
          }

          setLogs((prev) => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
          });
        } else {
          const { error } = await supabase.from("workout_logs").update({ completed: false }).eq("id", current.id);
          if (error) {
            alert("Errore rimozione conferma: " + error.message);
            return false;
          }
          setLogs((prev) => ({ ...prev, [key]: { ...current, completed: false } }));
        }

        setConfirmFlash(true);
        setTimeout(() => setConfirmFlash(false), 160);
        return false;
      }

      // stai completando
      if (current?.id) {
        const { error } = await supabase.from("workout_logs").update({ completed: true }).eq("id", current.id);
        if (error) {
          alert("Errore conferma: " + error.message);
          return false;
        }
        setLogs((prev) => ({ ...prev, [key]: { ...current, completed: true } }));
      } else {
        const basePayload = {
          program_id: id,
          exercise_name: exName,
          week_number: activeWeek,
          day_label: dayName,
          exercise_index: exIndex,
          actual_sets: "0",
          actual_reps: "",
          actual_weight: "",
          athlete_notes: "",
          pt_notes: "",
          pt_rpe: null,
          pt_metrics: {},
          completed: true,
        };

        const res = await safeUpsertWorkoutLog({ existingId: null, payload: basePayload });
        if (res.error) {
          alert("Errore conferma: " + res.error.message);
          return false;
        }

        const data = res.data;
        setLogs((prev) => ({
          ...prev,
          [key]: {
            ...data,
            athlete_notes: data.athlete_notes ?? "",
            pt_notes: data.pt_notes ?? "",
            pt_rpe: data.pt_rpe ?? null,
            pt_metrics: data.pt_metrics ?? null,
          },
        }));
      }

      setConfirmFlash(true);
      setTimeout(() => setConfirmFlash(false), 180);
      return true;
    },
    [activeWeek, closeEdit, id, logs, supabase]
  );

  const openLastModal = useCallback((log) => {
    setLastModalLog(log || null);
    setShowLastModal(true);
  }, []);

  const closeLastModal = useCallback(() => {
    setShowLastModal(false);
    setLastModalLog(null);
  }, []);

  const scrollWeeks = (dir) => {
    const el = weeksRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.8) * (dir === "left" ? -1 : 1);
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  /* ----------------------------- UI CLASSES ----------------------------- */

  const inputClass =
    "caret-white w-20 h-12 bg-slate-950 border border-slate-700 rounded-xl text-center text-white font-black text-xl outline-none " +
    "focus:border-blue-500 focus:ring-1 ring-blue-500/30 placeholder:text-white/20 hover:border-slate-600 transition";

  const inputKgClass =
    "caret-white w-20 h-12 bg-slate-950 border border-slate-700 rounded-xl text-center text-emerald-300 font-black text-xl outline-none " +
    "focus:border-emerald-500 focus:ring-1 ring-emerald-500/30 placeholder:text-white/20 hover:border-slate-600 transition";

  const textareaClass =
    "w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 ring-blue-500/30 " +
    "placeholder:text-white/20 resize-none min-h-[88px]";

  /* ----------------------------- GROUP NAV ----------------------------- */

  const goNextGroup = () => {
    const wasEditing = !!editingKey;
    closeEdit();
    setFocusGroupIndex((prev) => Math.min(groups.length - 1, prev + 1));
    if (!wasEditing) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrevGroup = () => {
    const wasEditing = !!editingKey;
    closeEdit();
    setFocusGroupIndex((prev) => Math.max(0, prev - 1));
    if (!wasEditing) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ avanza solo se il gruppo corrente è completo (considera anche la key appena completata)
  const onAdvanceIfGroupComplete = (justCompletedKey = null) => {
    const g = groups[focusGroupIndex];
    const dayName = activeDay?.name || "";

    const complete = g?.items?.every(({ ex, originalIndex }) => {
      const visibleEx = getExerciseDisplay(ex, activeWeek);
      const k = makeKey(visibleEx?.name, dayName, originalIndex);
      if (justCompletedKey && k === justCompletedKey) return true;
      return logs?.[k]?.completed === true;
    });

    if (!complete) return;

    if (focusGroupIndex < groups.length - 1) {
      goNextGroup();
      return;
    }
  };

  const exerciseProps = {
    activeWeek,
    activeDayName: activeDay?.name || "",
    logs,
    historyLogs,
    editingKey,
    confirmFlash,

    inputClass,
    inputKgClass,
    textareaClass,

    setLogsData,
    noteInput,
    ptRpeInput,
    ptNoteInput,
    ptMetricsRows,

    setNoteInput,
    setPtRpeInput,
    setPtNoteInput,
    setPtMetricsRows,

    openLastModal,
    closeEdit,
    openEdit,
    toggleConfirm,
    copySetsFromLast,
    saveEntry,

    updateRow,
    addSetRow,
    removeSetRow,

    onAdvanceIfGroupComplete,
  };

  /* ----------------------------- COMPLETION (VISIBLE ONLY) ----------------------------- */

  const dayCompleted = useMemo(() => {
    if (!activeDay) return false;
    if (!visibleExercises.length) return false;

    const dayName = activeDay?.name || "";
    return visibleExercises.every(({ ex, originalIndex }) => {
      const disp = getExerciseDisplay(ex, activeWeek);
      const k = makeKey(disp?.name, dayName, originalIndex);
      return logs[k]?.completed === true;
    });
  }, [activeDay, activeWeek, logs, visibleExercises]);

  const showCompletedScreen = dayCompleted && !reviewMode;

  /* ----------------------------- GUARDS (AFTER ALL HOOKS) ----------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-bold tracking-widest uppercase">
        Caricamento...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-6">
        <AlertTriangle className="mr-2 text-red-500" />
        {errorMsg}
      </div>
    );
  }

  /* ----------------------------- RENDER ----------------------------- */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      {/* LAST MODAL */}
      {showLastModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-950">
              <div className="text-sm font-black flex items-center gap-2 text-blue-200">
                <History size={16} /> LAST (W{activeWeek - 1})
              </div>
              <button
                onClick={closeLastModal}
                className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 flex items-center justify-center"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {!lastModalLog ? (
                <div className="text-slate-300 text-sm">Nessun dato nella settimana precedente.</div>
              ) : (
                <>
                  {hasValue(lastModalLog.pt_rpe) ? (
                    <div className="mb-4 flex items-center justify-between bg-slate-950 border border-fuchsia-800/30 rounded-2xl px-3 py-2">
                      <div className="text-[10px] font-black text-fuchsia-200 uppercase tracking-widest">RPE PT</div>
                      <div className="text-lg font-black text-white">{String(lastModalLog.pt_rpe)}</div>
                    </div>
                  ) : null}

                  {lastModalLog?.pt_metrics &&
                  typeof lastModalLog.pt_metrics === "object" &&
                  hasValue(lastModalLog.pt_metrics.rir) ? (
                    <div className="mb-4 flex items-center justify-between bg-slate-950 border border-amber-800/30 rounded-2xl px-3 py-2">
                      <div className="text-[10px] font-black text-amber-200 uppercase tracking-widest">RIR</div>
                      <div className="text-lg font-black text-white">{String(lastModalLog.pt_metrics.rir)}</div>
                    </div>
                  ) : null}

                  <div className="text-xs text-slate-400 uppercase font-black mb-2">Serie registrate</div>
                  <div className="space-y-2">
                    {parseSetData(lastModalLog.actual_reps, lastModalLog.actual_weight)
                      .map((s, i) => ({ ...s, i }))
                      .filter((x) => x.reps || x.weight)
                      .map(({ reps, weight, i }) => (
                        <div
                          key={i}
                          className="grid grid-cols-[52px_1fr_1fr] items-center text-sm font-mono bg-slate-950 border border-slate-700 rounded-xl px-3 py-2"
                        >
                          <span className="font-black text-slate-400">#{i + 1}</span>
                          <span className="font-black text-white text-center">{reps ? `${reps} reps` : "-"}</span>
                          <span className="font-black text-emerald-300 text-center">
                            {weight ? `${weight} kg` : "-"}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800">
        <div className="px-4 pt-4 pb-3 max-w-md mx-auto">
          <div className="flex justify-between items-end mb-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Programma</div>
              <h1 className="text-2xl font-black text-white leading-none truncate">{program?.title || ""}</h1>
            </div>

            {clientName ? (
              <div className="text-right pl-4 shrink-0">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Atleta</div>
                <div className="text-sm font-bold text-slate-200 leading-tight">{clientName}</div>
              </div>
            ) : null}
          </div>

          {/* SETTIMANE */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollWeeks("left")}
              className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition flex items-center justify-center text-slate-200"
              aria-label="Scorri settimane a sinistra"
            >
              <ChevronLeft size={18} />
            </button>

            <div ref={weeksRef} className="flex-1 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory">
              <div className="flex gap-2 pb-1">
                {Array.from({ length: program?.duration || 4 }, (_, i) => i + 1).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setActiveWeek(w)}
                    className={`snap-start min-w-[52px] h-[44px] rounded-xl border transition-all active:scale-95 font-black ${
                      activeWeek === w
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    W{w}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollWeeks("right")}
              className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition flex items-center justify-center text-slate-200"
              aria-label="Scorri settimane a destra"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* GIORNI */}
          {days.length > 0 ? (
            <div className="mt-3 flex border-t border-slate-800 overflow-x-auto hide-scrollbar pt-2">
              {days.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveDayIndex(idx)}
                  type="button"
                  className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition whitespace-nowrap ${
                    activeDayIndex === idx ? "bg-white text-slate-950" : "text-slate-500 hover:text-slate-200"
                  }`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {(program?.notes || activeDayNotes) && (
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-sm text-slate-200">
            {program?.notes ? (
              <div className="flex gap-2">
                <Info size={16} className="text-blue-300 mt-0.5" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Obiettivo</div>
                  <div>{program.notes}</div>
                </div>
              </div>
            ) : null}

            {activeDayNotes ? (
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                <Info size={16} className="text-amber-300 mt-0.5" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">Note giorno</div>
                  <div>{activeDayNotes}</div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {days.length > 0 && (!activeDay || visibleExercises.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-slate-800 rounded-3xl bg-slate-900/40">
            <div className="w-16 h-16 bg-slate-900/40 rounded-full flex items-center justify-center mb-4 text-slate-300 border border-slate-800">
              <Coffee size={32} />
            </div>
            <h3 className="text-lg font-black text-white mb-1">Riposo</h3>
            <p className="text-slate-400 text-sm">Nessun esercizio previsto in questo giorno.</p>
          </div>
        ) : null}

        {showCompletedScreen ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-300">
              <CheckCircle2 size={34} />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Giorno completato</h3>
            <p className="text-slate-300 text-sm mb-5">
              Hai completato tutti gli esercizi di <span className="text-white font-black">{activeDay?.name}</span>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setReviewMode(true);
                  closeEdit();
                  setFocusGroupIndex(0);
                }}
                className="w-full py-3 rounded-2xl bg-slate-950 text-white border border-slate-800 font-black"
                type="button"
              >
                RIVEDI
              </button>

              <button
                onClick={() => {
                  const nextDay = Math.min(days.length - 1, activeDayIndex + 1);
                  setActiveDayIndex(nextDay);
                  setReviewMode(false);
                  closeEdit();
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 border border-blue-500 text-white font-black"
                type="button"
              >
                PROSSIMO
              </button>
            </div>
          </div>
        ) : null}

        {!showCompletedScreen && groups.length > 0 ? (
          <GroupCard
            group={groups[focusGroupIndex]}
            gIndex={focusGroupIndex}
            groupsLen={groups.length}
            isFocused={true}
            onPrev={goPrevGroup}
            onNext={goNextGroup}
            disablePrev={focusGroupIndex === 0}
            disableNext={focusGroupIndex >= groups.length - 1}
            exerciseProps={exerciseProps}
          />
        ) : null}
      </div>
    </div>
  );
}