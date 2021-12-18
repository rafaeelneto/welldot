import React, { useEffect } from 'react';

import { IconButton } from '@mui/material';

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import PerfilEditor from './components/profileEditor/profileEditor.component';
import Header from './components/header/header.component';
import Home from './components/home/home.component';

import './App.css';

import styles from './App.module.scss';

const App = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const scriptLink = document.createElement('script');
      scriptLink.async = true;
      scriptLink.src =
        'https://www.googletagmanager.com/gtag/js?id=G-8TCQE1E5V8';
      document.head.appendChild(scriptLink);
      const scriptTag = document.createElement('script');
      scriptTag.text = `window.dataLayer = window.dataLayer || [];
          function gtag() {
            dataLayer.push(arguments);
          }
          gtag('js', new Date());
          gtag('config', 'G-8TCQE1E5V8');`;
      document.head.appendChild(scriptTag);
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        <Header />
        <Routes>
          <Route path="editor" element={<PerfilEditor />} />
          <Route index element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
