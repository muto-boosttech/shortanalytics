"use client";

import { useEffect, useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Calendar, Eye, Heart, TrendingUp, Video, Youtube, Instagram, MessageCircle, Share2 } from "lucide-react";
import { AIAssistCard } from "@/components/ai-assist-card";
import { ExportButton } from "@/components/export-button";
import { RefreshButton } from "@/components/refresh-button";
import { UsageBanner } from "@/components/usage-banner";

interface Industry {
  id: number;
  name: string;
  slug: string;
}

interface DashboardData {
  kpi: {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: number;
    avgViewCount: number;
    medianViewCount: number;
  };
  charts: {
    contentTypeStats: Array<{
      type: string;
      count: number;
      totalViews: number;
      avgEngagement: number;
    }>;
    hookTypeStats: Array<{
      type: string;
      count: number;
      totalViews: number;
      avgEngagement: number;
    }>;
    durationCategoryStats: Array<{
      category: string;
      count: number;
      totalViews: number;
      avgEngagement: number;
    }>;
    dailyTrend: Array<{
      date: string;
      videos: number;
      views: number;
      engagement: number;
    }>;
  };
  dataRange: {
    postedFrom: string | null;
    postedTo: string | null;
    collectedFrom: string | null;
    collectedTo: string | null;
  };
}

// 動画尺カテゴリの表示順序
const DURATION_ORDER = ["〜15秒", "〜30秒", "〜60秒", "60秒以上"];

// カラーパレット（参考デザイン準拠）
const CONTENT_TYPE_COLORS = ["#6366F1", "#818CF8", "#A78BFA", "#C4B5FD", "#DDD6FE", "#8B5CF6", "#7C3AED"];
const HOOK_TYPE_COLORS = ["#EC4899", "#F472B6", "#F9A8D4", "#FBCFE8", "#F43F5E", "#EF4444"];
const DURATION_COLORS = ["#6366F1", "#818CF8", "#A78BFA", "#C4B5FD"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs font-medium text-gray-600">{label}</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, index: number) => {
        const [formattedValue, name] = formatter
          ? formatter(entry.value, entry.dataKey, entry.payload)
          : [String(entry.value), entry.dataKey];
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500">{name}:</span>
            <span className="font-semibold text-gray-900">{formattedValue}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function DashboardContent() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<"tiktok" | "youtube" | "instagram">("tiktok");

  useEffect(() => {
    fetch("/api/industries")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIndustries(data.data);
          if (data.data.length > 0) {
            setSelectedIndustry(data.data[0].id.toString());
          }
        }
      });
  }, []);

  const fetchDashboardData = useCallback(() => {
    if (selectedIndustry) {
      setLoading(true);
      fetch(`/api/dashboard?industry_id=${selectedIndustry}&platform=${platform}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setDashboardData(data.data);
          }
          setLoading(false);
        });
    }
  }, [selectedIndustry, platform]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const kpiCards = dashboardData
    ? [
        {
          title: "総動画数",
          value: formatNumber(dashboardData.kpi.totalVideos),
          icon: Video,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          title: "総再生数",
          value: formatNumber(dashboardData.kpi.totalViews),
          icon: Eye,
          color: "text-teal-600",
          bgColor: "bg-teal-50",
        },
        {
          title: "平均ER",
          value: formatPercent(dashboardData.kpi.avgEngagementRate),
          icon: TrendingUp,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          title: "総いいね数",
          value: formatNumber(dashboardData.kpi.totalLikes),
          icon: Heart,
          color: "text-teal-600",
          bgColor: "bg-teal-50",
        },
      ]
    : [];

  // 動画尺カテゴリを指定順序でソート
  const sortedDurationStats = dashboardData?.charts.durationCategoryStats
    ? [...dashboardData.charts.durationCategoryStats].sort((a, b) => {
        const indexA = DURATION_ORDER.indexOf(a.category);
        const indexB = DURATION_ORDER.indexOf(b.category);
        return indexA - indexB;
      })
    : [];

  // 日付フォーマット関数
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 短い日付フォーマット（モバイル用）
  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ダッシュボード</h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Platform Toggle */}
            <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1">
              <button
                onClick={() => setPlatform("tiktok")}
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
                onClick={() => setPlatform("youtube")}
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
                onClick={() => setPlatform("instagram")}
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
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="業種を選択" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry.id} value={industry.id.toString()}>
                    {industry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RefreshButton
              type="full"
              platform={platform}
              industryId={selectedIndustry}
              onRefreshComplete={fetchDashboardData}
              label="データ更新"
            />
            <ExportButton
              type="dashboard"
              platform={platform}
              industryId={selectedIndustry}
            />
          </div>
        </div>

        <UsageBanner />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Data Range Info */}
            {dashboardData?.dataRange && (
              <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                <CardContent className="py-3 sm:py-4">
                  <div className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2 sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">投稿期間:</span>
                      <span className="text-emerald-900">
                        <span className="hidden sm:inline">
                          {formatDate(dashboardData.dataRange.postedFrom)} 〜 {formatDate(dashboardData.dataRange.postedTo)}
                        </span>
                        <span className="sm:hidden">
                          {formatDateShort(dashboardData.dataRange.postedFrom)} 〜 {formatDateShort(dashboardData.dataRange.postedTo)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-teal-600" />
                      <span className="text-teal-700 font-medium">収集期間:</span>
                      <span className="text-teal-900">
                        <span className="hidden sm:inline">
                          {formatDate(dashboardData.dataRange.collectedFrom)} 〜 {formatDate(dashboardData.dataRange.collectedTo)}
                        </span>
                        <span className="sm:hidden">
                          {formatDateShort(dashboardData.dataRange.collectedFrom)} 〜 {formatDateShort(dashboardData.dataRange.collectedTo)}
                        </span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {kpiCards.map((card) => (
                <Card key={card.title} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 sm:text-sm">{card.title}</span>
                      <div className={`rounded-lg p-1.5 sm:p-2 ${card.bgColor}`}>
                        <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900 sm:text-2xl">{card.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Content Type Chart - ER or Views based on data availability */}
              <Card className="border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-800 sm:text-base">
                      {(() => {
                        const stats = dashboardData?.charts.contentTypeStats || [];
                        const hasER = stats.some(s => s.avgEngagement > 0);
                        return hasER ? "コンテンツ類型別ER" : "コンテンツ類型別再生数";
                      })()}
                    </CardTitle>
                    <span className="text-[10px] text-gray-400 sm:text-xs">
                      {(() => {
                        const stats = dashboardData?.charts.contentTypeStats || [];
                        const hasER = stats.some(s => s.avgEngagement > 0);
                        return hasER ? "エンゲージメント率" : "総再生数";
                      })()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[220px] sm:h-[300px]">
                    {(dashboardData?.charts.contentTypeStats || []).length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-gray-400">データがありません</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dashboardData?.charts.contentTypeStats || []}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            type="number"
                            tickFormatter={(value: number) => {
                              const stats = dashboardData?.charts.contentTypeStats || [];
                              const hasER = stats.some(s => s.avgEngagement > 0);
                              return hasER ? `${(value * 100).toFixed(0)}%` : formatNumber(value);
                            }}
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF" }}
                          />
                          <YAxis 
                            dataKey="type" 
                            type="category" 
                            width={90} 
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#4B5563" }}
                          />
                          <Tooltip
                            content={(props: any) => {
                              const stats = dashboardData?.charts.contentTypeStats || [];
                              const hasER = stats.some(s => s.avgEngagement > 0);
                              return (
                                <CustomTooltip
                                  active={props.active}
                                  payload={props.payload}
                                  label={props.label}
                                  formatter={(value: number, _name: string, entryPayload: any) => {
                                    if (hasER) {
                                      const count = entryPayload?.count || 0;
                                      return [`${(value * 100).toFixed(2)}% (${count}件)`, "ER"];
                                    }
                                    const count = entryPayload?.count || 0;
                                    return [`${formatNumber(value)} (${count}件)`, "再生数"];
                                  }}
                                />
                              );
                            }}
                          />
                          <Bar
                            dataKey={(() => {
                              const stats = dashboardData?.charts.contentTypeStats || [];
                              const hasER = stats.some(s => s.avgEngagement > 0);
                              return hasER ? "avgEngagement" : "totalViews";
                            })()}
                            radius={[0, 6, 6, 0]}
                            barSize={20}
                          >
                            {(dashboardData?.charts.contentTypeStats || []).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CONTENT_TYPE_COLORS[index % CONTENT_TYPE_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Hook Type Views Chart */}
              <Card className="border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-800 sm:text-base">フック別再生数</CardTitle>
                    <span className="text-[10px] text-gray-400 sm:text-xs">総再生数</span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[220px] sm:h-[300px]">
                    {(dashboardData?.charts.hookTypeStats || []).length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-gray-400">データがありません</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dashboardData?.charts.hookTypeStats || []}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            type="number"
                            tickFormatter={(value: number) => formatNumber(value)}
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF" }}
                          />
                          <YAxis 
                            dataKey="type" 
                            type="category" 
                            width={90} 
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#4B5563" }}
                          />
                          <Tooltip
                            content={(props: any) => (
                              <CustomTooltip
                                active={props.active}
                                payload={props.payload}
                                label={props.label}
                                formatter={(value: number, _name: string, entryPayload: any) => {
                                  const count = entryPayload?.count || 0;
                                  return [`${formatNumber(value)} (${count}件)`, "再生数"];
                                }}
                              />
                            )}
                          />
                          <Bar dataKey="totalViews" radius={[0, 6, 6, 0]} barSize={20}>
                            {(dashboardData?.charts.hookTypeStats || []).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={HOOK_TYPE_COLORS[index % HOOK_TYPE_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Assist Card */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
              <AIAssistCard
                type="dashboard"
                platform={platform}
                industryId={selectedIndustry}
                data={{
                  totalVideos: dashboardData?.kpi.totalVideos || 0,
                  totalViews: dashboardData?.kpi.totalViews || 0,
                  avgEngagementRate: dashboardData?.kpi.avgEngagementRate || 0,
                }}
              />
            </Card>

            {/* Second Row Charts */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Duration Category Chart - ER or Views based on data availability */}
              <Card className="border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-800 sm:text-base">
                      {sortedDurationStats.some(s => s.avgEngagement > 0) ? "動画尺別ER" : "動画尺別再生数"}
                    </CardTitle>
                    <span className="text-[10px] text-gray-400 sm:text-xs">
                      {sortedDurationStats.some(s => s.avgEngagement > 0) ? "エンゲージメント率" : "総再生数"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[180px] sm:h-[240px]">
                    {sortedDurationStats.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-gray-400">データがありません</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={sortedDurationStats}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            type="number"
                            tickFormatter={(value: number) => {
                              const hasER = sortedDurationStats.some(s => s.avgEngagement > 0);
                              return hasER ? `${(value * 100).toFixed(0)}%` : formatNumber(value);
                            }}
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF" }}
                          />
                          <YAxis 
                            dataKey="category" 
                            type="category" 
                            width={70} 
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#4B5563" }}
                          />
                          <Tooltip
                            content={(props: any) => {
                              const hasER = sortedDurationStats.some(s => s.avgEngagement > 0);
                              return (
                                <CustomTooltip
                                  active={props.active}
                                  payload={props.payload}
                                  label={props.label}
                                  formatter={(value: number, _name: string, entryPayload: any) => {
                                    const count = entryPayload?.count || 0;
                                    if (hasER) {
                                      return [`${(value * 100).toFixed(2)}% (${count}件)`, "ER"];
                                    }
                                    return [`${formatNumber(value)} (${count}件)`, "再生数"];
                                  }}
                                />
                              );
                            }}
                          />
                          <Bar
                            dataKey={sortedDurationStats.some(s => s.avgEngagement > 0) ? "avgEngagement" : "totalViews"}
                            radius={[0, 6, 6, 0]}
                            barSize={24}
                          >
                            {sortedDurationStats.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={DURATION_COLORS[index % DURATION_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Trend Chart */}
              {dashboardData?.charts.dailyTrend && dashboardData.charts.dailyTrend.length > 0 && (
                <Card className="lg:col-span-1 border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-800 sm:text-base">日別トレンド</CardTitle>
                      <div className="flex items-center gap-4 text-[10px] sm:text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>投稿数</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-teal-500" />
                          <span>再生数</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="h-[200px] sm:h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={dashboardData.charts.dailyTrend}
                          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis
                            dataKey="date"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF" }}
                            tickFormatter={(value: string) => {
                              const d = new Date(value);
                              return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                          />
                          <YAxis
                            yAxisId="left"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF" }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF" }}
                            tickFormatter={(value: number) => formatNumber(value)}
                          />
                          <Tooltip
                            content={(props: any) => {
                              if (!props.active || !props.payload) return null;
                              const d = props.label ? new Date(props.label) : null;
                              const dateLabel = d ? `${d.getMonth() + 1}月${d.getDate()}日` : "";
                              return (
                                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
                                  <p className="mb-1 text-xs font-medium text-gray-600">{dateLabel}</p>
                                  {props.payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-gray-500">
                                        {entry.dataKey === "videos" ? "投稿数" : "再生数"}:
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {entry.dataKey === "videos" ? entry.value : formatNumber(entry.value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }}
                          />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="videos"
                            stroke="#059669"
                            strokeWidth={2}
                            fill="url(#colorVideos)"
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="views"
                            stroke="#0D9488"
                            strokeWidth={2}
                            fill="url(#colorViews)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
