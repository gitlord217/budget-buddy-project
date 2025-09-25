import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateGroupDialog } from '@/components/CreateGroupDialog';
import { GroupInvitations } from '@/components/GroupInvitations';
import { GroupsList } from '@/components/GroupsList';

const Groups = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Groups</h1>
              <p className="text-gray-300">Manage your group collaborations</p>
            </div>
          </div>
          <CreateGroupDialog />
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Invitations */}
          <GroupInvitations />

          {/* Groups List */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Your Groups</h2>
            <GroupsList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Groups;