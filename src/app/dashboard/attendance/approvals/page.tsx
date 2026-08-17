"use client";

import React from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "~/components/ui/button";
import { format } from "date-fns";

export default function ApprovalsPage() {
  const { data: requests, isLoading } = api.hr.getPendingRequests.useQuery();

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden">
      <PageHeader title="Approvals" />

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>Review and approve employee requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date / Details</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests && (requests.late.length > 0 || requests.early.length > 0 || requests.leaves.length > 0) ? (
                <>
                  {requests.leaves.map((req) => (
                    <TableRow key={`leave-${req.id}`}>
                      <TableCell className="font-medium">{req.employeeProfile.name}</TableCell>
                      <TableCell><Badge>Leave Request</Badge></TableCell>
                      <TableCell>{format(new Date(req.startDate), 'MMM dd')} - {format(new Date(req.endDate), 'MMM dd')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm">Approve</Button>
                          <Button size="sm" variant="outline" className="text-destructive">Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests.late.map((req) => (
                    <TableRow key={`late-${req.id}`}>
                      <TableCell className="font-medium">{req.employeeProfile.name}</TableCell>
                      <TableCell><Badge variant="secondary">Late Arrival</Badge></TableCell>
                      <TableCell>{format(new Date(req.date), 'MMM dd, yyyy')} - {req.reason}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm">Approve</Button>
                          <Button size="sm" variant="outline" className="text-destructive">Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No pending requests to approve.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
