'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CourseLessonsRedirectPage() {
  const params = useParams();
  const courseId = String(params.id);

  useEffect(() => {
    window.location.href = `/cursos/${courseId}`;
  }, [courseId]);

  return (
    <main className="min-h-screen p-6 text-white md:p-10">
      <div className="rounded-3xl border border-[#2d3a52] bg-[#1b2435]/80 p-6">
        Redirecionando para o curso...
      </div>
    </main>
  );
}
