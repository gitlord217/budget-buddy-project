-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_invitations table
CREATE TABLE public.group_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  invited_email TEXT NOT NULL,
  invited_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, invited_email)
);

-- Add group_id to transactions table for group transactions
ALTER TABLE public.transactions 
ADD COLUMN group_id UUID;

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (
  id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators and admins can update groups" 
ON public.groups 
FOR UPDATE 
USING (
  created_by = auth.uid() OR 
  id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Group members policies
CREATE POLICY "Users can view group members of their groups" 
ON public.group_members 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group creators and admins can manage members" 
ON public.group_members 
FOR ALL 
USING (
  group_id IN (
    SELECT g.id FROM public.groups g
    WHERE g.created_by = auth.uid()
  ) OR
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Group invitations policies
CREATE POLICY "Users can view invitations sent to them" 
ON public.group_invitations 
FOR SELECT 
USING (
  invited_user_id = auth.uid() OR 
  invited_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) OR
  invited_by = auth.uid()
);

CREATE POLICY "Users can create invitations for their groups" 
ON public.group_invitations 
FOR INSERT 
WITH CHECK (
  group_id IN (
    SELECT g.id FROM public.groups g
    WHERE g.created_by = auth.uid()
  ) OR
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'member')
  )
);

CREATE POLICY "Users can update invitations sent to them or by them" 
ON public.group_invitations 
FOR UPDATE 
USING (
  invited_user_id = auth.uid() OR 
  invited_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) OR
  invited_by = auth.uid()
);

-- Update transactions policies to include group transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions and group transactions" 
ON public.transactions 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions and group transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND (
    group_id IS NULL OR 
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions and group transactions they created" 
ON public.transactions 
FOR UPDATE 
USING (
  auth.uid() = user_id AND (
    group_id IS NULL OR 
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions and group transactions they created" 
ON public.transactions 
FOR DELETE 
USING (
  auth.uid() = user_id AND (
    group_id IS NULL OR 
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- Add triggers for timestamps
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_invitations_updated_at
BEFORE UPDATE ON public.group_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();