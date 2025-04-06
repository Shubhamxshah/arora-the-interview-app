import authConfig from "./auth.config";
import NextAuth from "next-auth";
import { privateRoutes } from "./pvroutes";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;

  const { nextUrl } = req;
  const isPrivateRoute = privateRoutes.includes(nextUrl.pathname);
  const isApiRoute = nextUrl.pathname.includes("/api");
  if (isApiRoute) {
    return;
  }

  if (!isLoggedIn && isPrivateRoute) {
    return Response.redirect(`${process.env.PROJECT_URL}`);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
