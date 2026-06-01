
import React from 'react';
import { COLORS } from '../constants';

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const variants = {
    primary: `bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95`,
    secondary: `bg-black text-white shadow-lg shadow-zinc-500/20 active:scale-95`,
    outline: `border-2 border-indigo-600 text-indigo-600 bg-transparent active:bg-indigo-50`,
    ghost: `text-[#1F2937] hover:bg-slate-100 active:bg-slate-200`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-4 rounded-2xl font-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<{
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  className?: string;
}> = ({ type = 'text', placeholder, value, onChange, label, className = '' }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</label>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="bg-white border border-gray-200 px-5 py-3.5 rounded-2xl outline-none focus:border-indigo-600 transition-colors font-medium text-sm text-black"
    />
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-50 transition-all active:scale-[0.98] ${className}`}
  >
    {children}
  </div>
);
