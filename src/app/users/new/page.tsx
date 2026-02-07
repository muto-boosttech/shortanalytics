"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowLeft, Eye, EyeOff, Check, Copy, Star, Zap, Crown, Rocket } from "lucide-react";

const planOptions = [
  {
    value: "free",
    label: "Free",
    icon: Star,
    color: "border-gray-200 bg-gray-50",
    selectedColor: "border-gray-400 bg-gray-100 ring-2 ring-gray-300",
    description: "週1回更新 / 月3回分析・エクスポート / 7日間限定",
  },
  {
    value: "starter",
    label: "Starter",
    icon: Zap,
    color: "border-blue-200 bg-blue-50",
    selectedColor: "border-blue-400 bg-blue-100 ring-2 ring-blue-300",
    description: "週3回更新 / 月60回分析・エクスポート",
  },
  {
    value: "premium",
    label: "Premium",
    icon: Crown,
    color: "border-purple-200 bg-purple-50",
    selectedColor: "border-purple-400 bg-purple-100 ring-2 ring-purple-300",
    description: "1日1回更新 / 月200回分析・エクスポート",
  },
  {
    value: "max",
    label: "Max",
    icon: Rocket,
    color: "border-amber-200 bg-amber-50",
    selectedColor: "border-amber-400 bg-amber-100 ring-2 ring-amber-300",
    description: "1日3回更新 / 月500回分析・エクスポート",
  },
];

export default function NewUserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    email: "",
    role: "viewer",
    plan: "free",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdUser, setCreatedUser] = useState<{
    username: string;
    password: string;
    displayName: string;
    role: string;
    plan: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const isMasterAdmin = user?.role === "master_admin";
  const isAdmin = user?.role === "master_admin" || user?.role === "admin";

  // ランダムパスワード生成
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password });
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.username || !form.password) {
      setError("ユーザーIDとパスワードは必須です");
      return;
    }

    if (form.password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedUser({
          username: form.username,
          password: form.password,
          displayName: form.displayName || form.username,
          role: form.role,
          plan: form.plan,
        });
      } else {
        setError(data.error || "ユーザーの作成に失敗しました");
      }
    } catch {
      setError("ユーザーの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    master_admin: "マスター管理者",
    admin: "管理者",
    viewer: "一般ユーザー",
  };

  const planLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    premium: "Premium",
    max: "Max",
  };

  const handleCopyCredentials = () => {
    if (!createdUser) return;
    const text = `ユーザーID: ${createdUser.username}\nパスワード: ${createdUser.password}\nロール: ${roleLabels[createdUser.role] || createdUser.role}\nプラン: ${planLabels[createdUser.plan] || createdUser.plan}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAdmin) {
    router.push("/dashboard");
    return null;
  }

  // 作成完了画面
  if (createdUser) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-lg space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ユーザー作成完了</h1>
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-green-800">ログイン情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-white p-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">表示名:</span>
                    <span className="text-gray-900">{createdUser.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">ユーザーID:</span>
                    <span className="font-mono text-gray-900">{createdUser.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">パスワード:</span>
                    <span className="font-mono text-gray-900">{createdUser.password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">ロール:</span>
                    <span className="text-gray-900">{roleLabels[createdUser.role] || createdUser.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">プラン:</span>
                    <span className="text-gray-900">{planLabels[createdUser.plan] || createdUser.plan}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopyCredentials}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    ログイン情報をコピー
                  </>
                )}
              </button>
              <p className="text-xs text-green-700">
                このログイン情報をユーザーに共有してください。パスワードは後から確認できません。
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setCreatedUser(null);
                setForm({ username: "", password: "", displayName: "", email: "", role: "viewer", plan: "free" });
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              続けて登録
            </button>
            <button
              onClick={() => router.push("/users")}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              ユーザー一覧へ
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/users")}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <UserPlus className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">新規ユーザー登録</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  ユーザーID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="ログイン用のユーザーIDを入力"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="6文字以上のパスワードを入力"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="mt-1.5 text-xs text-primary hover:text-primary/80"
                >
                  ランダムパスワードを生成
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">表示名</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="画面上に表示される名前"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="メールアドレスを入力（任意）"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ロール</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {isMasterAdmin && <option value="master_admin">マスター管理者</option>}
                  {isMasterAdmin && <option value="admin">管理者</option>}
                  <option value="viewer">一般ユーザー</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {isMasterAdmin
                    ? "マスター管理者: 全機能利用可 / 管理者: ユーザー管理可 / 一般: 閲覧のみ"
                    : "一般ユーザーのみ作成できます"}
                </p>
              </div>

              {/* プラン選択 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">プラン</label>
                <div className="grid grid-cols-2 gap-2">
                  {planOptions.map((plan) => {
                    const Icon = plan.icon;
                    const isSelected = form.plan === plan.value;
                    return (
                      <button
                        key={plan.value}
                        type="button"
                        onClick={() => setForm({ ...form, plan: plan.value })}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          isSelected ? plan.selectedColor : plan.color
                        } hover:shadow-sm`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-semibold">{plan.label}</span>
                        </div>
                        <p className="mt-1 text-[10px] leading-tight text-gray-600">{plan.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/users")}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      作成中...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      ユーザーを作成
                    </>
                  )}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
