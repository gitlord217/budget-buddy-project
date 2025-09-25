import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    username?: string;
    full_name?: string;
  };
}

interface GroupMembersDialogProps {
  groupId: string;
  groupName: string;
  members: GroupMember[];
  children?: React.ReactNode;
}

export const GroupMembersDialog = ({ groupId, groupName, members, children }: GroupMembersDialogProps) => {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      default:
        return <UserCheck className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Members ({members.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Members of {groupName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                {getRoleIcon(member.role)}
                <div>
                  <div className="font-medium">
                    {member.profiles?.full_name || member.profiles?.username || 'Unknown User'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Joined {formatDistanceToNow(new Date(member.joined_at))} ago
                  </div>
                </div>
              </div>
              <Badge variant={getRoleVariant(member.role)}>
                {member.role}
              </Badge>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              No members found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};