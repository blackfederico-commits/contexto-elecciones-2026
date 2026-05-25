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

        const metrics: Metric[] = [
          { label: "Participación", value: ensurePercentage(dashboardMap.get("participacion") ?? ""), description: "Electores movilizados" },
          { label: "Mesas informadas", value: formatVotes(dashboardMap.get("mesas_informadas") ?? ""), description: "Mesas informadas" },
          { label: "Abstención", value: ensurePercentage(dashboardMap.get("abstencion") ?? ""), description: "Padrón no votante" },
        ];

        const blank = resultados.find((c) => c.nombre.toLowerCase().includes("blanco"));
        if (blank) metrics.splice(2, 0, { label: "Voto en blanco", value: blank.votos, description: "Votos en blanco" });

        if (mounted) {
          setCandidatos(resultados);
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

  const top6 = candidatos.slice(0, 6);
  const highestTop = Math.max(...top6.map((c) => c.porcentaje), 1);

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#fafaf8] to-[#f5f3f0] px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative mx-auto max-w-7xl space-y-10">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Cobertura especial en tiempo real</p>
              <h1 className="font-serif text-4xl leading-tight sm:text-5xl md:text-6xl font-semibold text-[#cc0100]">Elecciones Presidenciales Colombia 2026</h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Cobertura especial de Contexto.info para Elecciones Colombia 2026</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">ÚLTIMA ACTUALIZACIÓN</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{updatedAt}</p>
            </div>
          </div>
        </header>

        {/* Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <article key={i} className="metric-card hover-lift animate-pulse" />
            ))
          ) : (
            dashboardMetrics.map((m) => (
              <article key={m.label} className="metric-card hover-lift">
                <p className="text-xs uppercase tracking-[0.34em] text-slate-600">{m.label}</p>
                <p className="metric-value text-slate-900">{m.value}</p>
                <p className="mt-1 text-sm text-slate-500">{m.description}</p>
              </article>
            ))
          )}
        </section>

        {/* TOP 6 visual */}
        <section className="space-y-6 animate-fade-up">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-slate-950 mb-2">Resultados Presidenciales</h2>
            <p className="text-slate-600">6 opciones con mayor votación</p>
          </div>

          <div className="top-results">
            {loading
              ? [...Array(6)].map((_, idx) => (
                  <div key={idx} className="result-item" aria-hidden>
                    <div className="bar-container">
                      <div className="bar-header">
                        <div className="h-6 w-20 rounded-full bg-slate-200" />
                        <div className="h-4 w-24 rounded-full bg-slate-200" />
                      </div>
                      <div className="bar-rail">
                        <div className="bar-fill" style={{ backgroundColor: "#e2e8f0", transform: "scaleY(0.18)" }} />
                      </div>
                    </div>
                    <div className="candidate-photo bg-slate-200" />
                    <div className="result-info">
                      <div className="h-4 w-32 rounded-full bg-slate-200" />
                      <div className="h-3 w-20 rounded-full bg-slate-200" />
                    </div>
                  </div>
                ))
              : top6.map((c, idx) => {
                  const isLeader = idx === 0;
                  const scale = Math.max(0.12, c.porcentaje / highestTop);
                  return (
                    <div key={c.id} className={`result-item ${isLeader ? "leader" : ""}`}>
                      <div className="bar-container">
                        <div className="bar-header">
                          <span className="bar-value" style={{ color: c.color }}>{c.porcentaje}%</span>
                          <span className="bar-subtext">{c.votos} votos</span>
                        </div>
                        <div className="bar-rail">
                          <div
                            className={`bar-fill`}
                            style={{
                              background: c.color,
                              animationDelay: `${idx * 0.06}s`,
                              ["--fill-scale" as any]: scale,
                            } as CSSProperties}
                          />
                        </div>
                      </div>
                      <img src={`/avatars/${resolveAvatarFile(c.foto, c.nombre)}`} alt={c.nombre} className="candidate-photo" />
                      <div className="result-info">
                        <p className="result-name">{c.nombre}</p>
                        <p className="muted">{c.formula ?? ""}</p>
                      </div>
                    </div>
                  );
                })}
          </div>
        </section>

        {/* Secondary: All candidates table */}
        <section className="space-y-6 animate-fade-up">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-slate-950 mb-2">Todas las opciones</h2>
          </div>

          <div className="all-results soft-card">
            {loading ? (
              <div className="p-6">Cargando...</div>
            ) : (
              <div className="p-4">
                <div className="all-results-grid" role="table">
                  {candidatos.map((c) => (
                    <div key={c.id} className="all-results-row" role="row">
                      <div className="row-left">
                        <img src={`/avatars/${c.foto}`} alt={c.nombre} className="avatar" />
                        <div className="ml-4 min-w-0">
                          <p className="candidate-name-mobile text-slate-950 font-semibold leading-tight truncate">{c.nombre}</p>
                          <p className="text-xs text-slate-500 mt-1">{c.votos} votos</p>
                        </div>
                      </div>
                      <div className="row-right">
                        <p className="percentage-label text-slate-950 font-semibold">{c.porcentaje}%</p>
                        <div className="small-bar-rail">
                          <div className="small-bar-fill" style={{ width: `${Math.min(100, c.porcentaje)}%`, background: c.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-8 pb-4">
          <p className="text-center text-sm text-slate-500">Datos actualizados: {updatedAt} • Fuente: Registraduría Nacional del Estado Civil</p>
        </footer>
      </div>
    </main>
  );
}
