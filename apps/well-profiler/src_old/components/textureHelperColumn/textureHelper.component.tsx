import React from 'react';

import { ActionIcon, Popover, Text, Anchor } from '@mantine/core';
import { HelpCircle } from 'react-feather';

function TextureHelperButton() {
  return (
    <div className="flex items-center justify-center w-full flex-row">
      Textura
      <Popover width={300} position="bottom" withArrow shadow="md">
        <Popover.Target>
          <ActionIcon className="ml-3" variant="transparent">
            <HelpCircle />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Text size="sm">
            As texturas são baseadas no padrão de representação geológica{' '}
            <Anchor href="https://ngmdb.usgs.gov/fgdc_gds/geolsymstd/downloadbytheme.php" target="_blank" rel="noopener noreferrer">
              FGDC Geologic Map Symbolization.
            </Anchor>{' '}
            O PDF com todas as texturas pode ser baixado em{' '}
            <Anchor href="/fgdc-geolsym-patternchart.pdf" target="_blank" rel="noopener noreferrer">
              /fgdc-geolsym-patternchart.pdf
            </Anchor>
            .
          </Text>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}

export default TextureHelperButton;
