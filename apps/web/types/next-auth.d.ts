import 'next-auth';

export type UserRole = 'admin' | 'super_user' | 'premium' | 'standard';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}
