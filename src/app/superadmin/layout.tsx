"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Users, Building, CreditCard, ChevronLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated" || !session?.user) {
    redirect("/");
  }

  if (!(session.user as any).isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            SaaS Admin
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/superadmin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <Building className="w-5 h-5" />
            Organizations
          </Link>
          <Link href="/superadmin/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/superadmin/billing" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <CreditCard className="w-5 h-5" />
            Billing & MRR
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            Back to App
          </Link>
          <button onClick={() => signOut()} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors w-full text-left">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
