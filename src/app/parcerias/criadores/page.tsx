import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Eye, Megaphone, MessageCircle, Plus } from "lucide-react";

import pgLogo from "@/app/icon.png";
import { createSeoMetadata } from "@/lib/seo";
import { foundingCreators, minimumVisibleCreators } from "./creators";
import { MerchShowcase } from "./merch-showcase";
import { FounderProfilePreview } from "./profile-preview";
import styles from "./page.module.css";

export const metadata: Metadata = {
  ...createSeoMetadata({
    title: "Criadores Fundadores",
    description: "Um convite para construir junto. Conheça o programa inicial de criadores parceiros do Projeto Garagem.",
    path: "/parcerias/criadores",
    noIndex: true,
  }),
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

const initialBenefits = [
  { icon: BadgeCheck, title: "Uma identidade de quem chegou primeiro.", text: "Selo de identificação Criador Fundador." },
  { icon: Megaphone, title: "Seu conteúdo, mais perto da comunidade.", text: "Destaque e divulgação dentro das possibilidades atuais do Projeto Garagem." },
  { icon: MessageCircle, title: "Uma conversa mais próxima.", text: "Participação na evolução da plataforma, com espaço para trocar ideias." },
  { icon: Eye, title: "Um olhar para o que vem a seguir.", text: "Possibilidade de conhecer novidades e recursos antecipadamente." },
];

const futurePossibilities = [
  "Camisetas e produtos exclusivos",
  "Kits personalizados e brindes",
  "Campanhas colaborativas",
  "Oportunidades comerciais e patrocínios",
  "Eventos e ações especiais",
];

const collaborationIdeas = [
  { title: "Histórias de projetos reais", text: "Explorar conteúdos sobre o seu carro, as escolhas de cada etapa e as histórias que fazem parte da sua garagem." },
  { title: "Troca com a comunidade", text: "Compartilhar impressões sobre a plataforma, sugerir melhorias e aproximar quem acompanha seu conteúdo dessa construção." },
  { title: "Ações com a sua identidade", text: "Pensar em conteúdos em conjunto e, conforme a evolução do projeto, em produtos, encontros e campanhas que façam sentido para os dois lados." },
];

const firstSteps = [
  { title: "A gente se conhece", text: "Uma conversa com Gustaf sobre seu conteúdo, seu projeto e o que você espera dessa troca." },
  { title: "Alinhamos o formato", text: "Definimos juntos o que faz sentido para a sua rotina e para as possibilidades atuais do Projeto Garagem." },
  { title: "Combinamos o começo", text: "Registramos os acordos e os próximos passos antes de iniciar qualquer ação da parceria." },
];

function FounderBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.badge} ${compact ? styles.badgeCompact : ""}`} role="img" aria-label="Selo Criador Fundador — Projeto Garagem">
      <div className={styles.badgeTop}><span>PROJETO GARAGEM</span><span aria-hidden="true">↗</span></div>
      <Image src={pgLogo} alt="" width={152} height={152} className={styles.badgeLogo} sizes="152px" loading={compact ? "lazy" : "eager"} />
      <div className={styles.badgeTitle}>CRIADOR<br /><span>FUNDADOR</span></div>
      <div className={styles.badgeRule} />
      <div className={styles.badgeBottom}><span>PARTE DA HISTÓRIA.<br />DESDE O COMEÇO.</span><BadgeCheck size={23} strokeWidth={1.4} aria-hidden="true" /></div>
    </div>
  );
}

export default function CreatorPartnershipPage() {
  const confirmedCreators = foundingCreators.filter((creator) => creator.publicationAuthorized);

  return (
    <main className={styles.page} data-creator-partnership>
      <a href="#programa" className={styles.skipLink}>Pular para o programa</a>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Projeto Garagem — início">
            <Image src={pgLogo} alt="Logo do Projeto Garagem" width={50} height={50} sizes="50px" loading="eager" />
            <span>PROJETO<br /><strong>GARAGEM</strong></span>
          </Link>
          <p className={styles.headerNote}><span className={styles.redDot} />CRIADORES FUNDADORES<span>UM PROGRAMA POR CONVITE</span></p>
        </header>

        <section className={styles.hero} aria-labelledby="convite-titulo">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>PROJETO GARAGEM <span>/</span> PROGRAMA EXCLUSIVO</p>
            <h1 id="convite-titulo">Faça parte de quem está construindo o futuro do <span>Projeto Garagem.</span></h1>
            <p className={styles.heroDescription}>Estamos reunindo um grupo inicial de criadores apaixonados pela cultura automotiva para crescer junto com o Projeto Garagem.</p>
            <a href="#programa" className={styles.exploreLink}>Conheça o programa <ArrowDown size={17} aria-hidden="true" /></a>
          </div>
          <div className={styles.heroArtwork}>
            <div className={styles.badgeFrame}><FounderBadge /></div>
            <p className={styles.artworkCaption}><span />PARA QUEM FAZ PARTE DO COMEÇO<span /></p>
          </div>
        </section>

        <div className={styles.values} aria-label="O que nos conecta">
          <span>Cultura automotiva</span><span>Histórias que conectam</span><span>Comunidade em construção</span>
        </div>

        <section id="programa" className={styles.section} aria-labelledby="programa-titulo">
          <p className={styles.sectionLabel}><span>01</span> O PROGRAMA</p>
          <div className={styles.programGrid}>
            <h2 id="programa-titulo">Mais do que uma parceria. <span>Um lugar desde o começo.</span></h2>
            <div className={styles.programCopy}>
              <p>O Projeto Garagem está formando seu primeiro grupo de criadores parceiros. Pessoas que vivem a cultura automotiva e acreditam no valor de cada projeto, de cada história e de uma comunidade que cresce junto.</p>
              <p>Estamos no início. A proposta é construir essa relação de perto, com troca, presença e espaço para evoluir.</p>
              <div className={styles.invitationCount}><span>3–5</span><p>criadores convidados<br /><strong>na seleção inicial prevista</strong></p></div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="beneficios-titulo">
          <p className={styles.sectionLabel}><span>02</span> FAZER PARTE</p>
          <h2 id="beneficios-titulo" className={styles.benefitsTitle}>O que significa ser um <span>Criador Fundador?</span></h2>
          <div className={styles.benefitsGrid}>
            <div>
              <h3 className={styles.columnTitle}>Benefícios da fase inicial <span aria-hidden="true">AGORA</span></h3>
              <ul className={styles.benefitsList}>
                {initialBenefits.map(({ icon: Icon, title, text }) => (
                  <li key={title}><Icon size={21} strokeWidth={1.5} aria-hidden="true" /><div><h4>{title}</h4><p>{text}</p></div></li>
                ))}
              </ul>
            </div>
            <div className={styles.future}>
              <p className={styles.futureEyebrow}>UM HORIZONTE PARA CONSTRUIR</p>
              <h3>Possibilidades para o futuro</h3>
              <p>Conforme o crescimento e os recursos do Projeto Garagem, poderemos explorar juntos:</p>
              <ul>{futurePossibilities.map((item) => <li key={item}><Plus size={14} aria-hidden="true" />{item}</li>)}</ul>
              <p className={styles.futureNote}>São possibilidades, não benefícios garantidos. Produtos, pagamentos e ações futuras dependerão da evolução do projeto e de acordos específicos.</p>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.identity} aria-labelledby="selo-titulo">
        <div className={`${styles.container} ${styles.identityGrid}`}>
          <div className={styles.identityArtwork}><FounderProfilePreview /></div>
          <div className={styles.identityCopy}>
            <p className={styles.sectionLabel}><span>03</span> UMA IDENTIDADE EM COMUM</p>
            <h2 id="selo-titulo">Um selo.<br /><span>Um começo em comum.</span></h2>
            <p>O selo Criador Fundador representa quem escolheu estar junto na fase inicial do Projeto Garagem. Uma identificação de pertencimento à história que estamos começando a construir.</p>
            <p>Esta prévia mostra uma proposta de como a identificação pode aparecer no perfil, junto ao seu nome e à sua história.</p>
            <span className={styles.identitySignature}><BadgeCheck size={18} aria-hidden="true" /> CRIADOR FUNDADOR · PROJETO GARAGEM</span>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <MerchShowcase />

        <section className={styles.section} aria-labelledby="colaboracao-titulo">
          <p className={styles.sectionLabel}><span>05</span> CONSTRUIR JUNTO</p>
          <div className={styles.collaborationHeading}>
            <h2 id="colaboracao-titulo">Sua voz. Seu projeto.<br /><span>Uma construção em comum.</span></h2>
            <p>O formato da parceria nasce da conversa. Estas são algumas ideias para explorar, respeitando o seu jeito de criar e a fase do Projeto Garagem.</p>
          </div>
          <div className={styles.collaborationIdeas}>
            {collaborationIdeas.map((idea, index) => (
              <div key={idea.title}><span>0{index + 1}</span><h3>{idea.title}</h3><p>{idea.text}</p></div>
            ))}
          </div>
          <div className={styles.firstSteps}>
            <h3>Como a parceria começa</h3>
            <p>Uma proposta simples para os primeiros passos.</p>
            <ol>{firstSteps.map((step) => <li key={step.title}><h4>{step.title}</h4><p>{step.text}</p></li>)}</ol>
          </div>
        </section>

        {confirmedCreators.length >= minimumVisibleCreators && (
          <section className={styles.section} aria-labelledby="criadores-titulo">
            <p className={styles.sectionLabel}>CRIADORES PARCEIROS</p>
            <h2 id="criadores-titulo">Quem faz parte dessa história</h2>
            <ul className={styles.creators}>
              {confirmedCreators.map((creator) => (
                <li key={creator.profileUrl}>
                  <a href={creator.profileUrl} target="_blank" rel="noopener noreferrer">
                    <Image src={creator.photo} alt={`Foto de ${creator.name}`} width={320} height={320} sizes="(max-width: 640px) 100vw, 33vw" />
                    <h3>{creator.name}</h3><span>{creator.handle}<ArrowUpRight size={16} aria-hidden="true" /></span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={`${styles.section} ${styles.founder}`} aria-labelledby="fundador-titulo">
          <div><p className={styles.sectionLabel}><span>06</span> QUEM ESTÁ POR TRÁS</p><p className={styles.founderName}>Gustaf<span>.</span></p><p className={styles.founderRole}>CRIADOR DE CONTEÚDO AUTOMOTIVO<br />FUNDADOR DO PROJETO GARAGEM</p></div>
          <div className={styles.founderCopy}><h2 id="fundador-titulo">A paixão veio antes <span>da plataforma.</span></h2><p>O Projeto Garagem nasceu da paixão de Gustaf por carros e da vontade de criar um espaço para quem vive essa mesma cultura.</p><p>Um lugar para compartilhar projetos, registrar a evolução e conectar as pessoas por trás de cada carro. O programa de Criadores Fundadores é um próximo passo nessa construção.</p></div>
        </section>

        <section id="duvidas" className={`${styles.section} ${styles.faq}`} aria-labelledby="duvidas-titulo">
          <div><p className={styles.sectionLabel}><span>07</span> ANTES DA CONVERSA</p><h2 id="duvidas-titulo">Para começar <span>com clareza.</span></h2><p>Algumas respostas sobre esta fase do programa e as possibilidades que queremos explorar.</p></div>
          <div className={styles.faqList}>
            <details><summary>Os produtos já estão disponíveis?<Plus size={18} aria-hidden="true" /></summary><p>As imagens apresentam conceitos em desenvolvimento. Modelos, personalização, produção e eventual envio ainda dependem de viabilidade e alinhamento. Os produtos não fazem parte dos benefícios iniciais garantidos.</p></details>
            <details><summary>Como serão combinados os conteúdos?<Plus size={18} aria-hidden="true" /></summary><p>Formatos, frequência, identificação da parceria e possíveis contrapartidas serão conversados individualmente. A proposta é alinhar expectativas antes de cada ação, respeitando seu conteúdo e sua rotina.</p></details>
            <details><summary>Há pagamento ou patrocínio garantido?<Plus size={18} aria-hidden="true" /></summary><p>O convite inicial não inclui promessa de remuneração ou patrocínio. Futuras oportunidades comerciais dependerão do crescimento do Projeto Garagem, dos recursos disponíveis e de acordos específicos.</p></details>
            <details><summary>Como continuo a conversa?<Plus size={18} aria-hidden="true" /></summary><p>Responda ao convite do fundador ou escreva para <a href="mailto:parcerias@projetogaragem.com.br">parcerias@projetogaragem.com.br</a>. A partir dessa troca, podemos conhecer seu projeto e conversar sobre os próximos passos. O contato não significa aceitação automática no programa.</p></details>
          </div>
        </section>

        <section className={styles.invite} aria-labelledby="final-titulo">
          <p className={styles.eyebrow}>O PRÓXIMO CAPÍTULO COMEÇA COM UMA CONVERSA</p>
          <h2 id="final-titulo">Toda grande história começa com quem <span>acreditou primeiro.</span></h2>
          <p>Queremos construir algo relevante para a cultura automotiva. E queremos pessoas que compartilhem essa paixão desde o início.</p>
          <a className={styles.contactButton} href="mailto:parcerias@projetogaragem.com.br?subject=Parceria%20%E2%80%94%20Criadores%20Fundadores">Conversar sobre a parceria <ArrowUpRight size={18} aria-hidden="true" /></a>
          <a className={styles.contactEmail} href="mailto:parcerias@projetogaragem.com.br">parcerias@projetogaragem.com.br</a>
          <span className={styles.inviteNote}>Um convite para nos conhecermos e pensar os próximos passos juntos.</span>
        </section>

        <footer className={styles.footer}><p>© {new Date().getFullYear()} Projeto Garagem</p><p>Feito por quem vive. Para quem vive.<ArrowRight size={14} aria-hidden="true" /></p></footer>
      </div>
    </main>
  );
}
