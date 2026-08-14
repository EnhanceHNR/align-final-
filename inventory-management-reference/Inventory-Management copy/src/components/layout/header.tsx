'use client';

import Link from 'next/link';
import {
  Bell,
  Package,
  Search,
  User,
  LogOut,
  Settings,
  LayoutGrid,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection, firestore } from '@/firebase';
import { useMemo } from 'react';
import { Notification } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import { auth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';


export function Header() {
  const { user } = useUser();
  const router = useRouter();
  const notificationsCollection = useMemo(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/notifications`);
  }, [user]);
  const { data: notifications } = useCollection<Notification>(notificationsCollection);
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar-1');
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
       <div className="md:hidden">
         <SidebarTrigger />
       </div>
      <div className="w-full flex-1">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            {notifications && notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="p-4 font-medium border-b">Notifications</div>
          <div className="p-2">
            {notifications && notifications.slice(0, 4).map((notif) => (
              <div key={notif.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary">
                {/* <div className="mt-1">
                  <notif.icon className="w-5 h-5 text-muted-foreground"/>
                </div> */}
                <div>
                  <p className="font-semibold text-sm">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{notif.timestamp}</p>
                </div>
              </div>
            ))}
             {(!notifications || notifications.length === 0) && (
                <p className="text-center text-sm text-muted-foreground p-4">No new notifications.</p>
             )}
          </div>
          <div className="p-2 border-t">
            <Button size="sm" variant="link" className="w-full">View all notifications</Button>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={userAvatar.description} data-ai-hint={userAvatar.imageHint} />}
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
           <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
