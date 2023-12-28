import React from 'react';
import {
  Button,
  AppShell,
  ActionIcon as IconButton,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

import { X } from 'react-feather';
import { Transition } from 'react-transition-group';

import styles from './fullScreenDialog.module.scss';

const FullScreenDialog = ({
  open,
  onResponse,
  title,
  btnText,
  alwaysFull = false,
  ...otherProps
}) => {
  const fullScreen = useMediaQuery('(min-width: 56.25em)') || alwaysFull;

  return (
    <div>
      <Transition in={open} timeout={300} mountOnEnter unmountOnExit>
        {(state: any) => (
          <div
            className={styles.dialog}
            style={{
              transition: 'opacity 300ms ease-in-out',
              opacity: state === 'entered' ? 1 : 0,
            }}
          >
            <AppShell className={styles.appBar}>
              <AppShell.Header>
                <IconButton
                  onClick={() => onResponse(false)}
                  aria-label="close"
                >
                  <X className={styles.closeIcon} />
                </IconButton>
                <Title variant="h6" className={styles.title}>
                  {title}
                </Title>
                {btnText ? (
                  <Button onClick={() => onResponse(true)}>{btnText}</Button>
                ) : (
                  ''
                )}
              </AppShell.Header>
            </AppShell>
            <div style={{ height: '100%', overflow: 'hidden' }}>
              {otherProps.children}
            </div>
          </div>
        )}
      </Transition>
    </div>
  );
};

export default FullScreenDialog;
