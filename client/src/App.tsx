import React from 'react';

import { IconButton } from '@mui/material';
import { Mail } from 'react-feather';

import ReactGA from 'react-ga';

import PerfilEditor from './components/profileEditor/profileEditor.component';
import Header from './components/header/header.component';

import { ReactComponent as Behance } from './assets/behance_1.svg';
import { ReactComponent as Linkedin } from './assets/linkedin_1.svg';

import { ReactComponent as Email } from './assets/email_1.svg';

import './App.css';

import styles from './App.module.scss';

const TRACKING_ID = 'UA-215620517-1';
ReactGA.initialize(TRACKING_ID);

const App = () => {
  return (
    <div className="App">
      <Header />
      <PerfilEditor />
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
      <div className={`${styles.tile} ${styles.about}`}>
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
      </div>
    </div>
  );
};

export default App;
