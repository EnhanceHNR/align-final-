"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, DatabaseBackup, ShieldCheck, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatDate(iso?: string) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

export default function SuperAdminBackupsPage() {
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: config } = api.superadmin.getBackupConfig.useQuery();
  const { data: backups, isLoading: backupsLoading } = api.superadmin.listBackups.useQuery();

  const runBackup = api.superadmin.runBackupNow.useMutation({
    onSuccess: (summary) => {
      toast({ title: "Backup complete", description: `${summary.totalDocs} documents saved.` });
      utils.superadmin.listBackups.invalidate();
      utils.superadmin.getBackupConfig.invalidate();
    },
    onError: (err) => toast({ title: "Backup failed", description: err.message, variant: "destructive" }),
  });

  const updateConfig = api.superadmin.updateBackupConfig.useMutation({
    onSuccess: () => {
      toast({ title: "Schedule updated" });
      utils.superadmin.getBackupConfig.invalidate();
    },
  });

  const restore = api.superadmin.restoreBackup.useMutation({
    onSuccess: (result) => {
      toast({ title: "Restore complete", description: `${result.restoredDocs} documents restored.` });
    },
    onError: (err) => toast({ title: "Restore failed", description: err.message, variant: "destructive" }),
  });

  const [restoringId, setRestoringId] = useState<string | null>(null);

  return (
    <div className="p-8 space-y-8 h-full bg-slate-50 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Backups</h1>
        <p className="text-slate-500 mt-2">Export every organization's data to storage, on demand or on a schedule.</p>
      </div>

      <Card className="rounded-2xl border-none shadow-lg bg-emerald-50/60">
        <CardContent className="p-6 flex items-start gap-4">
          <ShieldCheck className="text-emerald-600 shrink-0 mt-1" size={22} />
          <div className="text-sm text-emerald-900">
            <p className="font-bold">User data is never deleted by a backup or a restore.</p>
            <p className="mt-1 text-emerald-800/80">
              Every backup writes a brand-new, timestamped copy -- it never overwrites or removes an older one.
              Restoring only adds or refreshes records (a Firestore "merge" write); it cannot delete a user,
              an organization, or any of their data, even if that data isn't present in the backup.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle>Run a backup now</CardTitle>
            <CardDescription>Exports every organization's data immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              className="w-full"
              disabled={runBackup.isPending}
              onClick={() => runBackup.mutate()}
            >
              {runBackup.isPending ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <DatabaseBackup className="mr-2" size={18} />
              )}
              {runBackup.isPending ? "Backing up..." : "Run backup now"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle>Automatic schedule</CardTitle>
            <CardDescription>Last automatic run: {formatDate(config?.lastRunAt)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Enable scheduled backups</span>
              <Switch
                checked={!!config?.enabled}
                onCheckedChange={(checked) =>
                  updateConfig.mutate({ frequency: config?.frequency ?? "daily", enabled: checked })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              {(["daily", "weekly", "monthly"] as const).map((freq) => (
                <Button
                  key={freq}
                  size="sm"
                  variant={config?.frequency === freq ? "default" : "outline"}
                  onClick={() => updateConfig.mutate({ frequency: freq, enabled: config?.enabled ?? false })}
                  className="capitalize"
                >
                  {freq}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-100">
          <CardTitle>Backup history</CardTitle>
          <CardDescription>Most recent 50 runs.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {backupsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Started</TableHead>
                  <TableHead className="font-semibold text-slate-600">Triggered by</TableHead>
                  <TableHead className="font-semibold text-slate-600">Documents</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups?.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-slate-900">{formatDate(b.startedAt)}</TableCell>
                    <TableCell className="text-slate-600">{b.triggeredBy}</TableCell>
                    <TableCell className="text-slate-600">{b.totalDocs}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {b.status}
                      </Badge>
                      {b.lastRestoredAt && (
                        <div className="text-xs text-slate-400 mt-1">Last restored {formatDate(b.lastRestoredAt)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setRestoringId(b.id)}>
                            <RotateCcw className="w-4 h-4 mr-2" /> Restore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This adds/refreshes every record from the {formatDate(b.startedAt)} backup back into the
                              live database. It will not delete anything created or changed since then.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => restoringId && restore.mutate({ backupId: restoringId })}
                            >
                              Restore
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {(!backups || backups.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center p-8 text-slate-500">
                      No backups yet -- run one above.
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
