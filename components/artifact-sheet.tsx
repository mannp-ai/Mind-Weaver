
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Artifact } from "@/lib/types";
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
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const artifactFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  content: z.string().min(1, "Content is required."),
  primaryEmotion: z.string().min(1, "Primary emotion is required."),
  keywords: z.string().optional(),
});

type ArtifactFormValues = z.infer<typeof artifactFormSchema>;

type ArtifactSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  artifact: Artifact | null;
  existingArtifacts: Artifact[];
  onAddArtifact: (
    data: Omit<Artifact, "id" | "createdAt" | "updatedAt" | "color">
  ) => Promise<boolean>;
  onUpdateArtifact: (
    artifactId: string,
    data: Partial<Omit<Artifact, "id">>
  ) => Promise<boolean>;
  onDeleteArtifact: (artifactId: string) => void;
};

export default function ArtifactSheet({
  isOpen,
  onOpenChange,
  artifact,
  existingArtifacts,
  onAddArtifact,
  onUpdateArtifact,
  onDeleteArtifact,
}: ArtifactSheetProps) {
  const isEditing = artifact !== null;

  const form = useForm<ArtifactFormValues>({
    resolver: zodResolver(artifactFormSchema),
    defaultValues: {
      title: "",
      content: "",
      primaryEmotion: "",
      keywords: "",
    },
  });

  useEffect(() => {
    if (isEditing && artifact) {
      form.reset({
        title: artifact.title,
        content: artifact.content,
        primaryEmotion: artifact.primaryEmotion,
        keywords: artifact.keywords.join(", "),
      });
    } else {
      form.reset({ title: "", content: "", primaryEmotion: "", keywords: "" });
    }
  }, [artifact, isEditing, form, isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(data: ArtifactFormValues) {
    setIsSubmitting(true);
    const keywordsArray = data.keywords
      ? data.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : [];

    let success = false;
    if (isEditing && artifact && onUpdateArtifact) {
      success = await onUpdateArtifact(artifact.id, {
        title: data.title,
        content: data.content,
        primaryEmotion: data.primaryEmotion,
        keywords: keywordsArray,
      });
    } else if (!isEditing) {
      success = await onAddArtifact({
        title: data.title,
        content: data.content,
        primaryEmotion: data.primaryEmotion,
        keywords: keywordsArray,
        linkedTo: [],
      });
    }

    setIsSubmitting(false);
    if (success) {
      form.reset();
      onOpenChange(false);
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  const linkedArtifactsDetails = artifact?.linkedTo
    .map((id) => existingArtifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => a !== undefined);

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Artifact" : "Create Artifact"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? `A memory from ${format(
                  new Date(artifact.createdAt as string),
                  "PPP"
                )}.`
              : "Capture a new memory to weave into your Mind Atlas."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <ScrollArea className="-mx-6 px-6 flex-1 my-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="A title for your artifact"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write prose, a poem, or a simple thought..."
                          rows={8}
                          className="break-words"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="primaryEmotion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Emotion</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Joy, Sadness, Anxiety"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keywords (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Comma-separated, e.g., work, family"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEditing &&
                  linkedArtifactsDetails &&
                  linkedArtifactsDetails.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        Connections
                      </h3>
                      <div className="space-y-2">
                        {linkedArtifactsDetails.map((link) => (
                          <div
                            key={link.id}
                            className="p-3 border rounded-md bg-muted/50"
                          >
                            <p className="font-medium text-sm truncate">
                              {link.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                              {link.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </ScrollArea>

            <SheetFooter className="pt-4 mt-auto grid grid-cols-2 gap-2">
              {isEditing && artifact && (
                <div className="flex gap-2 col-span-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" type="button" className="w-full">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete this artifact and remove it from the Atlas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteArtifact(artifact.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
               

              {!isEditing && (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="col-span-2"
                >
                  {isSubmitting ? "Saving..." : "Weave into Atlas"}
                </Button>
              )}
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
