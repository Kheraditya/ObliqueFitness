export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  imageUri?: string;
  notes?: string;
  order: number;
  restSeconds: number;
  supersetGroup: number | null;
}

export interface LoggedSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

export interface PreviousSet {
  setNumber: number;
  weight: number | null;
  reps: number | null;
}
