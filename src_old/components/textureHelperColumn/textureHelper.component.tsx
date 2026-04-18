import React from 'react';

import { ActionIcon } from '@mantine/core';
import { HelpCircle } from 'react-feather';

function TextureHelperButton() {
  return (
    <div className="flex items-center justify-center w-full flex-row">
      Textura
      <ActionIcon
        className="ml-3"
        variant="transparent"
        onClick={() => {
          window
            .open(`/fgdc-geolsym-patternchart.pdf`, '_blank')
            ?.focus();
        }}
      >
        <HelpCircle />
      </ActionIcon>
    </div>
  );
}

export default TextureHelperButton;
