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
          className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-blue-950 rounded-[40px] p-8 relative max-w-lg w-full border-4 border-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.5)]"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-blue-300 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white mb-4">Brex Investment Structure</h3>
            <div className="w-full h-64 bg-blue-800 rounded-2xl mb-6 flex items-center justify-center text-blue-400 font-bold">
              [Flyer Placeholder]
            </div>
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
