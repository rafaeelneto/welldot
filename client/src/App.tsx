import React from 'react';
import PerfilEditor from './components/profileEditor/profileEditor.component';
import Header from './components/header/header.component';

import './App.css';

const App = () => {
  return (
    <div className="App">
      <Header />
      <PerfilEditor />
    </div>
  );
};

export default App;
