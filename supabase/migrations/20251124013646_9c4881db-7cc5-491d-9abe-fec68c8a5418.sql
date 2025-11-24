-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id, 
    full_name, 
    avatar_url, 
    phone, 
    country, 
    city, 
    terms_accepted,
    terms_accepted_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'country', ''),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE((new.raw_user_meta_data->>'terms_accepted')::boolean, false),
    CASE 
      WHEN COALESCE((new.raw_user_meta_data->>'terms_accepted')::boolean, false) 
      THEN now() 
      ELSE NULL 
    END
  );
  
  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();