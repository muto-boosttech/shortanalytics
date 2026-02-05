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
} from "recharts";
import { Calendar, Eye, Heart, TrendingUp, Video } from "lucide-react";

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

export default function DashboardPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
      fetch(`/api/dashboard?industry_id=${selectedIndustry}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setDashboardData(data.data);
          }
          setLoading(false);
        });
    }
  }, [selectedIndustry]);

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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="w-[200px]">
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

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <>
            {/* Data Range Info */}
            {dashboardData?.dataRange && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium text-gray-700">投稿期間:</span>
                      <span className="text-gray-600">
                        {formatDate(dashboardData.dataRange.postedFrom)} 〜 {formatDate(dashboardData.dataRange.postedTo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-accent" />
                      <span className="font-medium text-gray-700">収集期間:</span>
                      <span className="text-gray-600">
                        {formatDate(dashboardData.dataRange.collectedFrom)} 〜 {formatDate(dashboardData.dataRange.collectedTo)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {kpiCards.map((card) => (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {card.title}
                    </CardTitle>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts - 3 Column Layout */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Content Type ER Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">コンテンツ類型別ER</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData?.charts.contentTypeStats || []}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          dataKey="type" 
                          type="category" 
                          width={70} 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [
                            `${(Number(value) * 100).toFixed(2)}%`,
                            "ER",
                          ]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="avgEngagement" fill="#6366F1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Hook Type Views Chart - Changed to Horizontal Bar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">フック別再生数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData?.charts.hookTypeStats || []}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => formatNumber(value)}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          dataKey="type" 
                          type="category" 
                          width={85} 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [formatNumber(Number(value)), "再生数"]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="totalViews" fill="#EC4899" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Duration Category ER Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">動画尺別ER</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={sortedDurationStats}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          dataKey="category" 
                          type="category" 
                          width={60} 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value, _name, props) => {
                            const count = props?.payload?.count || 0;
                            return [
                              `${(Number(value) * 100).toFixed(2)}% (${count}件)`,
                              "ER",
                            ];
                          }}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="avgEngagement" fill="#10B981" radius={[0, 4, 4, 0]} />
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
