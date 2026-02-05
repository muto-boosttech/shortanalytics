"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  videoDurationSeconds: number;
  authorUsername: string;
  authorFollowerCount: number;
  thumbnailUrl: string;
  postedAt: string;
  collectedAt: string;
  source: string;
  videoTags: Array<{
    id: number;
    contentType: string;
    hookType: string;
    durationCategory: string;
    performerType: string;
    tone: string;
    ctaType: string;
    industry: { id: number; name: string };
  }>;
}

interface Benchmark {
  avgEngagementRate: number;
  medianViewCount: number;
  topContentTypes: Record<string, number>;
  topHookTypes: Record<string, number>;
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
              const industryId = data.data.videoTags[0].industry.id;
              fetch(`/api/benchmarks?industry_id=${industryId}`)
                .then((res) => res.json())
                .then((bmData) => {
                  if (bmData.success && bmData.data.length > 0) {
                    setBenchmark(bmData.data[0]);
                  }
                });
            }
          }
          setLoading(false);
        });
    }
  }, [params.id]);

  const getDiffIndicator = (value: number, benchmark: number) => {
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

  const erDiff = benchmark
    ? getDiffIndicator(video.engagementRate, benchmark.avgEngagementRate)
    : null;
  const viewDiff = benchmark
    ? getDiffIndicator(video.viewCount, benchmark.medianViewCount)
    : null;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">動画詳細</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video Preview */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <div className="relative aspect-[9/16] overflow-hidden rounded-lg">
                  <VideoThumbnail
                    videoId={video.tiktokVideoId}
                    thumbnailUrl={video.thumbnailUrl}
                    description={video.description}
                    className="h-full w-full"
                    showPlayIcon={true}
                  />
                  <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-sm text-white">
                    {Math.floor(video.videoDurationSeconds / 60)}:
                    {(video.videoDurationSeconds % 60).toString().padStart(2, "0")}
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full">
                      <ExternalLink className="h-4 w-4" />
                      TikTokで見る
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Video Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>説明</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-gray-700">{video.description}</p>
                {video.hashtags && video.hashtags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {video.hashtags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
                    <Eye className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">再生数</p>
                      <p className="text-xl font-bold">{formatNumber(video.viewCount)}</p>
                      {viewDiff && (
                        <div className={`flex items-center gap-1 text-xs ${viewDiff.color}`}>
                          <viewDiff.icon className="h-3 w-3" />
                          {viewDiff.text}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-pink-50 p-3">
                    <Heart className="h-8 w-8 text-pink-500" />
                    <div>
                      <p className="text-sm text-gray-600">いいね</p>
                      <p className="text-xl font-bold">{formatNumber(video.likeCount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-purple-50 p-3">
                    <MessageCircle className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-600">コメント</p>
                      <p className="text-xl font-bold">{formatNumber(video.commentCount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
                    <Share2 className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">シェア</p>
                      <p className="text-xl font-bold">{formatNumber(video.shareCount)}</p>
                    </div>
                  </div>
                </div>

                {/* Engagement Rate with Benchmark */}
                <div className="mt-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">エンゲージメント率</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatPercent(video.engagementRate)}
                      </p>
                    </div>
                    {erDiff && benchmark && (
                      <div className={`rounded-lg p-3 ${erDiff.bgColor}`}>
                        <p className="text-xs text-gray-600">業界平均比</p>
                        <div className={`flex items-center gap-1 text-lg font-bold ${erDiff.color}`}>
                          <erDiff.icon className="h-5 w-5" />
                          {erDiff.text}
                        </div>
                        <p className="text-xs text-gray-500">
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
              <CardHeader>
                <CardTitle>投稿者情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ユーザー名</p>
                      <p className="font-medium">@{video.authorUsername}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">フォロワー数</p>
                      <p className="font-medium">{formatNumber(video.authorFollowerCount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">投稿日時</p>
                      <p className="font-medium">{formatDateTime(video.postedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">収集日時</p>
                      <p className="font-medium">{formatDateTime(video.collectedAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {video.videoTags && video.videoTags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>分析タグ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {video.videoTags[0].industry && (
                      <div>
                        <p className="text-xs text-gray-500">業種</p>
                        <Badge variant="default">{video.videoTags[0].industry.name}</Badge>
                      </div>
                    )}
                    {video.videoTags[0].contentType && (
                      <div>
                        <p className="text-xs text-gray-500">コンテンツ類型</p>
                        <Badge variant="secondary">{video.videoTags[0].contentType}</Badge>
                      </div>
                    )}
                    {video.videoTags[0].hookType && (
                      <div>
                        <p className="text-xs text-gray-500">フックタイプ</p>
                        <Badge variant="outline">{video.videoTags[0].hookType}</Badge>
                      </div>
                    )}
                    {video.videoTags[0].durationCategory && (
                      <div>
                        <p className="text-xs text-gray-500">尺カテゴリ</p>
                        <Badge variant="secondary">{video.videoTags[0].durationCategory}</Badge>
                      </div>
                    )}
                    {video.videoTags[0].performerType && (
                      <div>
                        <p className="text-xs text-gray-500">出演者タイプ</p>
                        <Badge variant="outline">{video.videoTags[0].performerType}</Badge>
                      </div>
                    )}
                    {video.videoTags[0].tone && (
                      <div>
                        <p className="text-xs text-gray-500">トーン</p>
                        <Badge variant="secondary">{video.videoTags[0].tone}</Badge>
                      </div>
                    )}
                    {video.videoTags[0].ctaType && (
                      <div>
                        <p className="text-xs text-gray-500">CTAタイプ</p>
                        <Badge variant="outline">{video.videoTags[0].ctaType}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benchmark Comparison */}
            {benchmark && (
              <Card>
                <CardHeader>
                  <CardTitle>ベンチマーク比較</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
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
                          <td className="py-2">エンゲージメント率</td>
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
