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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&family=Montserrat:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800&family=Bebas+Neue&family=Anton&family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-brand-500 selection:text-dark-900">
        {children}
      </body>
    </html>
  );
}
