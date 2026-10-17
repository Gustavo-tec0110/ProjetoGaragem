import Image from "next/image";
import { BadgeCheck } from "lucide-react";

import styles from "./page.module.css";

export function CreatorProfilePreview() {
  return (
    <figure className={styles.profilePreview} aria-labelledby="perfil-exemplo-legenda">
      <figcaption id="perfil-exemplo-legenda" className={styles.profilePreviewLabel}>
        <span>Exemplo ilustrativo</span>
        <span>O SELO NO PERFIL</span>
      </figcaption>
      <div className={styles.profilePreviewCard}>
        <div className={styles.profilePreviewBanner}>
          <Image
            src="/ref/hero-opala-ss.webp"
            alt="Banner ilustrativo do perfil, com um carro clássico em uma garagem."
            fill
            sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 43vw, 500px"
            quality={85}
          />
        </div>
        <div className={styles.profilePreviewBody}>
          <div className={styles.profilePreviewAvatar}>
            <Image
              src="/partnerships/creators/perfil-exemplo-avatar.webp"
              alt="Foto de perfil ilustrativa de um criador fictício, gerada por IA."
              fill
              sizes="96px"
              quality={85}
            />
          </div>
          <div className={styles.profilePreviewName}>
            <h3>Seu nome</h3>
            <span className={styles.verifiedBadge} role="img" aria-label="Criador verificado pelo Projeto Garagem" title="Criador verificado pelo Projeto Garagem">
              <BadgeCheck size={20} strokeWidth={2} aria-hidden="true" />
            </span>
          </div>
          <p className={styles.profilePreviewHandle}>@seuperfil</p>
          <p className={styles.profilePreviewBio}>Seu projeto, suas histórias e a sua paixão pela cultura automotiva.</p>
          <div className={styles.profilePreviewFooter}>
            <span>PROJETOS</span><span>HISTÓRIAS</span><span>COMUNIDADE</span>
          </div>
        </div>
      </div>
      <p className={styles.profilePreviewNote}>Prévia visual com foto ilustrativa gerada por IA. Não representa um criador confirmado.</p>
    </figure>
  );
}
