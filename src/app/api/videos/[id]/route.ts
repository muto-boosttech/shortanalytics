import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/videos/[id] - 特定の動画を取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { success: false, error: "Invalid video ID" },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        videoTags: {
          include: {
            industry: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    // ハッシュタグをパース
    const videoWithParsedHashtags = {
      ...video,
      hashtags: video.hashtags ? JSON.parse(video.hashtags) : [],
    };

    return NextResponse.json({
      success: true,
      data: videoWithParsedHashtags,
    });
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch video" },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id] - 動画を削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { success: false, error: "Invalid video ID" },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    await prisma.video.delete({
      where: { id: videoId },
    });

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
