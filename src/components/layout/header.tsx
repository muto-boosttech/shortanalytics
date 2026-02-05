"use client";

import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Creative Analyzer
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>ゲスト</span>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-600">
          <LogOut className="h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </header>
  );
}
