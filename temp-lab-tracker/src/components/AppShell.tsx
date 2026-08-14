"use client";

import React, { useEffect } from 'react';
import { 
  Sidebar, 
  SidebarProvider, 
  SidebarInset, 
  SidebarHeader, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarFooter, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { FlaskConical, Home, Send, Archive, FileText, LogOut, User as UserIcon, Bell, Users, Receipt, BarChart3, Calendar, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { BottomNav } from './BottomNav';
import { useRoles } from '@/hooks/use-roles';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { role, isAdmin, isLoading: isRoleLoading } = useRoles();
  const auth = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isPublicPage = isAuthPage || pathname?.startsWith('/shared');

  useEffect(() => {
    if (!isUserLoading && !user && !isPublicPage) {
      router.push('/login');
    }
  }, [user, isUserLoading, isPublicPage, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const menuItems = [
    { href: '/', label: 'Overview', icon: Home },
    { href: '/send', label: 'Send Item', icon: Send },
    { href: '/receive', label: 'Receive Item', icon: Archive },
    { href: '/appointments', label: 'Pending Appointments', icon: Calendar },
    { href: '/patients', label: 'Patients', icon: UserIcon },
    { href: '/labs', label: 'Labs & Partners', icon: FlaskConical },
    { href: '/records', label: 'History', icon: FileText },
    { href: '/bills', label: 'Bills and Challans', icon: Receipt },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (isPublicPage) return <>{children}</>;

  if (isUserLoading || isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <FlaskConical className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-sm font-medium text-muted-foreground">Initializing LabTrack...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar>
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-xl">
                    <FlaskConical className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold tracking-tight">LabTrack</h2>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Medical Management</p>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="px-2">
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href} passHref>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        className="h-11 px-4 rounded-xl transition-all duration-200"
                        variant={pathname === item.href ? "outline" : "default"}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
                {isAdmin && (
                  <>
                    <SidebarMenuItem>
                      <Link href="/admin/templates" passHref>
                        <SidebarMenuButton
                          isActive={pathname === '/admin/templates'}
                          className="h-11 px-4 rounded-xl transition-all duration-200 text-primary hover:text-primary"
                          variant={pathname === '/admin/templates' ? "outline" : "default"}
                        >
                          <LayoutTemplate className="w-5 h-5" />
                          <span className="font-bold">Instruction Templates</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <Link href="/admin/users" passHref>
                      <SidebarMenuButton
                        isActive={pathname === '/admin/users'}
                        className="h-11 px-4 rounded-xl transition-all duration-200 text-primary hover:text-primary"
                        variant={pathname === '/admin/users' ? "outline" : "default"}
                      >
                        <Users className="w-5 h-5" />
                        <span className="font-bold">User Management</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4">
                <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                        <AvatarImage src={user?.photoURL || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {user?.email?.[0]?.toUpperCase() || user?.fullName?.[0]?.toUpperCase() || 'G'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] font-semibold text-primary uppercase">{role || 'Staff'}</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full mt-4 text-muted-foreground hover:text-destructive gap-2 rounded-xl">
                    <LogOut className="w-4 h-4" />
                    Logout
                </Button>
            </SidebarFooter>
          </Sidebar>
        </div>

        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Main Header */}
          <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 transition-all duration-300">
            <div className="flex h-16 items-center justify-between px-4 md:px-8">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 md:hidden">
                    <FlaskConical className="w-7 h-7 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">LabTrack</h1>
                </div>
                <div className="hidden md:flex flex-col">
                    <h1 className="text-lg font-bold">Welcome back,</h1>
                    <p className="text-xs text-muted-foreground font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground relative rounded-full">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
                </Button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border border-border/50">
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary">{user?.email?.[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 glass-card border-none shadow-xl mt-2">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-bold leading-none">{user?.email?.split('@')[0]}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border/10" />
                        <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-primary/10 focus:text-primary rounded-lg transition-colors">
                            <UserIcon className="w-4 h-4" />
                            Profile Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive text-destructive rounded-lg transition-colors">
                            <LogOut className="w-4 h-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main 
              className="flex-1 overflow-x-hidden pb-20 md:pb-8" 
              data-aria-hidden="false" 
              aria-hidden="false"
          >
            <div className="container max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
                {children}
            </div>
          </main>
          
          <BottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
