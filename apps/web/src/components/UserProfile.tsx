'use client';

import React from 'react';
import { User, LogOut } from 'lucide-react';

export function UserProfile() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3 px-2 cursor-pointer group hover:bg-white/5 py-1 px-3 rounded-full transition-colors">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-blue-500/40 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
          <User className="w-4 h-4 text-white/80" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">Alex Rivera</span>
          <span className="text-[9px] text-muted-foreground tracking-wide font-medium">PREMIUM</span>
        </div>
      </div>
      
      <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-red-400 transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10">
        <LogOut className="w-4 h-4" />
        <span className="font-bold">로그아웃</span>
      </button>
    </div>
  );
}
