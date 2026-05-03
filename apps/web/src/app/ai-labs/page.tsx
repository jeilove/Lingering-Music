'use client';

import React from 'react';
import { Sparkles, BrainCircuit, Wand2, Zap, History, Search } from 'lucide-react';
import { AIRecommendation } from '../../components/AIRecommendation';

/**
 * AI 실험실 페이지 컴포넌트
 * 사용자의 음악 취향을 분석하여 다양한 AI 기반 추천 및 실험적 기능을 제공한다.
 */
export default function AILabsPage() {
  return (
    <div className="p-8 pb-32 flex flex-col gap-12 max-w-[1400px] mx-auto">
      {/* 헤더 섹션 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
          <BrainCircuit className="w-10 h-10 text-amber-400" />
          AI 실험실
        </h1>
        <p className="text-muted-foreground text-sm">제미나이 AI가 당신의 음악 취향을 분석하여 새로운 영감을 제공합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 메인 AI 추천 섹션 */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="glass-card p-8 rounded-[32px] border border-amber-400/10 bg-linear-to-br from-amber-400/5 to-transparent">
            <AIRecommendation />
          </div>

          {/* 향후 추가될 실험 기능들 (Placeholder) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-amber-400/20 transition-all group cursor-not-allowed opacity-60">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wand2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">가사 기반 이미지 생성</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">노래 가사의 감정을 분석하여 어울리는 앨범 아트를 AI가 그려줍니다. (준비 중)</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-amber-400/20 transition-all group cursor-not-allowed opacity-60">
              <div className="w-12 h-12 rounded-xl bg-blue-400/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">스마트 플레이리스트</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">현재 날씨와 시간, 당신의 기분에 딱 맞는 플레이리스트를 즉석에서 생성합니다. (준비 중)</p>
            </div>
          </div>
        </div>

        {/* AI 분석 통계 (Sidebar) */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              취향 분석 리포트
            </h3>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                  <span className="text-muted-foreground">선호 장르</span>
                  <span className="text-primary">K-Pop (72%)</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[72%] rounded-full" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                  <span className="text-muted-foreground">음악 분위기</span>
                  <span className="text-amber-400">잔잔한/몽환적 (45%)</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 w-[45%] rounded-full" />
                </div>
              </div>
            </div>

            <button className="w-full mt-8 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all">
              상세 분석 보기
            </button>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-white/5 bg-linear-to-br from-primary/10 to-transparent">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              비슷한 곡 찾기
            </h3>
            <p className="text-[10px] text-muted-foreground mb-4">현재 재생 중인 곡과 가장 유사한 스타일의 곡을 전 세계 음원 데이터에서 찾아냅니다.</p>
            <button className="w-full py-2.5 rounded-lg bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
              분석 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
