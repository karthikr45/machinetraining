import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { Role } from '@prisma/client';
import type { SessionUser } from './types';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours — a typical shift
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          department: user.department,
          isTrainer: user.isTrainer,
          preferredLanguage: user.preferredLanguage,
        } as unknown as import('next-auth').User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as SessionUser;
        token.id = u.id;
        token.role = u.role;
        token.companyId = u.companyId;
        token.department = u.department ?? null;
        token.isTrainer = u.isTrainer;
        token.preferredLanguage = u.preferredLanguage;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.companyId = token.companyId as string;
        session.user.department = (token.department as string | null) ?? null;
        session.user.isTrainer = token.isTrainer as boolean;
        session.user.preferredLanguage = token.preferredLanguage as string;
      }
      return session;
    },
  },
};

/** Get the current session user server-side, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    role: session.user.role,
    companyId: session.user.companyId,
    department: session.user.department,
    isTrainer: session.user.isTrainer,
    preferredLanguage: session.user.preferredLanguage,
  };
}

/** Roles that can manage training, machines, SOPs, CAPA. */
export const MANAGER_ROLES: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'TRAINING_MANAGER',
  'QA_OFFICER',
];

export function isManager(role: Role): boolean {
  return MANAGER_ROLES.includes(role);
}

export function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}
