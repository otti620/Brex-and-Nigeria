import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';

export const FlyerPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-blue-950 rounded-3xl p-6 relative max-w-sm w-full border border-blue-800 shadow-2xl"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-blue-300 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white mb-4">Brex Investment Structure</h3>
            <img src="/flyer.png" alt="Flyer" className="rounded-2xl w-full mb-6" />
            <button 
              onClick={onClose}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              Close <ExternalLink size={18} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
