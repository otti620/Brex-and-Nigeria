
import React from 'react';

export const COLORS = {
  primary: '#14B8A6', // Fresh Teal
  secondary: '#6366F1', // Electric Indigo
  positive: '#22C55E', // Lime Green
  bgSoft: '#E0E7FF', // Lavender Mist
  base: '#F8FAFC', // Off-white
  text: '#1F2937', // Charcoal
};

export const ONBOARDING_SLIDES = []; // Empty as requested to remove onboarding

export const INTENTS = [
  { id: 'safe', label: 'Safe yields', desc: 'Preserve capital with low-risk T-Bills & Bonds.' },
  { id: 'grow', label: 'Grow wealth', desc: 'Higher yields with Commercial Papers & Commodities.' },
  { id: 'dollar', label: 'Dollar protection', desc: 'Hedge against inflation with USDT savings.' },
  { id: 'biz', label: 'Institutional', desc: 'Professional tools for high-net-worth flow.' }
];

export const ASSETS: any[] = [
  {
    id: 'tb-1',
    type: 'Treasury Bills',
    name: 'NTB 182-Day',
    yield: '14.5%',
    tenor: '182 Days',
    minAmount: '₦10,000',
    risk: 'Low',
    description: 'Government backed, zero-risk short term investment.',
    maturityDate: 'Sep 12, 2025'
  },
  {
    id: 'cp-1',
    type: 'Commercial Papers',
    name: 'Dangote CP Series 2',
    yield: '17.2%',
    tenor: '270 Days',
    minAmount: '₦50,000',
    risk: 'Medium',
    description: 'Corporate debt from top-rated Nigerian issuers.',
    issuer: 'Dangote Sugar PLC',
    rating: 'A+'
  },
  {
    id: 'usdt-1',
    type: 'Dollar Savings (USDT)',
    name: 'Flexible USDT',
    yield: '8.0%',
    tenor: 'Flexible',
    minAmount: '$10',
    risk: 'Low',
    description: 'Save in Dollars via USDT. Withdraw anytime.',
  },
  {
    id: 'gold-1',
    type: 'Commodities',
    name: 'Gold (ETP)',
    yield: '+12.4% (YTD)',
    tenor: 'N/A',
    minAmount: '₦5,000',
    risk: 'Medium',
    description: 'Synthetic exposure to global gold prices.',
  }
];

export const MARKET_NEWS = [
  { id: 1, title: "CBN Hikes Rates to 24.75%", category: "Banking", time: "2h ago", sentiment: "neutral" },
  { id: 2, title: "T-Bill Auction Over-Subscribed", category: "Bonds", time: "5h ago", sentiment: "positive" },
  { id: 3, title: "Dollar stabilizes at 1,450 to Naira", category: "FX", time: "1d ago", sentiment: "positive" },
  { id: 4, title: "Dangote Refinery lists new papers", category: "Stocks", time: "2d ago", sentiment: "positive" },
];

export const MARKET_STATS = [
  { label: "Inflation", value: "33.2%", trend: "up" },
  { label: "NGX Index", value: "103,450", trend: "down" },
  { label: "Omo Rates", value: "21.5%", trend: "up" },
];
