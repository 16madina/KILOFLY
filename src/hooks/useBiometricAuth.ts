import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface BiometricCredentials {
  email: string;
  password: string;
}

interface BiometricAuthHook {
  isAvailable: boolean;
  isEnabled: boolean;
  biometryType: string;
  authenticate: () => Promise<boolean>;
  saveCredentials: (credentials: BiometricCredentials) => Promise<void>;
  getCredentials: () => Promise<BiometricCredentials | null>;
  deleteCredentials: () => Promise<void>;
  enableBiometric: () => void;
  disableBiometric: () => void;
}

const BIOMETRIC_ENABLED_KEY = 'kilofly_biometric_enabled';
const CREDENTIALS_KEY = 'kilofly_biometric_credentials';

export const useBiometricAuth = (): BiometricAuthHook => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('');
  const [NativeBiometric, setNativeBiometric] = useState<any>(null);

  useEffect(() => {
    const initBiometric = async () => {
      // Only available on native platforms
      if (!Capacitor.isNativePlatform()) {
        console.log('Biometric auth not available on web');
        return;
      }

      try {
        // Dynamically import the native biometric plugin
        const { NativeBiometric: BiometricPlugin } = await import('capacitor-native-biometric');
        setNativeBiometric(BiometricPlugin);

        const result = await BiometricPlugin.isAvailable();
        
        if (result.isAvailable) {
          setIsAvailable(true);
          setBiometryType(result.biometryType === 1 ? 'Touch ID' : result.biometryType === 2 ? 'Face ID' : 'Biométrie');
          
          // Check if user has enabled biometric login
          const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
          setIsEnabled(enabled);
        }
      } catch (error) {
        console.log('Biometric not available:', error);
        setIsAvailable(false);
      }
    };

    initBiometric();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!NativeBiometric || !isAvailable) {
      return false;
    }

    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Connectez-vous à KiloFly',
        title: 'Authentification biométrique',
        subtitle: 'Utilisez Face ID ou Touch ID pour vous connecter',
        description: 'Placez votre doigt sur le capteur ou regardez l\'écran',
        negativeButtonText: 'Annuler',
        maxAttempts: 3,
      });
      return true;
    } catch (error) {
      console.log('Biometric authentication failed:', error);
      return false;
    }
  }, [NativeBiometric, isAvailable]);

  const saveCredentials = useCallback(async (credentials: BiometricCredentials): Promise<void> => {
    if (!NativeBiometric || !isAvailable) {
      // Fallback to secure storage for web/testing
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
      return;
    }

    try {
      await NativeBiometric.setCredentials({
        username: credentials.email,
        password: credentials.password,
        server: 'com.kilofly.app',
      });
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw error;
    }
  }, [NativeBiometric, isAvailable]);

  const getCredentials = useCallback(async (): Promise<BiometricCredentials | null> => {
    if (!NativeBiometric || !isAvailable) {
      // Fallback for web/testing
      const stored = localStorage.getItem(CREDENTIALS_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
      return null;
    }

    try {
      const credentials = await NativeBiometric.getCredentials({
        server: 'com.kilofly.app',
      });
      return {
        email: credentials.username,
        password: credentials.password,
      };
    } catch (error) {
      console.log('No stored credentials:', error);
      return null;
    }
  }, [NativeBiometric, isAvailable]);

  const deleteCredentials = useCallback(async (): Promise<void> => {
    if (!NativeBiometric || !isAvailable) {
      localStorage.removeItem(CREDENTIALS_KEY);
      return;
    }

    try {
      await NativeBiometric.deleteCredentials({
        server: 'com.kilofly.app',
      });
    } catch (error) {
      console.log('Failed to delete credentials:', error);
    }
  }, [NativeBiometric, isAvailable]);

  const enableBiometric = useCallback(() => {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    setIsEnabled(true);
  }, []);

  const disableBiometric = useCallback(() => {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    setIsEnabled(false);
    deleteCredentials();
  }, [deleteCredentials]);

  return {
    isAvailable,
    isEnabled,
    biometryType,
    authenticate,
    saveCredentials,
    getCredentials,
    deleteCredentials,
    enableBiometric,
    disableBiometric,
  };
};
