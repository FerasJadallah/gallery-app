-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for inserting profiles (users can only create their own profile)
CREATE POLICY "Users can create their own profile"
ON profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy for viewing profiles (everyone can view public profiles)
CREATE POLICY "Anyone can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Policy for updating profiles (users can only update their own profile)
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for deleting profiles (users can only delete their own profile)
CREATE POLICY "Users can delete their own profile"
ON profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Ensure the auth.users() function is available
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatically creating profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();