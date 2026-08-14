"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Send, Archive, FileText, User, Users, FlaskConical, Receipt, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoles } from '@/hooks/use-roles';

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useRoles();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/patients', label: 'Patients', icon: User },
    { href: '/labs', label: 'Labs', icon: FlaskConical },
    { href: '/records', label: 'History', icon: FileText },
    { href: '/bills', label: 'Bills', icon: Receipt },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (isAdmin) {
    navItems.push({ href: '/admin/users', label: 'Team', icon: Users });
  }

  // Don't show on login/signup pages
  if (pathname === '/login' || pathname === '/signup') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      <div className="bg-background/80 backdrop-blur-xl border-t border-border/50 px-6 py-3 flex items-center justify-between shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="relative group">
              <div className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )}>
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive ? "bg-primary/10" : "group-hover:bg-muted"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium tracking-wide uppercase">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
