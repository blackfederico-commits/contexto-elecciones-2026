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

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-CO").format(Math.round(value));
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
  const [barActive, setBarActive] = useState(false);
  const [animatedVotes, setAnimatedVotes] = useState<Record<number, number>>({});

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

  useEffect(() => {
    if (!loading && candidatos.length > 0) {
      setBarActive(false);
      const initialCounts = candidatos.reduce((acc, candidate) => {
        acc[candidate.id] = 0;
        return acc;
      }, {} as Record<number, number>);
      setAnimatedVotes(initialCounts);

      const duration = 1350;
      const start = performance.now();

      const step = (timestamp: number) => {
        const elapsed = Math.min(duration, timestamp - start);
        const progress = elapsed / duration;
        const nextCounts = candidatos.reduce((acc, candidate) => {
          acc[candidate.id] = Math.round(candidate.votosNumero * progress);
          return acc;
        }, {} as Record<number, number>);
        setAnimatedVotes(nextCounts);

        if (elapsed < duration) {
          requestAnimationFrame(step);
        } else {
          const finalCounts = candidatos.reduce((acc, candidate) => {
            acc[candidate.id] = candidate.votosNumero;
            return acc;
          }, {} as Record<number, number>);
          setAnimatedVotes(finalCounts);
        }
      };

      requestAnimationFrame((timestamp) => {
        setBarActive(true);
        step(timestamp);
      });
    }
  }, [loading, candidatos]);

  const leader = candidatos[0];
  const abelardo = candidatos.find((c) => /abelardo/i.test(c.nombre));
  const ivan = candidatos.find((c) => /cepeda/i.test(c.nombre));
  const votoBlanco = candidatos.find((c) => /blanco/i.test(c.nombre));
  const voteDifference = Math.abs((abelardo?.votosNumero ?? 0) - (ivan?.votosNumero ?? 0));
  const percentDifference = Math.abs((abelardo?.porcentaje ?? 0) - (ivan?.porcentaje ?? 0));
  const contenders = [abelardo, ivan].filter((c): c is Candidate => Boolean(c));

  const getLeaderPercentage = (candidate: Candidate) => {
    const leaderPercent = leader?.porcentaje ?? candidate.porcentaje ?? 100;
    return Math.min(100, (candidate.porcentaje / leaderPercent) * 100);
  };

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
          </div>

          <div className="comparison-grid hidden md:grid gap-6">
            {contenders.map((candidate) => {
              const votesValue = formatNumber(animatedVotes[candidate.id] ?? 0);
              const leaderPercent = leader?.porcentaje ?? candidate.porcentaje ?? 100;
              const scaledHeight = Math.min(
  100,
  10 + (candidate.porcentaje * 1.8)
);;
              const showInsideBar = scaledHeight >= 25;
              const baseColor = candidate.color;
              return (
                <article key={candidate.id} className={`comparison-card ${candidate.nombre === leader?.nombre ? "comparison-card-leader" : ""}`}>
                  <div className="comparison-card-top">
                    <p className="comparison-percentage">{candidate.porcentaje}%</p>
                    <p className="comparison-name">{candidate.nombre}</p>
                  </div>
                  <div className="comparison-profile-row">
                    <img src={`/avatars/${resolveAvatarFile(candidate.foto, candidate.nombre)}`} alt={candidate.nombre} className="comparison-photo" />
                    <div className="comparison-body">
                      <div className="comparison-chart">
                        <div className="comparison-bar-vertical">
                          <div
                            className="comparison-bar-fill-vertical"
                            style={{
                              "--fill-scale": `${scaledHeight}%`,
                              "--fill-color-light": baseColor,
                              "--fill-color-dark": `${baseColor}ee`,
                            } as CSSProperties}
                          >
                            {showInsideBar ? (
                              <div className="inbar-votes">
                                <div className="inbar-votes-number">{votesValue}</div>
                                <div className="inbar-votes-label">VOTOS</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {!showInsideBar ? (
                          <div className="comparison-votes-above">
                            <div className="votes-above-text">
                              <div className="votes-above-number">{votesValue}</div>
                              <div className="votes-above-label">VOTOS</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div style={{ display: "none" }}>
            {contenders.map((candidate) => {
              const votesValue = formatNumber(animatedVotes[candidate.id] ?? 0);
              const leaderPercent = leader?.porcentaje ?? candidate.porcentaje ?? 100;
              const scaledHeight = Math.min(100, (candidate.porcentaje / leaderPercent) * 100);
              const showInsideBar = scaledHeight >= 25;
              const baseColor = candidate.color;
              return (
                <article key={candidate.id} className={`comparison-card mobile ${candidate.nombre === leader?.nombre ? "comparison-card-leader" : ""}`}>
                  <div className="comparison-card-top">
                    <p className="comparison-percentage">{candidate.porcentaje}%</p>
                    <p className="comparison-name">{candidate.nombre}</p>
                  </div>
                  <div className="comparison-profile-row">
                    <img src={`/avatars/${resolveAvatarFile(candidate.foto, candidate.nombre)}`} alt={candidate.nombre} className="comparison-photo" />
                    <div className="comparison-body">
                      <div className="comparison-chart">
                        <div className="comparison-bar-vertical">
                          <div
                            className="comparison-bar-fill-vertical"
                            style={{
                              "--fill-scale": `${scaledHeight}%`,
                              "--fill-color-light": baseColor,
                              "--fill-color-dark": `${baseColor}ee`,
                            } as CSSProperties}
                          >
                            {showInsideBar ? (
                              <div className="inbar-votes">
                                <div className="inbar-votes-number">{votesValue}</div>
                                <div className="inbar-votes-label">VOTOS</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {!showInsideBar ? (
                          <div className="comparison-votes-above">
                            <div className="votes-above-text">
                              <div className="votes-above-number">{votesValue}</div>
                              <div className="votes-above-label">VOTOS</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="comparison-footer-grid">
            <div className="difference-panel">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Diferencia inmediata</p>
              <div className="difference-values">
                <div>
                  <p className="text-3xl font-semibold text-slate-950">{voteDifference.toLocaleString("es-CO")}</p>
                  <p className="text-sm text-slate-500">votos</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-slate-950">{percentDifference.toFixed(1)} pts</p>
                  <p className="text-sm text-slate-500">porcentuales</p>
                </div>
              </div>
            </div>
            <article className="blank-block">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Voto en Blanco</p>
<p className="mt-3 text-4xl font-semibold text-slate-950">
  {votoBlanco?.votos ?? "0"}
</p>

<p className="mt-2 text-sm text-slate-600">
  {votoBlanco?.porcentaje ?? 0}% del total
</p>
            </article>
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
