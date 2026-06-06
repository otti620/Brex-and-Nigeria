import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, TrendingUp } from 'lucide-react';
import flyer1 from '../src/assets/images/revenue_stream_flyer_1780385009267.png';
import flyer2 from '../src/assets/images/wealth_builder_flyer_1780385024026.png';

export const FlyerPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'wealth'>('revenue');

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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#0b1329] text-white rounded-[32px] overflow-hidden relative max-w-md w-full border border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.3)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="text-yellow-400 w-5 h-5 animate-pulse" />
                <span className="font-black text-sm tracking-widest uppercase bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Special Invest Offers
                </span>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector Tabs */}
            <div className="flex gap-2 p-4 pb-2">
              <button
                onClick={() => setActiveTab('revenue')}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all outline-none cursor-pointer ${
                  activeTab === 'revenue'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/10'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Revenue Stream (₦50k)
              </button>
              <button
                onClick={() => setActiveTab('wealth')}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all outline-none cursor-pointer ${
                  activeTab === 'wealth'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Wealth Builder (₦15k)
              </button>
            </div>

            {/* Flyer Image Container */}
            <div className="flex-1 p-4 overflow-y-auto min-h-0 bg-slate-950/40">
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-inner group relative">
                {activeTab === 'revenue' ? (
                  <motion.img 
                    key="revenue"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    src={flyer1} 
                    alt="Revenue Stream Plan Flyer" 
                    className="w-full object-contain mx-auto"
                  />
                ) : (
                  <motion.img 
                    key="wealth"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    src={flyer2} 
                    alt="Wealth Builder Plan Flyer" 
                    className="w-full object-contain mx-auto"
                  />
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-950 border-t border-white/5 flex flex-col gap-2">
              <button 
                onClick={onClose}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <TrendingUp size={14} /> Start Earning Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
