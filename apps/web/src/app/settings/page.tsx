'use client';

import React from 'react';
import { Settings, User, Shield, Bell, Database, Globe, Moon, Volume2, Cloud } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * 환경설정 페이지 컴포넌트
 * 앱의 일반 설정, 계정 관리, 데이터 동기화 등을 제어한다.
 */
export default function SettingsPage() {
  const sections = [
    { 
      icon: User, 
      title: '계정 설정', 
      desc: '프로필 정보 및 동기화 계정 관리',
      items: [
        { label: 'Google 계정 연결', value: 'jeilove17@gmail.com', action: '변경' },
        { label: '데이터 자동 동기화', value: '활성화', toggle: true },
      ]
    },
    { 
      icon: Volume2, 
      title: '재생 및 오디오', 
      desc: '음질 및 플레이어 동작 설정',
      items: [
        { label: '기본 스트리밍 음질', value: '고음질 (320kbps)', action: '변경' },
        { label: '가사 자동 표시', value: '비활성화', toggle: false },
        { label: '오디오 크로스페이드', value: '3초', action: '설정' },
      ]
    },
    { 
      icon: Cloud, 
      title: '저장소 및 백업', 
      desc: '클라우드 DB 및 로컬 캐시 관리',
      items: [
        { label: 'Vercel Serverless + Neon', value: '연결됨', status: 'online' },
        { label: '로컬 데이터 백업', action: '지금 실행' },
        { label: '캐시된 음원 삭제', value: '1.2 GB', action: '삭제' },
      ]
    },
    { 
      icon: Shield, 
      title: '보안 및 개인정보', 
      desc: '데이터 보안 및 접근 권한 설정',
      items: [
        { label: '재생 기록 수집 동의', value: '동의함', toggle: true },
        { label: '익명 분석 데이터 전송', value: '거부함', toggle: false },
      ]
    }
  ];

  return (
    <div className="p-8 pb-32 flex flex-col gap-12 max-w-[1000px] mx-auto">
      {/* 헤더 섹션 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
          <Settings className="w-10 h-10 text-primary" />
          환경설정
        </h1>
        <p className="text-muted-foreground text-sm">애플리케이션의 동작 방식과 개인 설정을 관리합니다.</p>
      </div>

      <div className="flex flex-col gap-8">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 px-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <section.icon className="w-5 h-5 text-primary" />
                {section.title}
              </h2>
              <p className="text-xs text-muted-foreground">{section.desc}</p>
            </div>

            <div className="glass-card rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <span className="text-sm text-white/80">{item.label}</span>
                  <div className="flex items-center gap-4">
                    {item.status === 'online' && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        ONLINE
                      </span>
                    )}
                    {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                    {item.action && (
                      <button className="text-xs font-bold text-primary hover:underline transition-all">
                        {item.action}
                      </button>
                    )}
                    {item.toggle !== undefined && (
                      <button className={cn(
                        "w-10 h-5 rounded-full p-1 transition-all duration-300 relative",
                        item.toggle ? "bg-primary" : "bg-white/10"
                      )}>
                        <div className={cn(
                          "w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-lg",
                          item.toggle ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 앱 정보 섹션 */}
      <div className="mt-8 p-8 glass-card rounded-[32px] border border-white/5 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20">
          <Settings className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Vibe Music Player</h3>
          <p className="text-xs text-muted-foreground">Version 1.0.0 (Stable)</p>
        </div>
        <p className="text-[10px] text-muted-foreground/60 max-w-xs">
          © 2026 jeilove. All rights reserved. <br/>
          Made with Love and AI.
        </p>
      </div>
    </div>
  );
}
