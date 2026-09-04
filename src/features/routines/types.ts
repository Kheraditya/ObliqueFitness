export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
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
  targetSets: number;
  restSeconds: number;
  supersetGroup: number | null;
}

export interface VolumeHistoryPoint {
  date: string;
  volume: number;
}
