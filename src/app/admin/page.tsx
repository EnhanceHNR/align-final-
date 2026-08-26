export const dynamic = "force-dynamic";

import React from "react";
import { adminDb } from "@/lib/firebaseAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Activity } from "lucide-react";

// Server Component for Super Admin
export default async function SuperAdminDashboard() {
  
  // Note: Add NextAuth session check here to verify SUPERADMIN role
  const orgsSnap = await adminDb.collection("organizations").orderBy("createdAt", "desc").get();
  
  const orgs = await Promise.all(orgsSnap.docs.map(async (doc) => {
      const data = doc.data();
      const usersSnap = await adminDb.collection("users").where("organizationId", "==", doc.id).get();
      return {
          id: doc.id,
          name: data.name,
          slug: data.slug,
          isActive: data.isActive,
          _count: { users: usersSnap.size }
      };
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">SuperAdmin Dashboard</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Organizations</CardTitle>
            <Building2 className="text-blue-600" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900">{orgs.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-none shadow-lg">
        <CardHeader>
          <CardTitle className="font-bold text-slate-900">Registered Clinics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {orgs.map(org => (
              <div key={org.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{org.name}</p>
                  <p className="text-sm text-slate-500">Slug: {org.slug}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">{org._count.users} Users</p>
                  <p className="text-sm text-emerald-500 font-bold">{org.isActive ? 'Active' : 'Suspended'}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
