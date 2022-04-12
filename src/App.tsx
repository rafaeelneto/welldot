import React, { useEffect } from 'react';

import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import Loading from './components/loading/loading.component';

import Header from './components/header/header.component';
import Home from './pages/home/home.component';

import './App.css';

import styles from './App.module.scss';

const PerfilEditor = React.lazy(
  () => import('./components/profileEditor/profileEditor.component')
);

const App = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <Header />
        <Routes>
          <Route
            path="editor"
            element={
              <React.Suspense fallback={<Loading />}>
                <PerfilEditor />
              </React.Suspense>
            }
          />
          <Route
            index
            element={
              <React.Suspense fallback={<Loading />}>
                <Home />
              </React.Suspense>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
