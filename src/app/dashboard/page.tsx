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
import dynamic from "next/dynamic";

// Rechartsを動的インポートで遅延読み込み
const LazyBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-gray-400 text-sm">チャート読み込み中...</div> }
);
const LazyBar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const LazyXAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const LazyYAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const LazyCartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const LazyTooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const LazyResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const LazyCell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });
const LazyLineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const LazyLine = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const LazyArea = dynamic(() => import("recharts").then((mod) => mod.Area), { ssr: false });
const LazyAreaChart = dynamic(() => import("recharts").then((mod) => mod.AreaChart), { ssr: false });
const LazyLegend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
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

// TeamHub風カラーパレット（エメラルドグリーン系グラデーション）
const CONTENT_TYPE_COLORS = ["#059669", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"];
const HOOK_TYPE_COLORS = ["#0D9488", "#14B8A6", "#2DD4BF", "#5EEAD4", "#99F6E4", "#CCFBF1"];
const DURATION_COLORS = ["#047857", "#059669", "#10B981", "#34D399"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs font-medium text-gray-600">{label}</p>}
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

export default function DashboardPage() {
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
              industryName={industries.find(i => i.id.toString() === selectedIndustry)?.name || "全業種"}
            />
          </div>
        </div>

        {/* Usage Banner */}
        <UsageBanner />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <>
            {/* Data Range Info */}
            {dashboardData?.dataRange && (
              <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                <CardContent className="py-3 sm:py-4">
                  <div className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2 sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600 sm:h-4 sm:w-4" />
                      <span className="font-medium text-gray-700">投稿期間:</span>
                      <span className="text-gray-600 hidden sm:inline">
                        {formatDate(dashboardData.dataRange.postedFrom)} 〜 {formatDate(dashboardData.dataRange.postedTo)}
                      </span>
                      <span className="text-gray-600 sm:hidden">
                        {formatDateShort(dashboardData.dataRange.postedFrom)} 〜 {formatDateShort(dashboardData.dataRange.postedTo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-teal-600 sm:h-4 sm:w-4" />
                      <span className="font-medium text-gray-700">収集期間:</span>
                      <span className="text-gray-600 hidden sm:inline">
                        {formatDate(dashboardData.dataRange.collectedFrom)} 〜 {formatDate(dashboardData.dataRange.collectedTo)}
                      </span>
                      <span className="text-gray-600 sm:hidden">
                        {formatDateShort(dashboardData.dataRange.collectedFrom)} 〜 {formatDateShort(dashboardData.dataRange.collectedTo)}
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
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500 sm:text-sm">
                      {card.title}
                    </CardTitle>
                    <div className={`rounded-lg p-1.5 sm:p-2 ${card.bgColor}`}>
                      <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="text-lg font-bold text-gray-900 sm:text-2xl">{card.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Content Type ER Chart */}
              <Card className="border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-800 sm:text-base">コンテンツ類型別ER</CardTitle>
                    <span className="text-[10px] text-gray-400 sm:text-xs">エンゲージメント率</span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[220px] sm:h-[300px]">
                    <LazyResponsiveContainer width="100%" height="100%">
                      <LazyBarChart
                        data={dashboardData?.charts.contentTypeStats || []}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <LazyCartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                        <LazyXAxis
                          type="number"
                          tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#9CA3AF" }}
                        />
                        <LazyYAxis 
                          dataKey="type" 
                          type="category" 
                          width={90} 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#4B5563" }}
                        />
                        <LazyTooltip
                          content={(props: any) => (
                            <CustomTooltip
                              active={props.active}
                              payload={props.payload}
                              label={props.label}
                              formatter={(value: number) => [
                                `${(value * 100).toFixed(2)}%`,
                                "ER",
                              ]}
                            />
                          )}
                        />
                        <LazyBar dataKey="avgEngagement" radius={[0, 6, 6, 0]} barSize={20}>
                          {(dashboardData?.charts.contentTypeStats || []).map((_, index) => (
                            <LazyCell key={`cell-${index}`} fill={CONTENT_TYPE_COLORS[index % CONTENT_TYPE_COLORS.length]} />
                          ))}
                        </LazyBar>
                      </LazyBarChart>
                    </LazyResponsiveContainer>
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
                    <LazyResponsiveContainer width="100%" height="100%">
                      <LazyBarChart
                        data={dashboardData?.charts.hookTypeStats || []}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <LazyCartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                        <LazyXAxis
                          type="number"
                          tickFormatter={(value: number) => formatNumber(value)}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#9CA3AF" }}
                        />
                        <LazyYAxis 
                          dataKey="type" 
                          type="category" 
                          width={100} 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#4B5563" }}
                        />
                        <LazyTooltip
                          content={(props: any) => (
                            <CustomTooltip
                              active={props.active}
                              payload={props.payload}
                              label={props.label}
                              formatter={(value: number) => [formatNumber(value), "再生数"]}
                            />
                          )}
                        />
                        <LazyBar dataKey="totalViews" radius={[0, 6, 6, 0]} barSize={20}>
                          {(dashboardData?.charts.hookTypeStats || []).map((_, index) => (
                            <LazyCell key={`cell-${index}`} fill={HOOK_TYPE_COLORS[index % HOOK_TYPE_COLORS.length]} />
                          ))}
                        </LazyBar>
                      </LazyBarChart>
                    </LazyResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AI Assist Card */}
              <Card className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                <AIAssistCard
                  type="dashboard"
                  industryId={selectedIndustry}
                  data={{
                    totalVideos: dashboardData?.kpi.totalVideos || 0,
                    totalViews: dashboardData?.kpi.totalViews || 0,
                    avgEngagementRate: dashboardData?.kpi.avgEngagementRate || 0,
                    contentTypeStats: dashboardData?.charts.contentTypeStats || [],
                    hookTypeStats: dashboardData?.charts.hookTypeStats || [],
                    durationStats: sortedDurationStats,
                  }}
                  title="伸びる投稿の特徴"
                />
              </Card>

              {/* Duration Category ER Chart - Full Width */}
              <Card className="lg:col-span-2 border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-800 sm:text-base">動画尺別ER</CardTitle>
                    <span className="text-[10px] text-gray-400 sm:text-xs">エンゲージメント率</span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[180px] sm:h-[220px]">
                    <LazyResponsiveContainer width="100%" height="100%">
                      <LazyBarChart
                        data={sortedDurationStats}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <LazyCartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                        <LazyXAxis
                          type="number"
                          tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#9CA3AF" }}
                        />
                        <LazyYAxis 
                          dataKey="category" 
                          type="category" 
                          width={70} 
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#4B5563" }}
                        />
                        <LazyTooltip
                          content={(props: any) => (
                            <CustomTooltip
                              active={props.active}
                              payload={props.payload}
                              label={props.label}
                              formatter={(value: number, _name: string, entryPayload: any) => {
                                const count = entryPayload?.count || 0;
                                return [
                                  `${(value * 100).toFixed(2)}% (${count}件)`,
                                  "ER",
                                ];
                              }}
                            />
                          )}
                        />
                        <LazyBar dataKey="avgEngagement" radius={[0, 6, 6, 0]} barSize={24}>
                          {sortedDurationStats.map((_, index) => (
                            <LazyCell key={`cell-${index}`} fill={DURATION_COLORS[index % DURATION_COLORS.length]} />
                          ))}
                        </LazyBar>
                      </LazyBarChart>
                    </LazyResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Trend Chart - Full Width */}
              {dashboardData?.charts.dailyTrend && dashboardData.charts.dailyTrend.length > 0 && (
                <Card className="lg:col-span-2 border-gray-200 hover:shadow-md transition-shadow">
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
                      <LazyResponsiveContainer width="100%" height="100%">
                        <LazyAreaChart
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
                          <LazyCartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <LazyXAxis
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
                          <LazyYAxis
                            yAxisId="left"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF" }}
                          />
                          <LazyYAxis
                            yAxisId="right"
                            orientation="right"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF" }}
                            tickFormatter={(value: number) => formatNumber(value)}
                          />
                          <LazyTooltip
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
                          <LazyArea
                            yAxisId="left"
                            type="monotone"
                            dataKey="videos"
                            stroke="#059669"
                            strokeWidth={2}
                            fill="url(#colorVideos)"
                          />
                          <LazyArea
                            yAxisId="right"
                            type="monotone"
                            dataKey="views"
                            stroke="#0D9488"
                            strokeWidth={2}
                            fill="url(#colorViews)"
                          />
                        </LazyAreaChart>
                      </LazyResponsiveContainer>
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
