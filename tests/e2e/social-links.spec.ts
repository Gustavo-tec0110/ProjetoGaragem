import { expect, test } from "@playwright/test";

import {
  getProfileSocialLinks,
  normalizeSocialLink,
  normalizeSocialLinks,
} from "../../src/lib/profile/social-links";

test.describe("normalização de links sociais", () => {
  test("normaliza os formatos amigáveis aceitos", () => {
    expect(normalizeSocialLink("instagram", "@gustaf")).toEqual({ ok: true, value: "https://www.instagram.com/gustaf" });
    expect(normalizeSocialLink("instagram", "instagram.com/gustaf")).toEqual({ ok: true, value: "https://www.instagram.com/gustaf" });
    expect(normalizeSocialLink("tiktok", "gustaf")).toEqual({ ok: true, value: "https://www.tiktok.com/@gustaf" });
    expect(normalizeSocialLink("youtube", "https://youtube.com/@garagemoficial")).toEqual({ ok: true, value: "https://www.youtube.com/@garagemoficial" });
    expect(normalizeSocialLink("youtube", "youtube.com/channel/UC1234")).toEqual({ ok: true, value: "https://www.youtube.com/channel/UC1234" });
  });

  test("rejeita protocolos, hosts e destinos não permitidos", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,alert(1)",
      "file:///etc/passwd",
      "https://instagram.com.exemplo-malicioso.com/gustaf",
      "https://www.instagram.com/gustaf?next=https://evil.example",
    ]) {
      expect(normalizeSocialLink("instagram", value).ok).toBe(false);
    }
    expect(normalizeSocialLink("youtube", "https://youtu.be/dQw4w9WgXcQ").ok).toBe(false);
  });

  test("mantém Instagram legado visível e permite links novos extensíveis", () => {
    expect(getProfileSocialLinks({}, "@garagem_antiga")).toEqual({ instagram: "https://www.instagram.com/garagem_antiga" });
    expect(normalizeSocialLinks({
      instagram: "garagem",
      tiktok: "@garagem",
      youtube: "youtube.com/@garagem",
    })).toEqual({
      ok: true,
      value: {
        instagram: "https://www.instagram.com/garagem",
        tiktok: "https://www.tiktok.com/@garagem",
        youtube: "https://www.youtube.com/@garagem",
      },
    });
  });
});
