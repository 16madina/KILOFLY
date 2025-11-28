-- Create function to notify users of new conversation messages
CREATE OR REPLACE FUNCTION public.notify_conversation_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine recipient (the other party in the conversation)
  SELECT CASE
    WHEN buyer_id = NEW.sender_id THEN seller_id
    ELSE buyer_id
  END INTO recipient_id
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  -- Send notification to recipient
  PERFORM send_notification(
    recipient_id,
    'Nouveau message 💬',
    sender_name || ' vous a envoyé un message',
    'info'
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for conversation messages
DROP TRIGGER IF EXISTS on_conversation_message_created ON public.messages;

CREATE TRIGGER on_conversation_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_conversation_message();