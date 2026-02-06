"use client";

import { useEffect, useState, useRef } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import {
  Play,
  X,
  Plus,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  Video,
  Youtube,
} from "lucide-react";

interface Industry {
  id: number;
  name: string;
  slug: string;
}

interface Hashtag {
  id: number;
  hashtag: string;
  isActive: boolean;
}

interface CollectionLog {
  id: number;
  hashtag: string;
  apifyRunId: string;
  videosCollected: number;
  videosNew: number;
  videosUpdated: number;
  status: string;
  startedAt: string;
  completedAt: string;
  errorMessage: string;
  industry: { name: string };
  platform: string;
}

interface CollectionResult {
  success: boolean;
  message: string;
  data?: {
    videosCollected: number;
    videosNew: number;
    videosUpdated: number;
  };
}

export default function CollectPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CollectionResult | null>(null);
  const [logs, setLogs] = useState<CollectionLog[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ success: boolean; message: string } | null>(null);
  const [platform, setPlatform] = useState<"tiktok" | "youtube">("tiktok");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/industries")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIndustries(data.data);
        }
      });

    fetchLogs();
  }, []);

  useEffect(() => {
    if (selectedIndustry) {
      fetch(`/api/industries/${selectedIndustry}/hashtags`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const hashtagsData = data.data.hashtags || [];
            setHashtags(hashtagsData);
            setSelectedHashtags(
              hashtagsData.filter((h: Hashtag) => h.isActive).map((h: Hashtag) => h.hashtag)
            );
          }
        });
    }
  }, [selectedIndustry]);

  const fetchLogs = () => {
    fetch("/api/collection-logs?limit=10")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.data);
        }
      });
  };

  const toggleHashtag = (hashtag: string) => {
    setSelectedHashtags((prev) =>
      prev.includes(hashtag)
        ? prev.filter((h) => h !== hashtag)
        : [...prev, hashtag]
    );
  };

  const addHashtag = async () => {
    if (!newHashtag.trim() || !selectedIndustry) return;

    const response = await fetch(`/api/industries/${selectedIndustry}/hashtags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtag: newHashtag.trim() }),
    });

    const data = await response.json();
    if (data.success) {
      setHashtags((prev) => [...prev, data.data]);
      setSelectedHashtags((prev) => [...prev, newHashtag.trim()]);
      setNewHashtag("");
    }
  };

  const removeHashtag = async (hashtagId: number, hashtag: string) => {
    const response = await fetch(
      `/api/industries/${selectedIndustry}/hashtags/${hashtagId}`,
      { method: "DELETE" }
    );

    const data = await response.json();
    if (data.success) {
      setHashtags((prev) => prev.filter((h) => h.id !== hashtagId));
      setSelectedHashtags((prev) => prev.filter((h) => h !== hashtag));
    }
  };

  const startCollection = async () => {
    if (!selectedIndustry || selectedHashtags.length === 0) {
      setResult({
        success: false,
        message: "業種とハッシュタグを選択してください",
      });
      return;
    }

    setCollecting(true);
    setProgress(0);
    setResult(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 1000);

    try {
      // プラットフォームに応じてAPIエンドポイントを選択
      const endpoint = platform === "youtube" ? "/api/collect-youtube" : "/api/collect";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryId: parseInt(selectedIndustry),
          hashtags: selectedHashtags,
          apiToken: apiToken || undefined,
        }),
      });

      const data = await response.json();
      clearInterval(progressInterval);
      setProgress(100);

      if (data.success) {
        setResult({
          success: true,
          message: `${platform === "youtube" ? "YouTube Shorts" : "TikTok"}の収集が完了しました`,
          data: {
            videosCollected: data.data.videosCollected,
            videosNew: data.data.videosNew,
            videosUpdated: data.data.videosUpdated,
          },
        });
      } else {
        setResult({
          success: false,
          message: data.error || "収集に失敗しました",
        });
      }

      fetchLogs();
    } catch (error) {
      clearInterval(progressInterval);
      setResult({
        success: false,
        message: "エラーが発生しました",
      });
    } finally {
      setCollecting(false);
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    setCsvResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/videos/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setCsvResult({
        success: data.success,
        message: data.success
          ? `${data.data.imported}件の動画をインポートしました`
          : data.error || "インポートに失敗しました",
      });
    } catch (error) {
      setCsvResult({
        success: false,
        message: "エラーが発生しました",
      });
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">完了</Badge>;
      case "failed":
        return <Badge variant="destructive">失敗</Badge>;
      case "running":
        return <Badge variant="default">実行中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlatformBadge = (platformValue: string) => {
    if (platformValue === "youtube") {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">YouTube</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">TikTok</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">データ収集</h1>
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
        </div>

        {/* API Token Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Apify APIトークン
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="apiToken">APIトークン（オプション）</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="apify_api_xxxxx..."
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                環境変数にAPIトークンが設定されていない場合、ここに入力してください。
                <a
                  href="https://console.apify.com/account/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-primary underline"
                >
                  Apifyでトークンを取得
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Collection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {platform === "youtube" ? (
                <Youtube className="h-5 w-5 text-red-500" />
              ) : (
                <Video className="h-5 w-5" />
              )}
              {platform === "youtube" ? "YouTube Shorts" : "TikTok"} 収集設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>業種を選択</Label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="w-full max-w-xs">
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

            {selectedIndustry && (
              <div className="space-y-2">
                <Label>ハッシュタグ（検索キーワード）</Label>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((h) => (
                    <Badge
                      key={h.id}
                      variant={selectedHashtags.includes(h.hashtag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleHashtag(h.hashtag)}
                    >
                      #{h.hashtag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHashtag(h.id, h.hashtag);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="新しいハッシュタグ"
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addHashtag()}
                    className="max-w-xs"
                  />
                  <Button variant="outline" size="sm" onClick={addHashtag}>
                    <Plus className="h-4 w-4" />
                    追加
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button
                onClick={startCollection}
                disabled={collecting || !selectedIndustry || selectedHashtags.length === 0}
                className={platform === "youtube" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {collecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    収集中...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    {platform === "youtube" ? "YouTube Shorts" : "TikTok"} 収集開始
                  </>
                )}
              </Button>
              {selectedHashtags.length > 0 && (
                <span className="text-sm text-gray-500">
                  {selectedHashtags.length}個のハッシュタグで収集
                </span>
              )}
            </div>

            {/* Progress */}
            {collecting && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-gray-500">収集中... {progress}%</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div
                className={`rounded-lg p-4 ${
                  result.success ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span
                    className={result.success ? "text-green-700" : "text-red-700"}
                  >
                    {result.message}
                  </span>
                </div>
                {result.data && (
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">収集動画数</p>
                      <p className="font-bold">{result.data.videosCollected}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">新規追加</p>
                      <p className="font-bold text-green-600">{result.data.videosNew}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">更新</p>
                      <p className="font-bold text-blue-600">{result.data.videosUpdated}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CSV Upload Fallback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CSVアップロード（フォールバック）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Apify APIが利用できない場合、CSVファイルから動画データをインポートできます。
            </p>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={csvUploading}
              >
                {csvUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    アップロード中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    CSVをアップロード
                  </>
                )}
              </Button>
            </div>
            {csvResult && (
              <div
                className={`rounded-lg p-4 ${
                  csvResult.success ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {csvResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span
                    className={csvResult.success ? "text-green-700" : "text-red-700"}
                  >
                    {csvResult.message}
                  </span>
                </div>
              </div>
            )}
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">CSVフォーマット:</p>
              <code className="mt-2 block text-xs text-gray-600">
                tiktok_video_id,video_url,description,hashtags,view_count,like_count,comment_count,share_count,video_duration_seconds,author_username,author_follower_count,posted_at,thumbnail_url
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Collection Logs */}
        <Card>
          <CardHeader>
            <CardTitle>収集ログ</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>プラットフォーム</TableHead>
                  <TableHead>業種</TableHead>
                  <TableHead>ハッシュタグ</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>収集数</TableHead>
                  <TableHead>新規</TableHead>
                  <TableHead>更新</TableHead>
                  <TableHead>開始日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      収集ログがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getPlatformBadge(log.platform || "tiktok")}</TableCell>
                      <TableCell>{log.industry?.name || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">#{log.hashtag}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.videosCollected}</TableCell>
                      <TableCell className="text-green-600">{log.videosNew}</TableCell>
                      <TableCell className="text-blue-600">{log.videosUpdated}</TableCell>
                      <TableCell>{formatDateTime(log.startedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
