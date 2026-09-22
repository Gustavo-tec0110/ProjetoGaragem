import type { Metadata } from "next";

import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Termos de Uso",
  description: "Regras para utilização do Projeto Garagem.",
  path: "/terms",
});

const updatedAt = "22 de setembro de 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <article className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-soft sm:p-10">
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.18em] text-accent">Projeto Garagem</p>
        <h1 className="mt-3 font-title text-3xl font-bold tracking-tight sm:text-4xl">Termos de Uso</h1>
        <p className="mt-3 text-sm text-muted">Última atualização: {updatedAt}</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground/85 sm:text-base">
          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">1. Aceitação</h2>
            <p className="mt-3">
              Ao criar uma conta ou usar o Projeto Garagem, você concorda com estes Termos e com a Política de
              Privacidade. Se não concordar, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">2. A plataforma</h2>
            <p className="mt-3">
              O Projeto Garagem oferece recursos para documentar veículos e projetos automotivos, organizar informações,
              publicar conteúdo e interagir com a comunidade. O serviço pode evoluir, ser alterado ou ter recursos
              descontinuados para manutenção, segurança ou aprimoramento.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">3. Conta e responsabilidade</h2>
            <p className="mt-3">
              Você é responsável pela exatidão das informações fornecidas, pela segurança da sua conta e pelas ações
              realizadas nela. Não compartilhe seu acesso nem use a conta de outra pessoa sem autorização.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">4. Conteúdo dos usuários</h2>
            <p className="mt-3">
              Você mantém a responsabilidade pelo conteúdo que publica. Ao enviar conteúdo para áreas públicas, você
              autoriza sua exibição e disponibilização dentro do Projeto Garagem para operar e divulgar a plataforma.
              Publique apenas material sobre o qual possua os direitos necessários e respeite a privacidade e os direitos
              de terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">5. Condutas não permitidas</h2>
            <p className="mt-3">Não é permitido usar o serviço para:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-accent">
              <li>violar leis, direitos autorais, marcas, privacidade ou outros direitos de terceiros;</li>
              <li>publicar conteúdo ilegal, enganoso, ofensivo, discriminatório, malicioso ou que incentive violência;</li>
              <li>tentar acessar contas, sistemas ou dados sem autorização, interferir na segurança ou automatizar abuso;</li>
              <li>enviar spam, coletar dados de outros usuários sem base legítima ou usar a plataforma para fraude.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">6. Conteúdo e disponibilidade</h2>
            <p className="mt-3">
              Conteúdos de usuários não representam necessariamente a opinião do Projeto Garagem. Embora busquemos
              manter o serviço disponível e seguro, ele é fornecido conforme disponível e pode sofrer interrupções,
              limitações ou falhas. Informações automotivas publicadas por usuários não substituem avaliação técnica,
              mecânica ou de segurança profissional.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">7. Suspensão e encerramento</h2>
            <p className="mt-3">
              Podemos restringir ou suspender o acesso quando houver violação destes Termos, risco à segurança ou
              exigência legal. Você pode solicitar orientações sobre sua conta e seus dados pelo canal de contato abaixo.
            </p>
          </section>

          <section>
            <h2 className="font-title text-xl font-semibold text-foreground">8. Contato e alterações</h2>
            <p className="mt-3">
              Dúvidas sobre estes Termos podem ser enviadas para{" "}
              <a className="font-semibold text-accent underline-offset-4 hover:underline" href="mailto:ggtopxbox1@gmail.com">
                ggtopxbox1@gmail.com
              </a>
              . Estes Termos podem ser atualizados; a versão vigente ficará disponível nesta página com a respectiva data.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
