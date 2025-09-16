"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUpWithEmail: (email: string, pass: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: { displayName?: string, photoURL?: string }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string):Promise<{error: string | null}> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      // Create a document for the new user in Firestore
      await setDoc(doc(db, "users", newUser.uid), {
          email: newUser.email,
          displayName: newUser.displayName,
          photoURL: newUser.photoURL,
          createdAt: serverTimestamp(),
      });

      router.push("/");
      return { error: null }
    } catch (e) {
      const error = e as FirebaseError;
      console.error("Error signing up: ", error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<{error: string | null}> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
      return { error: null };
    } catch (e) {
      const error = e as FirebaseError;
      console.error("Error signing in: ", error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: { displayName?: string, photoURL?: string }): Promise<{ error: string | null }> => {
    if (!auth.currentUser) return { error: "No user is signed in." };
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, updates);
      
      // Update the user's document in Firestore
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, { ...updates }, { merge: true });

      // Manually update the user state to reflect changes immediately
      setUser(auth.currentUser);
      return { error: null };
    } catch (e) {
      const error = e as FirebaseError;
      console.error("Error updating profile: ", error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUpWithEmail, signInWithEmail, signOut, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
