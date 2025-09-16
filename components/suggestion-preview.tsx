"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Artifact } from "@/lib/types";
import { ArrowRight } from "lucide-react";

export type SuggestionPreviewProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  fromArtifact: Artifact;
  toArtifact: Artifact;
  reason: string;
  onAccept: () => void;
  onDismiss: () => void;
};

export default function SuggestionPreview({
  isOpen,
  onOpenChange,
  fromArtifact,
  toArtifact,
  reason,
  onAccept,
  onDismiss,
}: SuggestionPreviewProps) {
  
  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  }

  const handleDismiss = () => {
    onDismiss();
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Librarian's Wisdom</DialogTitle>
          <DialogDescription>
            A hidden connection has been uncovered.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="border rounded-md p-3 flex-1 min-w-0 bg-muted/50">
                <p className="font-semibold text-sm truncate">{fromArtifact.title}</p>
                <p className="text-xs text-muted-foreground truncate">{fromArtifact.primaryEmotion}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="border rounded-md p-3 flex-1 min-w-0 bg-muted/50">
                <p className="font-semibold text-sm truncate">{toArtifact.title}</p>
                 <p className="text-xs text-muted-foreground truncate">{toArtifact.primaryEmotion}</p>
            </div>
          </div>
          <p className="text-center text-sm text-foreground leading-relaxed p-4 bg-accent/10 rounded-md border border-accent/20">
            {reason}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleDismiss}>
            Dismiss
          </Button>
          <Button onClick={handleAccept}>Accept Connection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
