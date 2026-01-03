import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilofly.app',
  appName: 'KiloFly',
  webDir: 'dist',
  server: {
    url: 'https://2b7a5f77-5ecc-4622-bc5b-450979c265cc.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#E8F5FE',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#1FB6FF',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
