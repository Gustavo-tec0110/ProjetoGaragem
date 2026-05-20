import type { Build } from "@/lib/types";

function base64UrlEncode(bytes: Uint8Array) {
  let base64: string;
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    base64 = btoa(binary);
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(data: string) {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(data.length / 4) * 4, "=");

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isBuild(value: unknown): value is Build {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<Build>;
  return (
    typeof maybe.id === "string" &&
    typeof maybe.carId === "string" &&
    typeof maybe.styleId === "string" &&
    typeof maybe.budget === "number" &&
    Array.isArray(maybe.parts)
  );
}

export function encodeBuildShare(build: Build) {
  const json = JSON.stringify(build);
  const bytes = new TextEncoder().encode(json);
  return base64UrlEncode(bytes);
}

export function decodeBuildShare(data: string): Build | null {
  try {
    const bytes = base64UrlDecode(data);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return isBuild(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

