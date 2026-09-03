export type Role = 'member' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  gym_id: string | null;
  name: string | null;
  avatar_url: string | null;
}
