"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Hash,
  Loader2,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

interface Hashtag {
  id: number;
  industryId: number;
  hashtag: string;
  isActive: boolean;
  platform: string;
}

interface Industry {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  hashtags?: Hashtag[];
  _count?: {
    hashtags: number;
    videoTags: number;
  };
}

const PLATFORMS = [
  { value: "tiktok", label: "TikTok", color: "bg-gray-900 text-white" },
  { value: "youtube", label: "YouTube", color: "bg-red-600 text-white" },
  { value: "instagram", label: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
];

export default function IndustriesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndustry, setExpandedIndustry] = useState<number | null>(null);
  const [industryHashtags, setIndustryHashtags] = useState<Record<number, Hashtag[]>>({});
  const [loadingHashtags, setLoadingHashtags] = useState<number | null>(null);

  // 業種追加フォーム
  const [showAddIndustry, setShowAddIndustry] = useState(false);
  const [newIndustryName, setNewIndustryName] = useState("");
  const [newIndustrySlug, setNewIndustrySlug] = useState("");
  const [addingIndustry, setAddingIndustry] = useState(false);

  // 業種編集
  const [editingIndustry, setEditingIndustry] = useState<number | null>(null);
  const [editIndustryName, setEditIndustryName] = useState("");
  const [editIndustrySlug, setEditIndustrySlug] = useState("");

  // ハッシュタグ追加フォーム
  const [showAddHashtag, setShowAddHashtag] = useState<number | null>(null);
  const [newHashtag, setNewHashtag] = useState("");
  const [newHashtagPlatform, setNewHashtagPlatform] = useState("tiktok");
  const [addingHashtag, setAddingHashtag] = useState(false);

  // ハッシュタグ編集
  const [editingHashtag, setEditingHashtag] = useState<number | null>(null);
  const [editHashtagValue, setEditHashtagValue] = useState("");

  // 確認ダイアログ
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "industry" | "hashtag"; id: number; industryId?: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 通知
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchIndustries = useCallback(async () => {
    try {
      const res = await fetch("/api/industries");
      const data = await res.json();
      if (data.success) {
        setIndustries(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("業種の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHashtags = async (industryId: number) => {
    setLoadingHashtags(industryId);
    try {
      const res = await fetch(`/api/industries/${industryId}/hashtags`);
      const data = await res.json();
      if (data.success) {
        setIndustryHashtags((prev) => ({
          ...prev,
          [industryId]: data.data.hashtags,
        }));
      }
    } catch {
      showNotification("error", "ハッシュタグの取得に失敗しました");
    } finally {
      setLoadingHashtags(null);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "master_admin")) {
      router.push("/dashboard");
      return;
    }
    if (!authLoading && user) {
      fetchIndustries();
    }
  }, [user, authLoading, router, fetchIndustries]);

  const toggleExpand = (industryId: number) => {
    if (expandedIndustry === industryId) {
      setExpandedIndustry(null);
    } else {
      setExpandedIndustry(industryId);
      if (!industryHashtags[industryId]) {
        fetchHashtags(industryId);
      }
    }
  };

  // 業種追加
  const handleAddIndustry = async () => {
    if (!newIndustryName.trim() || !newIndustrySlug.trim()) return;
    setAddingIndustry(true);
    try {
      const res = await fetch("/api/industries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newIndustryName.trim(), slug: newIndustrySlug.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", `業種「${newIndustryName}」を追加しました`);
        setNewIndustryName("");
        setNewIndustrySlug("");
        setShowAddIndustry(false);
        fetchIndustries();
      } else {
        showNotification("error", data.error || "業種の追加に失敗しました");
      }
    } catch {
      showNotification("error", "業種の追加に失敗しました");
    } finally {
      setAddingIndustry(false);
    }
  };

  // 業種更新
  const handleUpdateIndustry = async (industryId: number) => {
    if (!editIndustryName.trim() || !editIndustrySlug.trim()) return;
    try {
      const res = await fetch(`/api/industries/${industryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editIndustryName.trim(), slug: editIndustrySlug.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", "業種を更新しました");
        setEditingIndustry(null);
        fetchIndustries();
      } else {
        showNotification("error", data.error || "業種の更新に失敗しました");
      }
    } catch {
      showNotification("error", "業種の更新に失敗しました");
    }
  };

  // 業種削除
  const handleDeleteIndustry = async (industryId: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/industries/${industryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || "業種を削除しました");
        setDeleteConfirm(null);
        fetchIndustries();
      } else {
        showNotification("error", data.error || "業種の削除に失敗しました");
      }
    } catch {
      showNotification("error", "業種の削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  // ハッシュタグ追加
  const handleAddHashtag = async (industryId: number) => {
    if (!newHashtag.trim()) return;
    setAddingHashtag(true);
    try {
      const res = await fetch(`/api/industries/${industryId}/hashtags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashtag: newHashtag.trim().replace(/^#/, ""),
          platform: newHashtagPlatform,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", `ハッシュタグ「#${newHashtag.trim().replace(/^#/, "")}」を追加しました`);
        setNewHashtag("");
        setShowAddHashtag(null);
        fetchHashtags(industryId);
        fetchIndustries();
      } else {
        showNotification("error", data.error || "ハッシュタグの追加に失敗しました");
      }
    } catch {
      showNotification("error", "ハッシュタグの追加に失敗しました");
    } finally {
      setAddingHashtag(false);
    }
  };

  // ハッシュタグ更新
  const handleUpdateHashtag = async (industryId: number, hashtagId: number) => {
    if (!editHashtagValue.trim()) return;
    try {
      const res = await fetch(`/api/industries/${industryId}/hashtags/${hashtagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtag: editHashtagValue.trim().replace(/^#/, "") }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", "ハッシュタグを更新しました");
        setEditingHashtag(null);
        fetchHashtags(industryId);
      } else {
        showNotification("error", data.error || "ハッシュタグの更新に失敗しました");
      }
    } catch {
      showNotification("error", "ハッシュタグの更新に失敗しました");
    }
  };

  // ハッシュタグ有効/無効切り替え
  const handleToggleHashtag = async (industryId: number, hashtagId: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/industries/${industryId}/hashtags/${hashtagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", `ハッシュタグを${!currentActive ? "有効" : "無効"}にしました`);
        fetchHashtags(industryId);
      }
    } catch {
      showNotification("error", "ハッシュタグの更新に失敗しました");
    }
  };

  // ハッシュタグ削除
  const handleDeleteHashtag = async (industryId: number, hashtagId: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/industries/${industryId}/hashtags/${hashtagId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", "ハッシュタグを削除しました");
        setDeleteConfirm(null);
        fetchHashtags(industryId);
        fetchIndustries();
      } else {
        showNotification("error", data.error || "ハッシュタグの削除に失敗しました");
      }
    } catch {
      showNotification("error", "ハッシュタグの削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  // スラッグ自動生成
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* 通知 */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">削除の確認</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {deleteConfirm.type === "industry"
                ? `業種「${deleteConfirm.name}」を削除しますか？関連するハッシュタグ、動画タグ、ベンチマークデータもすべて削除されます。`
                : `ハッシュタグ「#${deleteConfirm.name}」を削除しますか？`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === "industry") {
                    handleDeleteIndustry(deleteConfirm.id);
                  } else if (deleteConfirm.industryId) {
                    handleDeleteHashtag(deleteConfirm.industryId, deleteConfirm.id);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">業種・ハッシュタグ管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              業種とハッシュタグを管理します。追加されたハッシュタグは次回のデータ収集から自動的に反映されます。
            </p>
          </div>
          <button
            onClick={() => setShowAddIndustry(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            業種を追加
          </button>
        </div>

        {/* 業種追加フォーム */}
        {showAddIndustry && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">新しい業種を追加</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">業種名</label>
                <input
                  type="text"
                  value={newIndustryName}
                  onChange={(e) => {
                    setNewIndustryName(e.target.value);
                    if (!newIndustrySlug || newIndustrySlug === generateSlug(newIndustryName)) {
                      setNewIndustrySlug(generateSlug(e.target.value));
                    }
                  }}
                  placeholder="例: フィットネス"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ（英数字）</label>
                <input
                  type="text"
                  value={newIndustrySlug}
                  onChange={(e) => setNewIndustrySlug(e.target.value)}
                  placeholder="例: fitness"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAddIndustry(false);
                  setNewIndustryName("");
                  setNewIndustrySlug("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddIndustry}
                disabled={addingIndustry || !newIndustryName.trim() || !newIndustrySlug.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {addingIndustry ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                追加
              </button>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            {error}
          </div>
        )}

        {/* 業種一覧 */}
        <div className="space-y-3">
          {industries.map((industry) => (
            <div key={industry.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              {/* 業種ヘッダー */}
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => toggleExpand(industry.id)}
                >
                  {expandedIndustry === industry.id ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}

                  {editingIndustry === industry.id ? (
                    <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editIndustryName}
                        onChange={(e) => setEditIndustryName(e.target.value)}
                        className="rounded border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        placeholder="業種名"
                      />
                      <input
                        type="text"
                        value={editIndustrySlug}
                        onChange={(e) => setEditIndustrySlug(e.target.value)}
                        className="rounded border px-2 py-1 text-sm text-gray-500 focus:border-primary focus:outline-none"
                        placeholder="スラッグ"
                      />
                      <button
                        onClick={() => handleUpdateIndustry(industry.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingIndustry(null)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">{industry.name}</span>
                      <span className="ml-2 text-xs text-gray-400">({industry.slug})</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Hash className="h-3.5 w-3.5" />
                    <span>{industry._count?.hashtags || 0} タグ</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {industry._count?.videoTags || 0} 動画
                  </div>
                  {editingIndustry !== industry.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingIndustry(industry.id);
                          setEditIndustryName(industry.name);
                          setEditIndustrySlug(industry.slug);
                        }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="編集"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ type: "industry", id: industry.id, name: industry.name });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ハッシュタグ一覧（展開時） */}
              {expandedIndustry === industry.id && (
                <div className="border-t bg-gray-50 p-4">
                  {loadingHashtags === industry.id ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      {/* プラットフォーム別ハッシュタグ */}
                      {PLATFORMS.map((platform) => {
                        const platformHashtags = (industryHashtags[industry.id] || []).filter(
                          (h) => h.platform === platform.value
                        );
                        return (
                          <div key={platform.value} className="mb-4 last:mb-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${platform.color}`}>
                                {platform.label}
                              </span>
                              <span className="text-xs text-gray-400">{platformHashtags.length} タグ</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {platformHashtags.map((hashtag) => (
                                <div
                                  key={hashtag.id}
                                  className={`group flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                                    hashtag.isActive
                                      ? "bg-white border-gray-200 text-gray-900"
                                      : "bg-gray-100 border-gray-200 text-gray-400 line-through"
                                  }`}
                                >
                                  {editingHashtag === hashtag.id ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-400">#</span>
                                      <input
                                        type="text"
                                        value={editHashtagValue}
                                        onChange={(e) => setEditHashtagValue(e.target.value)}
                                        className="w-24 border-b border-primary bg-transparent text-sm focus:outline-none"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleUpdateHashtag(industry.id, hashtag.id);
                                          if (e.key === "Escape") setEditingHashtag(null);
                                        }}
                                      />
                                      <button
                                        onClick={() => handleUpdateHashtag(industry.id, hashtag.id)}
                                        className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingHashtag(null)}
                                        className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span>#{hashtag.hashtag}</span>
                                      <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                                        <button
                                          onClick={() => handleToggleHashtag(industry.id, hashtag.id, hashtag.isActive)}
                                          className={`p-0.5 rounded transition-colors ${
                                            hashtag.isActive
                                              ? "text-yellow-500 hover:bg-yellow-50"
                                              : "text-green-500 hover:bg-green-50"
                                          }`}
                                          title={hashtag.isActive ? "無効にする" : "有効にする"}
                                        >
                                          {hashtag.isActive ? (
                                            <X className="h-3 w-3" />
                                          ) : (
                                            <Check className="h-3 w-3" />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingHashtag(hashtag.id);
                                            setEditHashtagValue(hashtag.hashtag);
                                          }}
                                          className="p-0.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                          title="編集"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            setDeleteConfirm({
                                              type: "hashtag",
                                              id: hashtag.id,
                                              industryId: industry.id,
                                              name: hashtag.hashtag,
                                            })
                                          }
                                          className="p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="削除"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                              {platformHashtags.length === 0 && (
                                <span className="text-xs text-gray-400 italic">ハッシュタグなし</span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* ハッシュタグ追加 */}
                      {showAddHashtag === industry.id ? (
                        <div className="mt-4 flex items-center gap-2 p-3 bg-white rounded-lg border">
                          <span className="text-gray-400">#</span>
                          <input
                            type="text"
                            value={newHashtag}
                            onChange={(e) => setNewHashtag(e.target.value)}
                            placeholder="ハッシュタグを入力"
                            className="flex-1 text-sm border-0 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddHashtag(industry.id);
                              if (e.key === "Escape") {
                                setShowAddHashtag(null);
                                setNewHashtag("");
                              }
                            }}
                          />
                          <select
                            value={newHashtagPlatform}
                            onChange={(e) => setNewHashtagPlatform(e.target.value)}
                            className="text-xs border rounded px-2 py-1 focus:outline-none focus:border-primary"
                          >
                            {PLATFORMS.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAddHashtag(industry.id)}
                            disabled={addingHashtag || !newHashtag.trim()}
                            className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                          >
                            {addingHashtag ? <Loader2 className="h-3 w-3 animate-spin" /> : "追加"}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddHashtag(null);
                              setNewHashtag("");
                            }}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setShowAddHashtag(industry.id);
                            setNewHashtagPlatform("tiktok");
                          }}
                          className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          ハッシュタグを追加
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {industries.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <Hash className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">業種が登録されていません</p>
              <p className="text-sm mt-1">「業種を追加」ボタンから最初の業種を登録してください。</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
