import { useClipboard } from '@vueuse/core';

export async function copyToClipboard(text: string) {
  try {
    await useClipboard({ legacy: true }).copy(text);
    return true;
  } catch (error) {
    console.error('Error copying text: ', error);
    return false;
  }
}
