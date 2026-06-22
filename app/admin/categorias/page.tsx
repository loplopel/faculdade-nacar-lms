'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

type Category = {
  id: string;
  name: string;
  description: string | null;
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadCategories() {
      setLoading(true);

      const { data, error } = await supabase
        .from('course_categories')
        .select('id, name, description')
        .order('name', { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setCategories(data || []);
      setLoading(false);
    }

    loadCategories();
  }, []);

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Supabase conectado
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Categorias de cursos
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Esta tela busca as categorias diretamente do banco Supabase da
            Faculdade Nacar.
          </p>
        </section>

        {loading && (
          <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
            Carregando categorias...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
            Erro ao conectar no Supabase: {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && categories.length === 0 && (
          <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6">
            <p className="text-lg font-black text-[#ffb088]">
              Conexão feita, mas nenhuma categoria foi encontrada.
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Verifique se a tabela course_categories tem registros no
              Supabase.
            </p>
          </div>
        )}

        {!loading && !errorMessage && categories.length > 0 && (
          <>
            <div className="mb-5 rounded-2xl border border-[#2d3a52] bg-[#080c18]/70 p-4 text-sm text-zinc-300">
              Total encontrado no Supabase:{' '}
              <strong className="text-[#f36b2a]">{categories.length}</strong>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl"
                >
                  <h2 className="text-2xl font-black">{category.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {category.description || 'Sem descrição cadastrada.'}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}