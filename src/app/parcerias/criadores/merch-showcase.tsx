import Image from "next/image";
import { ArrowUpRight, Clock3 } from "lucide-react";

import styles from "./page.module.css";

const products = [
  {
    image: "camiseta-essencial.webp",
    title: "Essencial PG",
    description: "A identidade do Projeto Garagem em uma proposta discreta para o dia a dia.",
    alt: "Mockup de camiseta preta com a marca Projeto Garagem no peito e detalhes da frente, das costas e da gola.",
  },
  {
    image: "camiseta-personalizada.webp",
    title: "Seu carro, sua assinatura",
    description: "Uma direção de personalização com o projeto e a identidade de cada criador.",
    alt: "Conceito de camiseta com silhuetas de carros, texto Seu carro e espaço ilustrativo para o perfil do criador nas costas.",
  },
  {
    image: "camiseta-boxer.webp",
    title: "Cultura boxer",
    description: "Uma proposta de estampa que conecta o carro, a mecânica e a paixão pelo projeto.",
    alt: "Mockup de camiseta com ilustração de um Subaru Impreza na frente e arte de motor boxer nas costas.",
  },
  {
    image: "camiseta-gol.webp",
    title: "Cada um no seu quadrado",
    description: "Traço técnico e uma homenagem a um clássico da cultura automotiva.",
    alt: "Conceito de camiseta com desenho técnico de um Volkswagen Gol quadrado e a frase Cada um no seu quadrado nas costas.",
  },
];

export function MerchShowcase() {
  return (
    <section id="produtos" className={styles.section} aria-labelledby="produtos-titulo">
      <p className={styles.sectionLabel}><span>01</span> PRODUTOS E MERCH</p>
      <div className={styles.merchHeading}>
        <h2 id="produtos-titulo">Produtos e merch <span>com a nossa identidade.</span></h2>
        <p>Uma primeira visão do que podemos criar juntos: peças que levam a cultura da garagem para além da tela.</p>
      </div>

      <div className={styles.futureNotice} role="note" aria-labelledby="futuras-parcerias-titulo">
        <Clock3 size={20} aria-hidden="true" />
        <div>
          <h3 id="futuras-parcerias-titulo">Futuras parcerias</h3>
          <p>Os produtos desta seção são conceitos para futuras parcerias. Produção, disponibilidade e envio dependerão da evolução do Projeto Garagem e dos acordos com cada criador.</p>
        </div>
      </div>

      <div className={styles.collection}>
        <Image
          src="/partnerships/creators/colecao-parceria.webp"
          alt="Conceito de coleção Projeto Garagem com moletom, boné, garrafa, copo, canecas, adesivos e chaveiro."
          width={1448}
          height={1086}
          sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 57vw, 720px"
          quality={85}
          className={styles.collectionImage}
        />
        <div className={styles.collectionCopy}>
          <span className={styles.merchStatus}>Conceitos visuais</span>
          <h3>Vestir a mesma paixão.<br />Levar a mesma identidade.</h3>
          <p>Estamos explorando ideias de produtos e kits que expressem o que conecta o Projeto Garagem e seus criadores.</p>
          <dl className={styles.collectionCategories}>
            <div><dt>Para vestir</dt><dd>Camisetas, moletom e boné.</dd></div>
            <div><dt>Para o dia a dia</dt><dd>Garrafas, copos e canecas.</dd></div>
            <div><dt>Para fazer parte</dt><dd>Adesivos, chaveiros e ideias de kits.</dd></div>
          </dl>
        </div>
      </div>

      <div className={styles.merchGalleryHeading}>
        <h3>Estudos de camisetas</h3>
        <span>AS ARTES, MAIS DE PERTO <ArrowUpRight size={14} aria-hidden="true" /></span>
      </div>
      <div className={styles.merchGrid}>
        {products.map((product, index) => (
          <figure key={product.image} className={styles.product}>
            <a
              href={`/partnerships/creators/${product.image}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.productImageLink}
              aria-label={`Ampliar imagem: ${product.title} (abre em nova aba)`}
            >
              <Image
                src={`/partnerships/creators/${product.image}`}
                alt={product.alt}
                width={1536}
                height={1024}
                sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 45vw, 580px"
                quality={85}
                className={styles.productImage}
              />
              <span className={styles.productExpand}><ArrowUpRight size={18} aria-hidden="true" /></span>
            </a>
            <figcaption>
              <span className={styles.productNumber}>0{index + 1}</span>
              <div><h3>{product.title}</h3><p>{product.description}</p></div>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className={styles.merchNote}>As imagens são mockups ilustrativos de possibilidades futuras. Produção, disponibilidade e eventual envio dependerão da viabilidade e dos acordos de cada parceria.</p>
    </section>
  );
}
