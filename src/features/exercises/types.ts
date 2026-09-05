export interface Exercise {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string | null;
  instructions: string[];
  images: string[];
  is_custom: boolean;
  exercise_type: string | null;
}

export interface PersonalRecords {
  heaviestWeight: number | null;
  best1RM: number | null;
  bestSetVolume: number | null;
  bestSessionVolume: number | null;
}

export interface HistorySet {
  weight: number | null;
  reps: number | null;
}

export interface HistoryEntry {
  sessionId: string;
  date: string;
  sets: HistorySet[];
}

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  heaviestWeight: number;
}
