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

export default function ResignationsPage() {
  const { data: session } = useSession();
  
  const { data: profile } = api.employee.getProfile.useQuery(
    { userId: session?.user?.id },
    { enabled: !!session?.user?.id }
  );

  const { data: resignations, isLoading } = api.hr.getResignations.useQuery(
    { employeeProfileId: profile?.id },
    { enabled: !!profile?.id }
  );

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center">
        <PageHeader title="Resignations" />
        <Button variant="destructive">Submit Resignation</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resignation Requests</CardTitle>
          <CardDescription>Track the status of your resignation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Last Working Day</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resignations && resignations.length > 0 ? (
                resignations.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">{format(new Date(res.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(new Date(res.lastWorkingDay), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{res.reason}</TableCell>
                    <TableCell>
                      <Badge variant={res.status === 'Approved' ? 'default' : res.status === 'Rejected' ? 'destructive' : 'outline'}>
                        {res.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No resignation requests found.
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
