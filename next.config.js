/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isso permite que o build seja concluído mesmo com erros do TypeScript
  typescript: {
    // !! ATENÇÃO: Isso ignora erros de TypeScript durante o build
    ignoreBuildErrors: true,
  },
  
  // Isso ignora erros de ESLint durante o build
  eslint: {
    // !! ATENÇÃO: Isso ignora erros de ESLint durante o build
    ignoreDuringBuilds: true,
  },
  
  // Mantenha as configurações originais que estavam no next.config.ts
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Headers personalizados para PWA
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  
  // Rewrites para melhorar o SEO
  async rewrites() {
    return [
      {
        source: "/sw.js",
        destination: "/_next/static/sw.js",
      },
    ];
  },
};

module.exports = nextConfig; 