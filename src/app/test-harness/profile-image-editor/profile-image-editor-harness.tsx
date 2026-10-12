"use client";

import * as React from "react";

import { ProfileImageCropDialog } from "@/components/garage/profile-image-crop-dialog";
import { Button } from "@/components/ui/button";
import type { ProfileCropKind } from "@/lib/profile/image-crop";

export function ProfileImageEditorHarness() {
  const [kind, setKind] = React.useState<ProfileCropKind>("avatar");
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<{ url: string; name: string } | null>(null);

  React.useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6">
      <h1 className="font-title text-2xl">Teste do editor de perfil</h1>
      <div className="mt-6 flex gap-2">
        <Button type="button" variant={kind === "avatar" ? "default" : "outline"} onClick={() => setKind("avatar")}>Avatar</Button>
        <Button type="button" variant={kind === "cover" ? "default" : "outline"} onClick={() => setKind("cover")}>Capa</Button>
      </div>
      <label className="mt-5 grid gap-2 text-sm text-muted">
        Imagem de teste
        <input
          data-testid="editor-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
        />
      </label>
      {result ? (
        <section className="mt-6" aria-label="Resultado aplicado">
          <p data-testid="applied-name">{result.name}</p>
          {/* Native img intentionally exposes the exact generated canvas output to E2E. */}
          <img data-testid="applied-image" src={result.url} alt="Resultado aplicado" className="mt-2 max-h-72 max-w-full object-contain" />
        </section>
      ) : null}
      <ProfileImageCropDialog
        file={file}
        kind={kind}
        onCancel={() => setFile(null)}
        onApply={async (croppedFile) => {
          setResult((current) => {
            if (current) URL.revokeObjectURL(current.url);
            return { url: URL.createObjectURL(croppedFile), name: croppedFile.name };
          });
        }}
      />
    </main>
  );
}
