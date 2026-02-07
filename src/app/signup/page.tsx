"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
  Download,
  Clock,
  Shield,
  TrendingUp,
  Eye,
  Loader2,
  ArrowRight,
  Sparkles,
  Monitor,
  Users,
  Globe,
  Target,
  Layers,
  FileText,
  Search,
  PieChart,
  Copy,
  CheckCircle2,
  Star,
  Award,
  Rocket,
  ChevronRight,
} from "lucide-react";

type PlanKey = "free" | "starter" | "premium" | "max";

interface PlanInfo {
  key: PlanKey;
  name: string;
  description: string;
  price: string;
  priceNote: string;
  highlight: boolean;
  badge?: string;
  color: string;
  features: {
    refresh: string;
    analysis: string;
    export: string;
    trial?: string;
  };
}

const PLANS: PlanInfo[] = [
  {
    key: "free",
    name: "Free",
    description: "まずは無料で試してみたい方に",
    price: "¥0",
    priceNote: "7日間限定",
    highlight: false,
    color: "gray",
    features: {
      refresh: "週1回 / 媒体×カテゴリ",
      analysis: "月3回",
      export: "月3回",
      trial: "7日間",
    },
  },
  {
    key: "starter",
    name: "Starter",
    description: "個人や小規模チームでの分析に",
    price: "¥9,800",
    priceNote: "/ 月（税別）",
    highlight: false,
    color: "blue",
    features: {
      refresh: "週3回 / 媒体×カテゴリ",
      analysis: "月60回",
      export: "月60回",
    },
  },
  {
    key: "premium",
    name: "Premium",
    description: "本格的な分析運用をしたい方に",
    price: "¥19,800",
    priceNote: "/ 月（税別）",
    highlight: true,
    badge: "人気",
    color: "emerald",
    features: {
      refresh: "1日1回 / 媒体×カテゴリ",
      analysis: "月200回",
      export: "月200回",
    },
  },
  {
    key: "max",
    name: "Max",
    description: "大規模運用・代理店向け",
    price: "¥49,800",
    priceNote: "/ 月（税別）",
    highlight: false,
    color: "purple",
    features: {
      refresh: "1日3回 / 媒体×カテゴリ",
      analysis: "月500回",
      export: "月500回",
    },
  },
];

const COMPARISON_FEATURES = [
  { name: "TikTok データ収集", free: true, starter: true, premium: true, max: true },
  { name: "YouTube Shorts データ収集", free: true, starter: true, premium: true, max: true },
  { name: "Instagram Reels データ収集", free: true, starter: true, premium: true, max: true },
  { name: "ダッシュボード", free: true, starter: true, premium: true, max: true },
  { name: "ランキング表示", free: true, starter: true, premium: true, max: true },
  { name: "AI分析（伸びる投稿の特徴）", free: "月3回", starter: "月60回", premium: "月200回", max: "月500回" },
  { name: "PDF エクスポート", free: "月3回", starter: "月60回", premium: "月200回", max: "月500回" },
  { name: "CSV エクスポート", free: "月3回", starter: "月60回", premium: "月200回", max: "月500回" },
  { name: "PPTX エクスポート", free: "月3回", starter: "月60回", premium: "月200回", max: "月500回" },
  { name: "データ更新頻度", free: "週1回", starter: "週3回", premium: "1日1回", max: "1日3回" },
  { name: "メールサポート", free: false, starter: true, premium: true, max: true },
  { name: "優先サポート", free: false, starter: false, premium: true, max: true },
];

const STEPS = [
  {
    num: "01",
    title: "アカウント作成",
    description: "プランを選択し、簡単な情報入力だけで即座にアカウントを作成。Freeプランなら7日間無料でお試しいただけます。",
    icon: Users,
  },
  {
    num: "02",
    title: "データ収集開始",
    description: "TikTok・YouTube Shorts・Instagram Reelsから、業種別のショート動画データを自動収集。手間のかかるデータ収集作業を完全自動化します。",
    icon: Search,
  },
  {
    num: "03",
    title: "ダッシュボードで分析",
    description: "収集したデータをKPIダッシュボードで可視化。コンテンツ類型別ER、フック別再生数、動画尺別の分析を一目で把握できます。",
    icon: PieChart,
  },
  {
    num: "04",
    title: "レポート出力・改善",
    description: "AIが伸びる投稿の特徴を自動分析。PDF・CSV・PPTXでレポートをエクスポートし、チームで共有・改善アクションに繋げます。",
    icon: FileText,
  },
];

const FEATURES_DETAIL = [
  {
    icon: Globe,
    title: "3プラットフォーム横断分析",
    description: "TikTok、YouTube Shorts、Instagram Reelsの3つのプラットフォームを一つのダッシュボードで横断分析。各プラットフォームの特性を比較し、最適な配信戦略を立案できます。",
    stat: "3媒体対応",
  },
  {
    icon: Sparkles,
    title: "AIによる自動分析",
    description: "AIがトップ動画の成功パターンを自動分析し、伸びる投稿の特徴や改善提案を生成。データに基づいた戦略的なコンテンツ制作をサポートします。",
    stat: "AI搭載",
  },
  {
    icon: Target,
    title: "10業種以上のカテゴリ分析",
    description: "フィットネス、美容、グルメ、ファッションなど10以上の業種カテゴリに対応。業種別のトレンドやベンチマークを把握し、競合分析に活用できます。",
    stat: "10+業種",
  },
  {
    icon: Layers,
    title: "コンテンツ類型・フック分析",
    description: "ハウツー、Vlog、レビューなどのコンテンツ類型と、質問形式、カウントダウンなどの冒頭フックを自動タグ付け。どの組み合わせが最も効果的かを数値で把握できます。",
    stat: "多角的分析",
  },
  {
    icon: TrendingUp,
    title: "リアルタイムランキング",
    description: "業種別のバズ動画ランキングをリアルタイムで表示。再生数、ER、いいね数など複数の指標で並び替え、トレンドの変化を即座にキャッチできます。",
    stat: "リアルタイム",
  },
  {
    icon: Download,
    title: "3形式のレポートエクスポート",
    description: "PDF、CSV、PPTXの3形式でプロフェッショナルなレポートを出力。クライアントへの報告書やチーム内の共有資料として即座に活用できます。",
    stat: "PDF/CSV/PPTX",
  },
];

const FAQ_ITEMS = [
  {
    q: "Freeプランはどのくらい使えますか？",
    a: "Freeプランは登録日から7日間ご利用いただけます。期間中はデータ更新（週1回/媒体×カテゴリ）、AI分析（月3回）、エクスポート（月3回）をお試しいただけます。7日間経過後はログインできなくなりますので、継続利用をご希望の場合は有料プランへのアップグレードをお願いいたします。",
  },
  {
    q: "プランの変更はできますか？",
    a: "はい、プランの変更は管理者にお問い合わせいただくことで対応可能です。アップグレード・ダウングレードともに対応しております。",
  },
  {
    q: "データ更新の「媒体×カテゴリ」とは何ですか？",
    a: "データ更新は、プラットフォーム（TikTok/YouTube/Instagram）と業種カテゴリの組み合わせごとにカウントされます。例えば「TikTok × フィットネス」で1回、「YouTube × 美容」で1回とカウントされます。",
  },
  {
    q: "対応しているSNSプラットフォームは？",
    a: "現在、TikTok、YouTube Shorts、Instagram Reelsの3つのプラットフォームに対応しています。今後も対応プラットフォームを拡大予定です。",
  },
  {
    q: "申し込み後すぐに使えますか？",
    a: "はい、アカウント作成後すぐにログインしてご利用いただけます。データ収集は初回更新を実行することで開始されます。",
  },
  {
    q: "セキュリティは大丈夫ですか？",
    a: "パスワードはbcryptによるハッシュ化で安全に管理しています。また、すべての通信はHTTPSで暗号化されており、データは安全な環境で保管されています。",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("premium");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    displayName: "",
    email: "",
    company: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeScreenshot, setActiveScreenshot] = useState<"dashboard" | "ranking">("dashboard");

  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrollY, setScrollY] = useState(0);

  // Stripeキャンセル時のメッセージ表示
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      setError("決済がキャンセルされました。再度お申し込みいただけます。");
      // フォームまでスクロール
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-rotate steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToPlans = () => {
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.password || !formData.displayName || !formData.email) {
      setError("必須項目をすべて入力してください");
      return;
    }
    if (formData.username.length < 4) {
      setError("ユーザーIDは4文字以上で入力してください");
      return;
    }
    if (formData.password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. アカウント作成
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, plan: selectedPlan === "free" ? "free" : "free" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");

      // 2. 有料プランの場合はStripe Checkoutにリダイレクト
      if (selectedPlan !== "free") {
        const stripeRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.data.userId,
            plan: selectedPlan,
          }),
        });
        const stripeData = await stripeRes.json();
        if (!stripeRes.ok) throw new Error(stripeData.error || "決済セッションの作成に失敗しました");

        // Stripe Checkoutページにリダイレクト
        if (stripeData.url) {
          window.location.href = stripeData.url;
          return;
        }
      }

      // Freeプランの場合は従来通り成功画面を表示
      setCreatedUser({
        username: formData.username,
        password: formData.password,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdUser) return;
    navigator.clipboard.writeText(
      `ユーザーID: ${createdUser.username}\nパスワード: ${createdUser.password}\nログインURL: ${window.location.origin}/login`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };



  // ========== SUCCESS SCREEN ==========
  if (success && createdUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center border border-emerald-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">登録完了</h2>
          <p className="text-gray-500 mb-8">アカウントが正常に作成されました</p>

          <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-left border border-gray-100">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">ユーザーID</p>
                <p className="text-lg font-mono font-bold text-gray-900">{createdUser.username}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">パスワード</p>
                <p className="text-lg font-mono font-bold text-gray-900">{createdUser.password}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">プラン</p>
                <p className="text-lg font-bold text-emerald-600 capitalize">{selectedPlan}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition-all mb-4"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "コピーしました" : "ログイン情報をコピー"}
          </button>

          <button
            onClick={() => router.push("/login")}
            className="w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-200"
          >
            ログインする
          </button>
        </div>
      </div>
    );
  }

  // ========== MAIN LP ==========
  return (
    <div className="min-h-screen bg-white">
      {/* ===== FIXED HEADER ===== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-600 font-bold tracking-wider block leading-none">BOOSTTECH</span>
                <span className="text-sm font-bold text-gray-900">縦型ショート動画<span className="text-emerald-600">分析</span></span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#about" className={`text-sm font-medium transition-colors ${scrollY > 50 ? "text-gray-600 hover:text-emerald-600" : "text-gray-700 hover:text-emerald-600"}`}>サービス概要</a>
              <a href="#features" className={`text-sm font-medium transition-colors ${scrollY > 50 ? "text-gray-600 hover:text-emerald-600" : "text-gray-700 hover:text-emerald-600"}`}>特徴</a>
              <a href="#plans" className={`text-sm font-medium transition-colors ${scrollY > 50 ? "text-gray-600 hover:text-emerald-600" : "text-gray-700 hover:text-emerald-600"}`}>料金</a>
              <a href="#faq" className={`text-sm font-medium transition-colors ${scrollY > 50 ? "text-gray-600 hover:text-emerald-600" : "text-gray-700 hover:text-emerald-600"}`}>FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/login")} className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${scrollY > 50 ? "text-gray-600 hover:text-emerald-600" : "text-gray-700 hover:text-emerald-600"}`}>
                ログイン
              </button>
              <button onClick={scrollToForm} className="text-sm font-bold px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-lg shadow-emerald-200/50">
                無料で始める
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-100/30 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/80 rounded-full">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">TikTok・YouTube Shorts・Instagram Reels 対応</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight">
                縦型ショート動画の
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">トレンド分析</span>を、
                <br />
                もっとスマートに。
              </h1>
              
              <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                3つのプラットフォームのショート動画データを自動収集・分析。
                コンテンツ類型、フック、動画尺などの多角的な分析で、
                <strong className="text-gray-900">バズる動画の法則</strong>を見つけましょう。
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={scrollToForm} className="group flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-xl shadow-emerald-200/50 hover:shadow-emerald-300/50">
                  7日間無料で試す
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={scrollToPlans} className="flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-lg transition-all border-2 border-gray-200 hover:border-emerald-300">
                  プランを選ぶ
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <p className="text-3xl font-black text-emerald-600">3<span className="text-base font-bold text-gray-500 ml-1">媒体</span></p>
                  <p className="text-xs text-gray-400 mt-1">対応プラットフォーム</p>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div>
                  <p className="text-3xl font-black text-emerald-600">10<span className="text-base font-bold text-gray-500 ml-1">カテゴリ以上</span></p>
                  <p className="text-xs text-gray-400 mt-1">分析可能な業種</p>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div>
                  <p className="text-3xl font-black text-emerald-600">3<span className="text-base font-bold text-gray-500 ml-1">形式</span></p>
                  <p className="text-xs text-gray-400 mt-1">エクスポート</p>
                </div>
              </div>
            </div>

            {/* Right: Video/Screenshot */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-200/30 border border-gray-200/50 bg-white">
                {/* Browser frame */}
                <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-center">tategatashort-analytics.com/dashboard</div>
                  </div>
                </div>
                {/* Video - 自動再生・無限ループ */}
                <div className="relative aspect-[16/10] bg-gray-900">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    poster="/images/screenshot-dashboard.png"
                    playsInline
                    muted
                    loop
                    autoPlay
                  >
                    <source src="/videos/demo.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">平均ER</p>
                    <p className="text-lg font-bold text-gray-900">11.54%</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Eye className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">総再生数</p>
                    <p className="text-lg font-bold text-gray-900">56.5M</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF BAR ===== */}
      <section className="bg-emerald-600 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 text-white">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-200" />
              <span className="text-sm font-medium">SSL暗号化通信</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-200" />
              <span className="text-sm font-medium">即時利用開始</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-200" />
              <span className="text-sm font-medium">7日間無料トライアル</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-200" />
              <span className="text-sm font-medium">チーム利用対応</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT / HOW IT WORKS ===== */}
      <section id="about" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-4">ABOUT</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6">
              データ収集からレポート出力まで
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              4つのステップで、ショート動画のトレンド分析を完全自動化
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Steps */}
            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`w-full text-left p-6 rounded-2xl transition-all duration-300 border-2 ${
                      activeStep === i
                        ? "bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-100/50"
                        : "bg-white border-gray-100 hover:border-emerald-100 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        activeStep === i ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-xs font-bold tracking-wider ${activeStep === i ? "text-emerald-600" : "text-gray-300"}`}>
                            STEP {step.num}
                          </span>
                        </div>
                        <h3 className={`text-lg font-bold mb-2 ${activeStep === i ? "text-gray-900" : "text-gray-600"}`}>
                          {step.title}
                        </h3>
                        <p className={`text-sm leading-relaxed transition-all ${
                          activeStep === i ? "text-gray-600 max-h-40 opacity-100" : "text-gray-400 max-h-0 opacity-0 overflow-hidden"
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Screenshot */}
            <div className="sticky top-24">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-200/20 border border-gray-200/50">
                <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-center">
                      tategatashort-analytics.com/{activeStep <= 1 ? "dashboard" : activeStep === 2 ? "dashboard" : "ranking"}
                    </div>
                  </div>
                </div>
                <Image
                  src={activeStep <= 2 ? "/images/screenshot-dashboard.png" : "/images/screenshot-ranking2.png"}
                  alt={activeStep <= 2 ? "ダッシュボード画面" : "ランキング画面"}
                  width={800}
                  height={500}
                  className="w-full transition-opacity duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DEMO VIDEO SECTION ===== */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.15),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-400 tracking-widest uppercase mb-4">DEMO</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
              実際の操作をご覧ください
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              直感的なインターフェースで、複雑なデータ分析をシンプルに
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 text-center">BOOSTTECH 縦型ショート動画分析 - デモ</div>
                </div>
              </div>
              <div className="relative aspect-video bg-black">
                <video
                  className="w-full h-full object-contain"
                  controls
                  playsInline
                  muted
                  loop
                  autoPlay
                  poster="/images/screenshot-dashboard.png"
                >
                  <source src="/videos/demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>

          {/* Feature highlights under video */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
            {[
              { icon: BarChart3, title: "KPIダッシュボード", desc: "総動画数・再生数・ER・いいね数を一目で把握" },
              { icon: PieChart, title: "多角的分析", desc: "コンテンツ類型・フック・動画尺別の詳細分析" },
              { icon: Sparkles, title: "AI分析", desc: "AIがトップ動画の成功パターンを自動分析" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-4">FEATURES</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6">
              ショート動画マーケティングに
              <br />
              必要なすべてが揃っています
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES_DETAIL.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="group relative bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-emerald-200 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100/30">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-emerald-50 group-hover:bg-emerald-100 rounded-2xl flex items-center justify-center transition-colors">
                      <Icon className="w-7 h-7 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{feature.stat}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SCREEN PREVIEW ===== */}
      <section className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-4">INTERFACE</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6">
              直感的なインターフェース
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              複雑なデータをわかりやすく可視化。誰でもすぐに使いこなせるシンプルなデザインです。
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex justify-center gap-4 mb-10">
            {[
              { key: "dashboard" as const, label: "ダッシュボード", icon: BarChart3 },
              { key: "ranking" as const, label: "ランキング", icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveScreenshot(tab.key)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                    activeScreenshot === tab.key
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200/50"
                      : "bg-white text-gray-600 hover:bg-emerald-50 border border-gray-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Screenshot */}
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-200/20 border border-gray-200/50">
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-center">
                    tategatashort-analytics.com/{activeScreenshot}
                  </div>
                </div>
              </div>
              <Image
                src={activeScreenshot === "dashboard" ? "/images/screenshot-dashboard.png" : "/images/screenshot-ranking2.png"}
                alt={activeScreenshot === "dashboard" ? "ダッシュボード画面" : "ランキング画面"}
                width={1200}
                height={750}
                className="w-full"
              />
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
            {activeScreenshot === "dashboard" ? (
              <>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">KPIダッシュボード</h4>
                  <p className="text-sm text-gray-500">総動画数・再生数・ER・いいね数を一目で把握</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                    <PieChart className="w-5 h-5 text-teal-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">コンテンツ類型分析</h4>
                  <p className="text-sm text-gray-500">Vlog、レビュー、ハウツーなど類型別のER比較</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                    <Target className="w-5 h-5 text-pink-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">フック別再生数</h4>
                  <p className="text-sm text-gray-500">質問形式・カウントダウンなどフック別の効果を比較</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">AI分析機能</h4>
                  <p className="text-sm text-gray-500">AIがトップ動画の成功パターンを自動分析</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">詳細フィルター</h4>
                  <p className="text-sm text-gray-500">業種・コンテンツ類型・フックタイプで絞り込み</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <Monitor className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">サムネイル表示</h4>
                  <p className="text-sm text-gray-500">バズ動画のサムネイルを一覧で確認</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== USE CASES ===== */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-4">USE CASES</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6">
              こんな方におすすめ
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Rocket, title: "SNSマーケター", desc: "バズるコンテンツの法則を発見し、エンゲージメント率を最大化したい方", color: "emerald" },
              { icon: Users, title: "広告代理店", desc: "クライアントへの提案にデータドリブンなインサイトを活用したい方", color: "teal" },
              { icon: Star, title: "インフルエンサー", desc: "自分のコンテンツ戦略を競合分析に基づいて最適化したい方", color: "blue" },
              { icon: Award, title: "ブランド担当者", desc: "自社ブランドのショート動画戦略を強化したい企業担当者", color: "purple" },
            ].map((item, i) => {
              const Icon = item.icon;
              const colorMap: Record<string, string> = {
                emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
                teal: "bg-teal-50 text-teal-600 border-teal-100",
                blue: "bg-blue-50 text-blue-600 border-blue-100",
                purple: "bg-purple-50 text-purple-600 border-purple-100",
              };
              const iconBg: Record<string, string> = {
                emerald: "bg-emerald-100",
                teal: "bg-teal-100",
                blue: "bg-blue-100",
                purple: "bg-purple-100",
              };
              return (
                <div key={i} className={`rounded-2xl p-8 border-2 ${colorMap[item.color]} transition-all hover:shadow-lg`}>
                  <div className={`w-14 h-14 ${iconBg[item.color]} rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== PLANS ===== */}
      <section id="plans" className="py-24 lg:py-32 bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.15),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-400 tracking-widest uppercase mb-4">PLAN</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
              あなたのニーズに合った
              <br />
              プランをお選びください
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Freeプランなら7日間無料でお試しいただけます。クレジットカード不要。
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-2xl p-8 transition-all duration-300 ${
                  plan.highlight
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-400/30 scale-105"
                    : "bg-white/10 backdrop-blur-sm text-white border border-white/10 hover:border-emerald-400/30"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.highlight ? "text-emerald-100" : "text-gray-400"}`}>{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-3xl font-black">{plan.price}</span>
                  {plan.priceNote && (
                    <span className={`text-sm ml-2 ${plan.highlight ? "text-emerald-100" : "text-gray-400"}`}>{plan.priceNote}</span>
                  )}
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2">
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-emerald-200" : "text-emerald-400"}`} />
                    <span className="text-sm">データ更新: {plan.features.refresh}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-emerald-200" : "text-emerald-400"}`} />
                    <span className="text-sm">AI分析: {plan.features.analysis}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-emerald-200" : "text-emerald-400"}`} />
                    <span className="text-sm">エクスポート: {plan.features.export}</span>
                  </div>
                  {plan.features.trial && (
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-emerald-200" : "text-emerald-400"}`} />
                      <span className="text-sm">トライアル: {plan.features.trial}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedPlan(plan.key);
                    scrollToForm();
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.highlight
                      ? "bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {plan.key === "free" ? "無料で始める" : "このプランで申し込む"}
                </button>
              </div>
            ))}
          </div>

          {/* Comparison toggle */}
          <div className="mt-16 text-center">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/10"
            >
              {showComparison ? "機能比較を閉じる" : "機能比較を表示"}
              {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showComparison && (
            <div className="mt-8 max-w-5xl mx-auto overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4 text-sm font-bold text-gray-300">機能</th>
                    <th className="text-center py-4 px-4 text-sm font-bold text-gray-300">Free</th>
                    <th className="text-center py-4 px-4 text-sm font-bold text-gray-300">Starter</th>
                    <th className="text-center py-4 px-4 text-sm font-bold text-emerald-400">Premium</th>
                    <th className="text-center py-4 px-4 text-sm font-bold text-gray-300">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((feature, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-3 px-4 text-sm text-gray-300">{feature.name}</td>
                      {(["free", "starter", "premium", "max"] as const).map((plan) => (
                        <td key={plan} className="py-3 px-4 text-center">
                          {typeof feature[plan] === "boolean" ? (
                            feature[plan] ? (
                              <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-gray-600 mx-auto" />
                            )
                          ) : (
                            <span className={`text-sm font-medium ${plan === "premium" ? "text-emerald-400" : "text-gray-300"}`}>
                              {feature[plan]}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ===== SECURITY ===== */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-4">SECURITY</p>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6">
                  データの取り扱いについて
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  お客様のデータを最優先で保護します。パスワードはbcryptによるハッシュ化で安全に管理し、すべての通信はHTTPSで暗号化。データは安全な環境で保管され、厳格なアクセス権限管理のもと運用しています。
                </p>
                <div className="space-y-4">
                  {[
                    "HTTPS暗号化通信",
                    "bcryptパスワードハッシュ化",
                    "厳格なアクセス権限管理",
                    "安全なクラウド環境での運用",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-64 h-64 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl flex items-center justify-center border-2 border-emerald-100">
                  <Shield className="w-32 h-32 text-emerald-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SIGNUP FORM ===== */}
      <section ref={formRef} id="signup" className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-4">SIGN UP</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6">
              アカウント作成
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              簡単な情報入力で、すぐにご利用開始いただけます
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-10 border border-gray-100">
              {/* Plan selector */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-3">プランを選択</label>
                <div className="grid grid-cols-4 gap-2">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.key}
                      onClick={() => setSelectedPlan(plan.key)}
                      className={`relative py-3 px-2 rounded-xl text-sm font-bold transition-all ${
                        selectedPlan === plan.key
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200/50"
                          : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600"
                      }`}
                    >
                      {plan.badge && selectedPlan === plan.key && (
                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-[10px] text-gray-900 font-bold px-2 py-0.5 rounded-full">{plan.badge}</span>
                      )}
                      {plan.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ユーザーID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="半角英数字4文字以上"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    パスワード <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="6文字以上"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    表示名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="画面上に表示される名前"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@company.com"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">会社名 <span className="text-gray-400 text-xs">（任意）</span></label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="株式会社〇〇"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Selected plan info */}
              <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">選択中のプラン</p>
                    <p className="text-lg font-bold text-gray-900 capitalize">{selectedPlan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      {PLANS.find((p) => p.key === selectedPlan)?.price}
                    </p>
                    {PLANS.find((p) => p.key === selectedPlan)?.priceNote && (
                      <p className="text-xs text-gray-500">{PLANS.find((p) => p.key === selectedPlan)?.priceNote}</p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    処理中...
                  </>
                ) : selectedPlan === "free" ? (
                  "無料で始める"
                ) : (
                  "決済に進む"
                )}
              </button>

              <p className="text-xs text-gray-400 text-center mt-4">
                申し込みにより、<a href="/terms" target="_blank" className="text-emerald-600 hover:text-emerald-700 underline">利用規約</a>と<a href="https://boosttech.jp/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">プライバシーポリシー</a>に同意したものとみなされます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-24 lg:py-32 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-4">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6">
              よくある質問
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border-2 border-gray-100 rounded-2xl overflow-hidden transition-all hover:border-emerald-100">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-bold text-gray-900 pr-4">{item.q}</span>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openFaq === i ? "bg-emerald-100" : "bg-gray-100"}`}>
                    {openFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-emerald-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            今すぐ始めましょう
          </h2>
          <p className="text-lg text-emerald-100 mb-10 max-w-2xl mx-auto">
            Freeプランなら7日間無料でお試しいただけます。
            <br />
            クレジットカード不要で、すぐにご利用開始できます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={scrollToForm}
              className="group inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-emerald-600 rounded-xl font-bold text-lg transition-all shadow-2xl hover:shadow-white/20 hover:scale-105"
            >
              無料で始める
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 font-bold tracking-wider block leading-none">BOOSTTECH</span>
                <span className="text-sm font-bold text-white">縦型ショート動画<span className="text-emerald-400">分析</span></span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/terms" className="hover:text-white transition-colors">利用規約</a>
              <a href="https://boosttech.jp/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">プライバシーポリシー</a>
              <a href="#signup" onClick={(e) => { e.preventDefault(); scrollToForm(); }} className="hover:text-white transition-colors cursor-pointer">お問い合わせ</a>
            </div>
            <p className="text-sm text-gray-500">&copy; 2026 BOOSTTECH. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
