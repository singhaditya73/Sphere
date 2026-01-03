import GoogleProvider from "next-auth/providers/google";
import { AuthOptions } from "next-auth";
import { prismaClient } from "@/lib/db";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      console.log("SignIn Callback started for:", user.email);
      if (!user.email) {
        console.log("No email provided in user object");
        return false;
      }
      try {
        console.log("Checking existing user...");
        // Check if user exists
        const existingUser = await prismaClient.user.findUnique({
          where: { email: user.email },
        });
        console.log("Existing user result:", existingUser);

        // Create user if doesn't exist
        if (!existingUser) {
          console.log("Creating new user...");
          const newUser = await prismaClient.user.create({
            data: {
              email: user.email,
              provider: "Google",
            },
          });
          console.log("New user created:", newUser);
        }
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
      return true;
    },
    async session({ session }) {
      if (session?.user?.email) {
        // Add user ID to session
        const dbUser = await prismaClient.user.findUnique({
          where: { email: session.user.email },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
};
