"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Minus,
  Trash2,
  Info,
  FileText,
  Dumbbell,
  Edit2,
  Clock,
  Loader2,
  Link as LinkIcon,
  Unlink,
  CheckSquare,
  Square,
  X,
} from "lucide-react";

// --- SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/* ------------------------- HELPERS ------------------------- */

const ensureObj = (x) => (x && typeof x === "object" ? x : {});

const sanitizePositiveNumberInput = (value) => {
  // Consente solo cifre e un solo punto. Niente segni, niente lettere.
  let s = String(value ?? "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = s.split(".");
  if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
  return s;
};

const toNumPositive = (v) => {
  const t = String(v ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const hasMetric = (ptm, key) => {
  if (!ptm || typeof ptm !== "object") return false;
  const v = ptm[key];

  // "Acceso" appena togglato
  if (v === "") return true;

  if (key === "target_rpe" || key === "rir") return toNumPositive(v) !== null;

  // method e altri testi
  return typeof v === "string" ? v.trim() !== "" : false;
};

const normalizePtMetrics = (ptm) => {
  const m = ensureObj(ptm);
  const out = {};

  for (const [k, v] of Object.entries(m)) {
    const kk = String(k || "").trim();
    if (!kk) continue;

    // numerici positivi
    if (kk === "target_rpe" || kk === "rir") {
      const n = toNumPositive(v);
      if (n === null) continue;
      out[kk] = n;
      continue;
    }

    // method = stringa utile e semplice
    if (kk === "method") {
      const s = String(v ?? "").trim();
      if (!s) continue;
      out[kk] = s;
      continue;
    }

    // extras come stringhe
    const s = String(v ?? "").trim();
    if (!s) continue;
    out[kk] = s;
  }

  return out;
};

const rowsFromObj = (obj) => {
  const o = ensureObj(obj);
  const entries = Object.entries(o).filter(
    ([k]) => !["target_rpe", "rir", "method"].includes(k)
  );
  if (!entries.length) return [{ k: "", v: "" }];
  return entries
    .map(([k, v]) => ({ k: String(k), v: String(v ?? "") }))
    .concat([{ k: "", v: "" }]);
};

const objFromRows = (rows) => {
  const out = {};
  (rows || []).forEach(({ k, v }) => {
    const kk = String(k ?? "").trim();
    const vv = String(v ?? "").trim();
    if (!kk || !vv) return;
    out[kk] = vv;
  });
  return out;
};

/* ------------------------- PT TARGETS PANEL ------------------------- */

function PtTargetsPanel({ ex, onUpdate }) {
  const ptm = ensureObj(ex.pt_metrics);

  const setNumericMetricValue = (key, rawValue) => {
    const cleaned = sanitizePositiveNumberInput(rawValue);
    onUpdate({ ...ex, pt_metrics: { ...ptm, [key]: cleaned } });
  };

  const setTextMetricValue = (key, rawValue) => {
    onUpdate({ ...ex, pt_metrics: { ...ptm, [key]: rawValue } });
  };

  const toggleMetric = (key) => {
    const next = { ...ptm };
    if (hasMetric(ptm, key)) delete next[key];
    else next[key] = ""; // accendo
    onUpdate({ ...ex, pt_metrics: next });
  };

  const [rows, setRows] = useState(() => rowsFromObj(ptm));

  useEffect(() => {
    setRows(rowsFromObj(ensureObj(ex.pt_metrics)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id]);

  const commitRowsToExercise = (nextRows) => {
    const extras = objFromRows(nextRows);
    const base = { ...ensureObj(ex.pt_metrics) };

    // rimuovo tutte le extra (non standard)
    for (const k of Object.keys(base)) {
      if (["target_rpe", "rir", "method"].includes(k)) continue;
      delete base[k];
    }

    onUpdate({ ...ex, pt_metrics: { ...base, ...extras } });
  };

  const fields = [
    { key: "target_rpe", label: "Target RPE", type: "number", hint: "0–10" },
    { key: "rir", label: "RIR", type: "number", hint: "Es. 2" },
    { key: "method", label: "Metodo", type: "text", hint: "Es. drop set / cluster / myo" },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
          Parametri PT (visibili all’atleta)
        </div>
      </div>

      {/* TOGGLE */}
      <div className="flex flex-wrap gap-2 mb-4">
        {fields.map((f) => {
          const on = hasMetric(ptm, f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleMetric(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition ${
                on
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* INPUTS (NO type=number => NO SPINNERS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.map((f) => {
          if (!hasMetric(ptm, f.key)) return null;
          const value = ptm[f.key] ?? "";

          return (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {f.label}
              </label>

              {f.type === "number" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setNumericMetricValue(f.key, e.target.value)}
                  placeholder={f.hint}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setTextMetricValue(f.key, e.target.value)}
                  placeholder={f.hint}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-500"
                />
              )}

              <div className="text-[10px] text-slate-400 font-bold">{f.hint}</div>
            </div>
          );
        })}
      </div>

      {/* EXTRA K/V */}
      <div className="mt-4">
        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
          Extra PT (chiave / valore) — salvati solo se compilati
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
              <input
                value={row.k}
                onChange={(e) => {
                  const val = e.target.value;
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[i] = { ...copy[i], k: val };
                    if (i === copy.length - 1 && (val.trim() || copy[i].v.trim())) copy.push({ k: "", v: "" });
                    commitRowsToExercise(copy);
                    return copy;
                  });
                }}
                placeholder="es. cue"
                className="min-w-0 w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-sm text-slate-800 font-black outline-none focus:border-blue-500"
              />
              <input
                value={row.v}
                onChange={(e) => {
                  const val = e.target.value;
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[i] = { ...copy[i], v: val };
                    if (i === copy.length - 1 && (copy[i].k.trim() || val.trim())) copy.push({ k: "", v: "" });
                    commitRowsToExercise(copy);
                    return copy;
                  });
                }}
                placeholder="es. ginocchia fuori"
                className="min-w-0 w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-sm text-slate-800 font-black outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  setRows((prev) => {
                    const copy = prev.filter((_, idx) => idx !== i);
                    const safe = copy.length ? copy : [{ k: "", v: "" }];
                    commitRowsToExercise(safe);
                    return safe;
                  });
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 transition flex items-center justify-center"
                title="Rimuovi"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- PAGE ------------------------- */

export default function EditorPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [program, setProgram] = useState(null);
  const [days, setDays] = useState([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [activeWeek, setActiveWeek] = useState(1);
  const [duration, setDuration] = useState(4);

  // selezione per superserie
  const [selectedExIds, setSelectedExIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingDayId, setEditingDayId] = useState(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (id) fetchProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (editingDayId && editInputRef.current) editInputRef.current.focus();
  }, [editingDayId]);

  const fetchProgram = async () => {
    setLoading(true);

    const { data, error } = await supabase.from("programs").select("*").eq("id", id).single();

    if (error || !data) {
      console.error(error);
      setLoading(false);
      return;
    }

    setProgram(data);
    setDuration(data.duration || 4);

    if (data.days_structure && Array.isArray(data.days_structure) && data.days_structure.length > 0) {
      const sanitizedDays = data.days_structure.map((d) => ({
        ...d,
        exercises: Array.isArray(d.exercises)
          ? d.exercises.map((ex) => ({
              ...ex,
              id: ex.id || `ex-${Math.random().toString(36).slice(2, 9)}`,
              superset_id: ex.superset_id || null,
              pt_metrics: ex.pt_metrics && typeof ex.pt_metrics === "object" ? ex.pt_metrics : {},
            }))
          : [],
        notes: d.notes || "",
      }));
      setDays(sanitizedDays);
    } else {
      setDays([{ id: `day-${Date.now()}`, name: "Giorno A", notes: "", exercises: [] }]);
    }

    setLoading(false);
  };

  // --- DISPLAY DATA (progressione) ---
  const getExerciseDisplayData = (ex) => {
    if (activeWeek === 1) return ex;
    const override = ex.progression?.[activeWeek] || ex.progression?.[String(activeWeek)];
    return override ? { ...ex, ...override } : ex;
  };

  const getDayNotes = (day) => {
    if (activeWeek === 1) return day.notes || "";
    const p = day.progression || {};
    const wOverride = p[activeWeek] || p[String(activeWeek)];
    return wOverride?.notes ?? day.notes ?? "";
  };

  // --- UPDATES ---
  const updateDayName = (index, val) => {
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, name: val } : day)));
  };

  const updateDayNotes = (val) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== activeDayIndex) return day;
        const updated = { ...day };
        if (activeWeek === 1) updated.notes = val;
        else {
          updated.progression = { ...updated.progression };
          if (!updated.progression[activeWeek]) updated.progression[activeWeek] = {};
          updated.progression[activeWeek] = { ...updated.progression[activeWeek], notes: val };
        }
        return updated;
      })
    );
  };

  const updateExercise = (exId, field, value) => {
    setDays((prev) =>
      prev.map((day, dIdx) => {
        if (dIdx !== activeDayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex) => {
            if (ex.id !== exId) return ex;

            const updatedEx = { ...ex };
            if (activeWeek === 1) updatedEx[field] = value;
            else {
              updatedEx.progression = { ...updatedEx.progression };
              if (!updatedEx.progression[activeWeek]) {
                updatedEx.progression[activeWeek] = {
                  sets: updatedEx.sets,
                  reps: updatedEx.reps,
                  load: updatedEx.load,
                  rest: updatedEx.rest,
                  notes: updatedEx.notes,
                };
              }
              updatedEx.progression[activeWeek] = { ...updatedEx.progression[activeWeek], [field]: value };
            }
            return updatedEx;
          }),
        };
      })
    );
  };

  const updateExerciseObject = (exId, updater) => {
    setDays((prev) =>
      prev.map((day, dIdx) => {
        if (dIdx !== activeDayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex) => (ex.id === exId ? updater(ex) : ex)),
        };
      })
    );
  };

  // --- DAYS ---
  const addDay = () => {
    const label = String.fromCharCode(65 + days.length);
    const newDay = { id: `day-${Date.now()}`, name: `Giorno ${label}`, notes: "", exercises: [] };
    setDays([...days, newDay]);
    setActiveDayIndex(days.length);
  };

  const deleteDay = () => {
    if (days.length <= 1) return alert("Minimo un giorno richiesto.");
    if (!confirm("Eliminare questo giorno?")) return;
    const newDays = days.filter((_, i) => i !== activeDayIndex);
    setDays(newDays);
    setActiveDayIndex(0);
    setSelectedExIds([]);
  };

  // --- EXERCISES ---
  const addExercise = () => {
    // ✅ niente valori precompilati
    const newEx = {
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      sets: "",
      reps: "",
      load: "",
      rest: "",
      notes: "",
      superset_id: null,
      pt_metrics: {},
    };

    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== activeDayIndex) return day;
        return { ...day, exercises: [...day.exercises, newEx] };
      })
    );
  };

  const deleteExercise = (exId) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== activeDayIndex) return day;
        return { ...day, exercises: day.exercises.filter((x) => x.id !== exId) };
      })
    );
    setSelectedExIds((prev) => prev.filter((x) => x !== exId));
  };

  // --- MULTI SELECT ---
  const toggleSelection = (exId) => {
    setSelectedExIds((prev) => (prev.includes(exId) ? prev.filter((id) => id !== exId) : [...prev, exId]));
  };

  const clearSelection = () => setSelectedExIds([]);

  // ✅ Helper: rendi contigui gli esercizi della superserie (evita rendering “spezzato”)
  const reorderSupersetContiguous = (exerciseList, ssid) => {
    const firstIdx = exerciseList.findIndex((x) => x.superset_id === ssid);
    if (firstIdx < 0) return exerciseList;

    const before = exerciseList.slice(0, firstIdx).filter((x) => x.superset_id !== ssid);
    const group = exerciseList.filter((x) => x.superset_id === ssid);
    const after = exerciseList.slice(firstIdx).filter((x) => x.superset_id !== ssid);

    return [...before, ...group, ...after];
  };

  // ✅ CREA / ESTENDI SUPER SERIE (NO DUPLICATI + MERGE + NO RESET)
  const createSuperset = () => {
    if (selectedExIds.length < 2) return;

    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== activeDayIndex) return day;

        const selected = day.exercises.filter((ex) => selectedExIds.includes(ex.id));
        const existingIds = Array.from(new Set(selected.map((ex) => ex.superset_id).filter(Boolean)));

        const targetSupersetId = existingIds[0] || `ss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const idsToMerge = existingIds.slice(1);

        const updatedExercises = day.exercises.map((ex) => {
          const isSelected = selectedExIds.includes(ex.id);

          if (idsToMerge.length && ex.superset_id && idsToMerge.includes(ex.superset_id)) {
            return { ...ex, superset_id: targetSupersetId };
          }

          if (isSelected) {
            if (ex.superset_id === targetSupersetId) return ex;
            return { ...ex, superset_id: targetSupersetId };
          }

          return ex;
        });

        const contiguous = reorderSupersetContiguous(updatedExercises, targetSupersetId);
        return { ...day, exercises: contiguous };
      })
    );
  };

  const ungroupSuperset = (supersetId) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== activeDayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex) => (ex.superset_id === supersetId ? { ...ex, superset_id: null } : ex)),
        };
      })
    );
  };

  // --- WEEKS ---
  const addWeek = async () => {
    const newDuration = Number(duration) + 1;
    setDuration(newDuration);
    await supabase.from("programs").update({ duration: newDuration }).eq("id", id);
    setActiveWeek(newDuration);
  };

  const removeWeek = async () => {
    if (Number(duration) <= 1) return;
    if (!confirm("Rimuovere ultima settimana?")) return;
    const newDuration = Number(duration) - 1;
    setDuration(newDuration);
    if (activeWeek > newDuration) setActiveWeek(newDuration);
    await supabase.from("programs").update({ duration: newDuration }).eq("id", id);
  };

  const saveProgram = async () => {
    setSaving(true);

    // ✅ normalizzo pt_metrics: niente placeholder, salvo solo se compilato
    const cleanedDays = (days || []).map((d) => ({
      ...d,
      exercises: (d.exercises || []).map((ex) => ({
        ...ex,
        pt_metrics: normalizePtMetrics(ex.pt_metrics),
      })),
    }));

    const { error } = await supabase
      .from("programs")
      .update({ days_structure: cleanedDays, duration: Number(duration) })
      .eq("id", id);

    setSaving(false);
    if (error) alert("Errore: " + error.message);
    else setDays(cleanedDays);
  };

  // --- RENDER GROUPS (contiguo) ---
  const groupExercisesForRender = (exerciseList) => {
    const groups = [];
    let currentGroup = null;

    exerciseList.forEach((ex) => {
      if (ex.superset_id) {
        if (currentGroup && currentGroup.type === "superset" && currentGroup.id === ex.superset_id) {
          currentGroup.exercises.push(ex);
        } else {
          currentGroup = { type: "superset", id: ex.superset_id, exercises: [ex] };
          groups.push(currentGroup);
        }
      } else {
        groups.push({ type: "single", exercises: [ex] });
        currentGroup = null;
      }
    });

    return groups;
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium">
        <Loader2 className="animate-spin mr-2" /> Caricamento...
      </div>
    );

  if (!program)
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Errore caricamento.</div>;

  const activeDay = days[activeDayIndex] || days[0];
  const renderedGroups = groupExercisesForRender(activeDay.exercises);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">{program?.title}</h1>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                <Clock size={12} /> {duration} SETTIMANE
              </div>
            </div>
          </div>

          <button
            onClick={saveProgram}
            disabled={saving}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? "..." : "SALVA"}
          </button>
        </div>

        {/* SETTIMANE */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
          {Array.from({ length: Number(duration) || 4 }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setActiveWeek(i + 1)}
              className={`flex-shrink-0 w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center transition border ${
                activeWeek === i + 1
                  ? "bg-slate-900 text-white border-slate-900 shadow-md scale-105"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              }`}
            >
              W{i + 1}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1 border-l border-slate-200 pl-2">
            <button
              onClick={removeWeek}
              disabled={duration <= 1}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-30"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={addWeek}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* DAY TABS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {days.map((day, idx) => {
            const isActive = idx === activeDayIndex;
            const isEditing = editingDayId === day.id;

            return (
              <div
                key={day.id}
                className={`relative flex items-center px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
                onClick={() => !isEditing && setActiveDayIndex(idx)}
              >
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={day.name}
                    onChange={(e) => updateDayName(idx, e.target.value)}
                    onBlur={() => setEditingDayId(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingDayId(null)}
                    className="bg-transparent text-sm font-bold outline-none text-white w-24"
                  />
                ) : (
                  <span className="font-bold text-sm whitespace-nowrap">{day.name}</span>
                )}
                {isActive && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDayId(day.id);
                    }}
                    className="ml-2 p-1 text-blue-200 hover:text-white rounded-full hover:bg-blue-500/50 transition"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
          <button onClick={addDay} className="p-2.5 bg-slate-200 rounded-xl hover:bg-slate-300 text-slate-600 transition">
            <Plus size={18} />
          </button>
        </div>

        {/* CARD */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
          {/* ACTION BAR SELEZIONE */}
          {selectedExIds.length > 0 && (
            <div className="absolute top-0 left-0 right-0 bg-slate-900 text-white z-20 p-3 flex justify-between items-center">
              <span className="text-sm font-bold ml-2">{selectedExIds.length} selezionati</span>
              <div className="flex gap-2">
                {selectedExIds.length > 1 && (
                  <button
                    onClick={createSuperset}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition"
                  >
                    <LinkIcon size={14} /> CREA/ESTENDI
                  </button>
                )}
                <button
                  onClick={clearSelection}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2"
                >
                  <X size={14} /> SVUOTA
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {activeWeek === 1 ? "Programma Base (W1)" : `Modifica Settimana ${activeWeek}`}
            </div>
            <button onClick={deleteDay} className="text-slate-400 hover:text-red-500 p-2 transition">
              <Trash2 size={18} />
            </button>
          </div>

          <div className="px-5 pt-5 relative">
            {activeWeek > 1 && (
              <div className="absolute top-5 right-5 text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 z-10">
                NOTA W{activeWeek}
              </div>
            )}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3">
              <div className="mt-1 text-amber-400">
                <Info size={18} />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">
                  Note per la giornata
                </label>
                <textarea
                  value={getDayNotes(activeDay)}
                  onChange={(e) => updateDayNotes(e.target.value)}
                  placeholder="Es. Focus tempo sotto tensione..."
                  className="w-full bg-transparent outline-none text-sm text-amber-900 placeholder:text-amber-400/70 font-medium resize-none h-auto min-h-[40px]"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {renderedGroups.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl text-slate-400">
                <Dumbbell size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">Nessun esercizio.</p>
              </div>
            ) : (
              renderedGroups.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className={`relative ${
                    group.type === "superset"
                      ? "p-4 rounded-2xl border-l-4 border-l-purple-500 bg-purple-50/50 border-y border-r border-slate-200"
                      : ""
                  }`}
                >
                  {group.type === "superset" && (
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                        <LinkIcon size={14} /> SUPER SET
                      </div>
                      <button
                        onClick={() => ungroupSuperset(group.id)}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition"
                      >
                        <Unlink size={12} /> SEPARA
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {group.exercises.map((ex) => {
                      const data = getExerciseDisplayData(ex);
                      const isSelected = selectedExIds.includes(ex.id);

                      return (
                        <div
                          key={ex.id}
                          className={`group relative bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                            isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-blue-300"
                          } ${activeWeek > 1 ? "bg-blue-50/20" : ""}`}
                        >
                          {activeWeek > 1 && (
                            <div className="absolute top-2 right-2 text-[9px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded">
                              MODIFICA W{activeWeek}
                            </div>
                          )}

                          <div className="flex items-start gap-3 mb-4">
                            <button
                              onClick={() => toggleSelection(ex.id)}
                              className={`mt-1 transition ${
                                isSelected ? "text-blue-600" : "text-slate-300 hover:text-slate-500"
                              }`}
                            >
                              {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                            </button>

                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                                Esercizio
                              </label>
                              <input
                                value={data.name}
                                onChange={(e) => updateExercise(ex.id, "name", e.target.value)}
                                className="w-full text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300 bg-transparent"
                                placeholder="Nome Esercizio"
                              />
                            </div>

                            <button
                              onClick={() => deleteExercise(ex.id)}
                              className="text-slate-200 hover:text-red-500 transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">
                                Serie
                              </label>
                              <input
                                value={data.sets}
                                onChange={(e) => updateExercise(ex.id, "sets", e.target.value)}
                                className="w-full text-center font-bold text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                placeholder="-"
                              />
                            </div>

                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">
                                Reps
                              </label>
                              <input
                                value={data.reps}
                                onChange={(e) => updateExercise(ex.id, "reps", e.target.value)}
                                className="w-full text-center font-bold text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                placeholder="-"
                              />
                            </div>

                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">
                                Recupero
                              </label>
                              <input
                                value={data.rest}
                                onChange={(e) => updateExercise(ex.id, "rest", e.target.value)}
                                className="w-full text-center font-bold text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                placeholder='es. 90"'
                              />
                            </div>

                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">
                                Carico
                              </label>
                              <input
                                value={data.load}
                                onChange={(e) => updateExercise(ex.id, "load", e.target.value)}
                                className="w-full text-center font-bold text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                placeholder="-"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2">
                            <FileText size={16} className="text-yellow-600" />
                            <input
                              value={data.notes || ""}
                              onChange={(e) => updateExercise(ex.id, "notes", e.target.value)}
                              placeholder="Note tecniche..."
                              className="w-full bg-transparent text-sm font-medium text-yellow-800 placeholder:text-yellow-800/50 outline-none"
                            />
                          </div>

                          {/* ✅ PT TARGETS */}
                          <PtTargetsPanel
                            ex={ex}
                            onUpdate={(nextEx) =>
                              updateExerciseObject(ex.id, () => ({
                                ...nextEx,
                                pt_metrics: ensureObj(nextEx.pt_metrics),
                              }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <button
              onClick={addExercise}
              className="w-full py-4 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition"
            >
              <Plus size={20} /> Aggiungi esercizio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
