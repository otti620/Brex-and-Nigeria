import fs from "fs";
import path from "path";

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
  type: 'recharge' | 'withdraw' | 'claim' | 'bonus' | 'subscribe';
  status: 'pending' | 'success' | 'failed';
  date: string;
  details: string;
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  passwordHash: string; // Storing password string directly for review transparency and security validation
  kycLevel: number;
  balance: number;
  monthlyGains: number;
  streak: number;
  badges: string[];
  memojiState: 'Neutral' | 'Happy' | 'Focused' | 'Celebration' | 'Concerned';
  selectedIntent: string;
  teamSize: number;
  rechargeMembers: number;
  effectiveSizeToday: number;
  teamSizeToday: number;
  invitationCode: string;
  referredBy?: string;
  linkedBankName?: string;
  linkedBankCode?: string;
  linkedBankOwner?: string;
  isAdmin?: boolean;
  investments: UserInvestment[];
  transactions: TransactionRecord[];
}

const isVercel = !!process.env.VERCEL;
const DB_DIR = isVercel ? "/tmp" : path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "database.json");

// Define VIP Level Products (as requested: VIP1 up to VIP8 with varied prices & rewards)
export const DEFAULTS_YIELDS: UserInvestment[] = [
  {
    id: "vip-1",
    level: 1,
    name: "Seed Capital",
    avatar: "🌱",
    cost: 3000,
    dailyProfit: 150,
    workingDays: 0,
    period: 365,
    joined: false,
    balance: 0,
    earnYesterday: 0,
    earnTotal: 0
  },
  {
    id: "vip-2",
    level: 2,
    name: "Wealth Builder",
    avatar: "📈",
    cost: 15000,
    dailyProfit: 900,
    workingDays: 0,
    period: 365,
    joined: false,
    balance: 0,
    earnYesterday: 0,
    earnTotal: 0
  },
  {
    id: "vip-3",
    level: 3,
    name: "Revenue Stream",
    avatar: "💧",
    cost: 50000,
    dailyProfit: 3500,
    workingDays: 0,
    period: 365,
    joined: false,
    balance: 0,
    earnYesterday: 0,
    earnTotal: 0
  },
  {
    id: "vip-4",
    level: 4,
    name: "Asset Reserve",
    avatar: "🏦",
    cost: 150000,
    dailyProfit: 12000,
    workingDays: 0,
    period: 365,
    joined: false,
    balance: 0,
    earnYesterday: 0,
    earnTotal: 0
  },
  {
    id: "vip-5",
    level: 5,
    name: "Capital Fortress",
    avatar: "🏰",
    cost: 300000,
    dailyProfit: 27000,
    workingDays: 0,
    period: 365,
    joined: false,
    balance: 0,
    earnYesterday: 0,
    earnTotal: 0
  },
  {
    id: "vip-6",
    level: 6,
    name: "Executive Portfolio",
    avatar: "💼",
    cost: 500000,
    dailyProfit: 50000,
    workingDays: 0,
    period: 365,
    joined: false,
    balance: 0,
    earnYesterday: 0,
    earnTotal: 0
  },
  {
    id: "vip-7",
    level: 7,
    name: "Royal Sovereign",
    avatar: "👑",
    cost: 1000000,
    dailyProfit: 110000,
    workingDays: 0,
    period: 365,
    joined: false,
    balance: 0,
    earnYesterday: 0,
    earnTotal: 0
  },
  {
    id: "vip-8",
    level: 8,
    name: "Diamond Infinity",
    avatar: "💎",
    cost: 2500000,
    dailyProfit: 300000,
    workingDays: 0,
    period: 365,
    joined: false,
    balance: 0,
    earnYesterday: 0,
    earnTotal: 0
  }
];

export function createInitialInvestments(): UserInvestment[] {
  return DEFAULTS_YIELDS.map(y => ({ ...y }));
}

// Helper to load current DB structure
export function loadDatabase(): { users: DbUser[] } {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (isVercel && !fs.existsSync(DB_FILE)) {
      const originalPath = path.join(process.cwd(), "data", "database.json");
      if (fs.existsSync(originalPath)) {
        try {
          fs.copyFileSync(originalPath, DB_FILE);
          console.log("[Vercel Temp DB] Copying initial database.json seed from bundle to /tmp/database.json");
        } catch (copyErr) {
          console.error("[Vercel Temp DB] Failed to copy bundled database.json seed:", copyErr);
        }
      }
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb = {
        users: [
          {
            id: "user_ottigospel",
            name: "Otti Gospel",
            email: "ottigospel@gmail.com",
            phoneNumber: "+234 900 111 2222",
            passwordHash: "password123",
            kycLevel: 3,
            balance: 500000,
            monthlyGains: 45000,
            streak: 5,
            badges: ["Founder Member 👑", "Alpha Brex 💧"],
            memojiState: "Celebration" as const,
            selectedIntent: "grow",
            teamSize: 5,
            rechargeMembers: 1,
            effectiveSizeToday: 0,
            teamSizeToday: 0,
            invitationCode: "BREX-9999",
            linkedBankName: "OPay",
            linkedBankCode: "9001112222",
            linkedBankOwner: "OTTI GOSPEL GUEST",
            isAdmin: true,
            investments: createInitialInvestments(),
            transactions: [
              {
                id: "txn_1",
                amount: 500000,
                type: "recharge" as const,
                status: "success" as const,
                date: "2026-05-25 10:15:30",
                details: "Central Vault Deposit Approved"
              }
            ]
          },
          {
            id: "user_sade",
            name: "Sade",
            email: "sade@brex.com",
            phoneNumber: "+234 906 123 4567",
            passwordHash: "password123",
            kycLevel: 3,
            balance: 145200,
            monthlyGains: 12450,
            streak: 3,
            badges: ["First Brex 💧"],
            memojiState: "Neutral" as const,
            selectedIntent: "safe",
            teamSize: 8,
            rechargeMembers: 2,
            effectiveSizeToday: 0,
            teamSizeToday: 0,
            invitationCode: "BREX-8854",
            linkedBankName: "OPay",
            linkedBankCode: "9061234567",
            linkedBankOwner: "SADE OLUWASEUN",
            investments: createInitialInvestments(),
            transactions: [
              {
                id: "txn_2",
                amount: 145200,
                type: "recharge" as const,
                status: "success" as const,
                date: "2026-05-28 11:24:00",
                details: "Central Vault Deposit"
              }
            ]
          },
          {
            id: "user_chidi",
            name: "Chidi Ebere",
            email: "chidi@brex.com",
            phoneNumber: "+234 813 999 4422",
            passwordHash: "password123",
            kycLevel: 0,
            balance: 3000,
            monthlyGains: 120,
            streak: 1,
            badges: ["First Brex 💧"],
            memojiState: "Happy" as const,
            selectedIntent: "safe",
            teamSize: 0,
            rechargeMembers: 0,
            effectiveSizeToday: 0,
            teamSizeToday: 0,
            invitationCode: "BREX-2214",
            investments: createInitialInvestments(),
            transactions: []
          }
        ]
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
      return initialDb;
    }

    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    let dirty = false;
    
    data.users = data.users.map((u: any) => {
      let changed = false;
      if (!u.investments || u.investments.length === 0) {
        u.investments = createInitialInvestments();
        changed = true;
      } else {
        const hasVip = u.investments.some((inv: any) => inv.id.startsWith("vip-"));
        if (!hasVip) {
          u.investments = createInitialInvestments();
          changed = true;
        }
      }
      if (!u.transactions) {
        u.transactions = [];
        changed = true;
      }
      if (changed) dirty = true;
      return u;
    });

    if (dirty) {
      saveDatabase(data);
    }

    return data;
  } catch (error) {
    console.error("Failed to load local DB, returning fallback:", error);
    return { users: [] };
  }
}

// Function to save database state
export function saveDatabase(data: { users: DbUser[] }) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed writing database file:", err);
  }
}
