import GoogleProvider from "next-auth/providers/google";
import NextAuth, { AuthOptions } from "next-auth";
import { prismaClient } from "@/lib/db";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn(params) {
      if (!params.user.email) {
        return false;
      }
      try {
        await prismaClient.user.create({
          data: {
            email: params.user.email,
            provider: "Google",
          },
        });
      } catch (error) {}
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
