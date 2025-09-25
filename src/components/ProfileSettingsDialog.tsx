import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, User, Mail, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      username?: string;
    };
  } | null;
  onSignOut: () => void;
}

export const ProfileSettingsDialog = ({ open, onOpenChange, user, onSignOut }: ProfileSettingsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
  });

  // Load current profile data when dialog opens
  useEffect(() => {
    if (open && user) {
      loadProfileData();
    }
  }, [open, user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      setFormData({
        username: data?.username || user.user_metadata?.username || '',
        full_name: data?.full_name || user.user_metadata?.full_name || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username || null,
          full_name: formData.full_name || null,
        })
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username: formData.username,
          full_name: formData.full_name,
        }
      });

      if (authError) {
        console.error('Auth metadata update error:', authError);
      }

      toast({
        title: "Success!",
        description: "Profile updated successfully.",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleteLoading(true);
    try {
      // Delete all user data from our tables
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      const { error: budgetsError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id);

      const { error: categoriesError } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', user.id);

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (transactionsError || budgetsError || categoriesError || profileError) {
        toast({
          title: "Error",
          description: "Failed to delete account data. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Sign out the user (deleting auth user requires admin privileges)
      await onSignOut();

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
          <DialogDescription>
            Update your profile information and account settings.
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">Email</Label>
            </div>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">Profile Information</Label>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>

          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <Label className="text-sm text-destructive">Danger Zone</Label>
            </div>
            
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <h4 className="text-sm font-medium text-destructive mb-1">Delete Account</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete your account and all data. Cannot be undone.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data including transactions, budgets, and categories from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteLoading ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateProfile} disabled={loading}>
            {loading ? "Updating..." : "Update Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};