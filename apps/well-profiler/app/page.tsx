import React from 'react';

import NextLink from 'next/link';
import type { Metadata } from 'next';

import { Button } from '@mantine/core';

import Behance from '@/public/assets/icons/behance_1.svg';
import Linkedin from '@/public/assets/icons/linkedin_1.svg';
import Email from '@/public/assets/icons/email_1.svg';

import styles from '@/app/home.module.scss';

export const metadata: Metadata = {
  title: 'Well Profiler',
  description:
    'Web app dedicado a construção de perfis geológicos e construtivos de poços de água subterrânea',
};

function Home() {
  return (
    <div className="w-full h-[calc(100%-50px)] overflow-y-auto">
      <div id="about" className={`${styles.tile} ${styles.hero}`}>
        <div className={`${styles.tileContent} ${styles.heroContent}`}>
          <div className={`${styles.lWrapper}`}>
            <h3 className={styles.tileTitle}>
              Crie perfis geológicos e construtivos de poços e sondagens com
              facilidade
            </h3>
            <Button
              color="white"
              variant="outline"
              radius="xl"
              component={NextLink}
              href="/editor"
              // onClick={() => {
              //   // @ts-ignore
              //   if (window.gtag) {
              //     // @ts-ignore
              //     window.gtag(
              //       'event',
              //       'button clicked',
              //       'User Interaction',
              //       'editor',
              //     );
              //   }
              // }}
            >
              Edite seu perfil
            </Button>
          </div>
          <div className={`${styles.rWrapper}`} />
        </div>
      </div>
      <div id="about" className={`${styles.tile} ${styles.info}`}>
        <div className={`${styles.tileContent} ${styles.infoContent}`}>
          <div className={`${styles.lWrapper}`} />
          <div className={`${styles.rWrapper}`}>
            <h3 className={styles.tileTitle}>
              Um programa destinado para geólogos, hidrogeólogos e demais
              profissionais
            </h3>
            <p className={styles.tileText}>
              O <strong>Well Profiler</strong> é uma ferramenta que torna fácil
              a confecção e visualização de perfis geológico-construtivos de
              poços. A ferramenta é gratuita para uso e conta com conjunto
              crescente recursos úteis que deverão ser adicionados com o tempo.
            </p>
          </div>
        </div>
      </div>
      <footer className={`${styles.tile} ${styles.about}`}>
        <div className={`${styles.tileContent}`}>
          <p className={styles.tileText}>
            Criado e desenvolvido por Rafael Gomes
          </p>
          <div className={styles.socialBtnsContainer}>
            <NextLink
              className={styles.socialBtn}
              href="https://www.behance.net/rafaeelneto"
              target="_blank"
            >
              <Behance />
            </NextLink>
            <NextLink
              className={styles.socialBtn}
              href="https://www.linkedin.com/in/rafaeelneto/"
              target="_blank"
            >
              <Linkedin />
            </NextLink>

            <NextLink
              className={styles.socialBtn}
              href="mailto: rafaelneto.g@gmail.com"
              target="_blank"
            >
              <Email />
            </NextLink>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
