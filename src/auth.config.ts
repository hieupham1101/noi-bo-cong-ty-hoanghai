import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

/**
 * Edge-compatible NextAuth configuration
 * CRITICAL: This file must NOT import Prisma or any heavy Node.js dependencies
 * It's used by middleware which runs on Vercel's Edge runtime
 */
export default {
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            // Authorization logic is handled in auth.ts with Prisma
            // This is just a placeholder for the provider structure
            async authorize(credentials) {
                // This will be overridden in auth.ts
                return null
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
} satisfies NextAuthConfig
