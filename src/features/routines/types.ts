export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  imageUri?: string;
  notes?: string;
  order: number;
  targetSets: number;
  restSeconds: number;
  supersetGroup: number | null;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface RoutineExerciseDraft {
  exerciseId: string;
  exerciseName: string;
  imageUri?: string;
  notes?: string;
  targetSets: number;
  restSeconds: number;
  supersetGroup: number | null;
}

export interface VolumeHistoryPoint {
  date: string;
  volume: number;
  reps: number;
  durationSeconds: number;
}

export interface PerformedSet {
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

export interface RoutinePerformance {
  date: string;
  durationSeconds: number;
  sets: PerformedSet[];
}
