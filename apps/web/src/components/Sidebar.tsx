'use client';

import React from 'react';
import { Home, Library, Sparkles, User, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { icon: Home, label: '홈', href: '/' },
  { icon: Library, label: '라이브러리', href: '/library' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-black border-r border-white/5 flex flex-col p-6 z-50">
      {/* Logo Section */}
      <div className="flex items-center gap-3 mb-10 pl-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase">음악, 행복</h1>
      </div>

      {/* Discover Menu */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-bold mb-4 pl-2">디스커버</p>
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                pathname === item.href 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="text-sm font-medium">{item.label}</span>
              {pathname === item.href && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>
      </div>

    </aside>
  );
}
