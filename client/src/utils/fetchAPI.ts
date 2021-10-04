import axios from 'axios';

const baseURL = process.env.REACT_APP_BASE_API_URL || '/v1/api';

export const API_ENDPOINTS = {
  FGDC_TEXTURES: '/fgdc-textures',
};

const instance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials: true,
});

export const APIPost = async (
  endpoint: string,
  data,
  onUploadProgress?: (progressEvent: any) => void
) => {
  try {
    const res = await instance.post(endpoint, data, {
      onUploadProgress,
    });

    return res;
  } catch (err) {
    throw err.response;
  }
};

export const APIPatch = async (
  endpoint: string,
  data,
  onUploadProgress?: (progressEvent: any) => void
) => {
  try {
    const res = await instance.patch(endpoint, data, {
      onUploadProgress,
    });

    return res;
  } catch (err) {
    throw err.response;
  }
};
