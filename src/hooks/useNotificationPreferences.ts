import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NotificationPreferences {
  messages_enabled: boolean;
  responses_enabled: boolean;
  alerts_enabled: boolean;
  promotions_enabled: boolean;
  push_enabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
  messages_enabled: true,
  responses_enabled: true,
  alerts_enabled: true,
  promotions_enabled: false,
  push_enabled: true,
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          messages_enabled: data.messages_enabled,
          responses_enabled: data.responses_enabled,
          alerts_enabled: data.alerts_enabled,
          promotions_enabled: data.promotions_enabled,
          push_enabled: data.push_enabled,
        });
      } else {
        // Create default preferences if none exist
        await createDefaultPreferences();
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    } catch (error) {
      console.error('Error creating default preferences:', error);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
      
      toast.success('Préférence enregistrée');
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setPreferences(preferences);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return {
    preferences,
    loading,
    updatePreference,
    refetch: fetchPreferences,
  };
};
