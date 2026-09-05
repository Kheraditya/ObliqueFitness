export type Role = 'member' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  gym_id: string | null;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  link: string | null;
  sex: string | null;
  birthday: string | null;
}
