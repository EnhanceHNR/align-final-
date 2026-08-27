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
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "~/components/ui/button";
import { format } from "date-fns";

export default function HolidaysPage() {
  const { data: holidays, isLoading } = api.hr.getHolidays.useQuery();

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center">
        <PageHeader title="Holidays" />
        <Button><Plus className="h-4 w-4 mr-2" /> Add Holiday</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Holidays</CardTitle>
          <CardDescription>Manage public and company-specific holidays.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays && holidays.length > 0 ? (
                holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>{safeFormat(new Date(holiday.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{holiday.type}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    No holidays configured for this year.
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