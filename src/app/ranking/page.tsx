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
  Instagram,
  Calendar,
} from "lucide-react";
import { AIAssistCard } from "@/components/ai-assist-card";
import { ExportButton } from "@/components/export-button";
import { RefreshButton } from "@/components/refresh-button";
import { UsageBanner } from "@/components/usage-banner";

interface Industry {
  id: number;
  name: string;
  slug: string;
}

interface VideoItem {
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

interface DataRange {
  postedFrom: string | null;
  postedTo: string | null;
  collectedFrom: string | null;
  collectedTo: string | null;
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
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [platform, setPlatform] = useState<"tiktok" | "youtube" | "instagram">("tiktok");
  const [dataRange, setDataRange] = useState<DataRange | null>(null);

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
      sort_by: sortField,
      sort_order: sortOrder,
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
          if (data.dataRange) {
            setDataRange(data.dataRange);
          }
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

  // 日付フォーマット関数
  const formatDateFull = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const activeFilterCount = selectedContentTypes.length + selectedHookTypes.length;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Usage Banner */}
        <UsageBanner />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ランキング</h1>
          <div className="flex items-center gap-2 sm:gap-3">
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
            <button
              onClick={() => {
                setPlatform("instagram");
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                platform === "instagram"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Instagram className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Instagram
            </button>
          </div>
          <RefreshButton
            type="full"
            platform={platform}
            industryId={selectedIndustry !== "all" ? selectedIndustry : undefined}
            onRefreshComplete={fetchVideos}
            label="データ更新"
          />
          <ExportButton
            type="ranking"
            platform={platform}
            industryId={selectedIndustry}
            industryName={industries.find(i => i.id.toString() === selectedIndustry)?.name || "全業種"}
            sortBy={sortBy.split("_")[0]}
            sortOrder={sortBy.split("_")[1]}
          />
          </div>
        </div>

        {/* Data Range Info */}
        {dataRange && (
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="py-3 sm:py-4">
              <div className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2 sm:text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 sm:h-4 sm:w-4" />
                  <span className="font-medium text-gray-700">投稿期間:</span>
                  <span className="text-gray-600 hidden sm:inline">
                    {formatDateFull(dataRange.postedFrom)} 〜 {formatDateFull(dataRange.postedTo)}
                  </span>
                  <span className="text-gray-600 sm:hidden">
                    {formatDateShort(dataRange.postedFrom)} 〜 {formatDateShort(dataRange.postedTo)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-teal-600 sm:h-4 sm:w-4" />
                  <span className="font-medium text-gray-700">収集期間:</span>
                  <span className="text-gray-600 hidden sm:inline">
                    {formatDateFull(dataRange.collectedFrom)} 〜 {formatDateFull(dataRange.collectedTo)}
                  </span>
                  <span className="text-gray-600 sm:hidden">
                    {formatDateShort(dataRange.collectedFrom)} 〜 {formatDateShort(dataRange.collectedTo)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
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

              {/* Advanced filters */}
              <div className={`space-y-3 ${showFilters ? "block" : "hidden sm:block"}`}>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">コンテンツ類型:</Label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {CONTENT_TYPES.map((type) => (
                      <label
                        key={type}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] sm:text-xs cursor-pointer transition-colors ${
                          selectedContentTypes.includes(type)
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <Checkbox
                          checked={selectedContentTypes.includes(type)}
                          onCheckedChange={() => toggleContentType(type)}
                          className="h-3 w-3 border-gray-300"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">フックタイプ:</Label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {HOOK_TYPES.map((type) => (
                      <label
                        key={type}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] sm:text-xs cursor-pointer transition-colors ${
                          selectedHookTypes.includes(type)
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <Checkbox
                          checked={selectedHookTypes.includes(type)}
                          onCheckedChange={() => toggleHookType(type)}
                          className="h-3 w-3 border-gray-300"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Assist */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <AIAssistCard
            type="ranking"
            platform={platform}
            industryId={selectedIndustry !== "all" ? selectedIndustry : undefined}
            data={{
              totalVideos: videos.length,
              sortBy: sortBy.split("_")[0],
            }}
            title="ランキング分析"
          />
        </Card>

        {/* Video List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : videos.length === 0 ? (
          <Card>
            <CardContent className="flex h-48 items-center justify-center">
              <p className="text-gray-500 text-sm">
                該当する動画が見つかりません。フィルターを変更してください。
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {videos.map((video, index) => (
                <Card key={video.id} className="border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Rank & Thumbnail */}
                      <div className="flex items-start gap-2 p-3 sm:p-4">
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs sm:text-sm font-bold text-emerald-700">
                          {(page - 1) * 20 + index + 1}
                        </div>
                        <div className="w-[100px] sm:w-[120px] flex-shrink-0">
                          <VideoThumbnail
                            videoId={video.tiktokVideoId}
                            thumbnailUrl={video.thumbnailUrl}
                            description={video.description?.substring(0, 50) || "動画"}
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-3 pt-0 sm:p-4 sm:pl-0">
                        <div className="mb-2">
                          <Link
                            href={`/videos/${video.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-emerald-600 line-clamp-2 sm:text-base transition-colors"
                          >
                            {video.description?.substring(0, 100) || "（説明なし）"}
                          </Link>
                          <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">
                            @{video.authorUsername || "不明"} ・ {formatDate(video.postedAt)}
                          </p>
                        </div>

                        {/* Tags */}
                        {video.videoTags && video.videoTags.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {video.videoTags.map((tag, i) => (
                              <div key={i} className="flex gap-1">
                                {tag.contentType && (
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {tag.contentType}
                                  </Badge>
                                )}
                                {tag.hookType && (
                                  <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                                    {tag.hookType}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600 sm:text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-emerald-500" />
                            {formatNumber(video.viewCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-rose-400" />
                            {formatNumber(video.likeCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3 text-teal-500" />
                            {formatNumber(video.commentCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3 text-blue-400" />
                            {formatNumber(video.shareCount)}
                          </span>
                          <span className="font-medium text-emerald-600">
                            ER: {formatPercent(video.engagementRate)}
                          </span>
                          {video.videoDurationSeconds && (
                            <span className="text-gray-400">
                              {formatDuration(video.videoDurationSeconds)}
                            </span>
                          )}
                          {video.videoUrl && (
                            <a
                              href={video.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="hidden sm:inline">元動画</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 py-4">
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
