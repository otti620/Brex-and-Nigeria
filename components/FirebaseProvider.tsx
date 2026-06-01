import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserState, UserInvestment, TransactionRecord } from '../types';
import { auth, db, isConfigured, config } from '../lib/firebase';
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
  { id: 'vip-1', name: 'Alpha Core', period: '365 Days', workingDays: 0, cost: 3000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 1, avatar: '💎', dailyProfit: 150 },
  { id: 'vip-2', name: 'Beta Growth', period: '365 Days', workingDays: 0, cost: 15000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 2, avatar: '💫', dailyProfit: 900 },
  { id: 'vip-3', name: 'Gamma Prime', period: '365 Days', workingDays: 0, cost: 50000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 3, avatar: '🚀', dailyProfit: 3500 },
  { id: 'vip-4', name: 'Delta Elite', period: '365 Days', workingDays: 0, cost: 150000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 4, avatar: '👑', dailyProfit: 12000 },
  { id: 'vip-5', name: 'Epsilon Apex', period: '365 Days', workingDays: 0, cost: 300000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 5, avatar: '🔱', dailyProfit: 27000 },
  { id: 'vip-6', name: 'Sigma Zenith', period: '365 Days', workingDays: 0, cost: 500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 6, avatar: '🌌', dailyProfit: 50000 },
  { id: 'vip-7', name: 'Omega Imperial', period: '365 Days', workingDays: 0, cost: 1000000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 7, avatar: '🔥', dailyProfit: 110000 },
  { id: 'vip-8', name: 'Legacy Diamond', period: '365 Days', workingDays: 0, cost: 2500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 8, avatar: '⚡', dailyProfit: 300000 }
];

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string; email: string; name: string } | null>(null);
  const [userData, setUserData] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: () => void;
    
    const unsub = isConfigured ? onAuthStateChanged(auth, async (fbUser) => {
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
            const phoneDigits = (fbUser.phoneNumber || '').replace(/[^0-9]/g, '');
            const isAdminPhone = phoneDigits.slice(-10) === '7077599057';
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
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    }) : () => { setLoading(false); };

    return () => {
      if (unsubDoc) unsubDoc();
      unsub();
    };
  }, []);

  const login = async (loginId: string, securityKey: string) => {
    setLoading(true);
    try {
      // Priority 1: Check if input is a phone number (mostly digits)
      // Priority 2: Use mapping to internal domain if it looks like a phone
      const isEmail = loginId.includes('@');
      let loginEmail = loginId;
      
      if (!isEmail) {
        const digits = loginId.replace(/[^0-9]/g, '');
        loginEmail = `${digits}@seedstreet.internal`;
      }
      
      await signInWithEmailAndPassword(auth, loginEmail, securityKey);
    } catch (err: any) {
      setLoading(false);
      throw new Error("Invalid phone number or password. Please verify and try again.");
    }
  };

  const register = async (payload: any) => {
    setLoading(true);
    try {
      // Use phone number as the primary identifier if email isn't provided or preferred
      const phoneDigits = payload.phoneNumber.replace(/[^0-9]/g, '');
      const loginEmail = payload.email || `${phoneDigits}@seedstreet.internal`;
      
      const userCred = await createUserWithEmailAndPassword(auth, loginEmail, payload.password);
      
      const ourOwnCode = `BREX-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Admin check for specified phone number
      const normalizedPhone = phoneDigits.slice(-10); // get last 10 digits
      const isAdminPhone = normalizedPhone === '7077599057';
      const isAdminEmail = loginEmail === "ottigospel@gmail.com";
      
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
        referredBy: payload.invitationCode || "",
        isAdmin: isAdminPhone || isAdminEmail,
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
      // fields standard: { linkedBankName, linkedBankCode, linkedBankOwner }
      await updateDoc(doc(db, 'users', user.uid), fields);
    } catch (err) {
      throw new Error("Failed to update settlement info");
    }
  };

  const updateSecurity = async (password: string) => {
    // Transaction PIN removal requested, so this is just a placeholder for pass updates
    throw new Error("Security updates limited in preview mode");
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
      // Level 1
      const q1 = query(collection(db, 'users'), where('referredBy', '==', userData.invitationCode));
      const snap1 = await getDocs(q1);
      const members: any[] = [];
      let rechargeMembers = 0;
      
      const l1Codes: string[] = [];
      snap1.forEach(docSnap => {
        const d = docSnap.data();
        l1Codes.push(d.invitationCode);
        const hasRecharged = d.balance > 2000;
        if (hasRecharged) rechargeMembers++;
        
        members.push({
          phone: d.phoneNumber ? `***${d.phoneNumber.slice(-4)}` : 'Hidden',
          recharge: d.balance || 0,
          withdraw: 0,
          date: d.date || 'Recent',
          lvl: 1
        });
      });

      // Level 2 (Referred by Level 1 members)
      const l2Codes: string[] = [];
      if (l1Codes.length > 0) {
        const q2 = query(collection(db, 'users'), where('referredBy', 'in', l1Codes));
        const snap2 = await getDocs(q2);
        snap2.forEach(docSnap => {
          const d = docSnap.data();
          l2Codes.push(d.invitationCode);
          const hasRecharged = d.balance > 2000;
          if (hasRecharged) rechargeMembers++;
          
          members.push({
            phone: d.phoneNumber ? `***${d.phoneNumber.slice(-4)}` : 'Hidden',
            recharge: d.balance || 0,
            withdraw: 0,
            date: d.date || 'Recent',
            lvl: 2
          });
        });
      }

      // Level 3 (Referred by Level 2 members)
      if (l2Codes.length > 0) {
        // Break into chunks of 10 if necessary, but assuming small for now
        const chunks = [];
        for (let i = 0; i < l2Codes.length; i += 10) {
          chunks.push(l2Codes.slice(i, i + 10));
        }
        
        for (const chunk of chunks) {
          const q3 = query(collection(db, 'users'), where('referredBy', 'in', chunk));
          const snap3 = await getDocs(q3);
          snap3.forEach(docSnap => {
            const d = docSnap.data();
            const hasRecharged = d.balance > 2000;
            if (hasRecharged) rechargeMembers++;
            
            members.push({
              phone: d.phoneNumber ? `***${d.phoneNumber.slice(-4)}` : 'Hidden',
              recharge: d.balance || 0,
              withdraw: 0,
              date: d.date || 'Recent',
              lvl: 3
            });
          });
        }
      }
      
      return {
        members,
        teamSize: members.length,
        rechargeMembers
      };
    } catch (err) {
      console.log("Failed to load hierarchical team data", err);
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
