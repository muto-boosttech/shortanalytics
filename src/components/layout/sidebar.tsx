"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Trophy,
  Database,
  Settings,
  Users,
  X,
  CreditCard,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiredRole?: string[];
}

const navigation: NavItem[] = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { name: "ランキング", href: "/ranking", icon: Trophy },
  { name: "データ収集", href: "/collect", icon: Database },
  { name: "タギング&BM", href: "/admin", icon: Settings, requiredRole: ["master_admin", "admin"] },
  { name: "ユーザー管理", href: "/users", icon: Users, requiredRole: ["master_admin", "admin"] },
  { name: "プラン・お支払い", href: "/settings", icon: CreditCard },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // ロールに基づいてナビゲーション項目をフィルタリング
  const filteredNavigation = navigation.filter((item) => {
    if (!item.requiredRole) return true;
    return user?.role && item.requiredRole.includes(user.role);
  });

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* サイドバー */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 border-r bg-white transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:z-40",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-3">
          <div className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="BOOSTTECH 縦型ショート動画分析" 
              width={180}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          {/* モバイル用閉じるボタン */}
          <button 
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <nav className="space-y-1 p-4">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
