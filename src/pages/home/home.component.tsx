import React, { useEffect } from 'react';

import { IconButton, Button, Link as LinkMaterial } from '@mui/material';

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import { ReactComponent as Behance } from '../../assets/behance_1.svg';
import { ReactComponent as Linkedin } from '../../assets/linkedin_1.svg';
import { ReactComponent as Email } from '../../assets/email_1.svg';

import styles from './home.module.scss';

function Home() {
  return (
    <div className={styles.root}>
      <div id="about" className={`${styles.tile} ${styles.hero}`}>
        <div className={`${styles.tileContent} ${styles.heroContent}`}>
          <div className={`${styles.lWrapper}`}>
            <h3 className={styles.tileTitle}>
              Crie perfis geológicos e construtivos de poços e sondagens com
              facilidade
            </h3>
            <Button
              variant="outlined"
              className={styles.btn}
              component={Link}
              to="/editor"
              onClick={() => {
                // @ts-ignore
                if (window.gtag) {
                  // @ts-ignore
                  window.gtag(
                    'event',
                    'button clicked',
                    'User Interaction',
                    'editor',
                  );
                }
              }}
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
            <LinkMaterial
              className={styles.socialBtn}
              onClick={() => {
                // @ts-ignore
                if (window.gtag) {
                  // @ts-ignore
                  window.gtag(
                    'event',
                    'button clicked',
                    'Link to social media',
                    'behance',
                  );
                }
              }}
              href="https://www.behance.net/rafaeelneto"
              target="_blank"
            >
              <Behance />
            </LinkMaterial>
            <LinkMaterial
              className={styles.socialBtn}
              onClick={() => {
                // @ts-ignore
                if (window.gtag) {
                  // @ts-ignore
                  window.gtag(
                    'event',
                    'button clicked',
                    'Link to social media',
                    'linkedinho',
                  );
                }
              }}
              href="https://www.linkedin.com/in/rafaeelneto/"
              target="_blank"
            >
              <Linkedin />
            </LinkMaterial>

            <LinkMaterial
              className={styles.socialBtn}
              onClick={() => {
                // @ts-ignore
                if (window.gtag) {
                  // @ts-ignore
                  window.gtag(
                    'event',
                    'button clicked',
                    'Link to social media',
                    'email',
                  );
                }
              }}
              href="mailto: rafaelneto.g@gmail.com"
              target="_blank"
            >
              <Email />
            </LinkMaterial>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
