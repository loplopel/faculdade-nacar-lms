const materials = [
  {
    title: "Manual de Atendimento Nacar",
    type: "PDF",
    area: "Atendimento",
  },
  {
    title: "Catálogo de Marcas Estratégicas",
    type: "PDF",
    area: "Produtos",
  },
  {
    title: "Vídeo — Como conduzir uma venda consultiva",
    type: "Vídeo",
    area: "Vendas",
  },
  {
    title: "Checklist de Garantia",
    type: "Texto",
    area: "Operacional",
  },
];

export default function BibliotecaPage() {
  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Conhecimento Nacar
          </p>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">Biblioteca</h1>
          <p className="mt-3 max-w-3xl text-zinc-300">
            Área para vídeos, PDFs, imagens, textos, manuais e materiais de
            apoio para consulta rápida dos colaboradores.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4">
          <input
            className="w-full rounded-xl border border-[#2d3a52] bg-[#1b2435] px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-[#f36b2a]"
            placeholder="Pesquisar por curso, material, produto, processo ou palavra-chave..."
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {materials.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl"
            >
              <span className="rounded-full border border-[#f36b2a]/30 bg-[#f36b2a]/10 px-3 py-1 text-xs font-bold text-[#ffb088]">
                {item.type}
              </span>
              <h2 className="mt-4 text-2xl font-black">{item.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">Área: {item.area}</p>

              <button className="mt-6 rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]">
                Abrir material
              </button>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}