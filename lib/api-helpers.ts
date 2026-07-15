import { NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { getCurrentUser } from './auth';
import type { SessionUser } from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Ensure a request is authenticated. Throws ApiError(401) otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError('Unauthorized', 401);
  return user;
}

/** Ensure the authenticated user has one of the allowed roles. */
export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    throw new ApiError('Forbidden — insufficient role', 403);
  }
  return user;
}

/** Wrap a handler with uniform error handling. */
export function handle<T>(
  fn: () => Promise<T>
): Promise<NextResponse> {
  return fn()
    .then((data) => NextResponse.json(data))
    .catch((err) => {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error('[API ERROR]', err);
      const message =
        err instanceof Error ? err.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status: 500 });
    });
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
