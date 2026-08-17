"use client";

import React from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "~/components/ui/button";

export default function PayrollPage() {
  const { data: session } = useSession();
  
  const { data: profile } = api.employee.getProfile.useQuery(
    { userId: session?.user?.id },
    { enabled: !!session?.user?.id }
  );

  const { data: payrolls, isLoading } = api.hr.getPayrolls.useQuery(
    { employeeProfileId: profile?.id },
    { enabled: !!profile?.id }
  );

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden">
      <PageHeader title="Payroll" />

      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>View and download your monthly salary slips.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls && payrolls.length > 0 ? (
                payrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">{payroll.month}</TableCell>
                    <TableCell>{payroll.year}</TableCell>
                    <TableCell>${payroll.baseSalary.toFixed(2)}</TableCell>
                    <TableCell>${payroll.netSalary.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={payroll.status === 'Paid' ? 'default' : 'outline'}>
                        {payroll.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No payroll records found.
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
