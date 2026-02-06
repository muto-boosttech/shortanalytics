"use client";

import { useEffect, useState } from "react";
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
} from "recharts";
import { Calendar, Eye, Heart, TrendingUp, Video, Youtube } from "lucide-react";
import { AIAssistCard } from "@/components/ai-assist-card";

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

// カラーパレット
const CONTENT_TYPE_COLORS = ["#6366F1", "#8B5CF6", "#A855F7", "#C084FC", "#D8B4FE"];
const HOOK_TYPE_COLORS = ["#EC4899", "#F472B6", "#F9A8D4", "#FBCFE8", "#F43F5E", "#FB7185"];
const DURATION_COLORS = ["#10B981", "#34D399", "#6EE7B7", "#A7F3D0"];

export default function DashboardPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<"tiktok" | "youtube">("tiktok");

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

  useEffect(() => {
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

  const kpiCards = dashboardData
    ? [
        {
          title: "総動画数",
          value: formatNumber(dashboardData.kpi.totalVideos),
          icon: Video,
          color: "text-primary",
        },
        {
          title: "総再生数",
          value: formatNumber(dashboardData.kpi.totalViews),
          icon: Eye,
          color: "text-blue-500",
        },
        {
          title: "平均ER",
          value: formatPercent(dashboardData.kpi.avgEngagementRate),
          icon: TrendingUp,
          color: "text-green-500",
        },
        {
          title: "総いいね数",
          value: formatNumber(dashboardData.kpi.totalLikes),
          icon: Heart,
          color: "text-accent",
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
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <>
            {/* Data Range Info */}
            {dashboardData?.dataRange && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="py-3 sm:py-4">
                  <div className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2 sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                      <span className="font-medium text-gray-700">投稿期間:</span>
                      <span className="text-gray-600 hidden sm:inline">
                        {formatDate(dashboardData.dataRange.postedFrom)} 〜 {formatDate(dashboardData.dataRange.postedTo)}
                      </span>
                      <span className="text-gray-600 sm:hidden">
                        {formatDateShort(dashboardData.dataRange.postedFrom)} 〜 {formatDateShort(dashboardData.dataRange.postedTo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
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
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                    <CardTitle className="text-xs font-medium text-gray-600 sm:text-sm">
                      {card.title}
                    </CardTitle>
                    <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="text-lg font-bold sm:text-2xl">{card.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Content Type ER Chart */}
              <Card>
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm sm:text-base">コンテンツ類型別ER</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[220px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData?.charts.contentTypeStats || []}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          dataKey="type" 
                          type="category" 
                          width={60} 
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [
                            `${(Number(value || 0) * 100).toFixed(2)}%`,
                            "ER",
                          ]}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Bar dataKey="avgEngagement" radius={[0, 4, 4, 0]}>
                          {(dashboardData?.charts.contentTypeStats || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CONTENT_TYPE_COLORS[index % CONTENT_TYPE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Hook Type Views Chart */}
              <Card>
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm sm:text-base">フック別再生数</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[220px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData?.charts.hookTypeStats || []}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => formatNumber(value)}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          dataKey="type" 
                          type="category" 
                          width={70} 
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [formatNumber(Number(value || 0)), "再生数"]}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Bar dataKey="totalViews" radius={[0, 4, 4, 0]}>
                          {(dashboardData?.charts.hookTypeStats || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={HOOK_TYPE_COLORS[index % HOOK_TYPE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AI Assist Card */}
              <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
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
              <Card className="lg:col-span-2">
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm sm:text-base">動画尺別ER</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[180px] sm:h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={sortedDurationStats}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          dataKey="category" 
                          type="category" 
                          width={55} 
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value, _name, props) => {
                            const count = props?.payload?.count || 0;
                            return [
                              `${(Number(value || 0) * 100).toFixed(2)}% (${count}件)`,
                              "ER",
                            ];
                          }}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Bar dataKey="avgEngagement" radius={[0, 4, 4, 0]}>
                          {sortedDurationStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DURATION_COLORS[index % DURATION_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
