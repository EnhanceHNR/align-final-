"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LeavesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const { data: profile } = api.employee.getProfile.useQuery(
    { userId: session?.user?.id },
    { enabled: !!session?.user?.id }
  );

  const { data: leaves, isLoading } = api.hr.getLeaves.useQuery(
    { employeeProfileId: profile?.id },
    { enabled: !!profile?.id }
  );

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center">
        <PageHeader title="My Leaves" />
        <Button><Plus className="h-4 w-4 mr-2" /> Apply Leave</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
          <CardDescription>View your past and upcoming leave requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves && leaves.length > 0 ? (
                leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.type}</TableCell>
                    <TableCell>{format(new Date(leave.startDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(new Date(leave.endDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{leave.days}</TableCell>
                    <TableCell>
                      <Badge variant={leave.status === 'Approved' ? 'default' : leave.status === 'Rejected' ? 'destructive' : 'outline'}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No leave requests found.
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
