
"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type {
  Artifact,
  AISuggestion,
  HiddenConnection,
  Habit,
} from "@/lib/types";
import AppHeader from "@/components/app-header";
import ArtifactSheet from "@/components/artifact-sheet";
import { getNodeColor } from "@/ai/flows/node-coloring-based-on-emotion";
import { generateConnections } from "@/ai/flows/generate-connections";
import { findHiddenConnection } from "@/ai/flows/find-hidden-connections";
import { weaveDream, WeaveDreamOutput } from "@/ai/flows/dream-weaving";
import {
  findRecurringPattern,
  FindRecurringPatternOutput,
} from "@/ai/flows/find-recurring-pattern";
import { useToast } from "@/hooks/use-toast";
import SuggestionDialog from "@/components/suggestion-dialog";
import { Button } from "@/components/ui/button";
import { Filter, Search, Zap, Sparkles, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  doc,
  updateDoc,
  arrayUnion,
  writeBatch,
  getDocs,
  where,
  arrayRemove,
  orderBy,
  limit,
} from "firebase/firestore";
import SuggestionPreview, {
  type SuggestionPreviewProps,
} from "@/components/suggestion-preview";
import { getHubArtifacts, getIsolatedArtifacts } from "@/lib/graph-utils";

const MindAtlas = dynamic(() => import("@/components/mind-atlas"), {
  ssr: false,
  loading: () => <div className="flex-1 relative bg-grid" />,
});

const ARTIFACT_LIMIT = 50; // Load the 50 most recent artifacts
const PLACEHOLDER_COLOR = "#808080"; // A neutral grey

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [
    newArtifactForSuggestions,
    setNewArtifactForSuggestions,
  ] = useState<Artifact | null>(null);

  // Hidden connections state
  const [hiddenConnection, setHiddenConnection] = useState<HiddenConnection | null>(
    null
  );
  const [isPreviewingConnection, setIsPreviewingConnection] = useState(false);
  const hasFetchedHiddenConnection = useRef(false);

  // Dream Weaving state
  const [isWeavingDream, setIsWeavingDream] = useState(false);
  const [dreamResult, setDreamResult] = useState<WeaveDreamOutput | null>(null);
  const [isDreamDialogOpen, setIsDreamDialogOpen] = useState(false);

  // AI Pattern Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FindRecurringPatternOutput | null>(
    null
  );
  const [isInsightDialogOpen, setIsInsightDialogOpen] = useState(false);

  // Filters and forces state
  const [searchTerm, setSearchTerm] = useState("");
  const [showOrphans, setShowOrphans] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const fetchArtifacts = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      const artifactsCollectionRef = collection(
        db,
        "users",
        user.uid,
        "artifacts"
      );
      const q = query(
        artifactsCollectionRef,
        orderBy("createdAt", "desc"),
        limit(ARTIFACT_LIMIT)
      );
      const querySnapshot = await getDocs(q);
      const artifactsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString(),
        } as Artifact;
      });
      setArtifacts(artifactsData);
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch your artifacts. Please try again later.",
      });
    } finally {
      setIsDataLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchArtifacts();
    }
  }, [user, fetchArtifacts]);

  // Effect to find hidden connections
  /*
  useEffect(() => {
    if (
      artifacts.length > 5 &&
      !hasFetchedHiddenConnection.current &&
      !isPreviewingConnection
    ) {
      const hubs = getHubArtifacts(artifacts, 5);
      const isolated = getIsolatedArtifacts(artifacts);

      if (isolated.length > 0 && hubs.length > 0) {
        hasFetchedHiddenConnection.current = true; // Mark as fetched to avoid re-running
        const randomIsolated =
          isolated[Math.floor(Math.random() * isolated.length)];

        findHiddenConnection({
          isolatedArtifact: {
            id: randomIsolated.id,
            content: `${randomIsolated.title}: ${randomIsolated.content}`,
          },
          hubArtifacts: hubs.map((h) => ({
            id: h.id,
            content: `${h.title}: ${h.content}`,
          })),
        })
          .then((result) => {
            if (result.isConnectionFound && result.hubArtifactId) {
              setHiddenConnection({
                fromId: randomIsolated.id,
                toId: result.hubArtifactId,
                reason: result.explanation!,
              });
            }
          })
          .catch((e) => {
            console.error("Failed to find hidden connection:", e.message);
          });
      }
    }
  }, [artifacts, isPreviewingConnection]);
  */

  const handleNodeClick = useCallback(
    (artifactId: string) => {
      const artifact = artifacts.find((a) => a.id === artifactId);
      if (artifact) {
        setSelectedArtifact(artifact);
        // Do not open the sheet automatically, let the user decide
      } else {
        setSelectedArtifact(null);
      }
    },
    [artifacts]
  );

  const handleNodeDoubleClick = useCallback(
    (artifactId: string) => {
      const artifact = artifacts.find((a) => a.id === artifactId);
      if (artifact) {
        setSelectedArtifact(artifact);
        setIsSheetOpen(true);
      }
    },
    [artifacts]
  );

  const handleApproveSuggestions = useCallback(
    async (approvedSuggestions: AISuggestion[], artifactToLink: Artifact) => {
      if (!artifactToLink || !user) return;

      try {
        const sourceArtifactRef = doc(
          db,
          "users",
          user.uid,
          "artifacts",
          artifactToLink.id
        );

        const batch = writeBatch(db);

        for (const suggestion of approvedSuggestions) {
          // Add forward link
          batch.update(sourceArtifactRef, {
            linkedTo: arrayUnion(suggestion.linkedArtifactId),
          });

          // Add backward link
          const linkedArtifactRef = doc(
            db,
            "users",
            user.uid,
            "artifacts",
            suggestion.linkedArtifactId
          );
          batch.update(linkedArtifactRef, {
            linkedTo: arrayUnion(artifactToLink.id),
          });
        }
        await batch.commit();

        toast({
          title: "AI Connections Added",
          description: "New links have been woven into the Atlas.",
        });
        fetchArtifacts(); // Refetch data after update
      } catch (error: any) {
        console.error("Error approving suggestions:", error.message);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not save connections. Please try again.",
        });
      }

      setIsSuggestionDialogOpen(false);
      setAiSuggestions([]);
      setNewArtifactForSuggestions(null);
    },
    [user, toast, fetchArtifacts]
  );

  const handleAddArtifact = async (
    newArtifactData: Omit<Artifact, "id" | "createdAt" | "updatedAt" | "color">
  ) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "You must be logged in to create an artifact.",
      });
      return false;
    }

    try {
      // Add artifact instantly with a placeholder color
      const docRef = await addDoc(
        collection(db, "users", user.uid, "artifacts"),
        {
          ...newArtifactData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          color: PLACEHOLDER_COLOR,
        }
      );
      
      // Immediately refetch data to show the new artifact
      fetchArtifacts();
      
      toast({
        title: "Artifact Created",
        description: "Your new memory has been woven into the Atlas.",
      });
      
      const newArtifactForAISuggestion: Artifact = {
        ...newArtifactData,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        color: PLACEHOLDER_COLOR, // Use placeholder for suggestion logic
      };

      // In the background, fetch the real color and update the document
      getNodeColor({ emotion: newArtifactData.primaryEmotion })
        .then(({ color }) => {
          updateDoc(doc(db, "users", user.uid, "artifacts", docRef.id), {
            color,
          });
          // Optimistically update the state for instant color change
          setArtifacts((prev) =>
            prev.map((a) => (a.id === docRef.id ? { ...a, color } : a))
          );
        })
        .catch((error) => {
          console.error("Failed to update artifact color:", error);
          // Optional: handle error, maybe revert color or notify user
        });


      // Trigger AI connection suggestions in the background
      generateConnections({
        newArtifact: {
          id: newArtifactForAISuggestion.id,
          content: `${newArtifactForAISuggestion.title}: ${newArtifactForAISuggestion.content}`,
        },
        existingArtifacts: artifacts.slice(0, 10).map((a) => ({
          // Use recent artifacts for context
          id: a.id,
          content: `${a.title}: ${a.content}`,
        })),
      })
        .then((result) => {
          const suggestions = result?.suggestions ?? [];
          if (suggestions.length > 0) {
            setAiSuggestions(suggestions);
            setNewArtifactForSuggestions(newArtifactForAISuggestion);
            setIsSuggestionDialogOpen(true);
          }
        })
        .catch((e) => {
          console.error("AI suggestion error:", e.message);
          toast({
            title: "AI Suggestions Failed",
            description:
              "Could not fetch AI suggestions, but your artifact was saved.",
          });
        });

      return true; // Indicate success
    } catch (error) {
      console.error("Failed to create artifact:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Could not save artifact to the database. Please try again.",
      });
      return false; // Indicate failure
    }
  };

  const handleUpdateArtifact = async (
    artifactId: string,
    updatedData: Partial<Omit<Artifact, "id">>
  ) => {
    if (!user) return false;

    try {
      const artifactRef = doc(db, "users", user.uid, "artifacts", artifactId);
      await updateDoc(artifactRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });
      fetchArtifacts(); // Refetch to update data in the main view
      toast({
        title: "Artifact Updated",
        description: "Your memory has been successfully updated.",
      });
      return true;
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update artifact.",
      });
      return false;
    }
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    if (!user) return;
    setIsSheetOpen(false); // Close the sheet first

    try {
      const batch = writeBatch(db);

      // 1. Delete the artifact itself
      const artifactRef = doc(db, "users", user.uid, "artifacts", artifactId);
      batch.delete(artifactRef);

      // 2. Find all artifacts that link to the one being deleted and remove the link
      const artifactsCollectionRef = collection(
        db,
        "users",
        user.uid,
        "artifacts"
      );
      const q = query(
        artifactsCollectionRef,
        where("linkedTo", "array-contains", artifactId)
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((documentSnapshot) => {
        const docRef = doc(
          db,
          "users",
          user.uid,
          "artifacts",
          documentSnapshot.id
        );
        batch.update(docRef, { linkedTo: arrayRemove(artifactId) });
      });

      await batch.commit();

      fetchArtifacts(); // Refetch data after deleting

      toast({
        title: "Artifact Deleted",
        description: "The memory has been removed from the Atlas.",
      });
    } catch (error: any) {
      console.error("Error deleting artifact:", error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete artifact. Please try again.",
      });
    }
  };

  const handleNewArtifactClick = () => {
    setSelectedArtifact(null);
    setIsSheetOpen(true);
  };

  const handleAcceptHiddenConnection = async () => {
    if (!hiddenConnection || !user) return;

    try {
      const fromRef = doc(
        db,
        "users",
        user.uid,
        "artifacts",
        hiddenConnection.fromId
      );
      const toRef = doc(
        db,
        "users",
        user.uid,
        "artifacts",
        hiddenConnection.toId
      );

      const batch = writeBatch(db);
      batch.update(fromRef, { linkedTo: arrayUnion(hiddenConnection.toId) });
      batch.update(toRef, { linkedTo: arrayUnion(hiddenConnection.fromId) });
      await batch.commit();

      fetchArtifacts(); // Refetch

      toast({
        title: "Hidden Connection Woven",
        description: "A new link has been created in your Mind Atlas.",
      });
    } catch (error: any) {
      console.error("Error accepting hidden connection:", error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save the new connection.",
      });
    } finally {
      setHiddenConnection(null);
      setIsPreviewingConnection(false);
      hasFetchedHiddenConnection.current = false; // Allow fetching new suggestions
    }
  };

  const handleDismissHiddenConnection = () => {
    setHiddenConnection(null);
    setIsPreviewingConnection(false);
    hasFetchedHiddenConnection.current = false; // Allow fetching new suggestions
  };

  const handleWeaveDream = async () => {
    if (!selectedArtifact) {
      toast({
        variant: "destructive",
        title: "No artifact selected",
        description: "Please select an artifact to weave a dream from.",
      });
      return;
    }

    setIsWeavingDream(true);

    const rootArtifact = selectedArtifact;
    const connectedArtifactIds = new Set(rootArtifact.linkedTo);
    connectedArtifactIds.add(rootArtifact.id);

    const artifactCluster = artifacts.filter((a) =>
      connectedArtifactIds.has(a.id)
    );

    try {
      const result = await weaveDream({
        artifacts: artifactCluster.map((a) => ({
          title: a.title,
          primaryEmotion: a.primaryEmotion,
          keywords: a.keywords,
        })),
      });
      setDreamResult(result);
      setIsDreamDialogOpen(true);
    } catch (error: any) {
      console.error("Error weaving dream:", error);
      toast({
        variant: "destructive",
        title: "Dream Weaving Failed",
        description:
          "Could not generate a story at this time. Please try again later.",
      });
    } finally {
      setIsWeavingDream(false);
    }
  };

  const handleAnalyzePatterns = async () => {
    if (!user) return;
    
    if (artifacts.length < 10) {
      toast({
        title: "Not Enough Data",
        description: "You need at least 10 artifacts to find meaningful patterns.",
      });
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
       const artifactsCollectionRef = collection(db, "users", user.uid, "artifacts");
       const q = query(artifactsCollectionRef);
       const querySnapshot = await getDocs(q);
       const allArtifacts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Artifact));

      const result = await findRecurringPattern({
        artifacts: allArtifacts.map(a => ({
          id: a.id,
          primaryEmotion: a.primaryEmotion,
          keywords: a.keywords,
          linkedTo: a.linkedTo,
        }))
      });
      
      setAnalysisResult(result);
      setIsInsightDialogOpen(true);

    } catch (error: any) {
      console.error("Error analyzing patterns:", error.message);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze patterns at this time. Please try again later.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptHabit = async () => {
    if (!analysisResult?.suggestedHabit || !user) return;
    try {
      const habitsCollectionRef = collection(db, "users", user.uid, "habits");
      await addDoc(habitsCollectionRef, {
        description: analysisResult.suggestedHabit,
        createdAt: serverTimestamp(),
        completedDates: [],
      });
      toast({
        title: "New Habit Created!",
        description:
          "Your new habit has been added. Let's start building a positive loop.",
      });
      router.push("/habits");
    } catch (error: any) {
      console.error("Error creating habit:", error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save the new habit.",
      });
    } finally {
      setIsInsightDialogOpen(false);
      setAnalysisResult(null);
    }
  };

  const filteredArtifacts = useMemo(() => {
    let artifactsToFilter = artifacts;

    if (!showOrphans) {
      const connectedIds = new Set<string>();
      artifactsToFilter.forEach((a) => {
        if (a.linkedTo.length > 0) {
          connectedIds.add(a.id);
          a.linkedTo.forEach((id) => connectedIds.add(id));
        }
      });
      artifactsToFilter = artifactsToFilter.filter((a) =>
        connectedIds.has(a.id)
      );
    }

    if (!searchTerm) return artifactsToFilter;

    const lowercasedFilter = searchTerm.toLowerCase();
    return artifactsToFilter.filter(
      (artifact) =>
        artifact.title.toLowerCase().includes(lowercasedFilter) ||
        artifact.content.toLowerCase().includes(lowercasedFilter) ||
        artifact.primaryEmotion.toLowerCase().includes(lowercasedFilter) ||
        artifact.keywords.some((kw) =>
          kw.toLowerCase().includes(lowercasedFilter)
        )
    );
  }, [artifacts, searchTerm, showOrphans]);

  const suggestionPreviewProps: SuggestionPreviewProps | null = useMemo(() => {
    if (!hiddenConnection) return null;
    const fromArtifact = artifacts.find(
      (a) => a.id === hiddenConnection.fromId
    );
    const toArtifact = artifacts.find((a) => a.id === hiddenConnection.toId);
    if (!fromArtifact || !toArtifact) return null;

    return {
      isOpen: isPreviewingConnection,
      onOpenChange: setIsPreviewingConnection,
      fromArtifact,
      toArtifact,
      reason: hiddenConnection.reason,
      onAccept: handleAcceptHiddenConnection,
      onDismiss: handleDismissHiddenConnection,
    };
  }, [
    hiddenConnection,
    artifacts,
    isPreviewingConnection,
    handleAcceptHiddenConnection,
    handleDismissHiddenConnection,
  ]);

  if (loading || isDataLoading) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader onNewArtifact={handleNewArtifactClick} />
        <main className="flex-1 flex relative overflow-hidden">
          <div className="flex-1 relative bg-grid" />
        </main>
      </div>
    );
  }

  return (
    <>
      <AppHeader onNewArtifact={handleNewArtifactClick} />
      <div className="flex-1 flex overflow-hidden">
        <div className="relative flex-1">
          <MindAtlas
            artifacts={filteredArtifacts}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            selectedNodeId={selectedArtifact?.id ?? null}
            searchTerm={searchTerm}
            previewConnection={isPreviewingConnection ? hiddenConnection : null}
          />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="absolute top-4 right-4 z-10">
                <Filter className="mr-2 h-4 w-4" />
                Filters & Actions
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80 p-0 flex flex-col" side="right">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 flex flex-col gap-6 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="orphans-switch" className="cursor-pointer">
                    Show Orphans
                  </Label>
                  <Switch
                    id="orphans-switch"
                    checked={showOrphans}
                    onCheckedChange={setShowOrphans}
                  />
                </div>
              </div>
              <div className="p-4 border-t mt-auto">
                 <SheetHeader className="p-0 pb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    AI Actions
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4">
                    <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={isWeavingDream || !selectedArtifact}
                    onClick={handleWeaveDream}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isWeavingDream ? "Weaving..." : "Weave a Dream"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Weaves a story from the selected artifact and its connections.
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {hiddenConnection && !isPreviewingConnection && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
          <div className="bg-background border rounded-lg shadow-2xl p-4 flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-2 rounded-full">
              <Zap className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                Librarian's Wisdom
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                I've found a hidden connection. Your entry about '
                <span className="font-medium text-foreground">
                  {
                    artifacts.find((a) => a.id === hiddenConnection.fromId)
                      ?.title
                  }
                </span>
                ' might be related to '
                <span className="font-medium text-foreground">
                  {
                    artifacts.find((a) => a.id === hiddenConnection.toId)
                      ?.title
                  }
                </span>
                '.
              </p>
            </div>
            <Button onClick={() => setIsPreviewingConnection(true)}>
              Explore
            </Button>
          </div>
        </div>
      )}

      {suggestionPreviewProps && (
        <SuggestionPreview {...suggestionPreviewProps} />
      )}

      {dreamResult && (
        <AlertDialog
          open={isDreamDialogOpen}
          onOpenChange={setIsDreamDialogOpen}
        >
          <AlertDialogContent className="max-w-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {dreamResult.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                A dream woven from your memories.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 text-sm text-foreground whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
              {dreamResult.story}
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsDreamDialogOpen(false)}>
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {analysisResult && (
        <AlertDialog
          open={isInsightDialogOpen}
          onOpenChange={setIsInsightDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Librarian's Wisdom
              </AlertDialogTitle>
              <AlertDialogDescription>
                {analysisResult?.isPatternFound
                  ? analysisResult.explanation
                  : "No significant recurring patterns were found at this time. Keep weaving your Atlas!"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {analysisResult?.isPatternFound && analysisResult.pattern && (
              <div className="my-4 space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {analysisResult.pattern.from}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">{analysisResult.pattern.to}</Badge>
                </div>
                <div className="text-center text-sm text-foreground leading-relaxed p-4 bg-accent/10 rounded-md border border-accent/20">
                  <p className="font-bold mb-2">Suggested Habit:</p>
                  <p>{analysisResult.suggestedHabit}</p>
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Dismiss</AlertDialogCancel>
              {analysisResult?.isPatternFound && (
                <AlertDialogAction onClick={handleAcceptHabit}>
                  Create Habit
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <ArtifactSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        artifact={selectedArtifact}
        existingArtifacts={artifacts}
        onAddArtifact={handleAddArtifact}
        onUpdateArtifact={handleUpdateArtifact}
        onDeleteArtifact={handleDeleteArtifact}
      />
      <SuggestionDialog
        isOpen={isSuggestionDialogOpen}
        onOpenChange={setIsSuggestionDialogOpen}
        suggestions={aiSuggestions}
        onApprove={(approved) =>
          handleApproveSuggestions(approved, newArtifactForSuggestions!)
        }
        existingArtifacts={artifacts}
      />
    </>
  );
}
