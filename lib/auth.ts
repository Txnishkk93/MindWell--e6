import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare, hash } from "bcryptjs"

declare module "next-auth" {
  interface User {
    id: string
    name?: string
    email?: string
  }

  interface Session {
    user: User & {
      id: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
  }
}

// Default demo user for testing
const DEMO_USER = {
  id: "demo-user-123",
  email: "test@mindwell.app",
  name: "Demo User",
  password: "$2a$10$bWrr8FQj6PnBD5kN7h7RH.7Ydmq.2L/vDVG3vQVtXZ7r3KJcKYMRG", // TestUser123!
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "dev-secret-key-for-mindwell-change-in-production",
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          // Try database first if available
          try {
            const { prisma } = await import("./prisma")
            const user = await prisma.user.findUnique({
              where: { email: credentials.email as string },
            })

            if (!user) {
              // Check demo user
              if (credentials.email === DEMO_USER.email) {
                const passwordMatch = await compare(
                  credentials.password as string,
                  DEMO_USER.password
                )
                if (passwordMatch) {
                  return {
                    id: DEMO_USER.id,
                    email: DEMO_USER.email,
                    name: DEMO_USER.name,
                  }
                }
              }
              return null
            }

            const passwordMatch = await compare(
              credentials.password as string,
              user.password
            )

            if (!passwordMatch) {
              return null
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            }
          } catch (dbError) {
            // Fallback to demo user if database unavailable
            console.warn("[v0] Database unavailable, using demo user:", dbError)
            if (credentials.email === DEMO_USER.email) {
              const passwordMatch = await compare(
                credentials.password as string,
                DEMO_USER.password
              )
              if (passwordMatch) {
                return {
                  id: DEMO_USER.id,
                  email: DEMO_USER.email,
                  name: DEMO_USER.name,
                }
              }
            }
            return null
          }
        } catch (error) {
          console.error("[v0] Auth error:", error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
