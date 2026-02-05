"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils";
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AIAssistCard } from "@/components/ai-assist-card";

interface Industry {
  id: number;
  name: string;
  slug: string;
}

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
  thumbnailUrl: string | null;
  postedAt: string;
  videoTags: Array<{
    contentType: string;
    hookType: string;
    durationCategory: string;
    industry: { name: string };
  }>;
}

const CONTENT_TYPES = [
  "商品紹介",
  "ハウツー",
  "チュートリアル",
  "ビフォーアフター",
  "Vlog",
  "レビュー",
  "エンタメ",
  "ニュース",
];

const HOOK_TYPES = [
  "質問形式",
  "問題提起",
  "ストーリー導入",
  "比較",
  "ビフォーアフター",
  "数字インパクト",
];

const SORT_OPTIONS = [
  { value: "viewCount_desc", label: "再生数（多い順）" },
  { value: "engagementRate_desc", label: "ER（高い順）" },
  { value: "likeCount_desc", label: "いいね数（多い順）" },
  { value: "postedAt_desc", label: "投稿日（新しい順）" },
];

export default function RankingPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [selectedHookTypes, setSelectedHookTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("viewCount_desc");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch("/api/industries")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIndustries(data.data);
        }
      });
  }, []);

  const fetchVideos = useCallback(() => {
    setLoading(true);
    const [sortField, sortOrder] = sortBy.split("_");
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      sortBy: sortField,
      sortOrder: sortOrder,
    });

    if (selectedIndustry !== "all") {
      params.append("industry_id", selectedIndustry);
    }
    if (selectedContentTypes.length > 0) {
      params.append("content_type", selectedContentTypes.join(","));
    }
    if (selectedHookTypes.length > 0) {
      params.append("hook_type", selectedHookTypes.join(","));
    }

    fetch(`/api/videos?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVideos(data.data);
          setTotalPages(data.pagination.totalPages);
        }
        setLoading(false);
      });
  }, [selectedIndustry, selectedContentTypes, selectedHookTypes, sortBy, page]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const toggleContentType = (type: string) => {
    setSelectedContentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const toggleHookType = (type: string) => {
    setSelectedHookTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">ランキング</h1>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>業種:</Label>
                  <Select
                    value={selectedIndustry}
                    onValueChange={(value) => {
                      setSelectedIndustry(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="全業種" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全業種</SelectItem>
                      {industries.map((industry) => (
                        <SelectItem key={industry.id} value={industry.id.toString()}>
                          {industry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label>並び替え:</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">コンテンツ類型:</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`content-${type}`}
                        checked={selectedContentTypes.includes(type)}
                        onCheckedChange={() => toggleContentType(type)}
                      />
                      <Label
                        htmlFor={`content-${type}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">フックタイプ:</Label>
                <div className="flex flex-wrap gap-2">
                  {HOOK_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`hook-${type}`}
                        checked={selectedHookTypes.includes(type)}
                        onCheckedChange={() => toggleHookType(type)}
                      />
                      <Label
                        htmlFor={`hook-${type}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Assist Card */}
        {!loading && videos.length > 0 && (
          <AIAssistCard
            type="ranking"
            industryId={selectedIndustry !== "all" ? selectedIndustry : undefined}
            data={{
              topVideos: videos.slice(0, 10).map((v) => ({
                description: v.description,
                viewCount: v.viewCount,
                engagementRate: v.engagementRate,
                videoDurationSeconds: v.videoDurationSeconds,
                contentType: v.videoTags?.[0]?.contentType,
                hookType: v.videoTags?.[0]?.hookType,
              })),
            }}
            title="トップ動画の成功パターン"
          />
        )}

        {/* Video Cards */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-[9/16]">
                    <VideoThumbnail
                      videoId={video.tiktokVideoId}
                      thumbnailUrl={video.thumbnailUrl}
                      description={video.description}
                      className="h-full w-full"
                      showPlayIcon={false}
                    />
                    <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      {formatDuration(video.videoDurationSeconds)}
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="mb-2 line-clamp-2 text-sm font-medium">
                      {video.description}
                    </p>
                    <p className="mb-2 text-xs text-gray-500">
                      @{video.authorUsername} · {formatDate(video.postedAt)}
                    </p>

                    <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Eye className="h-3 w-3" />
                        {formatNumber(video.viewCount)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Heart className="h-3 w-3" />
                        {formatNumber(video.likeCount)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <MessageCircle className="h-3 w-3" />
                        {formatNumber(video.commentCount)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Share2 className="h-3 w-3" />
                        {formatNumber(video.shareCount)}
                      </div>
                    </div>

                    <div className="mb-2">
                      <Badge variant="accent" className="text-xs">
                        ER: {formatPercent(video.engagementRate)}
                      </Badge>
                    </div>

                    {video.videoTags && video.videoTags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {video.videoTags[0]?.contentType && (
                          <Badge variant="secondary" className="text-xs">
                            {video.videoTags[0].contentType}
                          </Badge>
                        )}
                        {video.videoTags[0]?.hookType && (
                          <Badge variant="outline" className="text-xs">
                            {video.videoTags[0].hookType}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link href={`/videos/${video.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          詳細
                        </Button>
                      </Link>
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                前へ
              </Button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages} ページ
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                次へ
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
