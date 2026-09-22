import type { Metadata } from "next";

import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Política de Privacidade",
  description: "Como o Projeto Garagem trata os dados pessoais de seus usuários.",
  path: "/privacy",
});

const updatedAt = "22 de setembro de 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <article className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-soft sm:p-10">
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.18em] text-accent">Projeto Garagem</p>
        <h1 className="mt-3 font-title text-3xl font-bold tracking-tight sm:text-4xl">Política de Privacidade</h1>
        <p className="mt-3 text-sm text-muted">Última atualização: {updatedAt}</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground/85 sm:text-base">
          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">1. Visão geral</h2>
            <p className="mt-3">
              Esta Política explica como o Projeto Garagem trata dados pessoais ao disponibilizar uma plataforma para
              criar, organizar e compartilhar projetos automotivos. Ela se aplica ao site, às contas e às interações
              realizadas na plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">2. Dados tratados</h2>
            <p className="mt-3">Podemos tratar os dados necessários para operar o serviço, incluindo:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-accent">
              <li>dados de conta, como nome, e-mail, nome de usuário e foto de perfil;</li>
              <li>informações que você publica ou envia, como projetos, veículos, imagens, comentários e interações;</li>
              <li>dados técnicos essenciais para segurança, manutenção de sessão e prevenção de abuso.</li>
            </ul>
            <p className="mt-3">
              Quando você escolhe entrar com Google, recebemos apenas as informações autorizadas por você no fluxo do
              Google, normalmente nome, e-mail e foto de perfil. Não solicitamos acesso à sua senha do Google.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">3. Finalidades</h2>
            <p className="mt-3">
              Usamos esses dados para autenticar sua conta, manter sua garagem e seu perfil, exibir conteúdo publicado
              por você, viabilizar recursos da comunidade, proteger a plataforma e responder a solicitações de suporte.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">4. Compartilhamento e fornecedores</h2>
            <p className="mt-3">
              Dados podem ser processados pelos fornecedores necessários para a operação do serviço, como o Supabase
              (autenticação, banco de dados e armazenamento), o Netlify (hospedagem) e o Google (quando você utiliza o
              Login com Google). Conteúdos e dados de perfil que você decidir tornar públicos poderão ser vistos por
              visitantes da plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">5. Retenção e segurança</h2>
            <p className="mt-3">
              Mantemos os dados pelo tempo necessário para fornecer o serviço, cumprir obrigações legais, resolver
              disputas e aplicar estes termos. Adotamos medidas razoáveis de segurança, mas nenhum serviço online pode
              garantir segurança absoluta.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">6. Seus direitos</h2>
            <p className="mt-3">
              Nos termos da legislação aplicável, inclusive a LGPD, você pode solicitar confirmação e acesso aos seus
              dados, correção, informações sobre compartilhamento, portabilidade quando aplicável, bloqueio ou
              eliminação em hipóteses cabíveis e revogação de consentimento. Alguns pedidos podem estar sujeitos a
              limites legais ou técnicos.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">7. Contato</h2>
            <p className="mt-3">
              Para dúvidas, solicitações sobre seus dados ou esta Política, escreva para{" "}
              <a className="font-semibold text-accent underline-offset-4 hover:underline" href="mailto:ggtopxbox1@gmail.com">
                ggtopxbox1@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">8. Alterações nesta Política</h2>
            <p className="mt-3">
              Podemos atualizar esta Política para refletir mudanças no serviço ou em requisitos legais. A versão vigente
              será sempre publicada nesta página, com a data de atualização revisada.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
