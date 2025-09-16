"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AISuggestion, Artifact } from "@/lib/types";

type SuggestionDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  suggestions: AISuggestion[];
  onApprove: (approvedSuggestions: AISuggestion[]) => void;
  existingArtifacts: Artifact[];
};

export default function SuggestionDialog({
  isOpen,
  onOpenChange,
  suggestions,
  onApprove,
  existingArtifacts,
}: SuggestionDialogProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<
    AISuggestion[]
  >([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedSuggestions(suggestions);
    }
  }, [isOpen, suggestions]);

  const handleCheckedChange = (checked: boolean, suggestion: AISuggestion) => {
    if (checked) {
      setSelectedSuggestions((prev) => [...prev, suggestion]);
    } else {
      setSelectedSuggestions((prev) =>
        prev.filter(
          (s) => s.linkedArtifactId !== suggestion.linkedArtifactId
        )
      );
    }
  };

  const handleApproveClick = () => {
    onApprove(selectedSuggestions);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI-Powered Connection Suggestions</DialogTitle>
          <DialogDescription>
            I've found some potential connections to your previous artifacts.
            Review and approve the ones you'd like to make.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {suggestions.map((suggestion, index) => {
              const linkedArtifact = existingArtifacts.find(
                (a) => a.id === suggestion.linkedArtifactId
              );
              return (
                <div key={index} className="flex items-start space-x-4">
                  <Checkbox
                    id={`suggestion-${index}`}
                    checked={selectedSuggestions.some(
                      (s) =>
                        s.linkedArtifactId === suggestion.linkedArtifactId
                    )}
                    onCheckedChange={(checked) =>
                      handleCheckedChange(!!checked, suggestion)
                    }
                    className="mt-1"
                  />
                  <Label htmlFor={`suggestion-${index}`} className="flex-1">
                    <p className="font-semibold leading-snug">
                      {suggestion.connectionReason}
                    </p>
                    {linkedArtifact && (
                      <p className="mt-2 text-sm text-muted-foreground border-l-2 pl-3">
                        {linkedArtifact.content}
                      </p>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Dismiss
          </Button>
          <Button onClick={handleApproveClick}>Approve Connections</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
