-- Create unique index on profiles.user_id to support FKs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add foreign keys for relationships
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

-- Update invitation SELECT policy to avoid referencing auth.users
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON public.group_invitations;
CREATE POLICY "Users can view invitations sent to/by them" 
ON public.group_invitations 
FOR SELECT 
USING (
  invited_user_id = auth.uid() OR 
  invited_email = (auth.jwt() ->> 'email') OR 
  invited_by = auth.uid()
);
