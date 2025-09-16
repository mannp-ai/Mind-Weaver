import { FieldValue } from "firebase/firestore";

export type Artifact = {
  id: string;
  title: string;
  content: string;
  primaryEmotion: string;
  keywords: string[];
  linkedTo: string[];
  createdAt: string | FieldValue; // ISO string or Firestore ServerTimestamp
  updatedAt?: string | FieldValue;
  color: string;
};

export type AISuggestion = {
  linkedArtifactId: string;
  connectionReason: string;
};

export type HiddenConnection = {
  fromId: string;
  toId: string;
  reason: string;
};

export type Habit = {
    id: string;
    description: string;
    createdAt: string;
    completedDates: string[]; // Array of ISO date strings (YYYY-MM-DD)
}
