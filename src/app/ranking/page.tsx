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
  Filter,
  ChevronDown,
  ChevronUp,
  Video,
  Youtube,
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
  const [showFilters, setShowFilters] = useState(false);
  const [platform, setPlatform] = useState<"tiktok" | "youtube">("tiktok");

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

    params.append("platform", platform);

    fetch(`/api/videos?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVideos(data.data);
          setTotalPages(data.pagination.totalPages);
        }
        setLoading(false);
      });
  }, [selectedIndustry, selectedContentTypes, selectedHookTypes, sortBy, page, platform]);

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

  const activeFilterCount = selectedContentTypes.length + selectedHookTypes.length;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ランキング</h1>
          {/* Platform Toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1">
            <button
              onClick={() => {
                setPlatform("tiktok");
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                platform === "tiktok"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              TikTok
            </button>
            <button
              onClick={() => {
                setPlatform("youtube");
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                platform === "youtube"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Youtube className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              YouTube
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              {/* Main filters - always visible */}
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs sm:text-sm whitespace-nowrap">業種:</Label>
                  <Select
                    value={selectedIndustry}
                    onValueChange={(value) => {
                      setSelectedIndustry(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px] h-9">
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
                  <Label className="text-xs sm:text-sm whitespace-nowrap">並び替え:</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px] h-9">
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

                {/* Mobile filter toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="sm:hidden h-9"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  フィルター
                  {activeFilterCount > 0 && (
                    <Badge variant="accent" className="ml-1 h-5 px-1.5">
                      {activeFilterCount}
                    </Badge>
                  )}
                  {showFilters ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </div>

              {/* Expandable filters on mobile, always visible on desktop */}
              <div className={`space-y-3 ${showFilters ? "block" : "hidden sm:block"}`}>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">コンテンツ類型:</Label>
                  <div className="flex flex-wrap gap-x-3 gap-y-2 sm:gap-2">
                    {CONTENT_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-1.5 sm:space-x-2">
                        <Checkbox
                          id={`content-${type}`}
                          checked={selectedContentTypes.includes(type)}
                          onCheckedChange={() => toggleContentType(type)}
                          className="h-4 w-4"
                        />
                        <Label
                          htmlFor={`content-${type}`}
                          className="text-xs sm:text-sm font-normal cursor-pointer"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">フックタイプ:</Label>
                  <div className="flex flex-wrap gap-x-3 gap-y-2 sm:gap-2">
                    {HOOK_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-1.5 sm:space-x-2">
                        <Checkbox
                          id={`hook-${type}`}
                          checked={selectedHookTypes.includes(type)}
                          onCheckedChange={() => toggleHookType(type)}
                          className="h-4 w-4"
                        />
                        <Label
                          htmlFor={`hook-${type}`}
                          className="text-xs sm:text-sm font-normal cursor-pointer"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
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
            platform={platform}
            data={{
              allVideos: videos.map((v) => ({
                description: v.description,
                viewCount: v.viewCount,
                likeCount: v.likeCount,
                commentCount: v.commentCount,
                shareCount: v.shareCount,
                engagementRate: v.engagementRate,
                videoDurationSeconds: v.videoDurationSeconds,
                contentType: v.videoTags?.[0]?.contentType,
                hookType: v.videoTags?.[0]?.hookType,
                authorUsername: v.authorUsername,
                postedAt: v.postedAt,
                hashtags: v.hashtags,
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-[9/16]">
                    <VideoThumbnail
                      key={`thumb-${video.id}-${video.tiktokVideoId}`}
                      videoId={video.tiktokVideoId}
                      thumbnailUrl={video.thumbnailUrl}
                      description={video.description}
                      className="h-full w-full"
                      showPlayIcon={false}
                    />
                    <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 rounded bg-black/70 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs text-white">
                      {formatDuration(video.videoDurationSeconds)}
                    </div>
                  </div>
                  <CardContent className="p-2 sm:p-3">
                    <p className="mb-1.5 sm:mb-2 line-clamp-2 text-xs sm:text-sm font-medium">
                      {video.description}
                    </p>
                    <p className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs text-gray-500 truncate">
                      @{video.authorUsername} · {formatDate(video.postedAt)}
                    </p>

                    <div className="mb-1.5 sm:mb-2 grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-0.5 sm:gap-1 text-gray-600">
                        <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {formatNumber(video.viewCount)}
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 text-gray-600">
                        <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {formatNumber(video.likeCount)}
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 text-gray-600">
                        <MessageCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {formatNumber(video.commentCount)}
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 text-gray-600">
                        <Share2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {formatNumber(video.shareCount)}
                      </div>
                    </div>

                    <div className="mb-1.5 sm:mb-2">
                      <Badge variant="accent" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                        ER: {formatPercent(video.engagementRate)}
                      </Badge>
                    </div>

                    {video.videoTags && video.videoTags.length > 0 && (
                      <div className="mb-1.5 sm:mb-2 flex flex-wrap gap-1">
                        {video.videoTags[0]?.contentType && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                            {video.videoTags[0].contentType}
                          </Badge>
                        )}
                        {video.videoTags[0]?.hookType && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 hidden sm:inline-flex">
                            {video.videoTags[0].hookType}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-1.5 sm:gap-2">
                      <Link href={`/videos/${video.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-7 sm:h-8 text-xs sm:text-sm">
                          詳細
                        </Button>
                      </Link>
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                          <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">前へ</span>
              </Button>
              <span className="text-xs sm:text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <span className="hidden sm:inline mr-1">次へ</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
