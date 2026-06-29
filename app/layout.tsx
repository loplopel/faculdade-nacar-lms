import './globals.css';
import type { Metadata } from 'next';
import AppShell from '../components/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'Faculdade Nacar',
    template: '%s | Faculdade Nacar',
  },
  description: 'Portal oficial de treinamento, trilhas, provas e certificados do Grupo Nacar.',
  applicationName: 'Faculdade Nacar',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}