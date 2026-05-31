import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserState, UserInvestment, TransactionRecord } from '../types';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
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
  simulateInvite: () => Promise<any>;
  loadTeamData: () => Promise<any>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
  simulateInvite: async () => {},
  loadTeamData: async () => ({ members: [], teamSize: 0, rechargeMembers: 0 }),
  refreshProfile: async () => {},
  resetPassword: async () => {}
});

export const useFirebase = () => useContext(FirebaseContext);

const CLIENT_DEFAULT_VIP_PLANS = [
  { id: 'vip-1', name: 'VIP Level 1', period: '90 Days', workingDays: 0, cost: 3000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 1, avatar: '⭐', dailyProfit: 150 },
  { id: 'vip-2', name: 'VIP Level 2', period: '90 Days', workingDays: 0, cost: 15000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 2, avatar: '🌟', dailyProfit: 900 },
  { id: 'vip-3', name: 'VIP Level 3', period: '90 Days', workingDays: 0, cost: 50000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 3, avatar: '🏆', dailyProfit: 3500 },
  { id: 'vip-4', name: 'VIP Level 4', period: '90 Days', workingDays: 0, cost: 150000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 4, avatar: '👑', dailyProfit: 12000 },
  { id: 'vip-5', name: 'VIP Level 5', period: '90 Days', workingDays: 0, cost: 300000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 5, avatar: '💎', dailyProfit: 27000 },
  { id: 'vip-6', name: 'VIP Level 6', period: '90 Days', workingDays: 0, cost: 500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 6, avatar: '🌀', dailyProfit: 50000 },
  { id: 'vip-7', name: 'VIP Level 7', period: '90 Days', workingDays: 0, cost: 1000000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 7, avatar: '🔥', dailyProfit: 110000 },
  { id: 'vip-8', name: 'VIP Level 8', period: '90 Days', workingDays: 0, cost: 2500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 8, avatar: '⚡', dailyProfit: 300000 }
];

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string; email: string; name: string } | null>(null);
  const [userData, setUserData] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: () => void;
    
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        setUser({ uid: fbUser.uid, email: fbUser.email, name: fbUser.displayName || 'User' });
        
        // Listen to user document
        if (unsubDoc) unsubDoc();
        let firstCheck = true;
        unsubDoc = onSnapshot(doc(db, 'users', fbUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("User data loaded:", data);
            setUserData({ ...data, isLoggedIn: true } as UserState);
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
              isAdmin: fbUser.email === "ottigospel@gmail.com",
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
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubDoc) unsubDoc();
      unsub();
    };
  }, []);

  const login = async (loginId: string, securityKey: string) => {
    setLoading(true);
    try {
      // Basic check if it's an email format. If not, it's tricky because Firebase Auth uses emails.
      // We will assume loginId is an email.
      const email = loginId.includes('@') ? loginId : `${loginId.replace(/[^0-9]/g, '')}@brex.local`;
      await signInWithEmailAndPassword(auth, email, securityKey);
    } catch (err: any) {
      setLoading(false);
      throw new Error("Invalid credentials. Please verify your details or sign up.");
    }
  };

  const register = async (payload: any) => {
    setLoading(true);
    try {
      const email = payload.email.trim().toLowerCase();
      const userCred = await createUserWithEmailAndPassword(auth, email, payload.password);
      
      const ourOwnCode = `BREX-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newUserProfile = {
        id: userCred.user.uid,
        name: payload.name.trim(),
        email: email,
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
        referredBy: payload.invitationCode || "",
        isAdmin: email === "ottigospel@gmail.com",
        investments: CLIENT_DEFAULT_VIP_PLANS
      };

      await setDoc(doc(db, 'users', userCred.user.uid), newUserProfile);
      
      const txnRecord = {
        id: `txn_${Date.now()}`,
        userId: userCred.user.uid,
        amount: 1000,
        type: "bonus",
        status: "success",
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: "Setup Activation Welcome Bonus"
      };

      await setDoc(doc(db, `users/${userCred.user.uid}/transactions/${txnRecord.id}`), txnRecord);
      
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
      await updateDoc(doc(db, 'users', user.uid), fields);
    } catch (err) {
      throw new Error("Failed to link payout channels");
    }
  };

  const updateSecurity = async (password: string) => {
    // To change password, need reauthentication, too complex for this MVP.
    throw new Error("Changing password requires reauthentication (Not implemented in preview)");
  };

  const recharge = async (amount: number, senderName: string) => {
    if (!user || !userData) return;
    try {
      const newBalance = userData.balance + amount;
      const newGains = userData.monthlyGains + Math.floor(amount * 0.05);

      const batch = writeBatch(db);
      
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        balance: newBalance,
        monthlyGains: newGains
      });
      
      const txnId = `txn_${Date.now()}`;
      const txnRef = doc(db, `users/${user.uid}/transactions/${txnId}`);
      batch.set(txnRef, {
        id: txnId,
        userId: user.uid,
        amount: amount,
        type: "recharge",
        status: "pending",
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: "Deposit Submitted for Review"
      });
      
      await batch.commit();
    } catch (err) {
      throw new Error("Recharge settlement error");
    }
  };

  const withdraw = async (amount: number, bank: string, code: string, owner: string) => {
    if (!user || !userData) return;
    if (userData.balance < amount) throw new Error("Insufficient balance");
    
    // Un-withdrawable until deposit and buy product check
    const hasJoinedPlan = userData.investments && userData.investments.some((p: any) => p.joined);
    if (!hasJoinedPlan) {
      throw new Error("You must deposit and invest in at least one product to unlock withdrawals.");
    }

    try {
      const newBalance = userData.balance - amount;

      const batch = writeBatch(db);
      
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        balance: newBalance
      });
      
      const txnId = `txn_${Date.now()}`;
      const txnRef = doc(db, `users/${user.uid}/transactions/${txnId}`);
      batch.set(txnRef, {
        id: txnId,
        userId: user.uid,
        amount: amount,
        type: "withdraw",
        status: "pending",
        bank: bank,
        code: code,
        owner: owner,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: "Instant Payout Request Submitted"
      });
      
      await batch.commit();
    } catch (err) {
      throw new Error("Withdrawal failed");
    }
  };

  const accrueYield = async (planId: string) => {
    if (!user || !userData || !userData.investments) return;
    try {
      const investments = [...userData.investments];
      const planIndex = investments.findIndex(p => p.id === planId);
      if (planIndex === -1) throw new Error("Plan not found");
      
      const plan = investments[planIndex];
      if (!plan.joined) throw new Error("Not joined");
      
      const todayStr = new Date().toISOString().slice(0, 10);
      if (plan.lastClaimedDate === todayStr) throw new Error("Already claimed today");
      
      const yieldAmount = plan.dailyProfit;
      
      plan.earnYesterday = yieldAmount;
      plan.earnTotal += yieldAmount;
      plan.workingDays += 1;
      plan.lastClaimedDate = todayStr;
      
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      
      batch.update(userRef, {
        balance: increment(yieldAmount),
        monthlyGains: increment(yieldAmount),
        investments: investments
      });
      
      const txnId = `txn_${Date.now()}`;
      const txnRef = doc(db, `users/${user.uid}/transactions/${txnId}`);
      batch.set(txnRef, {
        id: txnId,
        userId: user.uid,
        amount: yieldAmount,
        type: "claim",
        status: "success",
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: `Daily Claim: interest profit from ${plan.name}`
      });
      
      await batch.commit();
    } catch (err: any) {
      throw new Error(err.message || "Yield accrual calculation failed");
    }
  };

  const subscribeToPlan = async (planId: string) => {
    if (!user || !userData || !userData.investments) return;
    try {
      const investments = [...userData.investments];
      const planIndex = investments.findIndex(p => p.id === planId);
      if (planIndex === -1) throw new Error("Plan not found");
      
      const plan = investments[planIndex];
      if (userData.balance < plan.cost) throw new Error("Insufficient balance");
      
      plan.joined = true;
      plan.balance += plan.cost;
      
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      
      batch.update(userRef, {
        balance: increment(-plan.cost),
        investments: investments
      });
      
      const txnId = `txn_${Date.now()}`;
      const txnRef = doc(db, `users/${user.uid}/transactions/${txnId}`);
      batch.set(txnRef, {
        id: txnId,
        userId: user.uid,
        amount: plan.cost,
        type: "subscribe",
        status: "success",
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: `Subscribed and activated ${plan.name} Pool`
      });
      
      await batch.commit();
    } catch (err: any) {
      throw new Error(err.message || "Portfolio allocation failed");
    }
  };

  const simulateInvite = async () => {
     // Intentionally left blank as mock data generation shouldn't be main concern here
  };

  const loadTeamData = async () => {
    if (!user || !userData) return { members: [], teamSize: 0, rechargeMembers: 0 };
    
    try {
      const q = query(
        collection(db, 'users'), 
        where('referredBy', '==', userData.invitationCode)
      );
      const snapshot = await getDocs(q);
      const level1Members: any[] = [];
      let totalRecharge = 0;
      
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        let phoneObfuscated = "Hidden";
        if (d.phoneNumber && d.phoneNumber.length >= 7) {
          const digits = d.phoneNumber.replace(/[^0-9]/g, '');
          if (digits.length >= 7) {
             phoneObfuscated = digits.slice(0,4) + "****" + digits.slice(-3);
          }
        }
        
        let hasRecharged = false;
        if (d.balance > 3000) {
            hasRecharged = true;
        }

        level1Members.push({
           phone: phoneObfuscated,
           recharge: hasRecharged ? 1 : 0,
           withdraw: 0,
           date: 'Recent',
           lvl: 1
        });
        
        if (hasRecharged) totalRecharge++;
      });
      
      return {
        members: level1Members,
        teamSize: level1Members.length,
        rechargeMembers: totalRecharge
      };
    } catch (err) {
      console.log("Failed to load real team data", err);
      return { members: [], teamSize: 0, rechargeMembers: 0 };
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      userData,
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
      simulateInvite,
      loadTeamData,
      refreshProfile,
      resetPassword,
      approveTransaction,
      rejectTransaction
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};
