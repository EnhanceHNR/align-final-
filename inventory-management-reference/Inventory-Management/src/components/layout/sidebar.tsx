
'use client';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Package, Home, ShoppingCart, BarChart2, Settings, LifeBuoy, File, Users, Receipt, CreditCard, History } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dealers', label: 'Dealers', icon: Users },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/history', label: 'Consumption History', icon: History },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/settings/users', label: 'Users', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="h-14 border-b flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
            <div className="flex items-center justify-center p-2 bg-primary rounded-lg">
                <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-headline font-semibold text-lg text-foreground group-data-[collapsible=icon]:hidden">Enhance Inventory</span>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} passHref>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  tooltip={{ children: link.label }}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{ children: 'Help' }}>
                <LifeBuoy />
                <span>Help</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/manual" passHref>
                <SidebarMenuButton tooltip={{ children: 'Documentation' }}>
                  <File />
                  <span>Docs</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
