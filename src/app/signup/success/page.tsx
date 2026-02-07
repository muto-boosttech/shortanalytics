"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [planName, setPlanName] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    // セッション情報を確認
    fetch(`/api/stripe/verify?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setPlanName(data.plan || "");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            決済を確認中...
          </h1>
          <p className="text-gray-600">しばらくお待ちください。</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            お申し込みありがとうございます！
          </h1>
          <p className="text-gray-600 mb-2">
            {planName && (
              <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium mb-3">
                {planName}プラン
              </span>
            )}
          </p>
          <p className="text-gray-600 mb-8">
            決済が正常に完了しました。<br />
            すぐにすべての機能をご利用いただけます。
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            ダッシュボードへ
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            エラーが発生しました
          </h1>
          <p className="text-gray-600 mb-8">
            決済の確認中にエラーが発生しました。<br />
            問題が続く場合はお問い合わせください。
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              申し込みページに戻る
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              ダッシュボードへ
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <Loader2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">読み込み中...</h1>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
