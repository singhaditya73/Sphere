import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const SendMessageSchema = z.object({
  text: z.string().min(1).max(500),
});

// Get messages for a room (last 50)
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const roomId = params.roomId;

    const messages = await prismaClient.message.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        text: m.text,
        userEmail: m.user.email,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Error fetching messages", error: String(e) },
      { status: 500 }
    );
  }
}

// Send a message
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prismaClient.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const params = await props.params;
    const roomId = params.roomId;

    const body = await req.json();
    const data = SendMessageSchema.parse(body);

    const message = await prismaClient.message.create({
      data: {
        text: data.text,
        userId: user.id,
        roomId,
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        text: message.text,
        userEmail: message.user.email,
        createdAt: message.createdAt,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Error sending message", error: String(e) },
      { status: 500 }
    );
  }
}
