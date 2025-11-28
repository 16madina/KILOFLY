import { Capacitor } from '@capacitor/core';

export const getPlatform = () => {
  return Capacitor.getPlatform();
};

export const isIOS = () => {
  return getPlatform() === 'ios';
};

export const isAndroid = () => {
  return getPlatform() === 'android';
};

export const isWeb = () => {
  return getPlatform() === 'web';
};

export const isMobile = () => {
  return isIOS() || isAndroid();
};
