export const SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

type NormalizedSocialLink =
  | { ok: true; value: string | null }
  | { ok: false; message: string };

const platformLabels: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export function socialPlatformLabel(platform: SocialPlatform) {
  return platformLabels[platform];
}

function invalid(platform: SocialPlatform): NormalizedSocialLink {
  return {
    ok: false,
    message: `Informe um link válido do ${socialPlatformLabel(platform)}.`,
  };
}

function hasOnlyAllowedUrlParts(url: URL) {
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    !url.search &&
    !url.hash
  );
}

function parseUrlOrProfileValue(platform: SocialPlatform, rawValue: string) {
  const value = rawValue.trim();
  if (!value) return null;

  if (/^[^\s/@.]+(?:[._-][^\s/@.]+)*$/.test(value) || value.startsWith("@")) {
    const handle = value.replace(/^@/, "");
    if (platform === "instagram") return new URL(`https://www.instagram.com/${handle}`);
    if (platform === "tiktok") return new URL(`https://www.tiktok.com/@${handle}`);
    return new URL(`https://www.youtube.com/@${handle}`);
  }

  const source = /^(?:www\.)?(?:instagram\.com|tiktok\.com|youtube\.com)\//i.test(value)
    ? `https://${value}`
    : value;

  try {
    return new URL(source);
  } catch {
    return undefined;
  }
}

function normalizeInstagram(url: URL): string | null {
  if (!hasOnlyAllowedUrlParts(url) || !["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase())) return null;
  const match = url.pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
  return match ? `https://www.instagram.com/${match[1]}` : null;
}

function normalizeTikTok(url: URL): string | null {
  if (!hasOnlyAllowedUrlParts(url) || !["tiktok.com", "www.tiktok.com"].includes(url.hostname.toLowerCase())) return null;
  const match = url.pathname.match(/^\/@([A-Za-z0-9._]{1,24})\/?$/);
  return match ? `https://www.tiktok.com/@${match[1]}` : null;
}

function normalizeYouTube(url: URL): string | null {
  if (!hasOnlyAllowedUrlParts(url) || !["youtube.com", "www.youtube.com"].includes(url.hostname.toLowerCase())) return null;
  const path = url.pathname;
  const handle = path.match(/^\/@([A-Za-z0-9._-]{3,30})\/?$/);
  const channel = path.match(/^\/(channel|c|user)\/([A-Za-z0-9._-]{1,100})\/?$/);
  if (handle) return `https://www.youtube.com/@${handle[1]}`;
  if (channel) return `https://www.youtube.com/${channel[1]}/${channel[2]}`;
  return null;
}

/** Normalizes a voluntarily supplied social profile link into a safe canonical HTTPS URL. */
export function normalizeSocialLink(platform: SocialPlatform, rawValue: string): NormalizedSocialLink {
  const url = parseUrlOrProfileValue(platform, rawValue);
  if (url === null) return { ok: true, value: null };
  if (!url) return invalid(platform);

  const normalized = platform === "instagram"
    ? normalizeInstagram(url)
    : platform === "tiktok"
      ? normalizeTikTok(url)
      : normalizeYouTube(url);

  return normalized ? { ok: true, value: normalized } : invalid(platform);
}

export function normalizeSocialLinks(values: Partial<Record<SocialPlatform, string>>):
  | { ok: true; value: SocialLinks }
  | { ok: false; platform: SocialPlatform; message: string } {
  const links: SocialLinks = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const normalized = normalizeSocialLink(platform, values[platform] ?? "");
    if (!normalized.ok) return { ok: false, platform, message: normalized.message };
    if (normalized.value) links[platform] = normalized.value;
  }
  return { ok: true, value: links };
}

function socialLinksRecord(value: unknown): Partial<Record<SocialPlatform, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    SOCIAL_PLATFORMS.flatMap((platform) =>
      typeof record[platform] === "string" ? [[platform, record[platform]]] : []
    )
  ) as Partial<Record<SocialPlatform, string>>;
}

/** Reads stored JSON defensively and keeps legacy Instagram profiles visible until they are edited. */
export function getProfileSocialLinks(value: unknown, legacyInstagramHandle?: string | null): SocialLinks {
  const links: SocialLinks = {};
  const storedLinks = socialLinksRecord(value);
  for (const platform of SOCIAL_PLATFORMS) {
    const normalized = normalizeSocialLink(platform, storedLinks[platform] ?? "");
    if (normalized.ok && normalized.value) links[platform] = normalized.value;
  }

  if (!links.instagram && legacyInstagramHandle) {
    const instagram = normalizeSocialLink("instagram", legacyInstagramHandle);
    if (instagram.ok && instagram.value) links.instagram = instagram.value;
  }

  return links;
}

export function instagramHandleFromSocialLinks(links: SocialLinks) {
  const instagram = links.instagram;
  if (!instagram) return null;
  const url = new URL(instagram);
  return url.pathname.slice(1) || null;
}
