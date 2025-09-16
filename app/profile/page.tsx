
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BrainCircuit, Link, BookCopy, Zap, ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, addDoc, serverTimestamp, getCountFromServer, where, documentId } from "firebase/firestore";
import type { Artifact } from "@/lib/types";
import { findRecurringPattern, FindRecurringPatternOutput } from "@/ai/flows/find-recurring-pattern";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/app-header";

const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, loading, updateUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [artifactCount, setArtifactCount] = useState(0);
  const [totalLinks, setTotalLinks] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // AI Pattern Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FindRecurringPatternOutput | null>(null);
  const [isInsightDialogOpen, setIsInsightDialogOpen] = useState(false);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (user?.displayName) {
      form.setValue("displayName", user.displayName);
    }
  }, [user, loading, router, form]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
        const artifactsCollectionRef = collection(db, "users", user.uid, "artifacts");
        
        // Get total artifact count efficiently
        const countSnapshot = await getCountFromServer(artifactsCollectionRef);
        setArtifactCount(countSnapshot.data().count);
        
        // Fetch only the documents to calculate links, not all data
        const q = query(artifactsCollectionRef);
        const querySnapshot = await getDocs(q);
        
        let links = 0;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.linkedTo && Array.isArray(data.linkedTo)) {
                links += data.linkedTo.length;
            }
        });
        setTotalLinks(links / 2); // Each link is counted twice

    } catch (error) {
        console.error("Error fetching stats:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch your statistics.",
        });
    } finally {
        setIsDataLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  const onSubmit = async (data: ProfileFormValues) => {
    const { error } = await updateUserProfile({ displayName: data.displayName });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error,
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your display name has been changed.",
      });
    }
  };

  const handleAnalyzePatterns = async () => {
    if (!user) return;
    
    if (artifactCount < 10) {
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
       const artifacts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Artifact));

      const result = await findRecurringPattern({
        artifacts: artifacts.map(a => ({
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
  }

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
        description: "Your new habit has been added. Let's start building a positive loop.",
      });
      router.push('/habits');
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
  
  if (loading || !user || isDataLoading) {
    return (
     <>
        <AppHeader onNewArtifact={() => router.push('/')} />
        <div className="flex-1 p-8">
            <Skeleton className="w-full h-[500px]" />
        </div>
     </>
    );
  }

  return (
    <>
    <AppHeader onNewArtifact={() => router.push('/')} />
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-1 space-y-8">
             <Card>
                <CardHeader className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? ""} />
                    <AvatarFallback className="text-3xl">
                        {user.displayName?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-2xl">{user.displayName ?? user.email}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Atlas Statistics</h3>
                </div>
                <CardDescription>
                  Your journey of self-discovery so far.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <BookCopy className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Total Artifacts</span>
                  </div>
                  <span className="font-bold text-base">{artifactCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <Link className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Total Connections</span>
                  </div>
                  <span className="font-bold text-base">
                    {Math.round(totalLinks)}
                  </span>
                </div>
              </CardContent>
            </Card>

             <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary"/>
                    Librarian's Wisdom
                </CardTitle>
                 <CardDescription>Unlock deeper insights from your Atlas.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={handleAnalyzePatterns} disabled={isAnalyzing}>
                    {isAnalyzing ? "Analyzing..." : "Analyze Patterns"}
                </Button>
                 <p className="text-xs text-muted-foreground mt-3 text-center">Requires at least 10 artifacts.</p>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your account details.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    
    <AlertDialog open={isInsightDialogOpen} onOpenChange={setIsInsightDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary"/>Librarian's Wisdom</AlertDialogTitle>
            <AlertDialogDescription>
              {analysisResult?.isPatternFound ? analysisResult.explanation : "No significant recurring patterns were found at this time. Keep weaving your Atlas!"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {analysisResult?.isPatternFound && analysisResult.pattern && (
             <div className="my-4 space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm">
                    <Badge variant="secondary">{analysisResult.pattern.from}</Badge>
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
              <AlertDialogAction onClick={handleAcceptHabit}>Create Habit</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    