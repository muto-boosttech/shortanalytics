"use client";

import { useEffect, useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  Check,
  X,
  Eye,
  EyeOff,
  Crown,
  Zap,
  Star,
  Rocket,
  Globe,
  UserPlus,
} from "lucide-react";

interface UserData {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  role: string;
  plan: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  createdBy: { username: string; displayName: string | null } | null;
}

const roleLabels: Record<string, string> = {
  master_admin: "マスター管理者",
  admin: "管理者",
  viewer: "一般ユーザー",
};

const roleBadgeColors: Record<string, string> = {
  master_admin: "bg-red-100 text-red-700 border-red-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  viewer: "bg-gray-100 text-gray-700 border-gray-200",
};

const roleIcons: Record<string, typeof Shield> = {
  master_admin: ShieldCheck,
  admin: Shield,
  viewer: User,
};

const planLabels: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  premium: "Premium",
  max: "Max",
};

const planBadgeColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600 border-gray-200",
  starter: "bg-blue-100 text-blue-700 border-blue-200",
  premium: "bg-purple-100 text-purple-700 border-purple-200",
  max: "bg-amber-100 text-amber-700 border-amber-200",
};

const planIcons: Record<string, typeof Star> = {
  free: Star,
  starter: Zap,
  premium: Crown,
  max: Rocket,
};

const planDescriptions: Record<string, string> = {
  free: "週1回更新 / 月3回分析・エクスポート / 7日間限定",
  starter: "週3回更新 / 月60回分析・エクスポート",
  premium: "1日1回更新 / 月200回分析・エクスポート",
  max: "1日3回更新 / 月500回分析・エクスポート",
};

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    email: "",
    role: "",
    plan: "free",
    isActive: true,
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isMasterAdmin = user?.role === "master_admin";
  const isAdmin = user?.role === "master_admin" || user?.role === "admin";

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [isAdmin, router, fetchUsers]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (u: UserData) => {
    setEditingUser(u);
    setEditForm({
      displayName: u.displayName || "",
      email: u.email || "",
      role: u.role,
      plan: u.plan || "free",
      isActive: u.isActive,
      password: "",
    });
    setShowPassword(false);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      const updateData: Record<string, unknown> = {
        displayName: editForm.displayName,
        email: editForm.email,
        isActive: editForm.isActive,
        plan: editForm.plan,
      };
      if (isMasterAdmin) {
        updateData.role = editForm.role;
      }
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (data.success) {
        showToast("ユーザーを更新しました", "success");
        setEditingUser(null);
        fetchUsers();
      } else {
        showToast(data.error || "更新に失敗しました", "error");
      }
    } catch {
      showToast("更新に失敗しました", "error");
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("ユーザーを削除しました", "success");
        setDeleteConfirm(null);
        fetchUsers();
      } else {
        showToast(data.error || "削除に失敗しました", "error");
      }
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  if (!isAdmin) return null;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ユーザー管理</h1>
          </div>
          <button
            onClick={() => router.push("/users/new")}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            新規ユーザー登録
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-gray-500 sm:text-sm">総ユーザー数</div>
              <div className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-gray-500 sm:text-sm">管理者</div>
              <div className="mt-1 text-xl font-bold text-blue-600 sm:text-2xl">
                {users.filter((u) => u.role === "admin" || u.role === "master_admin").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-gray-500 sm:text-sm">一般ユーザー</div>
              <div className="mt-1 text-xl font-bold text-gray-600 sm:text-2xl">
                {users.filter((u) => u.role === "viewer").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-gray-500 sm:text-sm">有効</div>
              <div className="mt-1 text-xl font-bold text-green-600 sm:text-2xl">
                {users.filter((u) => u.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-gray-500 sm:text-sm">有料プラン</div>
              <div className="mt-1 text-xl font-bold text-purple-600 sm:text-2xl">
                {users.filter((u) => u.plan && u.plan !== "free").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-gray-500 sm:text-sm">LP経由申込</div>
              <div className="mt-1 text-xl font-bold text-emerald-600 sm:text-2xl">
                {users.filter((u) => !u.createdBy && u.role !== "master_admin").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card>
          <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-4">
            <CardTitle className="text-sm sm:text-base">ユーザー一覧</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="text-gray-500">読み込み中...</div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <div className="text-gray-500">ユーザーがいません</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-3 py-3 text-left font-medium text-gray-600 sm:px-4">ユーザー</th>
                      <th className="hidden px-3 py-3 text-left font-medium text-gray-600 sm:table-cell sm:px-4">メール</th>
                      <th className="px-3 py-3 text-left font-medium text-gray-600 sm:px-4">ロール</th>
                      <th className="px-3 py-3 text-left font-medium text-gray-600 sm:px-4">プラン</th>
                      <th className="hidden px-3 py-3 text-left font-medium text-gray-600 md:table-cell sm:px-4">ステータス</th>
                      <th className="hidden px-3 py-3 text-left font-medium text-gray-600 lg:table-cell sm:px-4">登録経路</th>
                      <th className="hidden px-3 py-3 text-left font-medium text-gray-600 xl:table-cell sm:px-4">最終ログイン</th>
                      <th className="px-3 py-3 text-right font-medium text-gray-600 sm:px-4">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const RoleIcon = roleIcons[u.role] || User;
                      const userPlan = u.plan || "free";
                      const PlanIcon = planIcons[userPlan] || Star;
                      return (
                        <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="px-3 py-3 sm:px-4">
                            <div className="flex items-center gap-2">
                              <RoleIcon className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">{u.displayName || u.username}</div>
                                <div className="text-xs text-gray-500">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-3 py-3 text-gray-600 sm:table-cell sm:px-4">
                            {u.email || "-"}
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadgeColors[u.role] || roleBadgeColors.viewer}`}>
                              {roleLabels[u.role] || u.role}
                            </span>
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${planBadgeColors[userPlan] || planBadgeColors.free}`}>
                              <PlanIcon className="h-3 w-3" />
                              {planLabels[userPlan] || userPlan}
                            </span>
                          </td>
                          <td className="hidden px-3 py-3 md:table-cell sm:px-4">
                            {u.isActive ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <Check className="h-3.5 w-3.5" />
                                有効
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-500">
                                <X className="h-3.5 w-3.5" />
                                無効
                              </span>
                            )}
                          </td>
                          <td className="hidden px-3 py-3 lg:table-cell sm:px-4">
                            {u.createdBy ? (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                                <UserPlus className="h-3 w-3" />
                                {u.createdBy.displayName || u.createdBy.username}
                              </span>
                            ) : u.role === "master_admin" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                <Shield className="h-3 w-3" />
                                初期設定
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                <Globe className="h-3 w-3" />
                                LP申込
                              </span>
                            )}
                          </td>
                          <td className="hidden px-3 py-3 text-gray-500 xl:table-cell sm:px-4">
                            {formatDate(u.lastLoginAt)}
                          </td>
                          <td className="px-3 py-3 text-right sm:px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEdit(u)}
                                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                title="編集"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {u.role !== "master_admin" && u.id !== user?.id && (
                                <>
                                  {deleteConfirm === u.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleDelete(u.id)}
                                        className="rounded-lg bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600"
                                        title="削除確認"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="rounded-lg bg-gray-200 p-1.5 text-gray-600 transition-colors hover:bg-gray-300"
                                        title="キャンセル"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteConfirm(u.id)}
                                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                      title="削除"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="mb-4 text-lg font-bold text-gray-900">ユーザー編集</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">ユーザーID</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">表示名</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="表示名を入力"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="メールアドレスを入力"
                  />
                </div>
                {isMasterAdmin && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">ロール</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="master_admin">マスター管理者</option>
                      <option value="admin">管理者</option>
                      <option value="viewer">一般ユーザー</option>
                    </select>
                  </div>
                )}
                {/* プラン選択 */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">プラン</label>
                  <select
                    value={editForm.plan}
                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="free">Free - 週1回更新 / 月3回分析 / 7日間限定</option>
                    <option value="starter">Starter - 週3回更新 / 月60回分析</option>
                    <option value="premium">Premium - 1日1回更新 / 月200回分析</option>
                    <option value="max">Max - 1日3回更新 / 月500回分析</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {planDescriptions[editForm.plan] || ""}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    新しいパスワード（変更する場合のみ）
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="新しいパスワードを入力"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    アカウントを有効にする
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
