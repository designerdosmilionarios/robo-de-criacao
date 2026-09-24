// Lista de fontes comuns instaladas no Windows C:\Windows\Fonts
// Em produção, podemos ler isso via Tauri/Electron, mas por enquanto
// listamos as mais populares que designers costumam ter.

export const SYSTEM_FONTS = [
  // Web-safe defaults já incluídas via Google Fonts
  { name: 'Inter', family: 'Inter', type: 'Opus 4.8', weights: [300, 400, 500, 600, 700, 800, 900] },
  { name: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans', type: 'Opus 4.8', weights: [400, 500, 600, 700, 800] },
  { name: 'Montserrat', family: 'Montserrat', type: 'Opus 4.8', weights: [400, 600, 700, 800, 900] },
  { name: 'Syne', family: 'Syne', type: 'Opus 4.8', weights: [600, 700, 800] },
  { name: 'Poppins', family: 'Poppins', type: 'Opus 4.8', weights: [300, 400, 500, 600, 700, 800, 900] },
  { name: 'Roboto', family: 'Roboto', type: 'Opus 4.8', weights: [300, 400, 500, 700, 900] },
  { name: 'Bebas Neue', family: 'Bebas Neue', type: 'Opus 4.8', weights: [400] },
  { name: 'Playfair Display', family: 'Playfair Display', type: 'Opus 4.8', weights: [400, 700, 900] },
  { name: 'Anton', family: 'Anton', type: 'Opus 4.8', weights: [400] },
  { name: 'Archivo Black', family: 'Archivo Black', type: 'Opus 4.8', weights: [400] },
  { name: 'DM Sans', family: 'DM Sans', type: 'Opus 4.8', weights: [400, 500, 700, 900] },
];

export const GOOGLE_FONTS_URL = (family: string, weights: number[] = [400, 700]) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${weights.join(';')}&display=swap`;
