import React from 'react';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@/app/global.css';

import {
  ColorSchemeScript,
  MantineProvider,
  createTheme,
  MantineColorsTuple,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import Header from '@/src/components/header/header.component';

const myColor: MantineColorsTuple = [
  '#ebf8ff',
  '#d6eefa',
  '#a8ddf8',
  '#77caf6',
  '#57baf5',
  '#46b0f5',
  '#3dabf6',
  '#3196db',
  '#2485c4',
  '#0073ad',
];

const theme = createTheme({
  primaryColor: 'myColor',
  primaryShade: 9,
  colors: {
    myColor,
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" style={{height: '100vh'}}>
      <head>
        <ColorSchemeScript />
      </head>
      <body style={{height: '100%'}}>
        <div
          style={{ overflow: 'hidden', height: 0, width: 0 }}
          id="svgDraftContainer"
        />

        <MantineProvider theme={theme}>
          <Notifications />
          <Header />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
