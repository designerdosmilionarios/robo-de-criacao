import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Robô Studio | Esteira de Criação Inteligente',
  description: 'Gerador de carrosséis e criativos em lote com identidade de marca para designers e agências.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased selection:bg-brand-500 selection:text-dark-900">
        {children}
      </body>
    </html>
  );
}
