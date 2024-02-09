import { useState } from 'react';

const saveProfileOnLocalStorage = (profile2Save?: PROFILE_TYPE) => {
  // SAVE ON LOCAL STORAGE
  console.log('AUTO SAVE');
  const profileJSon = JSON.stringify(profile2Save || profileState);
  window.localStorage.setItem('profile', profileJSon);
};

const profileStateManager = () => {
  const [cementPad, setCementPadState] = useState();
  const [boreHole, setBoreHole] = useState();
  const [holeFill, setHoleFill] = useState();
  const [surfaceCase, setSurfaceCase] = useState();
  const [wellScreen, setWellScreen] = useState();

  return { cementPad, setCementPadState };
};

export default profileStateManager;
