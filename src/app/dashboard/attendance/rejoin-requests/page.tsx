"use client";
function safeFormat(dateVal: any, formatStr: string) {
  if (!dateVal) return '-';
  let d;
  if (dateVal && typeof dateVal === 'object' && '_seconds' in dateVal) {
      d = new Date(dateVal._seconds * 1000);
  } else {
      d = new Date(dateVal);
  }
  return isNaN(d.getTime()) ? 'Invalid Date' : format(d, formatStr);
}


import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "~/components/ui/button";

export default function RejoinRequestsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center">
        <PageHeader title="Rejoin Requests" />
        <Button>Submit Rejoin Request</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Rejoin Requests</CardTitle>
          <CardDescription>Track the status of your rejoin request.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                  No rejoin requests found.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}