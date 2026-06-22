'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserId } from '../../../lib/auth';

type CourseInfo = {
  title: string;
  slug: string;
};

type ProfileInfo = {
  full_name: string;
  email: string;
  position: string | null;
};

type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
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

export default function CertificateDetailPage() {
  const params = useParams();
  const certificateId = String(params.certificateId);

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadCertificate() {
      const userId = await getCurrentUserId();

      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          user_id,
          course_id,
          issued_at,
          courses (
            title,
            slug
          ),
          profiles (
            full_name,
            email,
            position
          )
        `)
        .eq('id', certificateId)
        .eq('user_id', userId)
        .single();

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setCertificate(data as Certificate);
      setLoading(false);
    }

    loadCertificate();
  }, [certificateId]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
          Carregando certificado...
        </div>
      </main>
    );
  }

  if (errorMessage || !certificate) {
    return (
      <main className="min-h-screen p-6 text-white md:p-10">
        <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
          Certificado não encontrado ou você não tem permissão para visualizar este certificado.
          {errorMessage ? ` Detalhe: ${errorMessage}` : ''}
        </div>
      </main>
    );
  }

  const course = getCourse(certificate);
  const profile = getProfile(certificate);

  const issuedDate = certificate.issued_at
    ? new Date(certificate.issued_at).toLocaleDateString('pt-BR')
    : 'Data não registrada';

  return (
    <main className="certificate-page min-h-screen p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="no-print mb-6 flex flex-wrap gap-3">
          <a
            href="/certificados"
            className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
          >
            Voltar para certificados
          </a>

          {course?.slug && (
            <a
              href={`/cursos/${course.slug}`}
              className="rounded-full border border-[#2d3a52] bg-white/5 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-[#f36b2a] hover:text-white"
            >
              Ver curso
            </a>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#f36b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(243,107,42,0.25)] hover:bg-[#ff6a24]"
          >
            Imprimir certificado
          </button>
        </div>

        <section
          id="certificate-print"
          className="certificate-sheet relative overflow-hidden rounded-[2.5rem] border border-[#f36b2a]/40 bg-[#101827] p-8 text-white shadow-2xl md:p-12"
        >
          <div className="certificate-glow-left absolute left-0 top-0 h-40 w-40 rounded-full bg-[#f36b2a]/20 blur-3xl" />
          <div className="certificate-glow-right absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[#f36b2a]/20 blur-3xl" />

          <div className="certificate-inner relative z-10 border border-[#2d3a52] p-8 md:p-12">
            <div className="certificate-header flex flex-col justify-between gap-8 md:flex-row md:items-start">
              <div className="certificate-brand">
                <p className="certificate-kicker text-sm uppercase tracking-[0.45em] text-[#f36b2a]">
                  Grupo Nacar
                </p>

                <h1 className="certificate-logo mt-6 text-5xl font-black tracking-tight text-[#f36b2a] md:text-7xl">
                  NACAR
                </h1>

                <p className="certificate-subtitle mt-2 text-sm font-bold text-zinc-300">
                  Faculdade Corporativa
                </p>
              </div>

              <div className="certificate-number rounded-3xl border border-[#f36b2a]/30 bg-[#080c18]/70 p-5 text-left">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                  Certificado Nº
                </p>
                <p className="mt-2 break-all text-sm font-bold text-zinc-200">
                  {certificate.id}
                </p>
              </div>
            </div>

            <div className="certificate-content mt-16 text-center">
              <p className="certificate-kicker text-sm uppercase tracking-[0.45em] text-[#f36b2a]">
                Certificado de conclusão
              </p>

              <h2 className="certificate-name mt-8 text-3xl font-black md:text-5xl">
                {profile?.full_name || 'Colaborador Nacar'}
              </h2>

              <p className="certificate-text mx-auto mt-8 max-w-4xl text-lg leading-8 text-zinc-300">
                Concluiu com aprovação o treinamento
              </p>

              <h3 className="certificate-course mx-auto mt-5 max-w-5xl text-3xl font-black text-[#f36b2a] md:text-5xl">
                {course?.title || 'Curso sem título'}
              </h3>

              <p className="certificate-description mx-auto mt-8 max-w-4xl text-base leading-8 text-zinc-300">
                Este certificado comprova que o colaborador realizou o conteúdo
                obrigatório, concluiu a trilha de aprendizagem e foi aprovado na
                avaliação da Faculdade Nacar.
              </p>
            </div>

            <div className="certificate-info mt-16 grid gap-6 md:grid-cols-3">
              <div className="certificate-info-card rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                  Data de emissão
                </p>
                <p className="mt-2 text-lg font-black">
                  {issuedDate}
                </p>
              </div>

              <div className="certificate-info-card rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                  Aluno
                </p>
                <p className="mt-2 text-lg font-black">
                  {profile?.email || 'E-mail não informado'}
                </p>
              </div>

              <div className="certificate-info-card rounded-3xl border border-[#2d3a52] bg-[#080c18]/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                  Status
                </p>
                <p className="mt-2 text-lg font-black text-green-300">
                  Aprovado
                </p>
              </div>
            </div>

            <div className="certificate-footer mt-16 flex flex-col justify-between gap-10 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-bold text-zinc-300">
                  Faculdade Nacar
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Portal corporativo de treinamento e conhecimento
                </p>
              </div>

              <div className="certificate-signature w-full max-w-sm text-center">
                <div className="h-px bg-[#f36b2a]" />
                <p className="mt-3 text-sm font-bold">
                  Grupo Nacar
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Validação corporativa
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
