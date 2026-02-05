"use client";

import { LogOut, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-3 lg:left-64 lg:h-16 lg:px-6">
      <div className="flex items-center gap-3">
        {/* モバイル用ハンバーガーメニュー */}
        <button 
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 lg:text-lg">
          Creative Analyzer
        </h1>
      </div>
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="hidden items-center gap-2 text-sm text-gray-600 sm:flex">
          <User className="h-4 w-4" />
          <span>BoosttechTikTok</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2 text-gray-600 lg:h-9 lg:px-3"
          onClick={handleLogout}
          disabled={isLoading}
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">ログアウト</span>
        </Button>
      </div>
    </header>
  );
}
