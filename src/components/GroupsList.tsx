import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Crown, UserPlus } from 'lucide-react';
import { useGroups, Group } from '@/hooks/useGroups';
import { formatDistanceToNow } from 'date-fns';
import { InviteToGroupDialog } from './InviteToGroupDialog';
import { useNavigate } from 'react-router-dom';

export const GroupsList = () => {
  const { groups, loading } = useGroups();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Groups Yet</CardTitle>
          <CardDescription>
            Create your first group or wait for an invitation to get started.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleGroupClick = (groupId: string) => {
    navigate(`/group/${groupId}`);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group: Group) => (
        <Card key={group.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader 
            className="pb-2"
            onClick={() => handleGroupClick(group.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {group.name}
                  {group.user_role === 'admin' && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </CardTitle>
                {group.description && (
                  <CardDescription className="mt-1">
                    {group.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant="secondary" className="ml-2">
                {group.user_role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent onClick={() => handleGroupClick(group.id)}>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(group.created_at))} ago
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleGroupClick(group.id)}
              >
                View Dashboard
              </Button>
              {(group.user_role === 'admin' || group.user_role === 'member') && (
                <InviteToGroupDialog groupId={group.id} groupName={group.name}>
                  <Button size="sm" variant="outline">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </InviteToGroupDialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};