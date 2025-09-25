import { useState } from 'react';
import { User, LogOut, Settings, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';

interface ProfileDropdownProps {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
      username?: string;
    };
  } | null;
  onSignOut: () => void;
}

export const ProfileDropdown = ({ user, onSignOut }: ProfileDropdownProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          <Mail className="mr-2 h-4 w-4" />
          <span>Email: {user?.email}</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => setSettingsOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-600" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      
      <ProfileSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        onSignOut={onSignOut}
      />
    </DropdownMenu>
  );
};