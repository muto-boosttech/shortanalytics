"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatPercent, formatNumber } from "@/lib/utils";
import {
  Tag,
  Calculator,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface Industry {
  id: number;
  name: string;
  slug: string;
}

interface TaggingResult {
  success: boolean;
  message: string;
  data?: {
    tagged: number;
    skipped: number;
  };
}

interface BenchmarkResult {
  success: boolean;
  message: string;
  data?: {
    recalculated: number;
    results: {
      industryId: number;
      industryName: string;
      sampleSize: number;
      avgEngagementRate: number;
      medianViewCount: number;
    }[];
  };
}

interface TopType {
  type: string;
  count: number;
}

interface Benchmark {
  id: number;
  periodStart: string;
  periodEnd: string;
  avgEngagementRate: number;
  medianViewCount: number;
  topContentTypes: TopType[];
  topHookTypes: TopType[];
  sampleSize: number;
  calculatedAt: string;
  industry: { name: string };
}

export default function AdminPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [untaggedCount, setUntaggedCount] = useState<number>(0);
  const [tagging, setTagging] = useState(false);
  const [taggingResult, setTaggingResult] = useState<TaggingResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(true);

  useEffect(() => {
    fetch("/api/industries")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIndustries(data.data);
        }
      });

    fetchUntaggedCount();
    fetchBenchmarks();
  }, []);

  const fetchUntaggedCount = async () => {
    const response = await fetch("/api/videos?has_tags=false&limit=1");
    const data = await response.json();
    if (data.success) {
      setUntaggedCount(data.pagination.total);
    }
  };

  const fetchBenchmarks = async () => {
    setLoadingBenchmarks(true);
    const response = await fetch("/api/benchmarks");
    const data = await response.json();
    if (data.success) {
      setBenchmarks(data.data);
    }
    setLoadingBenchmarks(false);
  };

  const runAutoTagging = async () => {
    setTagging(true);
    setTaggingResult(null);

    try {
      const params = new URLSearchParams();
      if (selectedIndustry !== "all") {
        params.append("industry_id", selectedIndustry);
      }

      const response = await fetch(`/api/videos/auto-tag?${params}`, {
        method: "POST",
      });

      const data = await response.json();
      setTaggingResult({
        success: data.success,
        message: data.success
          ? `${data.data.tagged}件の動画にタグを付与しました`
          : data.error || "タギングに失敗しました",
        data: data.success ? data.data : undefined,
      });

      if (data.success) {
        fetchUntaggedCount();
      }
    } catch (error) {
      setTaggingResult({
        success: false,
        message: "エラーが発生しました",
      });
    } finally {
      setTagging(false);
    }
  };

  const recalculateBenchmarks = async () => {
    setCalculating(true);
    setBenchmarkResult(null);

    try {
      const params = new URLSearchParams();
      if (selectedIndustry !== "all") {
        params.append("industry_id", selectedIndustry);
      }

      const response = await fetch(`/api/benchmarks/recalculate?${params}`, {
        method: "POST",
      });

      const data = await response.json();
      setBenchmarkResult({
        success: data.success,
        message: data.success
          ? `${data.data?.recalculated || 0}業種のベンチマークを再計算しました`
          : data.error || "再計算に失敗しました",
        data: data.success ? data.data : undefined,
      });

      if (data.success) {
        fetchBenchmarks();
      }
    } catch (error) {
      setBenchmarkResult({
        success: false,
        message: "エラーが発生しました",
      });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">タギング＆ベンチマーク</h1>

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">未タグ動画数</CardTitle>
              <AlertTriangle className={`h-5 w-5 ${untaggedCount > 0 ? "text-yellow-500" : "text-green-500"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {untaggedCount}
                <span className="ml-2 text-sm font-normal text-gray-500">件</span>
              </div>
              {untaggedCount > 0 && (
                <p className="mt-1 text-xs text-yellow-600">
                  タギングを実行してタグを付与してください
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ベンチマーク数</CardTitle>
              <Calculator className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {benchmarks.length}
                <span className="ml-2 text-sm font-normal text-gray-500">業種</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                最終更新: {benchmarks.length > 0 ? formatDateTime(benchmarks[0].calculatedAt) : "-"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Auto Tagging */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                自動タギング
              </CardTitle>
              <CardDescription>
                キーワードルールに基づいて動画に自動的にタグを付与します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">対象業種</label>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="業種を選択" />
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

              <Button onClick={runAutoTagging} disabled={tagging} className="w-full">
                {tagging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    タギング中...
                  </>
                ) : (
                  <>
                    <Tag className="h-4 w-4" />
                    タギング実行
                  </>
                )}
              </Button>

              {taggingResult && (
                <div
                  className={`rounded-lg p-4 ${
                    taggingResult.success ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {taggingResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span
                      className={taggingResult.success ? "text-green-700" : "text-red-700"}
                    >
                      {taggingResult.message}
                    </span>
                  </div>
                  {taggingResult.data && (
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">タグ付与</p>
                        <p className="font-bold text-green-600">{taggingResult.data.tagged}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">スキップ</p>
                        <p className="font-bold text-gray-600">{taggingResult.data.skipped}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benchmark Recalculation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                ベンチマーク再計算
              </CardTitle>
              <CardDescription>
                業種別のベンチマーク指標を最新データで再計算します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">対象業種</label>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="業種を選択" />
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

              <Button onClick={recalculateBenchmarks} disabled={calculating} className="w-full">
                {calculating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    計算中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    再計算実行
                  </>
                )}
              </Button>

              {benchmarkResult && (
                <div
                  className={`rounded-lg p-4 ${
                    benchmarkResult.success ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {benchmarkResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span
                      className={benchmarkResult.success ? "text-green-700" : "text-red-700"}
                    >
                      {benchmarkResult.message}
                    </span>
                  </div>
                  {benchmarkResult.data && (
                    <div className="mt-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">再計算業種数</span>
                        <span className="font-bold">{benchmarkResult.data.recalculated}業種</span>
                      </div>
                      {benchmarkResult.data.results && benchmarkResult.data.results.length > 0 && (
                        <div className="mt-1 flex justify-between">
                          <span className="text-gray-500">総サンプル数</span>
                          <span className="font-bold">
                            {benchmarkResult.data.results.reduce((sum, r) => sum + r.sampleSize, 0)}件
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Benchmark List */}
        <Card>
          <CardHeader>
            <CardTitle>ベンチマーク一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBenchmarks ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : benchmarks.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-gray-500">
                ベンチマークデータがありません
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {benchmarks.map((benchmark) => (
                  <Card key={benchmark.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-semibold">{benchmark.industry.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {benchmark.sampleSize}件
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">平均ER</span>
                          <span className="font-medium">
                            {formatPercent(benchmark.avgEngagementRate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">中央値再生数</span>
                          <span className="font-medium">
                            {formatNumber(benchmark.medianViewCount)}
                          </span>
                        </div>
                        <div className="pt-2 text-xs text-gray-400">
                          更新: {formatDateTime(benchmark.calculatedAt)}
                        </div>
                      </div>
                      {benchmark.topContentTypes && benchmark.topContentTypes.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <p className="mb-1 text-xs text-gray-500">トップコンテンツ類型</p>
                          <div className="flex flex-wrap gap-1">
                            {benchmark.topContentTypes
                              .slice(0, 3)
                              .map((item) => (
                                <Badge key={item.type} variant="outline" className="text-xs">
                                  {item.type}: {item.count}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
