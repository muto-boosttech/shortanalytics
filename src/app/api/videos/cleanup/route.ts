import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// DELETE /api/videos/cleanup - ダミーデータを削除
export async function DELETE() {
  try {
    // ダミーデータの特徴: tiktokVideoIdが "dummy_" で始まる
    const result = await prisma.video.deleteMany({
      where: {
        tiktokVideoId: {
          startsWith: "dummy_",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count}件のダミーデータを削除しました`,
      deleted: result.count,
    });
  } catch (error) {
    console.error("Error cleaning up dummy data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cleanup dummy data" },
      { status: 500 }
    );
  }
}
