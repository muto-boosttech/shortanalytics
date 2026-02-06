"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

interface AIAssistCardProps {
  type: "dashboard" | "ranking";
  industryId?: string;
  platform?: "tiktok" | "youtube";
  data: Record<string, unknown>;
  title?: string;
}

// LaTeX数式をプレーンテキストに変換
function cleanLatex(text: string): string {
  // \[ ... \] ブロック数式を除去
  let cleaned = text.replace(/\\\[[\s\S]*?\\\]/g, "");
  // \( ... \) インライン数式を除去
  cleaned = cleaned.replace(/\\\([\s\S]*?\\\)/g, "");
  // $$ ... $$ ブロック数式を除去
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, "");
  // $ ... $ インライン数式を除去
  cleaned = cleaned.replace(/\$[^$]+\$/g, "");
  // \frac{a}{b} → a/b
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)");
  // \approx → ≈
  cleaned = cleaned.replace(/\\approx/g, "≈");
  // \times → ×
  cleaned = cleaned.replace(/\\times/g, "×");
  // \text{...} → ...
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, "$1");
  // \dots → ...
  cleaned = cleaned.replace(/\\dots|\\ldots|\\cdots/g, "...");
  // 残りのバックスラッシュコマンドを除去
  cleaned = cleaned.replace(/\\[a-zA-Z]+/g, "");
  // 連続する空行を1つに
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned;
}

// Markdown テーブルを HTML テーブルに変換
function renderMarkdownTable(tableText: string): string {
  const lines = tableText.trim().split("\n").filter(l => l.trim().length > 0);
  if (lines.length < 2) return tableText;

  let html = '<div class="ai-table-wrapper"><table class="ai-table">';

  let headerProcessed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // セパレータ行（|---|---|---| など）はスキップ
    if (/^\|[\s\-:]+\|$/.test(line.replace(/[^|\-:\s]/g, "").trim()) || 
        (line.includes("---") && line.includes("|") && !line.replace(/[\s\-:|]/g, ""))) {
      continue;
    }

    const cells = line
      .split("|")
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      .map((c) => c.trim());

    if (cells.length === 0) continue;

    const isHeader = !headerProcessed;
    if (isHeader) headerProcessed = true;

    if (isHeader) {
      html += "<thead><tr>";
      for (const cell of cells) {
        html += `<th>${renderInlineMarkdown(cell)}</th>`;
      }
      html += "</tr></thead><tbody>";
    } else {
      html += "<tr>";
      for (const cell of cells) {
        html += `<td>${renderInlineMarkdown(cell)}</td>`;
      }
      html += "</tr>";
    }
  }

  html += "</tbody></table></div>";
  return html;
}

// インラインMarkdown（太字、斜体、コード）を処理
function renderInlineMarkdown(text: string): string {
  let result = text;
  // **太字**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *斜体*
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // `コード`
  result = result.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
  return result;
}

// Markdown をリッチな HTML に変換するメイン関数
function renderMarkdown(text: string): string {
  // まずLaTeX数式をクリーンアップ
  let html = cleanLatex(text);

  // テーブルを処理（複数行にまたがるため先に処理）
  html = html.replace(
    /(\|.+\|[\r\n]+\|[\s\-:]+\|[\r\n]+(?:\|.+\|[\r\n]*)+)/g,
    (match) => renderMarkdownTable(match)
  );

  // 行ごとに処理するために分割
  const lines = html.split("\n");
  const processedLines: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // HTMLタグが含まれる行はそのまま通す（テーブルなど）
    if (line.includes("<div") || line.includes("</div") || 
        line.includes("<table") || line.includes("</table") ||
        line.includes("<thead") || line.includes("</thead") ||
        line.includes("<tbody") || line.includes("</tbody") ||
        line.includes("<tr") || line.includes("</tr") ||
        line.includes("<th") || line.includes("<td")) {
      if (inList) {
        processedLines.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
        listType = null;
      }
      if (inBlockquote) {
        processedLines.push("</blockquote>");
        inBlockquote = false;
      }
      processedLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    // 空行
    if (trimmed === "") {
      if (inList) {
        processedLines.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
        listType = null;
      }
      if (inBlockquote) {
        processedLines.push("</blockquote>");
        inBlockquote = false;
      }
      processedLines.push('<div class="ai-spacer"></div>');
      continue;
    }

    // # 見出し → h1
    if (/^# (.+)$/.test(trimmed)) {
      if (inList) { processedLines.push(listType === "ol" ? "</ol>" : "</ul>"); inList = false; listType = null; }
      const match = trimmed.match(/^# (.+)$/);
      processedLines.push(`<h1 class="ai-h1">${renderInlineMarkdown(match![1])}</h1>`);
      continue;
    }

    // ## 見出し → h2
    if (/^## (.+)$/.test(trimmed)) {
      if (inList) { processedLines.push(listType === "ol" ? "</ol>" : "</ul>"); inList = false; listType = null; }
      const match = trimmed.match(/^## (.+)$/);
      processedLines.push(`<h2 class="ai-h2">${renderInlineMarkdown(match![1])}</h2>`);
      continue;
    }

    // ### 見出し → h3
    if (/^### (.+)$/.test(trimmed)) {
      if (inList) { processedLines.push(listType === "ol" ? "</ol>" : "</ul>"); inList = false; listType = null; }
      const match = trimmed.match(/^### (.+)$/);
      processedLines.push(`<h3 class="ai-h3">${renderInlineMarkdown(match![1])}</h3>`);
      continue;
    }

    // #### 見出し → h4
    if (/^#### (.+)$/.test(trimmed)) {
      if (inList) { processedLines.push(listType === "ol" ? "</ol>" : "</ul>"); inList = false; listType = null; }
      const match = trimmed.match(/^#### (.+)$/);
      processedLines.push(`<h4 class="ai-h4">${renderInlineMarkdown(match![1])}</h4>`);
      continue;
    }

    // --- 水平線
    if (/^[-*_]{3,}$/.test(trimmed)) {
      if (inList) { processedLines.push(listType === "ol" ? "</ol>" : "</ul>"); inList = false; listType = null; }
      processedLines.push('<hr class="ai-hr" />');
      continue;
    }

    // > 引用
    if (/^> (.+)$/.test(trimmed)) {
      if (inList) { processedLines.push(listType === "ol" ? "</ol>" : "</ul>"); inList = false; listType = null; }
      if (!inBlockquote) {
        processedLines.push('<blockquote class="ai-blockquote">');
        inBlockquote = true;
      }
      const match = trimmed.match(/^> (.+)$/);
      processedLines.push(`<p>${renderInlineMarkdown(match![1])}</p>`);
      continue;
    } else if (inBlockquote) {
      processedLines.push("</blockquote>");
      inBlockquote = false;
    }

    // - リスト項目（ネスト対応）
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) processedLines.push(listType === "ol" ? "</ol>" : "</ul>");
        processedLines.push('<ul class="ai-ul">');
        inList = true;
        listType = "ul";
      }
      processedLines.push(`<li>${renderInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // 数字リスト
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) processedLines.push(listType === "ol" ? "</ol>" : "</ul>");
        processedLines.push('<ol class="ai-ol">');
        inList = true;
        listType = "ol";
      }
      processedLines.push(`<li>${renderInlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    // インデントされたサブリスト項目（  - xxx）
    const subUlMatch = trimmed.match(/^\s{2,}[-*+]\s+(.+)$/);
    if (subUlMatch && inList) {
      processedLines.push(`<li class="ai-sublist">${renderInlineMarkdown(subUlMatch[1])}</li>`);
      continue;
    }

    // 通常のテキスト段落
    if (inList) {
      processedLines.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
      listType = null;
    }
    processedLines.push(`<p class="ai-paragraph">${renderInlineMarkdown(trimmed)}</p>`);
  }

  // 閉じタグの処理
  if (inList) processedLines.push(listType === "ol" ? "</ol>" : "</ul>");
  if (inBlockquote) processedLines.push("</blockquote>");

  return processedLines.join("\n");
}

export function AIAssistCard({
  type,
  industryId,
  platform,
  data,
  title = "AIアシスト",
}: AIAssistCardProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, industryId, platform, data }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data.analysis);
        setExpanded(true);
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
            <p className="text-xs text-gray-400 mt-2">
              詳細な分析を生成しています。30秒〜1分程度かかる場合があります。
            </p>
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
            {/* 折りたたみトグル */}
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setExpanded(!expanded)}
                variant="ghost"
                size="sm"
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    分析結果を折りたたむ
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    分析結果を展開する
                  </>
                )}
              </Button>
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

            {expanded && (
              <>
                <div className="ai-analysis-content bg-white rounded-lg p-5 sm:p-8 border border-indigo-100 shadow-sm max-h-[80vh] overflow-y-auto">
                  {type === "ranking" ? (
                    <div
                      className="ai-report"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(analysis),
                      }}
                    />
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {analysis}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 text-center">
                  ※ この分析はAIによる参考情報です。実際の結果は異なる場合があります。
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>

      {/* AI分析レポート用のスタイル */}
      <style jsx global>{`
        .ai-report {
          font-size: 14px;
          line-height: 1.8;
          color: #374151;
        }

        .ai-h1 {
          font-size: 1.375rem;
          font-weight: 700;
          color: #111827;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.625rem;
          border-bottom: 3px solid #6366f1;
        }
        .ai-h1:first-child {
          margin-top: 0;
        }

        .ai-h2 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ai-h2::before {
          content: "";
          display: inline-block;
          width: 4px;
          height: 1.25rem;
          background: #6366f1;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .ai-h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          padding-left: 0.75rem;
          border-left: 3px solid #a5b4fc;
        }

        .ai-h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #4b5563;
          margin-top: 1rem;
          margin-bottom: 0.375rem;
        }

        .ai-paragraph {
          margin-bottom: 0.625rem;
          font-size: 0.875rem;
          line-height: 1.75;
          color: #4b5563;
        }

        .ai-spacer {
          height: 0.5rem;
        }

        .ai-hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.5rem 0;
        }

        .ai-ul {
          list-style: none;
          padding-left: 0;
          margin: 0.5rem 0;
        }
        .ai-ul > li {
          position: relative;
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          line-height: 1.75;
          color: #4b5563;
        }
        .ai-ul > li::before {
          content: "";
          position: absolute;
          left: 0.375rem;
          top: 0.625rem;
          width: 6px;
          height: 6px;
          background: #6366f1;
          border-radius: 50%;
        }

        .ai-ol {
          list-style: none;
          padding-left: 0;
          margin: 0.5rem 0;
          counter-reset: ai-counter;
        }
        .ai-ol > li {
          position: relative;
          padding-left: 2rem;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          line-height: 1.75;
          color: #4b5563;
          counter-increment: ai-counter;
        }
        .ai-ol > li::before {
          content: counter(ai-counter);
          position: absolute;
          left: 0;
          top: 0.125rem;
          width: 1.375rem;
          height: 1.375rem;
          background: #eef2ff;
          color: #6366f1;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-sublist {
          padding-left: 2.5rem !important;
          font-size: 0.8125rem !important;
          color: #6b7280 !important;
        }
        .ai-sublist::before {
          width: 5px !important;
          height: 5px !important;
          background: #a5b4fc !important;
          left: 1.375rem !important;
        }

        .ai-blockquote {
          border-left: 4px solid #a5b4fc;
          background: #f5f3ff;
          padding: 0.75rem 1rem;
          margin: 0.75rem 0;
          border-radius: 0 0.375rem 0.375rem 0;
        }
        .ai-blockquote p {
          margin: 0;
          font-size: 0.875rem;
          color: #4338ca;
          font-style: italic;
        }

        .ai-inline-code {
          background: #f3f4f6;
          color: #6366f1;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.8125rem;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }

        /* テーブルスタイル */
        .ai-table-wrapper {
          overflow-x: auto;
          margin: 1rem 0;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .ai-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .ai-table thead th {
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          color: #312e81;
          font-weight: 600;
          padding: 0.625rem 0.875rem;
          text-align: left;
          border-bottom: 2px solid #c7d2fe;
          white-space: nowrap;
        }

        .ai-table tbody td {
          padding: 0.5rem 0.875rem;
          border-bottom: 1px solid #f3f4f6;
          color: #4b5563;
          vertical-align: top;
        }

        .ai-table tbody tr:hover {
          background: #fafbff;
        }

        .ai-table tbody tr:last-child td {
          border-bottom: none;
        }

        .ai-table strong {
          color: #312e81;
        }

        /* スクロールバーのスタイル */
        .ai-analysis-content::-webkit-scrollbar {
          width: 6px;
        }
        .ai-analysis-content::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        .ai-analysis-content::-webkit-scrollbar-thumb {
          background: #c7d2fe;
          border-radius: 3px;
        }
        .ai-analysis-content::-webkit-scrollbar-thumb:hover {
          background: #a5b4fc;
        }
      `}</style>
    </Card>
  );
}
