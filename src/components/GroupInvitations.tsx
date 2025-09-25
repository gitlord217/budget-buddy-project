import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Mail } from 'lucide-react';
import { useGroups, GroupInvitation } from '@/hooks/useGroups';
import { formatDistanceToNow } from 'date-fns';

export const GroupInvitations = () => {
  const { invitations, loading, joinGroup, declineInvitation } = useGroups();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Group Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading invitations...</div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Group Invitations
          </CardTitle>
          <CardDescription>
            You don't have any pending group invitations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleJoin = async (invitation: GroupInvitation) => {
    await joinGroup(invitation.id, invitation.group_id);
  };

  const handleDecline = async (invitation: GroupInvitation) => {
    await declineInvitation(invitation.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Group Invitations
          <Badge variant="secondary">{invitations.length}</Badge>
        </CardTitle>
        <CardDescription>
          Manage your pending group invitations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
          >
            <div className="flex-1">
              <h3 className="font-medium">{invitation.groups?.name}</h3>
              <p className="text-sm text-muted-foreground">
                Invited by {invitation.profiles?.full_name || invitation.profiles?.username || 'Someone'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(invitation.created_at))} ago
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleJoin(invitation)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Join
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecline(invitation)}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};