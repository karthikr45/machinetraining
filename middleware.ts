export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/machines/:path*',
    '/sop/:path*',
    '/training/:path*',
    '/simulation/:path*',
    '/ojt/:path*',
    '/capa/:path*',
    '/requalification/:path*',
    '/mock-inspection/:path*',
    '/audit-trail/:path*',
    '/reports/:path*',
    '/users/:path*',
    '/settings/:path*',
  ],
};
