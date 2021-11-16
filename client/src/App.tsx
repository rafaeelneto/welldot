/* eslint-disable max-len */
import React, { useState } from 'react';
import PerfilEditor from './components/perfilEditor/perfilEditor.component';
import Header from './components/header/header.component';

import PDFTeste from './components/print/pdfTeste.component';
import {
  GEOLOGIC_COMPONENT_TYPE,
  BORE_HOLE_COMPONENT_TYPE,
  CEMENT_PAD_COMPONENT_TYPE,
  HOLE_FILL_COMPONENT_TYPE,
  PROFILE_TYPE,
  SURFACE_CASE_COMPONENT_TYPE,
  WELL_CASE_COMPONENT_TYPE,
  WELL_SCREEN_COMPONENT_TYPE,
  CONSTRUCTIVE_COMPONENT_TYPE,
} from './types/perfil.types';
import './App.css';

const perfilEx: PROFILE_TYPE = {
  geologic: [
    {
      from: 0,
      to: 6,
      fgdc_texture: 612,
      color: '#f6ebc9',
      description: 'Argila arenosa, amarelada',
      geologic_unit: '',
    },
    {
      from: 6,
      to: 10,
      fgdc_texture: 682,
      color: '#c25c1e',
      description:
        'Argila com laterita vermelha acastanhada, levemente conglomerática',
      geologic_unit: '',
    },
    {
      from: 10,
      to: 17,
      fgdc_texture: 601,
      color: '#b26d40',
      description:
        'Areia castanha amarronzada, muito grossa a média, angulosa, possui uma matriz de areia fina, com presença de laterita vermelha',
      geologic_unit: '',
    },
    {
      from: 17,
      to: 20,
      fgdc_texture: 682,
      color: '#bb5332',
      description:
        'Areia argilosa, castanha avermelhada, muito grossa média, laterizada, com níveis de argila avermelhada',
      geologic_unit: '',
    },
    {
      from: 20,
      to: 27,
      fgdc_texture: 612,
      color: '#e08d40',
      description:
        'Argila arenosa, vermelha amarelada, com pequenas concreções lateríticas',
      geologic_unit: '',
    },
    {
      from: 27,
      to: 35,
      fgdc_texture: 607,
      color: '#b8624b',
      description:
        'Areia castanha avermelhada, muito fina grossa, subangulosa a subarredondada, com pequenas lentes de argila avermelhada',
      geologic_unit: '',
    },
    {
      from: 35,
      to: 56,
      fgdc_texture: 612,
      color: '#71814f',
      description:
        'Intercalações de folhelho cinza esverdeado, micáceo e fracamente laminado, e areia cinza clara fina grossa, subarredondada a subangulosa',
      geologic_unit: '',
    },
    {
      from: 56,
      to: 63,
      fgdc_texture: 682,
      color: '#849c78',
      description: 'Argila arenosa, cinza esverdeada com lente de folhelho',
      geologic_unit: '',
    },
    {
      from: 63,
      to: 81,
      fgdc_texture: 620,
      color: '#70705e',
      description: 'Argila cinza a preta, levemente laminada e micácea',
      geologic_unit: '',
    },
    {
      from: 81,
      to: 86,
      fgdc_texture: 682,
      color: '#444242',
      description:
        'Conglomerado cinza escuro, com clastos muito grossos a finos, arredondados a subarredondados, mal selecionados, possui uma matriz argilosa, arcabouço aberto, com concreções lateríticas',
      geologic_unit: '',
    },
    {
      from: 86,
      to: 96,
      fgdc_texture: 612,
      color: '#3b3434',
      description:
        'Areia argilosa, fina muito grossa, subarredondada, cinza escura',
      geologic_unit: '',
    },
    {
      from: 96,
      to: 104,
      fgdc_texture: 635,
      color: '#3f3434',
      description: 'Calcarenito cinza escuro, levemente arenoso, fossilífero ',
      geologic_unit: '',
    },
    {
      from: 104,
      to: 110,
      fgdc_texture: 619,
      color: '#c5ceb6',
      description:
        'Argila arenosa, cinza clara a esverdeada, levemente carbonática',
      geologic_unit: '',
    },
    {
      from: 110,
      to: 120,
      fgdc_texture: 612,
      color: '#beb7b7',
      description: 'Areia argilosa, cinza clara, levemente carbonática',
      geologic_unit: '',
    },
    {
      from: 120,
      to: 137,
      fgdc_texture: 619,
      color: '#c8cfa9',
      description:
        'Argila arenosa, cinza clara a esverdeada, levemente carbonática',
      geologic_unit: '',
    },
    {
      from: 137,
      to: 141,
      fgdc_texture: 682,
      color: '#575454',
      description:
        'Areia argilosa, cinza escura, média a fina, com pequenas quantidades de clatos grossos, subarredondados, mal selecionados',
      geologic_unit: '',
    },
    {
      from: 141,
      to: 154,
      fgdc_texture: 620,
      color: '#afb896',
      description: 'Folhelho cinza esverdeado, laminado',
      geologic_unit: '',
    },
    {
      from: 154,
      to: 159,
      fgdc_texture: 612,
      color: '#666464',
      description:
        'Areia argilosa, cinza escura, muito grossa a fina, subangulosa',
      geologic_unit: '',
    },
    {
      from: 159,
      to: 164,
      fgdc_texture: 619,
      color: '#666464',
      description:
        'Argila cinza escura, pouco arenosa, com níveis de folhelho cinza esverdeado',
      geologic_unit: '',
    },
    {
      from: 164,
      to: 178,
      fgdc_texture: 682,
      color: '#6a745c',
      description:
        'Areia argilosa, cinza escuro, levemente esverdeado, fina a grossa, subarredondada a subangulosa, com pequenas manchas de folhelho esverdeado',
      geologic_unit: '',
    },
    {
      from: 178,
      to: 182,
      fgdc_texture: 619,
      color: '#313030',
      description: 'Argilosa arenosa, cinza escura a preta',
      geologic_unit: '',
    },
    {
      from: 182,
      to: 197,
      fgdc_texture: 601,
      color: '#726c6c',
      description:
        'Areia cinza escura, fina grossa subangulosa levemente micácea',
      geologic_unit: '',
    },
    {
      from: 197,
      to: 199,
      fgdc_texture: 619,
      color: '#b8b5b5',
      description: 'Argila arenosa, cinza clara micácea',
      geologic_unit: '',
    },
    {
      from: 199,
      to: 232,
      fgdc_texture: 601,
      color: '#d3cccc',
      description:
        'Areia cinza clara, muito grossa a média, subangulosa, mal selecionada',
      geologic_unit: '',
    },
    {
      from: 232,
      to: 235,
      fgdc_texture: 607,
      color: '#e4dede',
      description: 'Areia cinza clara, muito fina a fina, subangulosa',
      geologic_unit: '',
    },
    {
      from: 235,
      to: 240,
      fgdc_texture: 601,
      color: '#d1cbcb',
      description:
        'Conglomerado cinza claro, médio a muito grosso, arredondado a subanguloso, boa seleção, com fragmentos de rochas (provavlmente quatzito)',
      geologic_unit: '',
    },
    {
      from: 240,
      to: 245,
      fgdc_texture: 682,
      color: '#5c5454',
      description:
        'Areia argilosa cinza escura, conglomerática muito grossa a média, arredondada a subangulosa com pequena lente de folhelho esverdeado',
      geologic_unit: '',
    },
    {
      from: 245,
      to: 251,
      fgdc_texture: 601,
      color: '#504b4b',
      description:
        'Areia conglomerática, cinza escura, muito grossa média, com matriz argilosa e presença de concreções lateríticas',
      geologic_unit: '',
    },
    {
      from: 251,
      to: 256,
      fgdc_texture: 619,
      color: '#bdb8b8',
      description: 'Argila arenosa, cinza',
      geologic_unit: '',
    },
    {
      from: 256,
      to: 275,
      fgdc_texture: 601,
      color: '#dfd8d8',
      description:
        'Conglomerado cinza claro, médio a muito grosso, mal selecionado, com matriz argilosa na base',
      geologic_unit: '',
    },
  ],
  constructive: {
    bole_hole: [
      {
        from: 0,
        to: 20,
        diam_pol: 30,
      },
      {
        from: 20,
        to: 96,
        diam_pol: 20,
      },
    ],
    well_screen: [
      {
        from: 206,
        to: 212.6,
        type: 'Aço Inoxidável AISI 304',
        diam_pol: 8,
        screen_slot_mm: 0.5,
      },
      {
        from: 212.6,
        to: 239,
        type: 'Aço Inoxidável AISI 304',
        diam_pol: 8,
        screen_slot_mm: 0.75,
      },
      {
        from: 258,
        to: 270.15,
        type: 'Aço Inoxidável AISI 304',
        diam_pol: 8,
        screen_slot_mm: 0.75,
      },
    ],
    surface_case: [
      {
        from: 0,
        to: 20,
        diam_pol: 30,
      },
    ],
    well_case: [
      {
        from: -0.5,
        to: 95.4,
        type: 'Aço Carbono Shedulle-40',
        diam_pol: 14,
      },
      {
        from: 95.4,
        to: 206,
        type: 'Aço Carbono Shedulle-40',
        diam_pol: 8,
      },
      {
        from: 239,
        to: 258,
        type: 'Aço Carbono Shedulle-40',
        diam_pol: 8,
      },
      {
        from: 270.15,
        to: 273,
        type: 'Aço Carbono Shedulle-40',
        diam_pol: 8,
      },
    ],
    hole_fill: [
      {
        from: 0,
        to: 20,
        diam_pol: 30,
        description: '',
        type: 'seal',
      },
      {
        from: 20,
        to: 96,
        diam_pol: 20,
        description: '',
        type: 'seal',
      },
      {
        from: 96,
        to: 275,
        diam_pol: 20,
        description: '',
        type: 'gravel_pack',
      },
    ],
    cement_pad: {
      type: 'Concreto',
      thickness: 0.25,
      width: 2.5,
      length: 2.5,
    },
  },
};

const App = () => {
  const [name, setName] = useState<string>('');

  return (
    <div className="App">
      <Header />
      <PDFTeste profile={perfilEx} />
      {/* <PerfilEditor
        wellName={name}
        onChangeWellName={(newWellName: string) => {
          setName(newWellName);
        }}
      /> */}
    </div>
  );
};

export default App;
