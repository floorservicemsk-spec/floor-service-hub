import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const publicPages = ["/login", "/register"];
const publicApiRoutes = ["/api/auth", "/api/public"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const pathname = req.nextUrl.pathname;
    
    // Check if it's a public page
    const isAuthPage = publicPages.some(page => pathname.startsWith(page));
    
    // Check if it's a public API route
    const isPublicApi = publicApiRoutes.some(route => pathname.startsWith(route));

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
        const pathname = req.nextUrl.pathname;
        
        // Allow access to auth pages (login, register) without auth
        if (publicPages.some(page => pathname.startsWith(page))) {
          return true;
        }
        
        // Allow access to public API routes
        if (publicApiRoutes.some(route => pathname.startsWith(route))) {
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
     * - sw.js (service worker)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|sw.js).*)",
  ],
};
