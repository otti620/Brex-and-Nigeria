import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send } from 'lucide-react';

export const TelegramModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-sky-600 rounded-3xl p-8 relative max-w-sm w-full border-4 border-white shadow-2xl text-center"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-sky-200"
            >
              <X size={24} />
            </button>
            <Send size={48} className="text-white mx-auto mb-6" />
            <h3 className="text-2xl font-black text-white mb-4">Join our Telegram</h3>
            <p className="text-sky-100 font-bold mb-6">Get real-time updates and support</p>
            <a 
              href="https://t.me/brexgroup6" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-white text-sky-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-50"
            >
              Join Official Channel
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
