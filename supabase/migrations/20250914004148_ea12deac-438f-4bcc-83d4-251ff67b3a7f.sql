-- Create RPC to allow any group member to set total_expenditure_limit securely
CREATE OR REPLACE FUNCTION public.set_group_total_expenditure_limit(group_uuid uuid, new_limit numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT is_group_member(group_uuid, auth.uid()) THEN
    RAISE EXCEPTION 'not a group member';
  END IF;

  UPDATE public.groups
  SET total_expenditure_limit = new_limit,
      updated_at = now()
  WHERE id = group_uuid;
END;
$$;

-- Create RPC to remove total_expenditure_limit by any group member
CREATE OR REPLACE FUNCTION public.remove_group_total_expenditure_limit(group_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT is_group_member(group_uuid, auth.uid()) THEN
    RAISE EXCEPTION 'not a group member';
  END IF;

  UPDATE public.groups
  SET total_expenditure_limit = NULL,
      updated_at = now()
  WHERE id = group_uuid;
END;
$$;