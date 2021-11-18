/* eslint-disable max-len */
import React, { useState } from 'react';
import PerfilEditor from './components/perfilEditor/perfilEditor.component';
import Header from './components/header/header.component';

import './App.css';

const App = () => {
  const [name, setName] = useState<string>('');

  return (
    <div className="App">
      <Header />
      <PerfilEditor
        wellName={name}
        onChangeWellName={(newWellName: string) => {
          setName(newWellName);
        }}
      />
    </div>
  );
};

export default App;
