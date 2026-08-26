"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SuperAdminUsersPage() {
  return (
    <div className="p-8 space-y-8 h-full bg-slate-50 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users & Hierarchy</h1>
        <p className="text-slate-500 mt-2">View all users across the platform.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Platform Users</CardTitle>
          <CardDescription>Coming soon...</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This page will show a searchable list of all users and their respective organizations.</p>
        </CardContent>
      </Card>
    </div>
  );
}
