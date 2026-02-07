"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, Presentation, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  type: "ranking" | "dashboard";
  platform: string;
  industryId?: string;
  industryName?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function ExportButton({
  type,
  platform,
  industryId,
  industryName,
  sortBy,
  sortOrder,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const buildParams = () => {
    const params = new URLSearchParams({ type, platform });
    if (industryId && industryId !== "all" && industryId !== "") params.append("industry_id", industryId);
    if (industryName) params.append("industry_name", industryName);
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);
    return params.toString();
  };

  const handleExport = async (format: "csv" | "pdf" | "pptx") => {
    setLoading(format);
    setDone(null);
    try {
      const params = buildParams();
      const url = `/api/export/${format}?${params}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Content-Dispositionからファイル名を取得
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${type}_${platform}_${new Date().toISOString().split("T")[0]}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) filename = match[1];
      }

      // Blobからダウンロードリンクを作成
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      // クリーンアップ（ダウンロード完了を待つため遅延）
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 10000);

      setDone(format);
      setTimeout(() => {
        setDone(null);
        setOpen(false);
      }, 1500);
    } catch (error) {
      console.error("Export error:", error);
      alert("エクスポートに失敗しました。もう一度お試しください。");
    } finally {
      setLoading(null);
    }
  };

  const exportOptions = [
    {
      format: "csv" as const,
      label: "CSV",
      description: "スプレッドシート用",
      icon: FileSpreadsheet,
      color: "text-green-600",
      bgHover: "hover:bg-green-50",
    },
    {
      format: "pdf" as const,
      label: "PDF",
      description: "レポート用",
      icon: FileText,
      color: "text-red-500",
      bgHover: "hover:bg-red-50",
    },
    {
      format: "pptx" as const,
      label: "PowerPoint",
      description: "プレゼン用",
      icon: Presentation,
      color: "text-orange-500",
      bgHover: "hover:bg-orange-50",
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs sm:text-sm sm:h-9"
        onClick={() => setOpen(!open)}
      >
        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">エクスポート</span>
        <span className="sm:hidden">出力</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            <p className="mb-2 px-2 text-xs font-medium text-gray-500">
              エクスポート形式を選択
            </p>
            {exportOptions.map((opt) => (
              <button
                key={opt.format}
                onClick={() => handleExport(opt.format)}
                disabled={loading !== null}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${opt.bgHover} disabled:opacity-50`}
              >
                {loading === opt.format ? (
                  <Loader2 className={`h-5 w-5 ${opt.color} animate-spin`} />
                ) : done === opt.format ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <opt.icon className={`h-5 w-5 ${opt.color}`} />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {done === opt.format ? "ダウンロード完了" : opt.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {done === opt.format ? "" : opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
