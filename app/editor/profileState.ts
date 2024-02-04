import { PROFILE_TYPE } from '@/src/types/profile.types';
import { useState } from 'react';

// const saveProfileOnLocalStorage = (profile2Save?: PROFILE_TYPE) => {
//   // SAVE ON LOCAL STORAGE
//   console.log('AUTO SAVE');
//   const profileJSon = JSON.stringify(profile2Save || '');
//   window.localStorage.setItem('profile', profileJSon);
// };

function useProfileStateManager() {
  const [cementPad, setCementPadState] = useState();
  const [boreHole, setBoreHole] = useState();
  const [holeFill, setHoleFill] = useState();
  const [surfaceCase, setSurfaceCase] = useState();
  const [wellScreen, setWellScreen] = useState();

  return { cementPad, setCementPadState };
}

export default useProfileStateManager;
