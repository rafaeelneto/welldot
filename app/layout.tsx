import React from 'react';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@/app/global.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <div
          style={{ overflow: 'hidden', height: 0, width: 0 }}
          id="svgDraftContainer"
        />

        <MantineProvider>
          <Notifications />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
