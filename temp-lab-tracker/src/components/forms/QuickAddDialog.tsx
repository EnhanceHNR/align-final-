"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import { addEntityAction } from '@/app/actions';

interface QuickAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collection: 'patients' | 'labs';
  onSuccess: (name: string) => void;
}

export function QuickAddDialog({ isOpen, onClose, collection, onSuccess }: QuickAddDialogProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const trimmedName = name.trim();
      const result = await addEntityAction(collection, trimmedName);

      if (result.success) {
        toast({
          title: "Added Successfully",
          description: `${trimmedName} has been added.`,
        });
        onSuccess(trimmedName);
        setName('');
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('QuickAdd error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = collection === 'patients' ? 'Patient' : 'Lab/Person';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md glass-card border-none rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add New {title}
          </DialogTitle>
          <DialogDescription>
            Enter the name to add it to your records.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="entity-name">Full Name</Label>
            <Input
              id="entity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${collection === 'patients' ? 'patient' : 'lab/person'} name`}
              className="rounded-xl bg-background/50 h-12"
              required
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl px-8">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add {title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
