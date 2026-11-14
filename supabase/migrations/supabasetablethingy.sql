CREATE TABLE IF NOT EXISTS public.build_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  skills text[] NOT NULL DEFAULT '{}',
  experience_level text NOT NULL DEFAULT 'beginner',
  available_time text NOT NULL DEFAULT '2-5 hours per week',
  goals text[] NOT NULL DEFAULT '{}',
  preferred_project_types text[] NOT NULL DEFAULT '{}',
  technologies text[] NOT NULL DEFAULT '{}',
  avoid_topics text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  challenge_level text NOT NULL DEFAULT 'balanced',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.build_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.build_profiles TO authenticated;

DROP POLICY IF EXISTS "Users can view their build profile" ON public.build_profiles;
CREATE POLICY "Users can view their build profile"
ON public.build_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their build profile" ON public.build_profiles;
CREATE POLICY "Users can create their build profile"
ON public.build_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their build profile" ON public.build_profiles;
CREATE POLICY "Users can update their build profile"
ON public.build_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their build profile" ON public.build_profiles;
CREATE POLICY "Users can delete their build profile"
ON public.build_profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
