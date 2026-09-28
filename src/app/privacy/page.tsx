import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Política de Privacidade",
  description: "Como o Projeto Garagem trata dados pessoais, cookies e conteúdo publicado.",
  path: "/privacy",
});

const updatedAt = "27 de setembro de 2026";
const sections = [
  ["visao-geral", "Visão geral"], ["dados", "Dados tratados"], ["finalidades", "Finalidades e bases"],
  ["publico", "Conteúdo público"], ["cookies", "Cookies e armazenamento"], ["compartilhamento", "Operadores e compartilhamento"],
  ["retencao", "Retenção e segurança"], ["direitos", "Seus direitos"], ["alteracoes", "Alterações e contato"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-24"><h2 className="font-title text-xl font-semibold tracking-tight text-foreground">{title}</h2>{children}</section>;
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <article className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-soft sm:p-10">
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.18em] text-accent">Projeto Garagem</p>
        <h1 className="mt-3 font-title text-3xl font-bold tracking-tight sm:text-4xl">Política de Privacidade</h1>
        <p className="mt-3 text-sm text-muted">Última atualização: {updatedAt}</p>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-foreground/85 sm:text-base">Esta Política descreve, em linguagem direta, como o Projeto Garagem trata dados pessoais para oferecer uma plataforma de projetos automotivos e comunidade.</p>

        <nav aria-label="Índice da política" className="mt-8 rounded-2xl border border-border/70 bg-background/35 p-4 sm:p-5">
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.14em] text-muted">Nesta página</p>
          <ol className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {sections.map(([id, label], index) => <li key={id}><a className="text-foreground/85 underline-offset-4 hover:text-accent hover:underline" href={`#${id}`}>{index + 1}. {label}</a></li>)}
          </ol>
        </nav>

        <div className="mt-10 space-y-9 text-sm leading-7 text-foreground/85 sm:text-base">
          <Section id="visao-geral" title="1. Visão geral">
            <p className="mt-3">O Projeto Garagem permite criar perfis, registrar veículos e evoluções, publicar imagens e interagir com outros membros. Esta Política se aplica ao site, à conta e às funcionalidades sociais da plataforma.</p>
          </Section>
          <Section id="dados" title="2. Dados tratados">
            <p className="mt-3">Tratamos apenas dados relacionados ao funcionamento da plataforma, conforme o uso que você faz dela:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-accent">
              <li><strong>Conta e autenticação:</strong> e-mail, nome, nome de usuário, identificador técnico da conta e dados necessários à sessão. No login com Google, recebemos os dados que você autorizar no fluxo, normalmente nome, e-mail e foto; nunca recebemos sua senha do Google.</li>
              <li><strong>Perfil:</strong> foto e capa, bio, cidade, estado, Instagram informado voluntariamente e escolhas de visibilidade de curtidas e itens salvos.</li>
              <li><strong>Projetos e conteúdo:</strong> veículos, dados técnicos, peças, despesas, atualizações, fotos, comentários, curtidas, itens salvos e follows. Campos que você publicar podem ficar visíveis a visitantes conforme a configuração do projeto.</li>
              <li><strong>Dados técnicos:</strong> dados de sessão, registros técnicos e dados de requisição que os provedores de infraestrutura processam, como endereço IP, data/hora e informações de segurança, quando necessários para prevenir abuso, operar e diagnosticar o serviço.</li>
            </ul>
          </Section>
          <Section id="finalidades" title="3. Finalidades e bases do tratamento">
            <p className="mt-3">Usamos os dados para criar e proteger contas, hospedar e exibir o conteúdo que você escolhe publicar, manter sua garagem, viabilizar comentários e interações, responder a solicitações e corrigir falhas.</p>
            <p className="mt-3">Na medida aplicável à LGPD, o tratamento necessário para conta e recursos ocorre para executar a relação com você; segurança, prevenção a fraude/abuso, manutenção e melhoria operacional se apoiam no legítimo interesse e na proteção do serviço; e tratamentos opcionais que venham a exigir consentimento só serão ativados após a sua escolha.</p>
          </Section>
          <Section id="publico" title="4. Conteúdo público e interações">
            <p className="mt-3">Nome de usuário, nome de exibição, foto de perfil, projetos marcados como públicos, fotos, atualizações, comentários e contagens de interação podem ser vistos por visitantes. Não publique dados pessoais, localização precisa, documentos ou conteúdo de terceiros sem ter permissão para isso. E-mail e nome completo de cadastro não são exibidos como dados públicos do perfil.</p>
          </Section>
          <Section id="cookies" title="5. Cookies e armazenamento local">
            <p className="mt-3">Usamos cookies essenciais da autenticação para manter a sessão e armazenamos localmente a decisão sobre cookies. A aplicação também pode usar armazenamento local ou de sessão para preferências e estados de interface. Esses recursos são necessários para o funcionamento ou não identificam visitantes para publicidade.</p>
            <p className="mt-3">Na data desta política, não identificamos no código analytics, pixel de marketing ou outra tecnologia opcional de rastreamento. Portanto, nenhuma categoria opcional é carregada. Você pode rever a explicação e sua escolha em cookies pelo rodapé.</p>
          </Section>
          <Section id="compartilhamento" title="6. Operadores e compartilhamento">
            <p className="mt-3">Utilizamos o Supabase para autenticação, banco de dados e Storage; o Netlify para hospedagem e execução da aplicação; e o Google somente quando você escolhe entrar com Google. Esses fornecedores operam dados para viabilizar o serviço. Conteúdo público é compartilhado com os visitantes da plataforma por sua própria natureza.</p>
            <p className="mt-3">Não vendemos dados pessoais. Não declaramos integração com analytics ou publicidade porque ela não foi encontrada na aplicação atual.</p>
          </Section>
          <Section id="retencao" title="7. Retenção, exclusão e segurança">
            <p className="mt-3">Mantemos os dados enquanto a conta e o conteúdo forem necessários para operar o serviço, atender solicitações, resolver disputas ou cumprir obrigações legais. A exclusão de uma conta ou conteúdo pode exigir etapas técnicas e não elimina imediatamente cópias de backup retidas de forma limitada e segura.</p>
            <p className="mt-3">Aplicamos controles de sessão, autorização e limites contra abuso. Nenhuma medida online elimina todos os riscos; por isso, mantenha sua senha protegida e não compartilhe links ou dados que devam permanecer privados.</p>
          </Section>
          <Section id="direitos" title="8. Seus direitos">
            <p className="mt-3">Nos termos da LGPD e da legislação aplicável, você pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio ou eliminação quando cabíveis, portabilidade, informações sobre compartilhamento e revisão de consentimento. Alguns pedidos podem ter limites legais, de segurança ou técnicos. Para proteger sua conta, poderemos pedir comprovação razoável de identidade.</p>
          </Section>
          <Section id="alteracoes" title="9. Alterações e contato">
            <p className="mt-3">Podemos atualizar esta Política quando o serviço ou requisitos legais mudarem. A versão vigente ficará nesta página com a data de atualização.</p>
            <p className="mt-3">Para dúvidas, solicitações relacionadas a dados pessoais ou esta Política, escreva para <a className="font-semibold text-accent underline-offset-4 hover:underline" href="mailto:ggtopxbox1@gmail.com">ggtopxbox1@gmail.com</a>. O Projeto Garagem não informa nesta página um DPO, CNPJ ou endereço comercial porque essas informações institucionais não constam da aplicação atual.</p>
          </Section>
        </div>
        <p className="mt-10 text-xs text-muted">Leia também os <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">Termos de Uso</Link>.</p>
      </article>
    </main>
  );
}
