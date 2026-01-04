import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilofly.app',
  appName: 'KiloFly',
  webDir: 'dist',
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
  // Deep links configuration
  // iOS: Add URL scheme in Info.plist: CFBundleURLSchemes = ["kilofly"]
  // Android: Add intent-filter in AndroidManifest.xml for scheme "kilofly"
  // Universal Links: Configure apple-app-site-association and assetlinks.json
};

export default config;
