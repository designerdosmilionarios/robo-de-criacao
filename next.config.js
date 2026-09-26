/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // As famílias são escolhidas dinamicamente pelo editor. Não tente baixá-las
  // durante o build; o navegador carrega a folha do Google Fonts em runtime.
  optimizeFonts: false,
  images: {
    unoptimized: true,
  }
}

module.exports = nextConfig
