import React from 'react';
import { motion } from 'motion/react';
import { DaySummary } from '../hooks/useGameLoop';
import { Award, DollarSign, Heart, Star, Users, TrendingUp, CheckCircle, ArrowRight, Utensils } from 'lucide-react';
import { sounds } from '../utils/audio';

interface DaySummaryModalProps {
  summary: DaySummary;
  onClose: () => void;
}

export const DaySummaryModal: React.FC<DaySummaryModalProps> = ({ summary, onClose }) => {
  const handleContinue = () => {
    sounds.playClick();
    onClose();
  };

  const satisfactionPercent = Math.round(
    (summary.served / Math.max(1, summary.served + summary.lost)) * 100
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none pointer-events-auto">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="mc-panel w-full max-w-lg p-6 flex flex-col font-mono shadow-2xl border-4 border-amber-800 bg-[#e2d6b5] relative overflow-hidden"
      >
        {/* Decorative Gold Header Stamp */}
        <div className="flex items-center justify-between border-b-4 border-stone-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 mc-slot bg-amber-500 text-stone-900 flex items-center justify-center text-2xl shadow">
              <Award size={26} className="text-amber-950" />
            </div>
            <div>
              <div className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                Daily Business Report
              </div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight leading-none">
                END OF DAY {summary.day}
              </h2>
              <span className="text-[10px] font-bold text-stone-600 uppercase">
                Week {summary.week} Shift Concluded
              </span>
            </div>
          </div>

          {/* Star Rating Badge */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-amber-500 drop-shadow">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={i < Math.round(summary.starRating) ? 'fill-amber-400 text-amber-600' : 'text-stone-400'}
                />
              ))}
            </div>
            <span className="text-[11px] font-black text-stone-800 mt-1">
              {summary.starRating.toFixed(1)} / 5.0 Rating
            </span>
          </div>
        </div>

        {/* Ledger Statistics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Revenue */}
          <div className="mc-inner-panel p-3 bg-stone-100/90 flex items-center gap-3 border-2 border-stone-700">
            <div className="p-2 bg-green-100 text-green-700 rounded border border-green-400">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[9px] font-black text-stone-500 uppercase">Gross Revenue</div>
              <div className="text-base font-black text-green-800">
                +${summary.revenue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mc-inner-panel p-3 bg-stone-100/90 flex items-center gap-3 border-2 border-stone-700">
            <div className="p-2 bg-pink-100 text-pink-700 rounded border border-pink-400">
              <Heart size={20} />
            </div>
            <div>
              <div className="text-[9px] font-black text-stone-500 uppercase">Gratuity / Tips</div>
              <div className="text-base font-black text-pink-700">
                +${summary.tips.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Guests Served */}
          <div className="mc-inner-panel p-3 bg-stone-100/90 flex items-center gap-3 border-2 border-stone-700">
            <div className="p-2 bg-blue-100 text-blue-700 rounded border border-blue-400">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[9px] font-black text-stone-500 uppercase">Guests Served</div>
              <div className="text-base font-black text-blue-900">
                {summary.served} customers
              </div>
            </div>
          </div>

          {/* Satisfaction Rate */}
          <div className="mc-inner-panel p-3 bg-stone-100/90 flex items-center gap-3 border-2 border-stone-700">
            <div className="p-2 bg-amber-100 text-amber-700 rounded border border-amber-400">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="text-[9px] font-black text-stone-500 uppercase">Satisfaction</div>
              <div className={`text-base font-black ${satisfactionPercent >= 80 ? 'text-green-700' : 'text-amber-700'}`}>
                {satisfactionPercent}% ({summary.lost} walkouts)
              </div>
            </div>
          </div>
        </div>

        {/* Top Dish Highlight */}
        {summary.topDish && (
          <div className="mc-inner-panel p-3 mb-5 bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <div>
                <div className="text-[9px] font-black text-amber-900 uppercase">Best Seller of the Day</div>
                <div className="text-sm font-black text-stone-900">{summary.topDish}</div>
              </div>
            </div>
            <span className="text-[10px] font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-400 uppercase">
              Fan Favorite
            </span>
          </div>
        )}

        {/* Continue to Next Day Button */}
        <button
          onClick={handleContinue}
          className="w-full py-3.5 mc-button-green text-stone-900 font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          <span>BEGIN DAY {summary.day + 1} SHIFT</span>
          <ArrowRight size={18} />
        </button>
      </motion.div>
    </div>
  );
};
