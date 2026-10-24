import React from 'react';
import { X, Flame, Wind, Sparkles, BookOpen } from 'lucide-react';

interface CraftsmanshipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CraftsmanshipModal: React.FC<CraftsmanshipModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-[#1c120a] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-[#f7efe6]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40 bg-[#25180f]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-semibold text-amber-200">
                非遗吹糖人工艺考
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                民间千年技艺 · 麦芽温饴以气化形
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm font-serif leading-relaxed text-[#edd6be]">
          <div className="p-4 rounded-xl bg-[#23150c] border border-amber-900/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-sans font-medium text-xs">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>温炉熬浆 · 麦芽饴糖</span>
            </div>
            <p className="text-stone-300 text-xs sm:text-sm">
              吹糖人是中国传统民间手工艺，相传自宋代即有盛行。手艺人将麦芽糖经由慢火微温熬至粘稠金黄，维持于约60℃微烫但具极佳延展性的胶态，既不可焦糊化水，亦不可受凉硬结。
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#23150c] border border-amber-900/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-sans font-medium text-xs">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>揉胚捏孔 · 导气相引</span>
            </div>
            <p className="text-stone-300 text-xs sm:text-sm">
              师傅自温锅引出一团饴糖，置于木案以食指迅速压出深窝，捏合拉长为中空糖管，宛若天然气阀。手指轻巧翻折，揉捏出饱满紧致而质地温润的琥珀色半透明糖胚。
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#23150c] border border-amber-900/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-sans font-medium text-xs">
              <Wind className="w-4 h-4 text-amber-400" />
              <span>一气呵成 · 点墨赋灵</span>
            </div>
            <p className="text-stone-300 text-xs sm:text-sm">
              艺人含管徐徐吹气，同时双手如抚丝弦般提、拉、捏、剪。内气充盈使得糖壳均匀轻薄膨胀，趁热捏制出河豚圆滚饱满的身躯、嘟起微翘的小口与微颤的鱼鳍；最后点上微黑的糖豆作眼，晶莹剔透，灵气骤现。
            </p>
          </div>

          <p className="text-xs text-[#a6866b] italic text-center pt-2 font-sans">
            「一口热气吹灵性，双手揉捻现化机。」
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-amber-900/40 bg-[#25180f]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#170a04] font-medium text-xs transition-colors"
          >
            返回工坊
          </button>
        </div>
      </div>
    </div>
  );
};
