const productionChecks = [
  {
    title: 'Código publicado',
    status: 'Conferir',
    description: 'Build local aprovado, commit enviado ao GitHub e deploy finalizado na Vercel.',
  },
  {
    title: 'Supabase seguro',
    status: 'Conferir',
    description: 'SQL v2.0 de RLS aplicado e telas testadas com usuário admin e funcionário.',
  },
  {
    title: 'Variáveis da Vercel',
    status: 'Conferir',
    description: 'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY cadastradas no projeto correto.',
  },
  {
    title: 'Domínio oficial',
    status: 'Pendente',
    description: 'Adicionar faculdade.nacar.com.br na Vercel e apontar DNS conforme instrução da própria Vercel.',
  },
  {
    title: 'Teste mobile',
    status: 'Conferir',
    description: 'Login, menu, cursos, aula, prova, certificado e administração testados no celular.',
  },
  {
    title: 'Backup estável',
    status: 'Conferir',
    description: 'Manter backup-v2.0-segura.zip e um backup da v2.1 após validação final.',
  },
];

const domainSteps = [
  'Na Vercel, abrir o projeto faculdade-nacar-lms.',
  'Entrar em Settings > Domains.',
  'Adicionar o domínio faculdade.nacar.com.br.',
  'Copiar exatamente o registro DNS que a Vercel solicitar.',
  'Criar o registro no painel DNS do domínio nacar.com.br.',
  'Aguardar a validação da Vercel e testar o HTTPS.',
];

export default function ProductionPage() {
  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            v2.1 — Produção final
          </p>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Checklist de publicação
          </h1>
          <p className="mt-3 max-w-3xl text-zinc-300">
            Área para acompanhar os últimos pontos antes de usar oficialmente a Faculdade Nacar em produção e no domínio corporativo.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {productionChecks.map((item) => (
            <article key={item.title} className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-black">{item.title}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'Pendente' ? 'border border-yellow-500/40 bg-yellow-500/10 text-yellow-100' : 'border border-[#f36b2a]/40 bg-[#f36b2a]/10 text-[#ffb088]'}`}>
                  {item.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/80 p-7 shadow-xl">
            <p className="text-sm uppercase tracking-[0.28em] text-[#f36b2a]">Domínio</p>
            <h2 className="mt-3 text-3xl font-black">faculdade.nacar.com.br</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              O domínio deve ser configurado diretamente na Vercel e no DNS oficial do domínio nacar.com.br. Não altere o Supabase para isso.
            </p>
            <a href="/admin/seguranca" className="mt-6 inline-block rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-200 hover:border-[#f36b2a] hover:text-white">
              Ver segurança v2.0
            </a>
          </div>

          <div className="rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/80 p-7 shadow-xl">
            <h2 className="text-2xl font-black">Passo a passo do domínio</h2>
            <ol className="mt-5 space-y-3">
              {domainSteps.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-2xl border border-[#2d3a52] bg-[#080c18]/55 p-4 text-sm leading-6 text-zinc-300">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f36b2a] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}
