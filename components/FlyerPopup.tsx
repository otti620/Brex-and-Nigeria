import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, Gift, ArrowRight } from 'lucide-react';
import promoFlyer from '../src/assets/images/brex_super_promo_1781195977645.jpg';

export const FlyerPopup = ({ isOpen, onClose, onAction }: { isOpen: boolean; onClose: () => void; onAction?: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-[#060b19] text-white rounded-[32px] overflow-hidden relative max-w-sm w-full border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col max-h-[92vh]"
          >
            {/* Header / Glowing Border Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-600 to-amber-500 z-10" />

            {/* Close Button overlay */}
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-95 transition-all outline-none border border-white/10"
            >
              <X size={16} />
            </button>

            {/* Scrollable Promo Image Frame */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative min-h-0">
              <div className="relative">
                {/* Premium Promo Label Badge */}
                <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-mono text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-md border border-amber-400/30">
                  <Flame size={10} className="text-white animate-pulse" />
                  <span>Exclusive Benefit</span>
                </div>

                {/* Main Rendered Flyer Asset */}
                <img 
                  src={promoFlyer} 
                  alt="Brex Super Promo 25% Cashback Offer" 
                  referrerPolicy="no-referrer"
                  className="w-full object-cover rounded-t-[32px]"
                />

                {/* Content Overlay details for styling backup */}
                <div className="p-6 space-y-4 bg-gradient-to-t from-[#060b19] via-[#060b19]/90 to-transparent pt-8 -mt-10 relative z-10 text-left">
                  <h3 className="text-xl font-black text-white font-sans flex items-center gap-2 tracking-tight">
                    🔥 25% Instant Cashback!
                  </h3>
                  <p className="text-[11px] leading-relaxed text-slate-350 font-medium">
                    Secure any premium savings allocation of <span className="text-amber-400 font-extrabold">₦7,500 and above</span> today. Instantly harvest 25% capital refund back into your main wallet with product value coverage!
                  </p>

                  <div className="space-y-2 bg-[#0c1328] border border-amber-500/10 p-3.5 rounded-2xl">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400 font-bold">Invest ₦7,500</span>
                      <span className="text-amber-400 font-black">Get ₦1,875 Instantly</span>
                    </div>
                    <div className="border-t border-white/5" />
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400 font-bold">Invest ₦16,000</span>
                      <span className="text-amber-400 font-black">Get ₦4,000 Instantly</span>
                    </div>
                    <div className="border-t border-white/5" />
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400 font-bold">Invest ₦30,000</span>
                      <span className="text-amber-400 font-black">Get ₦7,500 Instantly</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Board */}
            <div className="p-5 bg-[#060b19] border-t border-white/5 shrink-0">
              <button 
                onClick={() => {
                  if (onAction) {
                    onAction();
                  } else {
                    onClose();
                  }
                }}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-600 to-amber-500 text-white font-mono font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-amber-600/25"
              >
                <Gift size={14} /> Claim My Cashback Bonus <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

