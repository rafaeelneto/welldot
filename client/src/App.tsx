import React from 'react';
import PerfilEditor from './components/profileEditor/profileEditor.component';
import Header from './components/header/header.component';

import perfisMockup from './assets/images/pdfs_profiles_mockup.jpg';

import './App.css';

const App = () => {
  return (
    <div className="App">
      <Header />
      <PerfilEditor />
      <div className="tile info">
        <img
          alt="perfis gerados pelo well profiler"
          className="image"
          src={perfisMockup}
        />
        <p>
          O Well Profiler é uma ferramenta que torna fácil a confecção e
          visualização de perfis geológico-construtivos de poços. A ferramenta é
          gratuita para uso e conta com conjunto crescente recursos úteis que
          deverão ser adicionados com o tempo.
        </p>
        <p>
          Este programa é destinado para geólogos, hidrogeólogos ou demais
          profissionais interessados.
        </p>
      </div>
      <div className="tile about">
        <p>Criado e desenvolvido por Rafael Gomes</p>
      </div>
    </div>
  );
};

export default App;
