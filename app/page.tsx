export default function Home() {
  const candidatos = [
    {
      id: 1,
      nombre: "Iván Cepeda",
      porcentaje: 34.2,
      votos: "5.234.221",
      image: "IvanCepeda.png",
      formula: "Con Aida Quilcué",
      color: "candidate-1-color",
      barColor: "bar-1"
    },
    {
      id: 2,
      nombre: "Paloma Valencia",
      porcentaje: 28.4,
      votos: "4.102.114",
      image: "palomavalencia.png",
      formula: "Con Juan Daniel Oviedo",
      color: "candidate-2-color",
      barColor: "bar-2"
    },
    {
      id: 3,
      nombre: "Abelardo de la Espriella",
      porcentaje: 19.8,
      votos: "2.945.332",
      image: "AbelardoDeLaEspriella.png",
      formula: "Con Jose Manuel Restrepo",
      color: "candidate-3-color",
      barColor: "bar-3"
    },
    {
      id: 4,
      nombre: "Claudia López",
      porcentaje: 4.5,
      votos: "683.214",
      image: "ClaudiaLopez.png",
      formula: "Leonardo Huerta",
      color: "candidate-4-color",
      barColor: "bar-4"
    },
    {
      id: 5,
      nombre: "Santiago Botero XXX",
      porcentaje: 3.2,
      votos: "489.004",
      image: "SantiagoBotero.png",
      formula: "Carlos Cuevas",
      color: "candidate-5-color",
      barColor: "bar-5"
    },
    {
      id: 6,
      nombre: "Oscar Lizcano",
      porcentaje: 2.9,
      votos: "438.217",
      image: "OscarLizcano.png",
      formula: "Pedro De La Torre",
      color: "candidate-6-color",
      barColor: "bar-6"
    },
    {
      id: 7,
      nombre: "Miguel Uribe Londoño",
      porcentaje: 2.3,
      votos: "347.816",
      image: "MiguelUribeLondono.png",
      formula: "Luisa Villegas",
      color: "candidate-7-color",
      barColor: "bar-7"
    },
    {
      id: 8,
      nombre: "Sandra Macollins",
      porcentaje: 1.8,
      votos: "274.932",
      image: "SandraMacollins.png",
      formula: "Leonardo Karam",
      color: "candidate-8-color",
      barColor: "bar-8"
    },
    {
      id: 9,
      nombre: "Roy Barreras",
      porcentaje: 1.4,
      votos: "212.445",
      image: "RoyBarreras.png",
      formula: "Martha Zamora",
      color: "candidate-9-color",
      barColor: "bar-9"
    },
    {
      id: 10,
      nombre: "Sergio Fajardo",
      porcentaje: 1.2,
      votos: "184.311",
      image: "SergioFajardo.png",
      formula: "Ddna Bonilla",
      color: "candidate-10-color",
      barColor: "bar-10"
    },
    {
      id: 11,
      nombre: "Gustavo Matamoros",
      porcentaje: 0.9,
      votos: "137.920",
      image: "GustavoMatamoros.png",
      formula: "Mila Paz",
      color: "candidate-11-color",
      barColor: "bar-11"
    },
    {
      id: 12,
      nombre: "Voto en Blanco",
      porcentaje: 2.8,
      votos: "456.112",
      image: "VotoBlanco.png",
      formula: "Opción en escrutinio",
      color: "candidate-blank-color",
      barColor: "bar-blank"
    }
  ];

  const dashboardMetrics = [
    { label: "Participación", value: "75.3%", description: "Electores movilizados" },
    { label: "Mesas informadas", value: "68.42%", description: "Avance del conteo" },
    { label: "Voto en blanco", value: "2.8%", description: "Opciones nulas o blancas" },
    { label: "Abstención", value: "16.7%", description: "Padrón no votante" }
  ];

  const updatedAt = "25 de mayo · 20:12";

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#fafaf8] to-[#f5f3f0] px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">
                Cobertura especial en tiempo real
              </p>
              <h1 className="font-serif text-4xl leading-tight sm:text-5xl text-slate-950">
                Elecciones Presidenciales Colombia 2026
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Especial editorial de Contexto.info con los resultados, participación y avance de mesas en tiempo real.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                Actualizado
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{updatedAt}</p>
            </div>
          </div>
        </header>

        {/* Metrics Dashboard */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up">
          {dashboardMetrics.map((item) => (
            <article key={item.label} className="metric-card hover-lift">
              <p className="text-xs uppercase tracking-[0.34em] text-slate-600">
                {item.label}
              </p>
              <p className="metric-value text-slate-900">{item.value}</p>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </article>
          ))}
        </section>

        {/* Results Bars Section */}
        <section className="space-y-8 animate-fade-up">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-slate-950 mb-2">Resultados Presidenciales</h2>
            <p className="text-slate-600">Un podio electoral visual, con barras verticales y jerarquía clara.</p>
          </div>

          <div className="result-bar">
            {candidatos.map((candidato, index) => (
              <div
                key={candidato.id}
                className={`result-item ${index === 0 ? "leader" : ""}`}
              >
                <div className="bar-container">
                  <div className="bar-header">
                    <span className={`bar-value ${candidato.color}`}>{candidato.porcentaje}%</span>
                    <span className="bar-subtext">{candidato.votos} votos</span>
                  </div>
                  <div className="bar-rail">
                    <div
                      className={`bar-fill ${candidato.barColor}`}
                      style={{
                        height: `${candidato.porcentaje}%`,
                        animationDelay: `${index * 0.1 + 0.15}s`
                      }}
                    />
                  </div>
                </div>
                <img
                  src={`/avatars/${candidato.image}`}
                  alt={candidato.nombre}
                  className="candidate-photo"
                  style={{
                    animationDelay: `${index * 0.1 + 0.2}s`
                  }}
                />
                <div className="result-info">
                  <p className="result-name">{candidato.nombre}</p>
                  <p className="candidate-formula">{candidato.formula}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Editorial Candidate Cards */}
        <section className="space-y-8 animate-fade-up">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-slate-950 mb-2">Los Candidatos</h2>
            <p className="text-slate-600">Conoce las fórmulas y propuestas de cada candidato presidencial</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {candidatos.map((candidato) => (
              <article
                key={candidato.id}
                className="candidate-card group"
              >
                <img
                  src={`/avatars/${candidato.image}`}
                  alt={candidato.nombre}
                  className="avatar w-full sm:w-32 sm:h-40 rounded-lg object-cover"
                />
                <div className="w-full space-y-2">
                  <h3 className="candidate-name text-slate-900">{candidato.nombre}</h3>
                  <p className="candidate-formula text-slate-600">{candidato.formula}</p>
                  <div className="pt-3 border-t border-slate-200">
                    <p className={`font-semibold text-lg ${candidato.color}`}>
                      {candidato.porcentaje}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{candidato.votos} votos</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Footer Note */}
        <footer className="border-t border-slate-200 pt-8 pb-4">
          <p className="text-center text-sm text-slate-500">
            Datos actualizados: {updatedAt} • Fuente: Registraduría Nacional del Estado Civil
          </p>
        </footer>
      </div>
    </main>
  );
}