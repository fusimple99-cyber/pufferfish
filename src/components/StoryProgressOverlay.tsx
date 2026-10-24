import React from 'react';
import { FastForward, Flame, Wind, Sparkles } from 'lucide-react';

interface StoryProgressOverlayProps {
  progress: number; // 0..1
  onSkip: () => void;
}

export const StoryProgressOverlay: React.FC<StoryProgressOverlayProps> = ({ progress, onSkip }) => {
  // Determine current craft phase description
  let phaseTitle = '第一幕 · 挑取糖浆';
  let phaseSubtitle = '工匠以竹管探入紫铜温锅，引出一缕剔透醇厚麦芽金糖…';
  let PhaseIcon = Flame;

  if (progress >= 0.25 && progress < 0.55) {
    phaseTitle = '第二幕 · 揉捏糖胚';
    phaseSubtitle = '温热糖料置于老榆木案头，手工反复折叠拉扯，化为柔软透光的琥珀糖胚…';
    PhaseIcon = Sparkles;
  } else if (progress >= 0.55 && progress < 0.85) {
    phaseTitle = '第三幕 · 吹气赋形';
    phaseSubtitle = '气贯竹管，徐徐注入糖胚腹中，中空鼓胀，捏点出嘟唇、鱼鳍与憨态圆身…';
    PhaseIcon = Wind;
  } else if (progress >= 0.85) {
    phaseTitle = '第四幕 · 凝光成化';
    phaseSubtitle = '糖壳微凉定型，蜂蜜琥珀晶光流转，一只憨态可掬的吹糖河豚跃然案上！';
    PhaseIcon = Sparkles;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-t from-[#120a06]/90 via-transparent to-[#120a06]/40">
      {/* Top indicator */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#20120a]/80 border border-amber-500/30 text-amber-300 text-xs font-serif">
          <PhaseIcon className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>吹糖过程演示中</span>
        </div>

        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 text-xs font-serif transition-colors backdrop-blur-md"
          title="跳过制作动画直接进入3D互动"
        >
          <span>跳过动画 · 直接品赏</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom storytelling text card */}
      <div className="max-w-xl mx-auto w-full flex flex-col items-center text-center p-6 rounded-2xl bg-[#1c1109]/90 border border-amber-500/35 backdrop-blur-md shadow-2xl pointer-events-auto">
        <span className="text-xs font-serif tracking-widest text-amber-400 font-semibold mb-1">
          {phaseTitle}
        </span>
        <p className="text-sm sm:text-base font-serif text-[#ffeed8] leading-relaxed drop-shadow">
          {phaseSubtitle}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs h-1.5 bg-[#120a06] rounded-full overflow-hidden mt-4 border border-amber-900/40">
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 transition-all duration-150"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
