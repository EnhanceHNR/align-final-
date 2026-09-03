"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ShieldCheck } from "lucide-react";

const ROLE_STYLES: Record<string, string> = {
  MASTER: "bg-blue-50 text-blue-700 border-blue-200",
  ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
  STAFF: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function SuperAdminUsersPage() {
  const { data: users, isLoading } = api.superadmin.getPlatformUsers.useQuery();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email?.toLowerCase().includes(q) || u.organizationName?.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="p-8 space-y-8 h-full bg-slate-50 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users & Hierarchy</h1>
        <p className="text-slate-500 mt-2">Every user across every organization on the platform.</p>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Platform Users</CardTitle>
            <CardDescription>{users ? `${users.length} total` : "Loading..."}</CardDescription>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by email or clinic..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Email</TableHead>
                  <TableHead className="font-semibold text-slate-600">Organization</TableHead>
                  <TableHead className="font-semibold text-slate-600">Role</TableHead>
                  <TableHead className="font-semibold text-slate-600">Modules</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      {u.email}
                      {u.isSuperAdmin && (
                        <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Owner
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{u.organizationName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_STYLES[u.role] || ""}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {u.role === "MASTER" ? "All" : (u.allowedModules?.length ? u.allowedModules.join(", ") : "None assigned")}
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Deactivated</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center p-8 text-slate-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
