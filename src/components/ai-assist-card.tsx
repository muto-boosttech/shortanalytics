"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react";

interface AIAssistCardProps {
  type: "dashboard" | "ranking";
  industryId?: string;
  data: Record<string, unknown>;
  title?: string;
}

export function AIAssistCard({ type, industryId, data, title = "AIアシスト" }: AIAssistCardProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, industryId, data }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data.analysis);
      } else {
        setError(result.error || "分析の生成に失敗しました");
      }
    } catch (err) {
      console.error("AI assist error:", err);
      setError("分析の生成中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <span className="text-indigo-900">{title}</span>
          <span className="ml-auto text-xs font-normal text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
            AI分析
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!analysis && !loading && !error && (
          <div className="text-center py-6">
            <Lightbulb className="h-12 w-12 text-indigo-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">
              AIがデータを分析し、伸びる投稿の特徴や改善提案を生成します
            </p>
            <Button
              onClick={generateAnalysis}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              分析を開始
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-indigo-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-600">AIが分析中...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button
              onClick={generateAnalysis}
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {analysis}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={generateAnalysis}
                variant="ghost"
                size="sm"
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                再分析
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              ※ この分析はAIによる参考情報です。実際の結果は異なる場合があります。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
