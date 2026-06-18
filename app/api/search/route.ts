import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as youtubesearchapi from "youtube-search-api";

// Search YouTube for songs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const query = req.nextUrl.searchParams.get("q");
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { message: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const results = await youtubesearchapi.GetListByKeyword(
      query,
      false, // not playlist
      6,     // limit to 6 results
      [{ type: "video" }]
    );

    const videos = (results.items || [])
      .filter((item: any) => item.type === "video" && item.id)
      .slice(0, 6)
      .map((item: any) => ({
        id: item.id,
        title: item.title || "Unknown",
        thumbnail: item.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
        channelTitle: item.channelTitle || "",
        length: item.length?.simpleText || "",
        url: `https://www.youtube.com/watch?v=${item.id}`,
      }));

    return NextResponse.json({ results: videos });
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json(
      { message: "Error searching YouTube", error: String(e) },
      { status: 500 }
    );
  }
}
