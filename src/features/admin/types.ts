export type MembershipStatus = 'active' | 'frozen' | 'expired';

export interface AdminMembership {
  id: string;
  planName: string;
  startDate: string;
  endDate: string | null;
  status: MembershipStatus;
}

export interface AdminMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  accessEnabled: boolean;
  membership: AdminMembership | null;
}

export interface MemberProgress {
  workoutCount: number;
  totalVolume: number;
  totalDurationSeconds: number;
  lastWorkoutAt: string | null;
  latestWeight: { value: number; unit: string; loggedAt: string } | null;
}

export interface MembershipInput {
  planName: string;
  startDate: string;
  endDate: string | null;
  status: MembershipStatus;
}
