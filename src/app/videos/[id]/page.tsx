"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercent, formatDateTime } from "@/lib/utils";
import { VideoThumbnail } from "@/components/video-thumbnail";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  User,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface Video {
  id: number;
  tiktokVideoId: string;
  videoUrl: string;
  description: string;
  hashtags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementRate: number;
  videoDurationSeconds: number | null;
  authorUsername: string;
  authorFollowerCount: number | null;
  thumbnailUrl: string;
  postedAt: string | null;
  collectedAt: string;
  source: string;
  platform: string;
  videoTags: Array<{
    id: number;
    contentType: string | null;
    hookType: string | null;
    durationCategory: string | null;
    performerType: string | null;
    tone: string | null;
    ctaType: string | null;
    industry: { id: number; name: string };
  }>;
}

interface Benchmark {
  avgEngagementRate: number;
  medianViewCount: number;
  topContentTypes: Record<string, number>;
  topHookTypes: Record<string, number>;
}

// プラットフォーム判定ヘルパー
function getPlatformInfo(video: Video) {
  const platform = video.platform || 
    (video.tiktokVideoId?.startsWith("yt_") ? "youtube" : 
     video.tiktokVideoId?.startsWith("ig_") ? "instagram" : "tiktok");
  
  switch (platform) {
    case "youtube":
      return { label: "YouTubeで見る", name: "YouTube" };
    case "instagram":
      return { label: "Instagramで見る", name: "Instagram" };
    default:
      return { label: "TikTokで見る", name: "TikTok" };
  }
}

// 動画尺フォーマット
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds && seconds !== 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<Video | null>(null);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/videos/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setVideo(data.data);
            // Fetch benchmark for the industry
            if (data.data.videoTags && data.data.videoTags.length > 0) {
              const industryId = data.data.videoTags[0].industry?.id;
              if (industryId) {
                fetch(`/api/benchmarks?industry_id=${industryId}`)
                  .then((res) => res.json())
                  .then((bmData) => {
                    if (bmData.success && bmData.data.length > 0) {
                      setBenchmark(bmData.data[0]);
                    }
                  });
              }
            }
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [params.id]);

  const getDiffIndicator = (value: number, benchmark: number) => {
    if (!benchmark || benchmark === 0) {
      return {
        icon: Minus,
        color: "text-gray-500",
        bgColor: "bg-gray-50",
        text: "N/A",
      };
    }
    const diff = ((value - benchmark) / benchmark) * 100;
    if (diff > 10) {
      return {
        icon: TrendingUp,
        color: "text-green-500",
        bgColor: "bg-green-50",
        text: `+${diff.toFixed(1)}%`,
      };
    } else if (diff < -10) {
      return {
        icon: TrendingDown,
        color: "text-red-500",
        bgColor: "bg-red-50",
        text: `${diff.toFixed(1)}%`,
      };
    }
    return {
      icon: Minus,
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
    };
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!video) {
    return (
      <MainLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="text-gray-500">動画が見つかりません</div>
          <Button onClick={() => router.back()}>戻る</Button>
        </div>
      </MainLayout>
    );
  }

  const platformInfo = getPlatformInfo(video);
  const erDiff = benchmark
    ? getDiffIndicator(video.engagementRate || 0, benchmark.avgEngagementRate)
    : null;
  const viewDiff = benchmark
    ? getDiffIndicator(video.viewCount || 0, benchmark.medianViewCount)
    : null;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">戻る</span>
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">動画詳細</h1>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Video Preview */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="relative aspect-[9/16] overflow-hidden rounded-lg max-w-[280px] mx-auto sm:max-w-none">
                  <VideoThumbnail
                    videoId={video.tiktokVideoId}
                    thumbnailUrl={video.thumbnailUrl}
                    description={video.description || ""}
                    className="h-full w-full"
                    showPlayIcon={true}
                  />
                  {video.videoDurationSeconds != null && (
                    <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs sm:text-sm text-white">
                      {formatDuration(video.videoDurationSeconds)}
                    </div>
                  )}
                </div>
                <div className="mt-3 sm:mt-4">
                  {video.videoUrl && (
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full h-9 sm:h-10 text-sm sm:text-base">
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        {platformInfo.label}
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Video Info */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-2">
            {/* Description */}
            <Card>
              <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-base">説明</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <p className="whitespace-pre-wrap text-xs sm:text-sm text-gray-700 line-clamp-6 sm:line-clamp-none">{video.description || "（説明なし）"}</p>
                {video.hashtags && video.hashtags.length > 0 && (
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                    {video.hashtags.filter(tag => tag && tag.trim()).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-[10px] sm:text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-base">パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
                  <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-blue-50 p-2 sm:p-3">
                    <Eye className="h-5 w-5 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-sm text-gray-600">再生数</p>
                      <p className="text-sm sm:text-xl font-bold truncate">{formatNumber(video.viewCount)}</p>
                      {viewDiff && (
                        <div className={`hidden sm:flex items-center gap-1 text-xs ${viewDiff.color}`}>
                          <viewDiff.icon className="h-3 w-3" />
                          {viewDiff.text}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-pink-50 p-2 sm:p-3">
                    <Heart className="h-5 w-5 sm:h-8 sm:w-8 text-pink-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-sm text-gray-600">いいね</p>
                      <p className="text-sm sm:text-xl font-bold truncate">{formatNumber(video.likeCount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-purple-50 p-2 sm:p-3">
                    <MessageCircle className="h-5 w-5 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-sm text-gray-600">コメント</p>
                      <p className="text-sm sm:text-xl font-bold truncate">{formatNumber(video.commentCount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-green-50 p-2 sm:p-3">
                    <Share2 className="h-5 w-5 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-sm text-gray-600">シェア</p>
                      <p className="text-sm sm:text-xl font-bold truncate">{formatNumber(video.shareCount)}</p>
                    </div>
                  </div>
                </div>

                {/* Engagement Rate with Benchmark */}
                <div className="mt-3 sm:mt-4 rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">エンゲージメント率</p>
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        {formatPercent(video.engagementRate)}
                      </p>
                    </div>
                    {erDiff && benchmark && (
                      <div className={`rounded-lg p-2 sm:p-3 ${erDiff.bgColor}`}>
                        <p className="text-[10px] sm:text-xs text-gray-600">業界平均比</p>
                        <div className={`flex items-center gap-1 text-base sm:text-lg font-bold ${erDiff.color}`}>
                          <erDiff.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          {erDiff.text}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          平均: {formatPercent(benchmark.avgEngagementRate)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Author Info */}
            <Card>
              <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-base">投稿者情報</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500">ユーザー名</p>
                      <p className="text-xs sm:text-sm font-medium truncate">@{video.authorUsername || "不明"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500">フォロワー数</p>
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {video.authorFollowerCount != null ? formatNumber(video.authorFollowerCount) : "不明"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500">投稿日時</p>
                      <p className="text-xs sm:text-sm font-medium truncate">{formatDateTime(video.postedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500">収集日時</p>
                      <p className="text-xs sm:text-sm font-medium truncate">{formatDateTime(video.collectedAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {video.videoTags && video.videoTags.length > 0 && (
              <Card>
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm sm:text-base">分析タグ</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                    {video.videoTags[0]?.industry && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">業種</p>
                        <Badge variant="default" className="text-[10px] sm:text-xs">{video.videoTags[0].industry.name}</Badge>
                      </div>
                    )}
                    {video.videoTags[0]?.contentType && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">コンテンツ類型</p>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">{video.videoTags[0].contentType}</Badge>
                      </div>
                    )}
                    {video.videoTags[0]?.hookType && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">フックタイプ</p>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{video.videoTags[0].hookType}</Badge>
                      </div>
                    )}
                    {video.videoTags[0]?.durationCategory && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">尺カテゴリ</p>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">{video.videoTags[0].durationCategory}</Badge>
                      </div>
                    )}
                    {video.videoTags[0]?.performerType && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">出演者タイプ</p>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{video.videoTags[0].performerType}</Badge>
                      </div>
                    )}
                    {video.videoTags[0]?.tone && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">トーン</p>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">{video.videoTags[0].tone}</Badge>
                      </div>
                    )}
                    {video.videoTags[0]?.ctaType && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">CTAタイプ</p>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{video.videoTags[0].ctaType}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benchmark Comparison */}
            {benchmark && (
              <Card>
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm sm:text-base">ベンチマーク比較</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                    <table className="w-full text-xs sm:text-sm min-w-[300px]">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">指標</th>
                          <th className="py-2 text-right font-medium">この動画</th>
                          <th className="py-2 text-right font-medium">業界平均</th>
                          <th className="py-2 text-right font-medium">差分</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2">ER</td>
                          <td className="py-2 text-right font-medium">
                            {formatPercent(video.engagementRate)}
                          </td>
                          <td className="py-2 text-right text-gray-500">
                            {formatPercent(benchmark.avgEngagementRate)}
                          </td>
                          <td className="py-2 text-right">
                            {erDiff && (
                              <span className={erDiff.color}>{erDiff.text}</span>
                            )}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">再生数</td>
                          <td className="py-2 text-right font-medium">
                            {formatNumber(video.viewCount)}
                          </td>
                          <td className="py-2 text-right text-gray-500">
                            {formatNumber(benchmark.medianViewCount)}
                          </td>
                          <td className="py-2 text-right">
                            {viewDiff && (
                              <span className={viewDiff.color}>{viewDiff.text}</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
