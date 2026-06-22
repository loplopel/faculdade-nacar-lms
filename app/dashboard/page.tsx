import { Nav } from '@/components/Nav';
import { StatCard } from '@/components/StatCard';

const cursos = [
  { title: 'Integração Nacar', progress: '80%', status: 'Em andamento' },
  { title: 'Vendas consultivas', progress: '35%', status: 'Obrigatório' },
  { title: 'Garantia e pós-venda', progress: '100%', status: 'Concluído' },
];

export default function DashboardPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black">Meu aprendizado</h1>
          <p className="text-zinc-600">Acompanhe seus cursos, provas, notas e certificados.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Cursos concluídos" value="7" hint="+2 este mês" />
          <StatCard title="Média geral" value="87%" hint="Muito bom" />
          <StatCard title="Certificados" value="5" hint="Disponíveis para baixar" />
          <StatCard title="Ranking loja" value="3º" hint="Nacar Motorcycle" />
        </div>
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-black">Continuar treinamentos</h2>
          <div className="grid gap-3">
            {cursos.map((course) => (
              <div key={course.title} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{course.title}</h3>
                    <p className="text-sm text-zinc-500">{course.status}</p>
                  </div>
                  <span className="font-black text-red-600">{course.progress}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-red-600" style={{ width: course.progress }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
