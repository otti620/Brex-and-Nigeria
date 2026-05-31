
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
    primary: `bg-[#14B8A6] text-white shadow-lg shadow-teal-500/20 active:scale-95`,
    secondary: `bg-[#6366F1] text-white shadow-lg shadow-indigo-500/20 active:scale-95`,
    outline: `border-2 border-[#14B8A6] text-[#14B8A6] bg-transparent active:bg-teal-50`,
    ghost: `text-[#1F2937] hover:bg-slate-100 active:bg-slate-200`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-4 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
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
    {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="bg-white border-2 border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-[#6366F1] transition-colors"
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
