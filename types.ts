
export enum Screen {
  Auth = 'auth',
  Signup = 'signup',
  Admin = 'admin',
  OTP = 'otp',
  PinCreation = 'pin_creation',
  IntentSelection = 'intent_selection',
  KYC = 'kyc',
  BankLinking = 'bank_linking',
  Dashboard = 'dashboard',
  Market = 'market',
  Promotions = 'promotions',
  Portfolio = 'portfolio',
  Profile = 'profile',
  Fund = 'fund',
  AssetDetail = 'asset_detail',
  AIAdvisor = 'ai_advisor'
}

export enum AssetType {
  TreasuryBills = 'Treasury Bills',
  CommercialPapers = 'Commercial Papers',
  Bonds = 'Bonds',
  Commodities = 'Commodities',
  USDT = 'Dollar Savings (USDT)',
  LockedSavings = 'Locked Savings'
}

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  yield: string;
  tenor: string;
  minAmount: string;
  risk: 'Low' | 'Medium' | 'High';
  description: string;
  issuer?: string;
  rating?: string;
  maturityDate?: string;
}

export interface UserInvestment {
  id: string;
  level: number;
  name: string;
  avatar: string;
  cost: number;
  dailyProfit: number;
  period: number;
  workingDays: number;
  joined: boolean;
  balance: number;
  earnYesterday: number;
  earnTotal: number;
  lastClaimedDate?: string;
}

export interface TransactionRecord {
  id: string;
  amount: number;
  type: 'recharge' | 'withdraw' | 'claim' | 'bonus' | 'subscribe' | 'earning' | 'adjustment';
  status: 'pending' | 'success' | 'failed';
  date: string;
  details: string;
}

export interface UserState {
  isLoggedIn: boolean;
  name: string;
  email?: string;
  phoneNumber?: string;
  kycLevel: number;
  balance: number;
  monthlyGains: number;
  referralBonus?: number;
  streak: number;
  badges: string[];
  memojiState: 'Neutral' | 'Happy' | 'Focused' | 'Celebration' | 'Concerned';
  selectedIntent: string;
  isAdmin?: boolean;
  isSuspended?: boolean;
  invitationCode?: string;
  linkedBankName?: string;
  linkedBankCode?: string;
  linkedBankOwner?: string;
  teamSize?: number;
  rechargeMembers?: number;
  effectiveSizeToday?: number;
  teamSizeToday?: number;
  investments?: UserInvestment[];
  transactions?: TransactionRecord[];
  spinBalance?: number;
}
