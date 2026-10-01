import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const remotePatterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    port: "",
    pathname: "/photo-*",
  },
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    port: "",
    pathname: "/**",
    search: "",
  },
];

if (supabaseUrl) {
  const storageUrl = new URL(supabaseUrl);
  if (storageUrl.protocol === "https:") {
    remotePatterns.push({
      protocol: "https",
      hostname: storageUrl.hostname,
      port: storageUrl.port,
      pathname: "/storage/v1/object/public/project-images/**",
      search: "",
    });
  }
}

const nextConfig: NextConfig = {
  experimental: {
    // O proxy pode executar antes de handlers; evita buffer de requests desnecessariamente grandes.
    proxyClientMaxBodySize: "6mb",
  },
  images: {
    qualities: [75, 85],
    remotePatterns,
  },
  async redirects() {
    return [
      {
        // Keep links already indexed under the Netlify subdomain working without
        // making that hostname a public canonical URL. Next.js preserves the path
        // and query string and emits a permanent 308 response for this redirect.
        source: "/:path*",
        has: [{ type: "host", value: "projetogaragem.netlify.app" }],
        destination: "https://projetogaragem.com.br/:path*",
        permanent: true,
        basePath: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
