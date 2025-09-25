-- Enable realtime for groups and group_invitations
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.group_invitations REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_invitations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_invitations;
  END IF;
END $$;