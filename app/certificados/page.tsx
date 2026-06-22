'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUserId } from '../../lib/auth';

type CourseInfo = {
  title: string;
  slug: string;
};

type ProfileInfo = {
  full_name: string | null;
  email: string | null;
};

type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_url: string | null;
  issued_at: string | null;
  courses: CourseInfo | CourseInfo[] | null;
  profiles: ProfileInfo | ProfileInfo[] | null;
};

function getCourse(certificate: Certificate) {
  if (Array.isArray(certificate.courses)) {
    return certificate.courses[0];
  }

  return certificate.courses;
}

function getProfile(certificate: Certificate) {
  if (Array.isArray(certificate.profiles)) {
    return certificate.profiles[0];
  }

  return certificate.profiles;
}

function formatDate(date: string | null) {
  if (!date) {
    return 'Data não informada';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export default function CertificadosPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadCertificates() {
      setLoading(true);
      setErrorMessage('');

      const userId = await getCurrentUserId();

      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const { data, error } = await supabase
        .from('certificates')
        .select(
          `
          id,
          user_id,
          course_id,
          certificate_url,
          issued_at,
          courses (
            title,
            slug
          ),
          profiles (
            full_name,
            email
          )
        `
        )
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });

      if (error) {
        setErrorMessage(`Erro ao buscar certificados: ${error.message}`);
        setLoading(false);
        return;
      }

      setCertificates((data || []) as Certificate[]);
      setLoading(false);
    }

    loadCertificates();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando certificados...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-[#2d3a52] bg-[#1b2435]/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f36b2a]">
            Faculdade Nacar
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Meus certificados
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-300">
            Consulte os certificados emitidos após a conclusão e aprovação nos
            treinamentos da Faculdade Nacar.
          </p>
        </section>

        {errorMessage && (
          <div className="mb-6 rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <section className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6 shadow-xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Certificados emitidos</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Total encontrado: {certificates.length}
              </p>
            </div>

            <a
              href="/cursos"
              className="rounded-2xl border border-[#2d3a52] bg-white/5 px-5 py-3 text-center text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
            >
              Ver cursos
            </a>
          </div>

          {certificates.length === 0 ? (
            <div className="rounded-3xl border border-[#f36b2a]/30 bg-[#f36b2a]/10 p-6">
              <p className="font-bold text-[#ffb088]">
                Nenhum certificado encontrado ainda.
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Para gerar um certificado, conclua as aulas do curso e seja
                aprovado na prova final.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {certificates.map((certificate) => {
                const course = getCourse(certificate);
                const profile = getProfile(certificate);

                return (
                  <article
                    key={certificate.id}
                    className="rounded-3xl border border-[#2d3a52] bg-[#080c18]/70 p-6 shadow-xl"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f36b2a]">
                          Certificado
                        </p>

                        <h3 className="mt-3 text-xl font-black">
                          {course?.title || 'Curso não encontrado'}
                        </h3>
                      </div>

                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                        Emitido
                      </span>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-[#2d3a52] bg-[#1b2435]/70 p-4 text-sm text-zinc-300">
                      <p>
                        <span className="font-bold text-zinc-100">
                          Colaborador:
                        </span>{' '}
                        {profile?.full_name || profile?.email || 'Usuário logado'}
                      </p>

                      <p>
                        <span className="font-bold text-zinc-100">
                          Emissão:
                        </span>{' '}
                        {formatDate(certificate.issued_at)}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      <a
                        href={`/certificados/${certificate.id}`}
                        className="rounded-2xl bg-[#f36b2a] px-5 py-3 text-center text-sm font-black text-white shadow-[0_0_24px_rgba(243,107,42,0.3)] hover:bg-[#ff6a24]"
                      >
                        Ver certificado
                      </a>

                      {course?.slug && (
                        <a
                          href={`/cursos/${course.slug}`}
                          className="rounded-2xl border border-[#2d3a52] bg-white/5 px-5 py-3 text-center text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
                        >
                          Ver curso
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
