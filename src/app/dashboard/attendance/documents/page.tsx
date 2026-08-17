"use client";

import React from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Upload, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "~/components/ui/button";
import { format } from "date-fns";

export default function DocumentsPage() {
  const { data: session } = useSession();
  
  const { data: profile } = api.employee.getProfile.useQuery(
    { userId: session?.user?.id },
    { enabled: !!session?.user?.id }
  );

  const { data: documents, isLoading } = api.hr.getDocuments.useQuery(
    { employeeProfileId: profile?.id },
    { enabled: !!profile?.id }
  );

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center">
        <PageHeader title="Documents" />
        <Button><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Documents</CardTitle>
          <CardDescription>View your uploaded identification and contract documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Uploaded At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {doc.title}
                    </TableCell>
                    <TableCell>{format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    No documents found.
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
