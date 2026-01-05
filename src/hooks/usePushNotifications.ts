import { useEffect, useCallback, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Platform = 'android' | 'ios' | 'web';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const tokenSavedRef = useRef(false);
  const pushNotificationsRef = useRef<typeof import('@capacitor/push-notifications').PushNotifications | null>(null);

  const getPlatform = (): Platform => {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
    return 'web';
  };

  const isNative = Capacitor.isNativePlatform();

  // Save token to database
  const saveTokenToDatabase = useCallback(async (token: string) => {
    if (!user?.id || tokenSavedRef.current) return;
    
    try {
      const platform = getPlatform();
      
      // Use raw SQL approach for tables not in types yet
      const { error } = await supabase.rpc('upsert_push_token' as never, {
        p_user_id: user.id,
        p_token: token,
        p_platform: platform
      } as never);

      if (error) {
        // Fallback: try direct insert
        const { error: insertError } = await supabase
          .from('push_tokens' as never)
          .upsert(
            { user_id: user.id, token, platform } as never,
            { onConflict: 'user_id,token' }
          );
        
        if (insertError) {
          console.error('Error saving push token:', insertError);
        } else {
          console.log('Push token saved successfully');
          tokenSavedRef.current = true;
        }
      } else {
        console.log('Push token saved successfully');
        tokenSavedRef.current = true;
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }, [user?.id]);

  // Remove token from database
  const removeTokenFromDatabase = useCallback(async (token: string) => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('push_tokens' as never)
        .delete()
        .eq('user_id', user.id)
        .eq('token', token);
      
      tokenSavedRef.current = false;
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }, [user?.id]);

  // Initialize native push notifications
  useEffect(() => {
    const initNativePush = async () => {
      if (!isNative) {
        // Fallback to web notifications
        const supported = 'Notification' in window;
        setIsSupported(supported);
        if (supported) {
          setPermission(Notification.permission as 'granted' | 'denied' | 'default');
        }
        return;
      }

      // Dynamically import to avoid errors on web
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        pushNotificationsRef.current = PushNotifications;
        
        setIsSupported(true);

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();
        setPermission(permStatus.receive === 'granted' ? 'granted' : 'default');

        // Listen for registration success
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          setFcmToken(token.value);
          setPermission('granted');
          await saveTokenToDatabase(token.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
          setPermission('denied');
        });

        // Listen for push notifications received
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          // Show local notification or update UI
          showNotificationInternal(notification.title || 'KiloFly', {
            body: notification.body,
            data: notification.data,
          });
        });

        // Listen for notification actions
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          // Handle notification tap - navigate to relevant screen
          const data = action.notification.data;
          if (data?.route) {
            window.location.href = data.route as string;
          }
        });
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        // Fallback to web
        const supported = 'Notification' in window;
        setIsSupported(supported);
        if (supported) {
          setPermission(Notification.permission as 'granted' | 'denied' | 'default');
        }
      }
    };

    initNativePush();

    return () => {
      if (pushNotificationsRef.current) {
        pushNotificationsRef.current.removeAllListeners();
      }
    };
  }, [isNative, saveTokenToDatabase]);

  // Internal show notification function
  const showNotificationInternal = useCallback((title: string, options?: NotificationOptions & { data?: Record<string, unknown> }) => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    // Don't show if the page is visible and focused
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      return;
    }

    try {
      if (!isNative && 'Notification' in window) {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: options?.tag || 'kilofly-notification',
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          if (options?.data?.route) {
            window.location.href = options.data.route as string;
          }
        };

        setTimeout(() => notification.close(), 5000);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isSupported, permission, isNative]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      if (isNative && pushNotificationsRef.current) {
        const permResult = await pushNotificationsRef.current.requestPermissions();
        
        if (permResult.receive === 'granted') {
          await pushNotificationsRef.current.register();
          setPermission('granted');
          return true;
        } else {
          setPermission('denied');
          return false;
        }
      } else {
        // Web fallback
        const result = await Notification.requestPermission();
        setPermission(result as 'granted' | 'denied' | 'default');
        return result === 'granted';
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, isNative]);

  // Public show notification method (renamed for compatibility)
  const showNotification = useCallback((title: string, options?: NotificationOptions & { data?: Record<string, unknown> }) => {
    showNotificationInternal(title, options);
  }, [showNotificationInternal]);

  // Alias for backward compatibility
  const showLocalNotification = showNotification;

  // Unregister push notifications (e.g., on logout)
  const unregister = useCallback(async () => {
    if (fcmToken) {
      await removeTokenFromDatabase(fcmToken);
    }
    
    if (isNative && pushNotificationsRef.current) {
      try {
        await pushNotificationsRef.current.unregister();
        setFcmToken(null);
        tokenSavedRef.current = false;
      } catch (error) {
        console.error('Error unregistering push notifications:', error);
      }
    }
  }, [isNative, fcmToken, removeTokenFromDatabase]);

  return {
    isSupported,
    permission,
    fcmToken,
    isNative,
    requestPermission,
    showNotification,
    showLocalNotification,
    unregister,
  };
};