"use client";

import React, { useState, useEffect } from "react";
import { useRoles } from "@/hooks/use-roles";
import { fetchEntitiesAction, addEntityAction, deleteEntityAction, updateEntityAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Loader2, Pencil, LayoutTemplate } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function TemplateManager() {
  const { isAdmin } = useRoles();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    const data = await fetchEntitiesAction('templates');
    setTemplates(data);
    setIsLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setNewName("");
    setNewText("");
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (template: any) => {
    setEditingTemplate(template);
    setNewName(template.name);
    setNewText(template.text || "");
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newText.trim()) {
        toast({ title: "Validation Error", description: "Title and text are required.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const additionalData = { text: newText.trim() };
      let result;
      if (editingTemplate) {
        result = await updateEntityAction('templates', editingTemplate.id, newName.trim(), additionalData);
      } else {
        result = await addEntityAction('templates', newName.trim(), additionalData);
      }

      if (result.success) {
        toast({ title: editingTemplate ? "Updated" : "Created", description: result.message });
        setIsAddDialogOpen(false);
        loadTemplates();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) return;
    try {
      const result = await deleteEntityAction('templates', id);
      if (result.success) {
        toast({ title: "Deleted", description: `Template "${name}" has been deleted.` });
        loadTemplates();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.text && t.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="glass-card border-none shadow-2xl">
        <CardHeader className="border-b border-border/10 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-2xl">
                <LayoutTemplate className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tight text-foreground">Instruction Templates</CardTitle>
                <CardDescription className="text-sm font-medium mt-1">Manage quick instruction templates for your staff.</CardDescription>
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex gap-2">
                <Button onClick={handleOpenAdd} className="gap-2 rounded-xl shadow-lg hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4" /> Add Template
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6 relative">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search templates..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 rounded-xl h-12 bg-background/50 border-none shadow-inner focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 backdrop-blur-sm overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b-border/50">
                  <TableHead className="font-bold text-foreground h-12">Template Title</TableHead>
                  <TableHead className="font-bold text-foreground h-12">Instruction Text</TableHead>
                  {isAdmin && <TableHead className="text-right font-bold text-foreground h-12 w-24">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 3 : 2} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" />
                    </TableCell>
                  </TableRow>
                ) : filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 3 : 2} className="h-32 text-center text-muted-foreground">
                      No templates found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-muted/30 transition-colors border-b-border/50 group">
                      <TableCell className="font-medium text-foreground py-4">
                        {template.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {template.text}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(template)} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id, template.name)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="glass-card border-none shadow-2xl rounded-3xl max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary">
              {editingTemplate ? 'Edit Template' : 'Add New Template'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Template Title</label>
                <Input 
                  placeholder="e.g., Late Delivery" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="rounded-xl h-12 bg-background/50 border-primary/20 focus-visible:ring-primary"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Instruction Text</label>
                <Textarea 
                  placeholder="Type the instructions that should be pasted..." 
                  value={newText} 
                  onChange={(e) => setNewText(e.target.value)} 
                  className="rounded-xl min-h-[120px] bg-background/50 border-primary/20 focus-visible:ring-primary resize-none"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
