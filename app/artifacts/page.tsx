
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  writeBatch,
  where,
  arrayRemove,
  updateDoc,
  serverTimestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  addDoc,
} from "firebase/firestore";
import type { Artifact } from "@/lib/types";
import { format } from "date-fns";
import AppHeader from "@/components/app-header";
import { BookCopy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ArtifactSheet from "@/components/artifact-sheet";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { getNodeColor } from "@/ai/flows/node-coloring-based-on-emotion";

const ARTIFACTS_PER_PAGE = 15;
const PLACEHOLDER_COLOR = "#808080"; // Grey

export default function ArtifactsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [
    lastVisible,
    setLastVisible,
  ] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();

  const fetchArtifacts = useCallback(
    async (loadMore = false) => {
      if (!user) return;
      setIsDataLoading(true);

      try {
        const artifactsCollectionRef = collection(
          db,
          "users",
          user.uid,
          "artifacts"
        );
        let q = query(
          artifactsCollectionRef,
          orderBy("createdAt", "desc"),
          limit(ARTIFACTS_PER_PAGE)
        );

        if (loadMore && lastVisible) {
          q = query(
            artifactsCollectionRef,
            orderBy("createdAt", "desc"),
            startAfter(lastVisible),
            limit(ARTIFACTS_PER_PAGE)
          );
        }

        const querySnapshot = await getDocs(q);
        const newArtifacts = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString(),
          } as Artifact;
        });

        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(newArtifacts.length === ARTIFACTS_PER_PAGE);

        setArtifacts((prev) => (loadMore ? [...prev, ...newArtifacts] : newArtifacts));
      } catch (error) {
        console.error("Error fetching artifacts:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch artifacts.",
        });
      } finally {
        setIsDataLoading(false);
      }
    },
    [user, toast, lastVisible]
  );
  
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (user) {
      fetchArtifacts();
    }
  }, [user, loading, router]); // Removed fetchArtifacts from dependency array as it's stable

  const handleRowClick = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setIsSheetOpen(true);
  };

  const handleNewArtifactClick = () => {
    setSelectedArtifact(null);
    setIsSheetOpen(true);
  };
  
  const refreshData = useCallback(() => {
    setLastVisible(null); // Reset pagination
    setHasMore(true);
    fetchArtifacts(false); // This will reset and fetch the first page
  },[fetchArtifacts]);

  const handleDeleteArtifact = async (artifactId: string) => {
    if (!user) return;
    setIsSheetOpen(false);

    try {
      const batch = writeBatch(db);
      const artifactRef = doc(db, "users", user.uid, "artifacts", artifactId);
      batch.delete(artifactRef);

      const q = query(
        collection(db, "users", user.uid, "artifacts"),
        where("linkedTo", "array-contains", artifactId)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((documentSnapshot) => {
        batch.update(documentSnapshot.ref, {
          linkedTo: arrayRemove(artifactId),
        });
      });

      await batch.commit();
      refreshData();

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
      refreshData();
      toast({
        title: "Artifact Updated",
        description: "Your memory has been successfully updated.",
      });
      return true;
    } catch (error) {
      console.error("Failed to update artifact:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update artifact. Please try again.",
      });
      return false;
    }
  };

  const handleAddArtifact = async (
    data: Omit<Artifact, "id" | "createdAt" | "updatedAt" | "color">
  ) => {
    if (!user) return false;
    try {
      // Add artifact instantly with a placeholder color
      const docRef = await addDoc(collection(db, "users", user.uid, "artifacts"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        color: PLACEHOLDER_COLOR,
      });

      // Immediately refresh data to show the new artifact
      refreshData();

      // In the background, fetch the real color and update the document
      getNodeColor({ emotion: data.primaryEmotion })
        .then(({ color }) => {
          updateDoc(doc(db, "users", user.uid, "artifacts", docRef.id), { color });
        })
        .catch(error => {
          console.error("Failed to update artifact color:", error);
          // Optional: handle error, maybe revert color or notify user
        });

      return true; // Indicate success to close the sheet
    } catch (error) {
      console.error("Failed to create artifact:", error);
      return false; // Indicate failure
    }
  };

  if (isDataLoading && artifacts.length === 0) {
    return (
      <>
        <AppHeader onNewArtifact={handleNewArtifactClick} />
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader onNewArtifact={handleNewArtifactClick} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <BookCopy className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              All Artifacts
            </h1>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Primary Emotion</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artifacts.map((artifact) => (
                <TableRow
                  key={artifact.id}
                  onClick={() => handleRowClick(artifact)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    {artifact.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      style={{
                        backgroundColor: artifact.color,
                        color: "hsl(var(--card-foreground))",
                      }}
                      variant="outline"
                    >
                      {artifact.primaryEmotion}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {artifact.keywords.slice(0, 3).map((kw) => (
                        <Badge key={kw} variant="secondary">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {artifact.updatedAt
                      ? format(new Date(artifact.updatedAt as string), "PPP")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {format(new Date(artifact.createdAt as string), "PPP")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
             <TableCaption>
              {!hasMore ? "You've reached the end of your memories." : "A list of your recent artifacts. Click a row to edit."}
            </TableCaption>
          </Table>
        </div>
         {hasMore && (
          <div className="flex justify-center mt-6">
            <Button onClick={() => fetchArtifacts(true)} disabled={isDataLoading}>
              {isDataLoading ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>
      <ArtifactSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        artifact={selectedArtifact}
        existingArtifacts={artifacts} // Use paginated artifacts for sheet details
        onAddArtifact={handleAddArtifact}
        onUpdateArtifact={handleUpdateArtifact}
        onDeleteArtifact={handleDeleteArtifact}
      />
    </>
  );
}
