import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

const NAMES = ['Ola', 'Tunde', 'Chioma', 'Ifeanyi', 'Amara', 'Babatunde', 'Fatima', 'Yusuf', 'Efe', 'Chinedu'];
const ACTIONS = ['deposited', 'withdrew', 'earned'];

export const LiveActivityBar = () => {
  const [activity, setActivity] = useState({ name: NAMES[0], action: ACTIONS[0], amount: 5000 });

  useEffect(() => {
    const interval = setInterval(() => {
      setActivity({
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
        amount: Math.floor(Math.random() * 50000) + 1000
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-gray-100 p-3 rounded-full shadow-sm flex items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            <User size={12} />
        </div>
        <AnimatePresence mode="wait">
            <motion.p 
                key={activity.name + activity.action}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[11px] font-bold text-gray-800"
            >
                {activity.name} {activity.action} ₦{activity.amount.toLocaleString()}
            </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
      </div>
    </div>
  );
};
