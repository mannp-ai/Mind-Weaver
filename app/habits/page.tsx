"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, query, doc, updateDoc, arrayUnion, arrayRemove, getDocs } from "firebase/firestore";
import type { Habit } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";
import { Repeat, Trophy } from "lucide-react";
import { isSameDay, parseISO, format, differenceInCalendarDays, subDays } from 'date-fns';
import AppHeader from "@/components/app-header";

function calculateStreak(completedDates: string[]): number {
    if (completedDates.length === 0) {
        return 0;
    }

    const sortedDates = completedDates.map(parseISO).sort((a, b) => b.getTime() - a.getTime());
    const today = new Date();
    
    // Check if the most recent completion is today or yesterday
    if (!isSameDay(sortedDates[0], today) && !isSameDay(sortedDates[0], subDays(today, 1))) {
        return 0;
    }

    let streak = 1;
    let lastDate = sortedDates[0];

    for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        if (differenceInCalendarDays(lastDate, currentDate) === 1) {
            streak++;
            lastDate = currentDate;
        } else if (!isSameDay(lastDate, currentDate)) {
            // Break if there's a gap
            break;
        }
    }
   
    return streak;
}


export default function HabitsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
        const habitsCollectionRef = collection(db, "users", user.uid, "habits");
        const q = query(habitsCollectionRef);
        const querySnapshot = await getDocs(q);
        const habitsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString(),
          } as Habit;
        });
        setHabits(habitsData);
    } catch (error) {
        console.error("Error fetching habits:", error);
    } finally {
        setIsDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user, fetchHabits]);

  const handleDayClick = async (day: Date, habit: Habit) => {
    if (!user) return;
    
    const dayString = format(day, 'yyyy-MM-dd');
    const habitRef = doc(db, "users", user.uid, "habits", habit.id);
    const isCompleted = habit.completedDates.includes(dayString);
  
    try {
      if (isCompleted) {
        await updateDoc(habitRef, { completedDates: arrayRemove(dayString) });
      } else {
        await updateDoc(habitRef, { completedDates: arrayUnion(dayString) });
      }
      fetchHabits(); // Refetch to update the UI
    } catch (error) {
      console.error("Error updating habit completion:", error);
    }
  };


  if (isDataLoading || loading) {
     return (
       <>
        <AppHeader onNewArtifact={() => router.push('/')} />
        <div className="flex-1 p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader onNewArtifact={() => router.push('/')} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-2">
                <Repeat className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Habit Loops
                </h1>
            </div>
        </div>

        {habits.length === 0 ? (
            <Card className="text-center p-8">
                <CardHeader>
                    <CardTitle>No Habits Yet</CardTitle>
                    <CardDescription>
                       Use the "Analyze Patterns" feature on your profile page to discover and create new habits.
                    </CardDescription>
                </CardHeader>
            </Card>
        ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {habits.map(habit => {
                    const completedDatesISO = habit.completedDates.map(d => parseISO(d));
                    const streak = calculateStreak(habit.completedDates);
                    return (
                        <Card key={habit.id}>
                            <CardHeader>
                                <CardTitle>{habit.description}</CardTitle>
                                <CardDescription>Created on {format(parseISO(habit.createdAt), "PPP")}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <Calendar
                                    mode="multiple"
                                    min={1}
                                    selected={completedDatesISO}
                                    onDayClick={(day) => handleDayClick(day, habit)}
                                    className="rounded-md border"
                                />
                                <div className="flex items-center gap-2 mt-4 text-lg font-semibold text-primary p-3 rounded-md bg-primary/10">
                                    <Trophy className="h-5 w-5" />
                                    <span>Current Streak: {streak} {streak === 1 ? 'day' : 'days'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        )}
      </div>
    </>
  );
}
