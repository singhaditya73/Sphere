import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

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
        username: true,
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const username = body.username?.trim();

    if (!username || username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { message: "Username must be between 3 and 20 characters." },
        { status: 400 }
      );
    }

    // Check alphanumeric + underscores
    const alphaNumericRegex = /^[a-zA-Z0-9_]+$/;
    if (!alphaNumericRegex.test(username)) {
      return NextResponse.json(
        { message: "Username can only contain letters, numbers, and underscores." },
        { status: 400 }
      );
    }

    // Check unique
    const existing = await prismaClient.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive"
        },
        NOT: {
          email: session.user.email
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 400 }
      );
    }

    const user = await prismaClient.user.update({
      where: { email: session.user.email },
      data: { username }
    });

    return NextResponse.json({
      message: "Username updated successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Error updating username", error: String(e) },
      { status: 500 }
    );
  }
}
