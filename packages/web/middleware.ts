import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Already authenticated — redirect away from login (unless they have an error param)
  const hasError = request.nextUrl.searchParams.has("error");
  if (sessionCookie && pathname === "/login" && !hasError) {
    return NextResponse.redirect(new URL("/propose", request.url));
  }

  // Not authenticated — protect everything except login and API auth routes
  if (
    !sessionCookie &&
    pathname !== "/login" &&
    !(pathname === "/api/auth" || pathname.startsWith("/api/auth/"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
};
