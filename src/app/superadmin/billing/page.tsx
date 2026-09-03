"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, DollarSign, Building2, Infinity as InfinityIcon, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminBillingPage() {
  const { toast } = useToast();
  const { data: metrics, isLoading: metricsLoading } = api.superadmin.getMrrMetrics.useQuery();
  const { data: orgs, isLoading: orgsLoading, refetch } = api.superadmin.getOrganizations.useQuery();
  const [editing, setEditing] = useState<Record<string, string>>({});

  const setPricing = api.superadmin.setOrgPricing.useMutation({
    onSuccess: () => {
      toast({ title: "Price updated" });
      refetch();
    },
  });

  return (
    <div className="p-8 space-y-8 h-full bg-slate-50 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing & MRR</h1>
        <p className="text-slate-500 mt-2">
          Revenue overview across every tenant. No payment processor is connected yet, so MRR is calculated
          from the monthly price you set per organization below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="text-emerald-600" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900">
              {metricsLoading ? <Loader2 className="animate-spin" size={24} /> : `$${(metrics?.mrr ?? 0).toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Paying Organizations</CardTitle>
            <Building2 className="text-blue-600" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900">{metrics?.activeOrganizations ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Lifetime Grants</CardTitle>
            <InfinityIcon className="text-purple-600" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900">{metrics?.lifetimeOrganizations ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Canceled</CardTitle>
            <Ban className="text-rose-500" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900">{metrics?.canceledOrganizations ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-100">
          <CardTitle>Per-Organization Pricing</CardTitle>
          <CardDescription>Set each tenant's monthly price -- this is what feeds the MRR total above.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {orgsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Organization</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600">Monthly Price</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs?.map((org: any) => {
                  const current = editing[org.id] ?? String(org.monthlyPrice ?? 0);
                  return (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium text-slate-900">{org.name || "Unnamed Clinic"}</TableCell>
                      <TableCell>
                        {org.subscriptionStatus === "lifetime" ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Lifetime</Badge>
                        ) : org.subscriptionStatus === "canceled" ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Canceled</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">$</span>
                          <Input
                            type="number"
                            min={0}
                            className="w-28 h-9"
                            value={current}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [org.id]: e.target.value }))}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setPricing.isPending}
                          onClick={() =>
                            setPricing.mutate({ organizationId: org.id, monthlyPrice: Number(current) || 0 })
                          }
                        >
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!orgs || orgs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center p-8 text-slate-500">
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
