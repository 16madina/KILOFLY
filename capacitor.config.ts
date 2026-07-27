import type { CapacitorConfig } from '@capacitor/cli';



// Live web shell (like KiDi+): UI/JS updates without a new Play build.
// Local hot-reload: set NATIVE_APP_URL=http://YOUR_LAN_IP:5173 before cap sync.
const nativeAppUrl = process.env.NATIVE_APP_URL || "https://kiloflyapp.com";

const config: CapacitorConfig = {
  appId: 'com.kilofly.app',
  appName: 'KiloFly',
  webDir: 'dist',
  server: {
    url: nativeAppUrl,
    cleartext: nativeAppUrl.startsWith("http://"),
    androidScheme: "https",
    allowNavigation: [
      "kiloflyapp.com",
      "www.kiloflyapp.com",
      "*.lovable.app",
      "*.lovableproject.com",
      "*.stripe.com",
    ],
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
    PushNotifications: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
  },
  // ============================================
  // DEEP LINKS & UNIVERSAL LINKS CONFIGURATION
  // ============================================
  // 
  // CUSTOM URL SCHEME (kilofly://):
  // --------------------------------
  // iOS: In Xcode, add URL scheme in Info.plist:
  //   CFBundleURLSchemes = ["kilofly"]
  //
  // Android: Add intent-filter in AndroidManifest.xml:
  //   <intent-filter>
  //     <action android:name="android.intent.action.VIEW" />
  //     <category android:name="android.intent.category.DEFAULT" />
  //     <category android:name="android.intent.category.BROWSABLE" />
  //     <data android:scheme="kilofly" />
  //   </intent-filter>
  //
  // UNIVERSAL LINKS (iOS) - kiloflyapp.com:
  // ----------------------------------------
  // 1. In Xcode > Signing & Capabilities > + Capability > Associated Domains
  // 2. Add: applinks:kiloflyapp.com
  // 3. Replace YOUR_TEAM_ID in public/.well-known/apple-app-site-association
  //
  // APP LINKS (Android) - kiloflyapp.com:
  // --------------------------------------
  // 1. Add to AndroidManifest.xml inside <activity>:
  //   <intent-filter android:autoVerify="true">
  //     <action android:name="android.intent.action.VIEW" />
  //     <category android:name="android.intent.category.DEFAULT" />
  //     <category android:name="android.intent.category.BROWSABLE" />
  //     <data android:scheme="https" android:host="kiloflyapp.com" />
  //   </intent-filter>
  // 2. Replace YOUR_SHA256_FINGERPRINT in public/.well-known/assetlinks.json
  //    Get fingerprint: keytool -list -v -keystore your-keystore.jks
  //
};

export default config;
