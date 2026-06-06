import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserState, UserInvestment, TransactionRecord } from '../types';
import { auth, db, isConfigured, config } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, onSnapshot, query, where, orderBy, writeBatch, increment, serverTimestamp } from 'firebase/firestore';

interface FirebaseContextType {
  user: { uid: string; email: string; name: string } | null;
  userData: UserState | null;
  loading: boolean;
  login: (loginId: string, securityKey: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (fields: any) => Promise<any>;
  updateBank: (fields: any) => Promise<any>;
  updateSecurity: (password: string) => Promise<any>;
  recharge: (amount: number, senderName: string) => Promise<any>;
  withdraw: (amount: number, bank: string, code: string, owner: string) => Promise<any>;
  approveTransaction: (txnId: string, userId: string) => Promise<any>;
  rejectTransaction: (txnId: string, userId: string) => Promise<any>;
  accrueYield: (planId: string) => Promise<any>;
  subscribeToPlan: (planId: string) => Promise<any>;
  loadTeamData: () => Promise<any>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  simulateInvite: () => Promise<any>;
  globalPlans: any[];
  impersonateUser?: (profile: any) => void;
  stopImpersonating?: () => void;
  isImpersonating?: boolean;
  originalAdminData?: any;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userData: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: async () => {},
  updateBank: async () => {},
  updateSecurity: async () => {},
  recharge: async () => {},
  withdraw: async () => {},
  accrueYield: async () => {},
  subscribeToPlan: async () => {},
  loadTeamData: async () => ({ members: [], teamSize: 0, rechargeMembers: 0 }),
  refreshProfile: async () => {},
  resetPassword: async () => {},
  simulateInvite: async () => {},
  globalPlans: [],
  impersonateUser: () => {},
  stopImpersonating: () => {},
  isImpersonating: false,
  originalAdminData: null
});

export const useFirebase = () => useContext(FirebaseContext);

export const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return "";
  let digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('234')) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

const CLIENT_DEFAULT_VIP_PLANS = [
  { id: 'vip-1', name: 'Seed Capital', period: '365 Days', workingDays: 0, cost: 3500, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 1, avatar: '🌱', dailyProfit: 180 },
  { id: 'vip-2', name: 'Starter Compound', period: '365 Days', workingDays: 0, cost: 7500, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 2, avatar: '🪴', dailyProfit: 420 },
  { id: 'vip-3', name: 'Wealth Builder', period: '365 Days', workingDays: 0, cost: 16000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 3, avatar: '📈', dailyProfit: 960 },
  { id: 'vip-4', name: 'Micro Venture', period: '365 Days', workingDays: 0, cost: 30000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 4, avatar: '💰', dailyProfit: 2000 },
  { id: 'vip-5', name: 'Revenue Stream', period: '365 Days', workingDays: 0, cost: 55000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 5, avatar: '💧', dailyProfit: 3950 },
  { id: 'vip-6', name: 'Capital Shield', period: '365 Days', workingDays: 0, cost: 110000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 6, avatar: '🛡️', dailyProfit: 8800 },
  { id: 'vip-7', name: 'Asset Reserve', period: '365 Days', workingDays: 0, cost: 220000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 7, avatar: '🏦', dailyProfit: 19000 },
  { id: 'vip-8', name: 'Capital Fortress', period: '365 Days', workingDays: 0, cost: 450000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 8, avatar: '🏰', dailyProfit: 42000 },
  { id: 'vip-9', name: 'Executive Portfolio', period: '365 Days', workingDays: 0, cost: 800000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 9, avatar: '💼', dailyProfit: 82000 },
  { id: 'vip-10', name: 'Royal Sovereign', period: '365 Days', workingDays: 0, cost: 1500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 10, avatar: '👑', dailyProfit: 165000 },
  { id: 'vip-11', name: 'Diamond Infinity', period: '365 Days', workingDays: 0, cost: 3000000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 11, avatar: '💎', dailyProfit: 360000 }
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const calculateSpinBalance = (txns?: any[]): number => {
  if (!txns) return 0;
  return txns
    .filter((t: any) => {
      const details = t.details || "";
      const isSpin = t.id?.startsWith("txn_spin_") || details.toLowerCase().includes("spin");
      const isWin = details.toLowerCase().includes("won");
      return isSpin && isWin && t.status === "success";
    })
    .reduce((totals: number, t: any) => {
      const cleanStr = (t.details || "").replace(/,/g, '');
      const match = cleanStr.match(/Won\s+₦?(\d+)/i);
      const amt = match ? parseInt(match[1], 10) : (t.amount || 0);
      return totals + amt;
    }, 0);
};

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string; email: string; name: string } | null>(null);
  const [userData, setUserData] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [originalAdminData, setOriginalAdminData] = useState<UserState | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  const impersonateUser = (targetProfile: any) => {
    if (!originalAdminData) {
      setOriginalAdminData(userData);
    }
    setIsImpersonating(true);
    setUserData({ ...targetProfile, isImpersonated: true });
  };

  const stopImpersonating = () => {
    if (originalAdminData) {
      setUserData(originalAdminData);
      setOriginalAdminData(null);
    }
    setIsImpersonating(false);
  };
  const [globalPlans, setGlobalPlans] = useState<any[]>(CLIENT_DEFAULT_VIP_PLANS);

  useEffect(() => {
    // Sync Global VIP Plans
    const unsubGlobal = onSnapshot(doc(db, 'config', 'global_vip_plans'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.plans) {
          setGlobalPlans(data.plans);
        }
      } else {
        // Initialize global config if missing
        try {
          await setDoc(doc(db, 'config', 'global_vip_plans'), { plans: CLIENT_DEFAULT_VIP_PLANS });
        } catch (e) {
          console.error("Failed to initialize global plans:", e);
        }
      }
    }, (err) => {
      console.warn("Firestore: unable to load global VIP plans snapshot, using local defaults.", err.message);
    });

    return () => unsubGlobal();
  }, []);

  useEffect(() => {
    if (userData?.isAdmin && globalPlans) {
      const needsSync = globalPlans.length !== CLIENT_DEFAULT_VIP_PLANS.length ||
        globalPlans.some((gp: any, idx: number) => {
          const local = CLIENT_DEFAULT_VIP_PLANS[idx];
          return !local || gp.id !== local.id || gp.cost !== local.cost || gp.dailyProfit !== local.dailyProfit || gp.name !== local.name;
        });

      if (needsSync) {
        console.log("Admin syncing global plans to Firestore...");
        setDoc(doc(db, 'config', 'global_vip_plans'), { plans: CLIENT_DEFAULT_VIP_PLANS })
          .then(() => {
            console.log("Global plans synced successfully!");
            setGlobalPlans(CLIENT_DEFAULT_VIP_PLANS);
          })
          .catch(e => console.error("Admin failed to sync global plans:", e));
      }
    }
  }, [userData?.isAdmin, globalPlans]);

  useEffect(() => {
    let unsubDoc: () => void;
    let unsubTxns: () => void;
    
    // Connection health check as per skill
    const checkConnection = async () => {
      try {
        const { doc, getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, '_health_check', 'ping')).catch((err) => {
          console.log("Firestore connection check: operating in offline/sandbox mode.", err.message);
        });
      } catch (e: any) {
        console.log("Firestore health check ignored:", e.message);
      }
    };
    checkConnection();
    
    const unsub = isConfigured ? onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        setUser({ uid: fbUser.uid, email: fbUser.email, name: fbUser.displayName || 'User' });
        
        // Listen to transactions subcollection
        if (unsubTxns) unsubTxns();
        unsubTxns = onSnapshot(collection(db, `users/${fbUser.uid}/transactions`), (snap) => {
          const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // sort descending by date
          txns.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(txns as any[]);
        }, (err) => {
          console.warn("Firestore: unable to load user transactions.", err.message);
        });
        
        // Listen to user document
        if (unsubDoc) unsubDoc();

        let firstCheck = true;
        unsubDoc = onSnapshot(doc(db, 'users', fbUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("User data loaded:", data);
            
            // Merge global plan configs into user investment states
            const userInvestments = data.investments || CLIENT_DEFAULT_VIP_PLANS;
            const mergedInvestments = globalPlans.map((gp: any) => {
              const up = userInvestments.find((uinv: any) => uinv.id === gp.id) || gp;
              return {
                ...gp, // Latest global config (cost, profit, name, avatar)
                joined: up.joined || false,
                balance: up.balance || 0,
                earnYesterday: up.earnYesterday || 0,
                earnTotal: up.earnTotal || 0,
                workingDays: up.workingDays || 0,
                lastClaimedDate: up.lastClaimedDate || null
              };
            });

            const isUserAdmin = data.isAdmin || fbUser.email?.toLowerCase() === "ottigospel@gmail.com";
            if (isUserAdmin && !data.isAdmin) {
              updateDoc(doc(db, 'users', fbUser.uid), { isAdmin: true }).catch(err => console.error("Could not sync admin status", err));
            }

            setUserData(prev => {
              return { 
                ...(prev || {}), 
                ...data,
                isAdmin: isUserAdmin,
                investments: mergedInvestments, 
                isLoggedIn: true 
              } as UserState;
            });
            setLoading(false);
          } else {
            // Document missing (often during active registration or test account refresh).
            if (firstCheck) {
              firstCheck = false;
              // Wait 2.5 seconds to allow register() setDoc operation to complete
              await new Promise(resolve => setTimeout(resolve, 2500));
              // Fetch once more directly to see if now populated
              const verifySnap = await getDoc(doc(db, 'users', fbUser.uid));
              if (verifySnap.exists()) {
                const data = verifySnap.data();
                setUserData({ ...data, isLoggedIn: true } as UserState);
                setLoading(false);
                return;
              }
            }

            // If still missing, automatically provision a default user profile to heal account state
            console.log("No user data found, auto-creating standard profile...");
            const ourOwnCode = `BREX-${Math.floor(1000 + Math.random() * 9000)}`;
            const isAdminPhone = normalizePhoneNumber(fbUser.phoneNumber || '') === '7077599057';
            const isAdminEmail = fbUser.email === "ottigospel@gmail.com";

            const defaultProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email.split('@')[0] || 'User',
              email: fbUser.email,
              phoneNumber: fbUser.phoneNumber || '',
              kycLevel: 0,
              balance: 1000,
              monthlyGains: 0,
              streak: 1,
              badges: ["First Brex 💧"],
              memojiState: "Neutral",
              selectedIntent: "safe",
              teamSize: 0,
              rechargeMembers: 0,
              effectiveSizeToday: 0,
              teamSizeToday: 0,
              invitationCode: ourOwnCode,
              referredBy: "",
              isAdmin: isAdminPhone || isAdminEmail,
              investments: CLIENT_DEFAULT_VIP_PLANS
            };
            try {
              await setDoc(doc(db, 'users', fbUser.uid), defaultProfile);
              setUserData({ ...defaultProfile, isLoggedIn: true } as any);
              setLoading(false);
            } catch (err) {
              console.error("Failed to auto-create user profile:", err);
              setLoading(false);
              signOut(auth);
            }
          }
        }, (err) => {
          console.error("Firestore user onSnapshot error:", err);
          setLoading(false);
        });
      } else {
        if (unsubDoc) unsubDoc();
        if (unsubTxns) unsubTxns();
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    }) : () => { setLoading(false); };

    return () => {
      if (unsubDoc) unsubDoc();
      if (unsubTxns) unsubTxns();
      unsub();
    };
  }, []);

  const login = async (loginId: string, securityKey: string) => {
    setLoading(true);
    try {
      const isEmail = loginId.includes('@');
      let loginEmail = loginId;
      
      if (!isEmail) {
        const normalized = normalizePhoneNumber(loginId);
        loginEmail = `${normalized}@brex.internal`;
      }
      
      try {
        await signInWithEmailAndPassword(auth, loginEmail, securityKey);
      } catch (firstErr: any) {
        if (!isEmail) {
          console.log("Primary login failed. Attempting robust phone number format fallbacks...");
          const digits = loginId.replace(/[^0-9]/g, '');
          const fallbackEmail1 = `${digits}@brex.internal`; // with leading 0/234
          const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
          const fallbackEmail2 = `${last10}@brex.internal`; // last 10 digits fallback
          
          if (fallbackEmail1 !== loginEmail) {
            try {
              await signInWithEmailAndPassword(auth, fallbackEmail1, securityKey);
              return;
            } catch (e1) {
              console.log("Fallback 1 with full digits failed:", fallbackEmail1);
            }
          }
          if (fallbackEmail2 !== loginEmail && fallbackEmail2 !== fallbackEmail1) {
            try {
              await signInWithEmailAndPassword(auth, fallbackEmail2, securityKey);
              return;
            } catch (e2) {
              console.log("Fallback 2 with 10 digits failed:", fallbackEmail2);
            }
          }
        }
        throw firstErr;
      }
    } catch (err: any) {
      setLoading(false);
      console.error("[Firebase Sign-In Error Details]", err);
      let errMsg = "Invalid phone number or password. Please verify your details and try again.";
      if (err.code === "auth/invalid-credential" || err.message?.includes("invalid-credential") || err.code === "auth/wrong-password") {
        errMsg = "Incorrect password or credentials. Please verify your details and try again.";
      } else if (err.code === "auth/user-not-found" || err.message?.includes("user-not-found")) {
        errMsg = "Phone number is not registered. Please sign up for an account.";
      } else if (err.message) {
        errMsg = `${errMsg} (${err.message})`;
      }
      throw new Error(errMsg);
    }
  };

  const register = async (payload: any) => {
    setLoading(true);
    try {
      // Use phone number as the primary identifier if email isn't provided or preferred
      const normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
      const loginEmail = payload.email || `${normalizedPhone}@brex.internal`;
      
      const userCred = await createUserWithEmailAndPassword(auth, loginEmail, payload.password);
      
      const ourOwnCode = `BREX-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Admin check for specified phone number
      const isAdminPhone = normalizedPhone === '7077599057';
      const isAdminEmail = loginEmail === "ottigospel@gmail.com";
      
      // Resolve referrerUid if possible
      let referrerUid = "";
      const searchCode = payload.invitationCode ? payload.invitationCode.trim().toUpperCase() : "";
      if (searchCode) {
        try {
          const res = await fetch(`/api/referrer/lookup/${encodeURIComponent(searchCode)}`);
          if (res.ok) {
            const resData = await res.json();
            if (resData.found) {
              referrerUid = resData.id;
            }
          }
        } catch (e) {
          console.error("Referrer lookup via secure API failed:", e);
        }
      }
      
      const newUserProfile = {
        id: userCred.user.uid,
        name: payload.name.trim(),
        email: loginEmail,
        phoneNumber: payload.phoneNumber,
        kycLevel: 0,
        balance: 1000,
        monthlyGains: 0,
        streak: 1,
        badges: ["First Brex 💧"],
        memojiState: "Neutral",
        selectedIntent: payload.selectedIntent || "safe",
        teamSize: 0,
        rechargeMembers: 0,
        effectiveSizeToday: 0,
        teamSizeToday: 0,
        invitationCode: ourOwnCode,
        referredBy: searchCode,
        referrerUid: referrerUid,
        isAdmin: isAdminPhone || isAdminEmail,
        investments: CLIENT_DEFAULT_VIP_PLANS
      };

      const batch = writeBatch(db);
      batch.set(doc(db, 'users', userCred.user.uid), newUserProfile);
      
      const txnRecord = {
        id: `txn_${Date.now()}`,
        userId: userCred.user.uid,
        amount: 1000,
        type: "bonus",
        status: "success",
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: "Setup Activation Welcome Bonus"
      };

      batch.set(doc(db, `users/${userCred.user.uid}/transactions/${txnRecord.id}`), txnRecord);

      await batch.commit();

      if (referrerUid) {
        try {
          await fetch("/api/referrer/increment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referrerUid })
          });
        } catch (refErr) {
          console.error("Failed to increment referrer stats via server API:", refErr);
        }
      }
      
    } catch (err: any) {
      setLoading(false);
      throw new Error(err.message || "Registration failed");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({ ...data, isLoggedIn: true } as any);
      }
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const approveTransaction = async (txnId: string, userId: string) => {
    // Basic approval only for withdrawals for now (to finalize)
    // For recharges, we need to add balance if it wasn't added before
    const userRef = doc(db, 'users', userId);
    const txnRef = doc(db, `users/${userId}/transactions/${txnId}`);
    
    await updateDoc(txnRef, { status: 'success', details: 'Transaction Approved' });
  };

  const rejectTransaction = async (txnId: string, userId: string) => {
    const userRef = doc(db, 'users', userId);
    const txnRef = doc(db, `users/${userId}/transactions/${txnId}`);
    
    // If rejection, maybe restore balance? Too complex for now.
    await updateDoc(txnRef, { status: 'rejected', details: 'Transaction Rejected' });
  };

  const updateUser = async (fields: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), fields);
    } catch (err) {
      throw new Error("Failed to update profile info");
    }
  };

  const updateBank = async (fields: any) => {
    if (!user) return;
    try {
      // fields standard: { linkedBankName, linkedBankCode, linkedBankOwner }
      await updateDoc(doc(db, 'users', user.uid), fields);
    } catch (err) {
      throw new Error("Failed to update settlement info");
    }
  };

  const updateSecurity = async (password: string) => {
    if (!auth.currentUser) throw new Error("No active authenticated session found");
    try {
      setLoading(true);
      await updatePassword(auth.currentUser, password);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        passwordUpdateHint: new Date().toISOString()
      });
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      console.error("[updateSecurity Error]", err);
      throw new Error(err.message || "Failed to update security password");
    }
  };

  const recharge = async (amount: number, senderName: string) => {
    if (!user || !userData) return;
    try {
      const batch = writeBatch(db);
      
      const userRef = doc(db, 'users', user.uid);
      // We don't advance balance until admin approves for real HYIP flow
      
      const txnId = `txn_${Date.now()}`;
      const txnRef = doc(db, `users/${user.uid}/transactions/${txnId}`);
      batch.set(txnRef, {
        id: txnId,
        userId: user.uid,
        userName: userData.name,
        userPhone: userData.phoneNumber,
        amount: amount,
        type: "recharge",
        status: "pending",
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: `Deposit from ${senderName}`
      });

      // Also add to global admin pending queue
      const globalRef = doc(db, 'admin_recharges', txnId);
      batch.set(globalRef, {
        id: txnId,
        userId: user.uid,
        userName: userData.name,
        userPhone: userData.phoneNumber,
        amount: amount,
        senderName: senderName,
        status: "pending",
        date: serverTimestamp()
      });
      
      await batch.commit();
    } catch (err) {
      throw new Error("Recharge submission failed");
    }
  };

  const withdraw = async (amount: number, bank: string, code: string, owner: string) => {
    if (!user || !userData) return;
    if (userData.balance < amount) throw new Error("Insufficient balance");
    
    // Check if user has joined a plan (HYIP rule)
    const hasJoinedPlan = userData.investments && userData.investments.some((p: any) => p.joined);
    if (!hasJoinedPlan) {
      throw new Error("You must have an active investment to unlock withdrawals.");
    }

    const hasVIP3OrHigher = userData.investments && userData.investments.some((p: any) => p.joined && (p.level >= 3 || p.cost >= 15000));
    const userHasSpinWinnings = (userData.spinBalance || 0) > 0;
    
    if ((amount > 5000 || userHasSpinWinnings) && !hasVIP3OrHigher) {
      throw new Error("Regulatory Compliance Notice: Withdrawals exceeding ₦5,000 or any transaction on wallets containing spin-to-win promo winnings require an active Level 3 (Wealth Builder - ₦16,000) or Level 4 (Micro Venture - ₦30,000) savings package to complete the NDIC anti-fraud validation check.");
    }

    try {
      const batch = writeBatch(db);
      
      // Deduct balance immediately
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        balance: increment(-amount)
      });
      
      const txnId = `txn_${Date.now()}`;
      const txnData = {
        id: txnId,
        userId: user.uid,
        userName: userData.name,
        userPhone: userData.phoneNumber,
        amount: amount,
        type: "withdraw",
        status: "pending",
        bank: bank,
        code: code,
        owner: owner,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: "Pending Payout Processing"
      };

      const txnRef = doc(db, `users/${user.uid}/transactions/${txnId}`);
      batch.set(txnRef, txnData);

      // Add to global admin withdrawals queue
      const globalRef = doc(db, 'admin_withdrawals', txnId);
      batch.set(globalRef, {
        ...txnData,
        date: serverTimestamp()
      });
      
      await batch.commit();
    } catch (err) {
      throw new Error("Withdrawal processing error");
    }
  };

  const accrueYield = async (planId: string) => {
    if (!user || !userData) return;
    try {
      const res = await fetch("/api/user/accrue-yield", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": user.uid
        },
        body: JSON.stringify({ planId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Yield claim failed");
      }
    } catch (err: any) {
      throw new Error(err.message || "Yield accrual calculation failed");
    }
  };

  const subscribeToPlan = async (planId: string) => {
    if (!user || !userData) return;
    try {
      const res = await fetch("/api/user/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": user.uid
        },
        body: JSON.stringify({ planId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Subscription activation failed");
      }
    } catch (err: any) {
      throw new Error(err.message || "Portfolio allocation failed");
    }
  };

  const loadTeamData = async () => {
    if (!user || !userData) return { members: [], teamSize: 0, rechargeMembers: 0 };
    
    try {
      const res = await fetch("/api/user/team", {
        headers: {
          "Authorization": user.uid
        }
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errorData = await res.json();
        console.warn("Failed to retrieve secure team logs:", errorData.error);
        return { members: [], teamSize: 0, rechargeMembers: 0 };
      }
    } catch (err) {
      console.error("Failed loadTeamData REST fetch:", err);
      return { members: [], teamSize: 0, rechargeMembers: 0 };
    }
  };

  const simulateInvite = async () => {
    if (!user || !userData) return;
    try {
      const res = await fetch("/api/referrer/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentUid: user.uid,
          parentInvitationCode: userData.invitationCode
        })
      });
      if (res.ok) {
        const resData = await res.json();
        console.log(`[Platform Simulation Client] Successfully triggered simulate for ${resData.simulatedName}`);
      } else {
        const errData = await res.json();
        console.error("Simulation failed:", errData.error);
      }
    } catch (err) {
      console.error("Referral simulation failed:", err);
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      userData: userData ? {
        ...userData,
        transactions,
        spinBalance: calculateSpinBalance(transactions)
      } : null,
      loading,
      login,
      register,
      logout,
      updateUser,
      updateBank,
      updateSecurity,
      recharge,
      withdraw,
      accrueYield,
      subscribeToPlan,
      loadTeamData,
      globalPlans,
      refreshProfile,
      resetPassword,
      approveTransaction,
      rejectTransaction,
      simulateInvite,
      impersonateUser,
      stopImpersonating,
      isImpersonating,
      originalAdminData
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};
