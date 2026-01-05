-- Trigger function to call push notification edge function when notification is created
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Use pg_net to call the edge function asynchronously
  -- This requires the pg_net extension which is enabled by default in Supabase
  PERFORM net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'body', NEW.message,
      'data', jsonb_build_object(
        'type', NEW.type,
        'notification_id', NEW.id::text
      )
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS on_notification_created_send_push ON public.notifications;
CREATE TRIGGER on_notification_created_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_notification();