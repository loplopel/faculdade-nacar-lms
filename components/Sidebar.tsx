const menuItems = [
  { label: "Dashboard", href: "/" },
  { label: "Meus cursos", href: "/cursos" },
  { label: "Provas e notas", href: "/provas" },
  { label: 'Certificados', href: '/certificados' },
  { label: "Biblioteca", href: "/biblioteca" },
  { label: "Administração", href: "/admin" },
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-72 border-r border-[#2d3a52] bg-[#080c18]/90 p-6 shadow-2xl lg:block">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.4em] text-[#f36b2a]">
          Grupo Nacar
        </p>

        <div className="mt-8 text-center">
          <h1 className="text-5xl font-black italic tracking-wider text-[#f36b2a] drop-shadow-[0_0_20px_rgba(243,107,42,0.45)]">
            NACAR
          </h1>
          <p className="mt-4 text-sm font-medium text-zinc-300">
            Faculdade Corporativa
          </p>
        </div>

        <p className="mt-6 text-sm leading-6 text-zinc-400">
          Portal de conhecimento, treinamentos, provas, certificados e evolução
          dos colaboradores.
        </p>
      </div>

      <nav className="space-y-2 text-sm">
        {menuItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="block rounded-xl px-4 py-3 font-semibold text-zinc-300 hover:bg-[#f36b2a] hover:text-white hover:shadow-[0_0_22px_rgba(243,107,42,0.35)]"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="mt-10 rounded-2xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-4">
        <p className="text-sm font-semibold text-[#ffb088]">Próxima missão</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Finalizar o treinamento de atendimento e realizar a prova final.
        </p>
      </div>
    </aside>
  );
}