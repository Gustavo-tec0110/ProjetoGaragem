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
  {
    protocol: "https",
    hostname: "projetogaragem.netlify.app",
    pathname: "/**",
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
