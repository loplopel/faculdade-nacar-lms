const actions = [
  {
    title: 'Criar novo curso',
    description: 'Cadastrar título, descrição, categoria, status e regras do curso.',
    href: '/admin/novo-curso',
  },
  {
    title: 'Gerenciar cursos',
    description: 'Acessar aulas e provas dos cursos já cadastrados.',
    href: '/admin/cursos',
  },
  {
    title: 'Categorias',
    description: 'Organizar cursos por atendimento, vendas, produtos, garantia e outros temas.',
    href: '/admin/categorias',
  },
  {
    title: 'Usuários e perfis',
    description: 'Cadastrar e editar colaboradores, cargos, lojas, regiões, perfis e situação.',
    href: '/admin/usuarios',
  },
  {
    title: 'Matrículas e acessos',
    description: 'Liberar cursos para colaboradores, controlar status e acompanhar a jornada do aluno.',
    href: '/admin/matriculas',
  },
  {
    title: 'Relatórios',
    description: 'Ver notas, cursos concluídos, pendências e ranking por loja. Em breve.',
    href: '/admin',
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Painel Administrativo
          </p>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Administração
          </h1>
          <p className="mt-3 max-w-3xl text-zinc-300">
            Área de gestão dos cursos, categorias, aulas, provas, certificados e relatórios da Faculdade Nacar.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {actions.map((action) => (
            <article
              key={action.title}
              className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl"
            >
              <h2 className="text-2xl font-black">{action.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {action.description}
              </p>

              <a
                href={action.href}
                className="mt-6 inline-block rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
              >
                Acessar
              </a>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
