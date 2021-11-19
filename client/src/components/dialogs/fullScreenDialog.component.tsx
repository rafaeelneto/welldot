import React from 'react';
/* eslint-disable max-len */
/* eslint-disable react/jsx-props-no-spreading */
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';

import styles from './fullScreenDialog.module.scss';

const Transition = React.forwardRef(
  // eslint-disable-next-line react/require-default-props
  (
    props: TransitionProps & { children?: React.ReactElement },
    ref: React.Ref<unknown>
  ) => <Slide direction="up" ref={ref} {...props} />
);

export default function FullScreenDialog({
  open,
  onResponse,
  title,
  btnText,
  alwaysFull = false,
  ...otherProps
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm')) || alwaysFull;

  return (
    <div>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={() => onResponse(false)}
        TransitionComponent={Transition}
      >
        <AppBar className={styles.appBar}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => onResponse(false)}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={styles.title}>
              {title}
            </Typography>
            {btnText ? (
              <Button color="inherit" onClick={() => onResponse(true)}>
                {btnText}
              </Button>
            ) : (
              ''
            )}
          </Toolbar>
        </AppBar>
        <div style={{ height: '100%', overflow: 'hidden' }}>
          {otherProps.children}
        </div>
      </Dialog>
    </div>
  );
}
