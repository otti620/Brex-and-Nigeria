
import React from 'react';

interface MemojiProps {
  state: 'Neutral' | 'Happy' | 'Focused' | 'Celebration' | 'Concerned';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Memoji: React.FC<MemojiProps> = ({ state, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  const getEmoji = () => {
    switch (state) {
      case 'Happy': return '😊';
      case 'Focused': return '🧐';
      case 'Celebration': return '🤩';
      case 'Concerned': return '😟';
      case 'Neutral':
      default: return '🙂';
    }
  };

  const getColors = () => {
    switch (state) {
      case 'Happy': return 'from-green-100 to-green-200';
      case 'Focused': return 'from-indigo-100 to-indigo-200';
      case 'Celebration': return 'from-yellow-100 to-orange-200';
      case 'Concerned': return 'from-red-100 to-orange-100';
      case 'Neutral':
      default: return 'from-slate-100 to-slate-200';
    }
  };

  return (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${getColors()} flex items-center justify-center shadow-inner relative overflow-hidden group`}>
      <span className={`transition-transform duration-500 group-hover:scale-110`} style={{ fontSize: size === 'xl' ? '6rem' : size === 'lg' ? '4rem' : size === 'md' ? '2.5rem' : '1.25rem' }}>
        {getEmoji()}
      </span>
      {state === 'Celebration' && (
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute top-2 left-4 w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute top-8 right-4 w-1 h-1 bg-pink-400 rounded-full animate-ping delay-75"></div>
          <div className="absolute bottom-4 left-10 w-1 h-1 bg-yellow-400 rounded-full animate-ping delay-150"></div>
        </div>
      )}
    </div>
  );
};

export default Memoji;
