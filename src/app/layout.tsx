import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Lubian Gestão', template: '%s · Lubian Gestão' },
  description: 'Gestão da Lubian Limpezas — Engenharia de Limpeza Pós-Obra',
};

export const viewport: Viewport = { themeColor: '#1e3a8a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
