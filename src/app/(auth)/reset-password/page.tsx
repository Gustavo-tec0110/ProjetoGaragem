"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas nao coincidem.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase nao configurado.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-md pt-20 md:pt-24 pb-12">
          <Card className="p-6 md:p-8">
            <h1 className="font-title text-2xl tracking-tight">Nova senha</h1>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nova senha" required />
              <Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirmar senha" required />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
