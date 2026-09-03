"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AutoLogoutProvider from "@/app/_components/AutoLogoutProvider";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppProvider } from "@/context/app-context";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/");
        }
    }, [status, router]);


    if (status === "loading") {
        return <div className="p-10 text-center">Loading...</div>;
    }


    if (status === "unauthenticated") {
        return null;
    }

    const role = (session?.user as any)?.role as "MASTER" | "ADMIN" | "STAFF" | undefined;
    const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
    const allowedModules = ((session?.user as any)?.allowedModules as string[] | undefined) || [];

    return (
        <AppProvider>
            <AutoLogoutProvider>
                <SidebarProvider>
                    <DashboardSidebar role={role} isSuperAdmin={isSuperAdmin} allowedModules={allowedModules} />
                    <SidebarInset className="bg-[#F8FAFC]">
                        <main className="flex-1 overflow-y-auto flex flex-col min-h-screen">
                            <header className="md:hidden sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
                                <SidebarTrigger />
                                <span className="font-bold text-lg text-slate-800 tracking-tight">Align.io</span>
                            </header>

                            <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 lg:p-10">
                                {children}
                            </div>
                        </main>
                    </SidebarInset>
                </SidebarProvider>
            </AutoLogoutProvider>
        </AppProvider>
    );
}
