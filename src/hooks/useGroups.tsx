import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  user_role?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    user_id: string;
    username?: string;
    full_name?: string;
  };
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  invited_email: string;
  invited_user_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  groups?: {
    name: string;
  };
  profiles?: {
    username?: string;
    full_name?: string;
  };
}

export const useGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members(role, user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedGroups = data?.map(group => {
        const userMembership = group.group_members?.find(m => m.user_id === user.id);
        return {
          ...group,
          member_count: group.group_members?.length || 0,
          user_role: userMembership?.role || 'member'
        };
      }) || [];

      setGroups(formattedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      // First get invitations by user_id
      const { data: userInvites, error: userError } = await supabase
        .from('group_invitations')
        .select(`
          *,
          groups(name),
          profiles!fk_group_invitations_invited_by(username, full_name)
        `)
        .eq('status', 'pending')
        .eq('invited_user_id', user.id)
        .order('created_at', { ascending: false });

      // Then get invitations by email where invited_user_id is null
      const { data: emailInvites, error: emailError } = await supabase
        .from('group_invitations')
        .select(`
          *,
          groups(name),
          profiles!fk_group_invitations_invited_by(username, full_name)
        `)
        .eq('status', 'pending')
        .eq('invited_email', user.email || '')
        .is('invited_user_id', null)
        .order('created_at', { ascending: false });

      if (userError || emailError) throw userError || emailError;

      // Combine both sets of invitations and sort by created_at
      const allInvitations = [...(userInvites || []), ...(emailInvites || [])];
      allInvitations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setInvitations(allInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchGroups(), fetchInvitations()]).finally(() => {
        setLoading(false);
      });

      // Set up real-time subscriptions for groups and invitations
      const groupsChannel = supabase
        .channel('groups_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'groups'
          },
          () => {
            fetchGroups();
          }
        )
        .subscribe();

      const invitationsChannel = supabase
        .channel('invitations_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'group_invitations'
          },
          () => {
            fetchInvitations();
          }
        )
        .subscribe();

      // Listen for local cross-component events
      const onGroupsChanged = () => fetchGroups();
      window.addEventListener('groups:changed', onGroupsChanged as unknown as EventListener);

      return () => {
        supabase.removeChannel(groupsChannel);
        supabase.removeChannel(invitationsChannel);
        window.removeEventListener('groups:changed', onGroupsChanged as unknown as EventListener);
      };
    }
  }, [user]);

  const createGroup = async (name: string, description?: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // Optimistically update groups list immediately
      setGroups((prev) => {
        const formatted: any = {
          ...groupData,
          group_members: [{ role: 'admin', user_id: user.id }],
          member_count: 1,
          user_role: 'admin'
        };
        return [formatted, ...(prev || [])];
      });

      // Also refetch in background to stay in sync
      window.dispatchEvent(new CustomEvent('groups:changed'));
      fetchGroups();
      toast({
        title: "Success!",
        description: "Group created successfully.",
      });

      return { success: true, group: groupData };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { error: error.message };
    }
  };

  const inviteToGroup = async (groupId: string, email: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      // First check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from('group_invitations')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('invited_email', email)
        .single();

      if (existingInvitation) {
        if (existingInvitation.status === 'pending') {
          toast({
            title: "Invitation already sent",
            description: "This user has already been invited to the group.",
            variant: "destructive"
          });
          return { error: 'Invitation already exists' };
        } else {
          // Update existing invitation to pending if it was declined
          const { error: updateError } = await supabase
            .from('group_invitations')
            .update({ status: 'pending', invited_by: user.id })
            .eq('id', existingInvitation.id);

          if (updateError) throw updateError;

          toast({
            title: "Success!",
            description: "Invitation resent successfully.",
          });
          return { success: true };
        }
      }

      // Create new invitation if none exists
      const { error } = await supabase
        .from('group_invitations')
        .insert({
          group_id: groupId,
          invited_by: user.id,
          invited_email: email
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Invitation sent successfully.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { error: error.message };
    }
  };

  const joinGroup = async (invitationId: string, groupId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingMember) {
        // Try to add user to group members
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: user.id,
            role: 'member'
          });

        // Ignore duplicate key error if another process already added the user
        if (memberError && memberError.code !== '23505') throw memberError;
      }

      // Update invitation status and link invited_user_id
      const { error: inviteError } = await supabase
        .from('group_invitations')
        .update({
          status: 'accepted',
          invited_user_id: user.id
        })
        .eq('id', invitationId);

      if (inviteError) throw inviteError;

      await Promise.all([fetchGroups(), fetchInvitations()]);
      
      toast({
        title: "Success!",
        description: "You've joined the group successfully.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { error: error.message };
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('group_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      await fetchInvitations();
      
      toast({
        title: "Invitation declined",
        description: "You've declined the group invitation.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { error: error.message };
    }
  };

  return {
    groups,
    invitations,
    loading,
    createGroup,
    inviteToGroup,
    joinGroup,
    declineInvitation,
    refetchGroups: fetchGroups,
    refetchInvitations: fetchInvitations
  };
};