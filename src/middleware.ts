import NextAuth from "next-auth"
import authConfig from "@/auth.config"

/**
 * Edge-compatible middleware using lightweight auth config
 * CRITICAL: This must NOT import from @/auth as it contains Prisma
 */
const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")
    const isOnLogin = req.nextUrl.pathname.startsWith("/login")

    if (isOnDashboard && !isLoggedIn) {
        return Response.redirect(new URL("/login", req.nextUrl))
    }

    if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", req.nextUrl))
    }

    return
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
