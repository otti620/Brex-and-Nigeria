import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Users } from 'lucide-react';

export const FlyerPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
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
            className="bg-gradient-to-b from-[#0b1329] to-[#040814] text-white rounded-[32px] overflow-hidden relative max-w-sm w-full border border-sky-500/30 shadow-[0_0_50px_rgba(14,165,233,0.25)] flex flex-col p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mx-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-extrabold text-[10px] tracking-widest uppercase text-sky-400 font-mono">
                  Official Community Channel
                </span>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-all outline-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Flyer Info */}
            <div className="flex-1 py-6 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-sky-500/20 mb-5 relative">
                <Send className="w-8 h-8 text-white fill-current translate-x-[-1px] translate-y-[-1px]" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0b1329]" />
              </div>
              <h3 className="text-xl font-black tracking-tight leading-snug mb-2">
                Official Telegram Announcement
              </h3>
              <p className="text-slate-300 text-xs font-semibold leading-relaxed px-2">
                Join our channels to get immediate claim event codes, custom promo codes, network settlement announcements, and support.
              </p>

              {/* Verified Badge */}
              <div className="mt-5 flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-3.5 py-1.5 rounded-full">
                <Users size={12} className="text-sky-400" />
                <span className="text-[10px] font-black uppercase text-sky-300 font-mono">12,500+ Active Members</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <a 
                href="https://t.me/brexgroup6" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-sky-500/20 text-center"
              >
                Join Telegram Channel
              </a>
              <button 
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-400 font-extrabold py-3 rounded-2xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Close Bulletin
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
