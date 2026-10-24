import React from 'react';
import { Wind, Rotate3d, Compass } from 'lucide-react';

interface InteractionOverlayProps {
  scale: number;
  isHeld: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  onAngleChange: (angle: 'front' | 'side' | 'back' | 'reset') => void;
  isCreating: boolean;
}

export const InteractionOverlay: React.FC<InteractionOverlayProps> = ({
  scale,
  isHeld,
  onPressStart,
  onPressEnd,
  onAngleChange,
  isCreating,
}) => {
  if (isCreating) return null;

  const inflationPercent = Math.round(Math.max(0, Math.min(100, ((scale - 1.0) / 0.35) * 100)));

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-8 z-10">
      {/* Top spacing */}
      <div className="h-16" />

      {/* Center ambient interaction reminder if idle */}
      {!isHeld && scale < 1.05 && (
        <div className="self-center flex flex-col items-center gap-1.5 transition-opacity duration-700 pointer-events-none mt-auto mb-20 animate-pulse">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e130c]/70 backdrop-blur-md border border-amber-500/30 text-amber-200/90 shadow-lg">
            <Wind className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-serif tracking-widest font-normal">
              按住，为糖人吹一口气
            </span>
          </div>
          <span className="text-[11px] font-sans tracking-wider text-[#d4b595]/60 font-light">
            Hold to Breathe Life Into It · 支持空格键
          </span>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3 pointer-events-auto">
        {/* Angle presets & 360 Hint */}
        <div className="flex items-center justify-between w-full px-2 text-xs text-[#c9aa8d]/80">
          <div className="flex items-center gap-1.5">
            <Rotate3d className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-serif">拖动 360° 自由旋转</span>
          </div>

          <div className="flex items-center gap-1 bg-[#20120a]/80 border border-amber-500/25 rounded-full p-0.5">
            <button
              onClick={() => onAngleChange('front')}
              className="px-2.5 py-1 rounded-full text-xs text-[#d1b090] hover:text-white hover:bg-amber-600/30 transition-colors"
              title="观察正面"
            >
              正面
            </button>
            <button
              onClick={() => onAngleChange('side')}
              className="px-2.5 py-1 rounded-full text-xs text-[#d1b090] hover:text-white hover:bg-amber-600/30 transition-colors"
              title="观察侧面"
            >
              侧面
            </button>
            <button
              onClick={() => onAngleChange('back')}
              className="px-2.5 py-1 rounded-full text-xs text-[#d1b090] hover:text-white hover:bg-amber-600/30 transition-colors"
              title="观察背面"
            >
              背面
            </button>
            <button
              onClick={() => onAngleChange('reset')}
              className="p-1 rounded-full text-[#d1b090] hover:text-amber-300 hover:bg-amber-600/30 transition-colors"
              title="复位视角"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Breathing Button Island */}
        <div className="w-full flex items-center justify-between gap-4 p-3 rounded-2xl bg-[#20120a]/85 border border-amber-500/35 backdrop-blur-md shadow-2xl">
          {/* Status readout */}
          <div className="flex flex-col pl-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#a88a6d] font-sans">形态膨胀</span>
              <span className="text-sm font-mono font-medium text-amber-300">
                {scale.toFixed(2)}x
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-32 h-1.5 bg-[#120a06] rounded-full overflow-hidden mt-1 border border-amber-900/40">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-75"
                style={{ width: `${inflationPercent}%` }}
              />
            </div>
          </div>

          {/* Large tactile Hold / Breathe Button */}
          <button
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerLeave={onPressEnd}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 rounded-xl font-serif text-sm tracking-widest transition-all duration-200 select-none shadow-lg active:scale-95 ${
              isHeld
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-[#170a04] font-semibold shadow-[0_0_30px_rgba(255,160,30,0.6)]'
                : 'bg-gradient-to-r from-[#8f440b] via-[#ad5510] to-[#8f440b] hover:from-[#a8520e] hover:to-[#a8520e] text-[#fff4e6] border border-amber-400/40'
            }`}
            aria-label="按住为糖人吹气膨胀"
          >
            <Wind className={`w-4 h-4 ${isHeld ? 'animate-bounce text-[#170a04]' : 'text-amber-200'}`} />
            <span>{isHeld ? '正在注气膨胀…' : '按住吹气 (Hold)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
