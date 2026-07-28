-- Allow users to create their own profile row (in case trigger didn't fire)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Insert admin profile (was missing because trigger didn't fire for manually-created auth user)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('ddb7f264-8402-45de-9d59-de4657101482', 'admin@mathmentor.com', 'Admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
