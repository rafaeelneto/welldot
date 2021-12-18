import React, { useEffect } from 'react';

import { IconButton, Button } from '@mui/material';

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import { ReactComponent as Behance } from '../../assets/behance_1.svg';
import { ReactComponent as Linkedin } from '../../assets/linkedin_1.svg';
import { ReactComponent as Email } from '../../assets/email_1.svg';

import styles from './home.module.scss';

const Home = () => {
  return (
    <div className={styles.root}>
      <div id="about" className={`${styles.tile} ${styles.hero}`}>
        <div className={`${styles.tileContent} ${styles.heroContent}`}>
          <div className={`${styles.lWrapper}`}>
            <h3 className={styles.tileTitle}>
              Crie perfil geológicos e construtivos de poços e sondagens com
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
                    'editor'
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
            <IconButton className={styles.socialBtn}>
              <Behance />
            </IconButton>
            <IconButton className={styles.socialBtn}>
              <Linkedin />
            </IconButton>
            <IconButton className={styles.socialBtn}>
              <Email />
            </IconButton>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
