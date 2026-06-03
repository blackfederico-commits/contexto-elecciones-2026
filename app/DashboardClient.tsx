"use client"

import { useEffect, useState, type CSSProperties } from "react";

const RESULTADOS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSQqauci2C89QLThjt-qK_O8KflhfSMuxHx4yOso6amSGlI953l3PJ7CHdOxm3_xLaiVj1XrNUZhjwI/pub?gid=0&single=true&output=csv";
const DASHBOARD_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSQqauci2C89QLThjt-qK_O8KflhfSMuxHx4yOso6amSGlI953l3PJ7CHdOxm3_xLaiVj1XrNUZhjwI/pub?gid=922132930&single=true&output=csv";

type Candidate = {
  id: number;
  nombre: string;
  porcentaje: number;
  votos: string;
  votosNumero: number;
  foto: string;
  color: string;
  formula?: string;
};

type Metric = { label: string; value: string; description: string };

type ResultadosRow = { id: string; nombre: string; porcentaje: string; votos: string; color: string; foto: string };
type DashboardRow = { metrica: string; valor: string };

function normalizeCell(value: string) {
  const cleaned = value.replace(/^\uFEFF/, "").trim();
  if (/^".*"$/.test(cleaned)) return cleaned.slice(1, -1).trim();
  return cleaned;
}

function parseCSV<T extends Record<string, string>>(csv: string): T[] {
  const content = csv.replace(/^\uFEFF/, "").trim();
  const rows: string[][] = [[]];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      rows[rows.length - 1].push(field);
      field = "";
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      rows[rows.length - 1].push(field);
      field = "";
      if (char === '\r' && next === '\n') i += 1;
      rows.push([]);
      continue;
    }
    field += char;
  }
  if (field.length || rows[rows.length - 1].length) rows[rows.length - 1].push(field);
  const cleanedRows = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (cleanedRows.length < 2) return [];
  const headers = cleanedRows[0].map((v) => normalizeCell(v).toLowerCase());
  return cleanedRows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    row.forEach((value, idx) => {
      record[headers[idx] ?? String(idx)] = normalizeCell(value);
    });
    return record as T;
  });
}

function parseNumber(value: string) {
  const cleaned = value.replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned) return 0;
  const normalized = cleaned.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatVotes(value: string) {
  const parsed = parseNumber(value);
  if (!Number.isFinite(parsed) || parsed === 0) return value.trim();
  return new Intl.NumberFormat("es-CO").format(parsed);
}

function ensurePercentage(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/\s*%$/, "%");
  return normalized.endsWith("%") ? normalized : `${normalized}%`;
}

function resolveAvatarFile(fileName: string, nombre: string) {
  const normalized = fileName?.trim();
  if (!normalized) {
    return `${nombre.replace(/\s+/g, "")}.png`;
  }
  if (/matamoros/i.test(normalized) && !/matamoroso/i.test(normalized)) {
    return "GustavoMatamoroso.png";
  }
  return normalized;
}

export default function DashboardClient() {
  const [candidatos, setCandidatos] = useState<Candidate[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<Metric[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [resR, resD] = await Promise.all([
          fetch(`${RESULTADOS_CSV}&t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-store" } }),
          fetch(`${DASHBOARD_CSV}&t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-store" } }),
        ]);
        const [rText, dText] = await Promise.all([resR.text(), resD.text()]);
        const resultados = parseCSV<ResultadosRow>(rText)
          .filter((row) => row.nombre.trim().length > 0)
          .map((row) => {
            const votosNumero = parseNumber(row.votos);
            return {
              id: Number(row.id) || 0,
              nombre: row.nombre,
              porcentaje: Number(row.porcentaje) || 0,
              votos: formatVotes(row.votos),
              votosNumero,
              foto: resolveAvatarFile(row.foto, row.nombre),
              color: row.color || "#1f2937",
              formula: "",
            };
          })
          .sort((a, b) => b.votosNumero - a.votosNumero || b.porcentaje - a.porcentaje);

        const dashboardRows = parseCSV<DashboardRow>(dText);
        const dashboardMap = new Map(dashboardRows.map((r) => [r.metrica.toLowerCase().trim(), r.valor.trim()]));

        const blank = resultados.find((c) => c.nombre.toLowerCase().includes("blanco"));
        const blankPercentage = blank
          ? ensurePercentage(`${blank.porcentaje}%`)
          : ensurePercentage(dashboardMap.get("voto_en_blanco") ?? dashboardMap.get("blanco") ?? "");

        const metrics: Metric[] = [
          { label: "Participación", value: ensurePercentage(dashboardMap.get("participacion") ?? ""), description: "Electores movilizados" },
          { label: "Mesas informadas", value: ensurePercentage(dashboardMap.get("mesas_informadas") ?? ""), description: "Mesas informadas" },
          { label: "Voto en blanco", value: blankPercentage, description: "Votos en blanco" },
          { label: "Abstención", value: ensurePercentage(dashboardMap.get("abstencion") ?? ""), description: "Padrón no votante" },
        ];

        const candidatosDeSegundaVuelta = resultados
          .filter((c) => {
            const key = c.nombre.toLowerCase();
            return key.includes("abelardo") || key.includes("cepeda") || key.includes("blanco");
          })
          .sort((a, b) => {
            const order = ["abelardo", "cepeda", "blanco"];
            return order.indexOf(a.nombre.toLowerCase().includes("abelardo") ? "abelardo" : a.nombre.toLowerCase().includes("cepeda") ? "cepeda" : "blanco") - order.indexOf(b.nombre.toLowerCase().includes("abelardo") ? "abelardo" : b.nombre.toLowerCase().includes("cepeda") ? "cepeda" : "blanco");
          });

        if (mounted) {
          setCandidatos(candidatosDeSegundaVuelta);
          setDashboardMetrics(metrics);
          setUpdatedAt(dashboardMap.get("hora_actualizacion") ?? "");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const leader = candidatos[0];
  const abelardo = candidatos.find((c) => /abelardo/i.test(c.nombre));
  const ivan = candidatos.find((c) => /cepeda/i.test(c.nombre));
  const votoBlanco = candidatos.find((c) => /blanco/i.test(c.nombre));
  const voteDifference = Math.abs((abelardo?.votosNumero ?? 0) - (ivan?.votosNumero ?? 0));
  const percentDifference = Math.abs((abelardo?.porcentaje ?? 0) - (ivan?.porcentaje ?? 0));

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#fafaf8] to-[#f5f3f0] px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative mx-auto max-w-7xl space-y-10">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Cobertura especial en tiempo real</p>
              <h1 className="font-serif text-4xl leading-tight sm:text-5xl md:text-6xl font-semibold text-[#cc0100]">Elecciones Presidenciales Colombia 2026</h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Especial segunda vuelta de Contexto.info</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">ÚLTIMA ACTUALIZACIÓN</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{updatedAt}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <article key={i} className="stat-card animate-pulse" />
            ))
          ) : (
            dashboardMetrics.map((m) => (
              <article key={m.label} className="stat-card">
                <p className="text-xs uppercase tracking-[0.34em] text-slate-500">{m.label}</p>
                <p className="mt-4 text-4xl font-semibold text-slate-950">{m.value}</p>
                <p className="mt-3 text-sm text-slate-500">{m.description}</p>
              </article>
            ))
          )}
        </section>

        <section className="space-y-6 animate-fade-up">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-slate-950 mb-2">Segunda vuelta presidencial</h2>
            <p className="text-slate-600">Tres opciones, enfoque claro y cobertura premium.</p>
          </div>

          <div className="hidden md:grid grid-cols-3 gap-6">
            {loading
              ? [...Array(3)].map((_, idx) => (
                  <article key={idx} className="bar-card animate-pulse" aria-hidden>
                    <div className="bar-card-header">
                      <div className="h-10 w-24 rounded-full bg-slate-200" />
                      <div className="h-4 w-20 rounded-full bg-slate-200 mt-4" />
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill vertical" />
                    </div>
                    <div className="bar-card-footer">
                      <div className="h-14 w-full rounded-2xl bg-slate-200" />
                      <div className="h-4 w-32 rounded-full bg-slate-200 mt-4" />
                    </div>
                  </article>
                ))
              : [abelardo, ivan, votoBlanco].filter(Boolean).map((candidate) => {
                  const isLeader = candidate?.nombre === leader?.nombre;
                  return (
                    <article key={candidate?.id} className={`bar-card ${isLeader ? "bar-card-leader" : ""}`}>
                      <div className="bar-card-header">
                        <p className="text-4xl font-semibold text-slate-950">{candidate?.porcentaje}%</p>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill vertical"
                          style={{
                            background: candidate?.color,
                            height: `${Math.max(12, Math.min(100, candidate?.porcentaje ?? 0))}%`,
                          }}
                        >
                          <span className="bar-fill-text">{candidate?.votos}</span>
                        </div>
                      </div>
                      <div className="bar-card-footer">
                        <img src={`/avatars/${resolveAvatarFile(candidate?.foto ?? "", candidate?.nombre ?? "")}`} alt={candidate?.nombre} className="bar-photo" />
                        <div>
                          <p className="text-lg font-semibold text-slate-950">{candidate?.nombre}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
          </div>

          <div className="md:hidden grid grid-cols-2 gap-4">
            {[abelardo, ivan].filter(Boolean).map((candidate) => {
              const isLeader = candidate?.nombre === leader?.nombre;
              return (
                <article key={candidate?.id} className={`mobile-card ${isLeader ? "mobile-card-leader" : ""}`}>
                  <img src={`/avatars/${resolveAvatarFile(candidate?.foto ?? "", candidate?.nombre ?? "")}`} alt={candidate?.nombre} className="mobile-card-photo" />
                  <div className="mobile-card-content">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{candidate?.nombre}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950">{candidate?.porcentaje}%</p>
                    <p className="mt-2 text-sm text-slate-600">{candidate?.votos} votos</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="md:hidden">
            <article className="mobile-card mobile-card-blank">
              <div className="mobile-card-blank-head">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Voto en Blanco</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{votoBlanco?.porcentaje ?? 0}%</p>
              </div>
              <p className="mt-3 text-sm text-slate-600">{votoBlanco?.votos ?? "0"} votos</p>
            </article>
          </div>
        </section>

        <section className="summary-panel animate-fade-up">
          <div className="summary-grid">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Líder actual</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{leader?.nombre ?? "Sin datos"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Diferencia de votos</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{voteDifference.toLocaleString("es-CO")} votos</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Diferencia porcentual</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{percentDifference.toFixed(1)} pts</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Última actualización</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{updatedAt}</p>
            </div>
          </div>
        </section>

        <section className="mobile-summary-metrics md:hidden animate-fade-up">
          <div className="grid grid-cols-2 gap-4">
            {dashboardMetrics.slice(0, 3).map((metric) => (
              <article key={metric.label} className="stat-card">
                <p className="text-xs uppercase tracking-[0.34em] text-slate-500">{metric.label}</p>
                <p className="mt-4 text-2xl font-semibold text-slate-950">{metric.value}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-8 pb-4">
          <p className="text-center text-sm text-slate-500">Datos actualizados: {updatedAt} • Fuente: Registraduría Nacional del Estado Civil</p>
        </footer>
      </div>
    </main>
  );
}
