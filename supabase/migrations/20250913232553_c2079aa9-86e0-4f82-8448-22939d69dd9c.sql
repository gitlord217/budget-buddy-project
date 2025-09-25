-- Drop and recreate foreign keys to ensure they exist properly
DO $$ BEGIN
  -- Drop existing constraints if they exist
  ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS fk_group_members_group;
  ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS fk_group_members_profile;
  ALTER TABLE public.group_invitations DROP CONSTRAINT IF EXISTS fk_group_invitations_group;
  ALTER TABLE public.group_invitations DROP CONSTRAINT IF EXISTS fk_group_invitations_invited_by;
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_transactions_profiles;
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_transactions_group;
  
  -- Create unique index on profiles.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add foreign keys for proper relationships
ALTER TABLE public.group_members
  ADD CONSTRAINT fk_group_members_group
  FOREIGN KEY (group_id) REFERENCES public.groups (id) ON DELETE CASCADE;

ALTER TABLE public.group_members
  ADD CONSTRAINT fk_group_members_profile
  FOREIGN KEY (user_id) REFERENCES public.profiles (user_id) ON DELETE CASCADE;

ALTER TABLE public.group_invitations
  ADD CONSTRAINT fk_group_invitations_group
  FOREIGN KEY (group_id) REFERENCES public.groups (id) ON DELETE CASCADE;

ALTER TABLE public.group_invitations
  ADD CONSTRAINT fk_group_invitations_invited_by
  FOREIGN KEY (invited_by) REFERENCES public.profiles (user_id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles (user_id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_group
  FOREIGN KEY (group_id) REFERENCES public.groups (id) ON DELETE SET NULL;

-- Update invitation SELECT policy to avoid referencing auth.users table
DROP POLICY IF EXISTS "Users can view invitations sent to/by them" ON public.group_invitations;
CREATE POLICY "Users can view invitations sent to/by them" 
ON public.group_invitations 
FOR SELECT 
USING (
  invited_user_id = auth.uid() OR 
  invited_email = (auth.jwt() ->> 'email') OR 
  invited_by = auth.uid()
);