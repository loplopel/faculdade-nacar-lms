const permissions = [
  {
    role: 'Admin',
    access: 'Acesso total ao LMS, usuários, conteúdos, trilhas, matrículas, relatórios e configurações.',
  },
  {
    role: 'Gestor',
    access: 'Acompanha relatórios, usuários, matrículas, lojas, cargos e grupos. Ideal para liderança.',
  },
  {
    role: 'Instrutor',
    access: 'Gerencia conteúdos, cursos, aulas, provas, biblioteca e trilhas de treinamento.',
  },
  {
    role: 'Funcionário',
    access: 'Acessa somente os próprios cursos liberados, provas, progresso e certificados.',
  },
];

const checklist = [
  'Build local aprovado antes de rodar o SQL de RLS.',
  'Deploy publicado na Vercel com a v2.0.',
  'Login admin testado antes de ativar segurança no banco.',
  'SQL v2.0_security_rls.sql rodado no Supabase.',
  'Admin consegue acessar telas administrativas.',
  'Funcionário não consegue acessar /admin.',
  'Funcionário vê apenas seus cursos, provas e certificados.',
  'Upload e leitura de materiais testados.',
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            v2.0 Segurança
          </p>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Segurança e produção
          </h1>
          <p className="mt-4 max-w-4xl leading-7 text-zinc-300">
            Esta área resume as regras de acesso da Faculdade Nacar. A proteção visual fica no código e a proteção real dos dados fica no Supabase com RLS e policies.
          </p>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {permissions.map((item) => (
            <article key={item.role} className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
              <h2 className="text-2xl font-black text-[#f36b2a]">{item.role}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{item.access}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/80 p-8 shadow-xl">
          <h2 className="text-3xl font-black">Checklist obrigatório</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {checklist.map((item) => (
              <div key={item} className="rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4 text-sm text-zinc-300">
                <span className="mr-2 text-[#f36b2a]">✓</span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-yellow-500/30 bg-yellow-500/10 p-6 shadow-xl">
          <h2 className="text-2xl font-black text-yellow-100">Ordem correta</h2>
          <p className="mt-3 leading-7 text-zinc-300">
            Primeiro aplique o ZIP, rode build e faça deploy. Só depois rode o SQL de segurança no Supabase. Assim, se algum ajuste for necessário, o sistema não fica travado no meio do caminho.
          </p>
        </section>
      </div>
    </main>
  );
}
