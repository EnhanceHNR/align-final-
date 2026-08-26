"use client";

import { trpc } from "@/app/_trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Ban, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SuperAdminPage() {
  const { toast } = useToast();
  const { data: orgs, isLoading, refetch } = trpc.superadmin.getOrganizations.useQuery();

  const grantMutation = trpc.superadmin.grantLifetime.useMutation({
    onSuccess: () => {
      toast({ title: "Lifetime access granted" });
      refetch();
    }
  });

  const suspendMutation = trpc.superadmin.suspendOrganization.useMutation({
    onSuccess: () => {
      toast({ title: "Organization suspended" });
      refetch();
    }
  });

  return (
    <div className="p-8 space-y-8 h-full bg-slate-50 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organizations</h1>
        <p className="text-slate-500 mt-2">Manage SaaS tenants, their plans, and their access.</p>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-100">
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>View and manage all clinics across the platform</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">ID / Name</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600">Plan</TableHead>
                  <TableHead className="font-semibold text-slate-600">Users</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs?.map((org: any) => (
                  <TableRow key={org.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell>
                      <div className="font-medium text-slate-900">{org.name || "Unnamed Clinic"}</div>
                      <div className="text-[13px] text-slate-500">{org.id}</div>
                    </TableCell>
                    <TableCell>
                      {org.subscriptionStatus === "lifetime" ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Lifetime
                        </Badge>
                      ) : org.subscriptionStatus === "canceled" ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <Ban className="w-3 h-3 mr-1" /> Canceled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {org.subscriptionStatus || "Active"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {org.planId || "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">{org.userCount}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => grantMutation.mutate({ organizationId: org.id })}
                        disabled={grantMutation.isPending || org.subscriptionStatus === "lifetime"}
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" /> Grant Lifetime
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => suspendMutation.mutate({ organizationId: org.id })}
                        disabled={suspendMutation.isPending || org.subscriptionStatus === "canceled"}
                      >
                        <Ban className="w-4 h-4 mr-2" /> Suspend
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!orgs || orgs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center p-8 text-slate-500">
                      No organizations found.
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
