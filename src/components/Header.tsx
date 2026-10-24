import React from 'react';
import { Volume2, VolumeX, Sparkles, Sun, ShieldCheck, BookOpen, Download, RotateCcw } from 'lucide-react';
import type { WorkshopLightingMode } from '../scene/SugarWorkshopScene';

interface HeaderProps {
  lightingMode: WorkshopLightingMode;
  onLightingChange: (mode: WorkshopLightingMode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onReplayStory: () => void;
  onOpenInspect: () => void;
  onOpenCraftStory: () => void;
  onOpenExport: () => void;
  isCreating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lightingMode,
  onLightingChange,
  soundEnabled,
  onToggleSound,
  onReplayStory,
  onOpenInspect,
  onOpenCraftStory,
  onOpenExport,
  isCreating,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 pointer-events-none bg-gradient-to-b from-[#140b06]/85 via-[#140b06]/50 to-transparent backdrop-blur-[2px]">
      {/* Brand & Title */}
      <div className="flex items-center gap-3.5 pointer-events-auto">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffa638] via-[#e67300] to-[#803300] p-[1.5px] shadow-[0_0_15px_rgba(255,140,20,0.4)] flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-[#20130b] flex items-center justify-center text-amber-400 text-sm font-bold tracking-widest">
            糖
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif tracking-widest text-[#fff2df] font-medium drop-shadow-md">
              一口糖 · 一尾河豚
            </h1>
            <span className="hidden md:inline-block px-2 py-0.5 text-[11px] font-sans tracking-wide rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300/90">
              国家非遗吹糖人
            </span>
          </div>
          <p className="text-xs tracking-wider text-[#d1b090]/80 font-light font-sans mt-0.5">
            The Birth of a Sugar Pufferfish · 3D 沉浸工坊
          </p>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex items-center gap-2 mt-3 sm:mt-0 pointer-events-auto flex-wrap justify-end">
        {/* Replay Creation Story Button */}
        <button
          onClick={onReplayStory}
          disabled={isCreating}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all duration-300 ${
            isCreating
              ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
              : 'border-amber-400/30 bg-[#25170f]/80 text-[#ebd4b9] hover:bg-amber-600/30 hover:border-amber-400/60 hover:text-white shadow-sm'
          }`}
          title="重新观看吹糖人诞生过程"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isCreating ? 'animate-spin' : ''}`} />
          <span>重温诞生</span>
        </button>

        {/* Lighting mode selector */}
        <div className="flex items-center bg-[#25170f]/80 border border-amber-500/25 rounded-full p-0.5 text-xs">
          <button
            onClick={() => onLightingChange('warm_workshop')}
            className={`px-2.5 py-1 rounded-full transition-colors ${
              lightingMode === 'warm_workshop'
                ? 'bg-amber-500 text-[#1a0f08] font-medium'
                : 'text-[#d1b090] hover:text-white'
            }`}
            title="暖金工坊光照"
          >
            暖金
          </button>
          <button
            onClick={() => onLightingChange('candle_glow')}
            className={`px-2.5 py-1 rounded-full transition-colors ${
              lightingMode === 'candle_glow'
                ? 'bg-amber-500 text-[#1a0f08] font-medium'
                : 'text-[#d1b090] hover:text-white'
            }`}
            title="烛影微光"
          >
            烛影
          </button>
          <button
            onClick={() => onLightingChange('morning_amber')}
            className={`px-2.5 py-1 rounded-full transition-colors ${
              lightingMode === 'morning_amber'
                ? 'bg-amber-500 text-[#1a0f08] font-medium'
                : 'text-[#d1b090] hover:text-white'
            }`}
            title="晨曦金光"
          >
            晨曦
          </button>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="p-2 rounded-full border border-amber-500/30 bg-[#25170f]/80 text-[#d1b090] hover:text-amber-200 hover:border-amber-400/60 transition-colors"
          title={soundEnabled ? '静音' : '开启工坊音效'}
          aria-label={soundEnabled ? '静音' : '开启工坊音效'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
        </button>

        {/* Craft Story Introduction */}
        <button
          onClick={onOpenCraftStory}
          className="p-2 rounded-full border border-amber-500/30 bg-[#25170f]/80 text-[#d1b090] hover:text-amber-200 hover:border-amber-400/60 transition-colors"
          title="吹糖人工艺考"
          aria-label="吹糖人工艺介绍"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Model Integrity & Specs */}
        <button
          onClick={onOpenInspect}
          className="p-2 rounded-full border border-amber-500/30 bg-[#25170f]/80 text-[#d1b090] hover:text-amber-200 hover:border-amber-400/60 transition-colors"
          title="原始河豚模型完整性校验"
          aria-label="模型校验"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Local Run & Download Instructions */}
        <button
          onClick={onOpenExport}
          className="p-2 rounded-full border border-amber-500/30 bg-[#25170f]/80 text-[#d1b090] hover:text-amber-200 hover:border-amber-400/60 transition-colors"
          title="下载与本地运行说明"
          aria-label="下载与运行"
        >
          <Download className="w-4 h-4 text-amber-300" />
        </button>
      </div>
    </header>
  );
};
