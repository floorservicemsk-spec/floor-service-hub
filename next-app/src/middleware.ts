import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");
    const isPublicApi =
      req.nextUrl.pathname.startsWith("/api/auth") ||
      req.nextUrl.pathname.startsWith("/api/public");

    // Allow public API routes
    if (isPublicApi) {
      return NextResponse.next();
    }

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/chat", req.url));
    }

    // Allow unauthenticated users to access auth pages
    if (isAuthPage && !isAuth) {
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page without auth
        if (req.nextUrl.pathname.startsWith("/login")) {
          return true;
        }
        // Allow access to public API routes
        if (req.nextUrl.pathname.startsWith("/api/auth")) {
          return true;
        }
        // Require auth for everything else
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
