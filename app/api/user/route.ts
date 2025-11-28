import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthenticated" },
        { status: 401 }
      );
    }

    const user = await prismaClient.user.findFirst({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json(
      { message: "Error fetching user", error: String(e) },
      { status: 500 }
    );
  }
}
