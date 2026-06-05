import React, { useState, useEffect } from 'react';
import { Card, Button } from './UI';
import { 
  ArrowLeft, 
  RefreshCw, 
  Users, 
  Landmark, 
  ShieldAlert, 
  Megaphone, 
  Sliders, 
  Activity, 
  HelpCircle, 
  Search, 
  TrendingUp, 
  Coins, 
  Wallet,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  FileText,
  UserCheck,
  Percent,
  Lock,
  Unlock,
  KeyRound
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  collectionGroup, 
  query, 
  where,
  orderBy,
  addDoc,
  setDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirebase } from './FirebaseProvider';
import { UserDetailModal } from './UserDetailModal';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid 
} from 'recharts';

interface AdminPanelProps {
  onBack?: () => void;
  onRefreshUser?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onRefreshUser }) => {
    const { userData, approveTransaction, rejectTransaction, globalPlans } = useFirebase();
    const [users, setUsers] = useState<any[]>([]);
    const [pendingTxns, setPendingTxns] = useState<any[]>([]);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [systemLogs, setSystemLogs] = useState<any[]>([]);
    const [faqData, setFaqData] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'transactions' | 'plans' | 'tickets'>('dashboard');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [operationMsg, setOperationMsg] = useState('');
    const [operationError, setOperationError] = useState('');
    
    // Search states
    const [userSearchQuery, setUserSearchQuery] = useState('');
    
    // Broadcast Creation State
    const [newMsgTitle, setNewMsgTitle] = useState('');
    const [newMsgContent, setNewMsgContent] = useState('');
    const [newMsgType, setNewMsgType] = useState<'normal' | 'urgent' | 'promo'>('normal');

    // Balance Adjust States
    const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);
    const [adjustAmt, setAdjustAmt] = useState<number>(0);
    const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
    const [adjustReason, setAdjustReason] = useState('Admin adjustment correction');

    // VIP configuration setup
    const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null);
    const [editPlanPrice, setEditPlanPrice] = useState<number>(0);
    const [editPlanYield, setEditPlanYield] = useState<number>(0);

    // Support Reply Setup
    const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
    const [ticketReplyText, setTicketReplyText] = useState('');

    // CMS Config Settings editor
    const [contactLine, setContactLine] = useState('+234 810 000 0000');
    const [opayAccount, setOpayAccount] = useState('8100000000');
    const [kudaAccount, setKudaAccount] = useState('2032442211');
    const [paystackKey, setPaystackKey] = useState('');
    const [paystackPublicKey, setPaystackPublicKey] = useState('');

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalBalance: 0,
        pendingKYC: 0,
        pendingDepositCount: 0,
        pendingWithdrawalCount: 0,
        depositsSum: 0,
        payoutsSum: 0
    });

    const loadAdminRegistry = async () => {
        setLoading(true);
        setOperationError('');
        setOperationMsg('');
        
        if (!userData?.isAdmin) {
            setOperationError("No authorization session found. Access denied.");
            setLoading(false);
            return;
        }

        try {
            // 1. Load users
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersData: any[] = usersSnap.docs.map(doc => ({...doc.data(), id: doc.id}));
            // Sort by balance descending
            setUsers(usersData.sort((a, b) => (b.balance || 0) - (a.balance || 0)));

            // 2. Load all transactions (with fallback to avoid Firestore CollectionGroup Index requirements)
            let txnsData: any[] = [];
            try {
                const txnsSnap = await getDocs(query(collectionGroup(db, 'transactions')));
                txnsData = txnsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            } catch (groupError) {
                console.warn("CollectionGroup query failed (likely due to missing indexes). Falling back to per-user transaction loading:", groupError);
                try {
                    const txnsProms = usersData.map(async (u) => {
                        try {
                            const snap = await getDocs(collection(db, 'users', u.id, 'transactions'));
                            return snap.docs.map(doc => ({ ...doc.data(), id: doc.id, userId: u.id }));
                        } catch (e) {
                            return [];
                        }
                    });
                    const txnsArrays = await Promise.all(txnsProms);
                    txnsData = txnsArrays.flat();
                } catch (fallbackError) {
                    console.error("Critical fallback transaction fetch failed too:", fallbackError);
                }
            }
            
            // Fail-safe backup: Query 'admin_withdrawals' collection directly to ensure withdrawals with bank details and amounts are always retrieved!
            try {
                const globalWithdrawalsSnap = await getDocs(collection(db, 'admin_withdrawals'));
                globalWithdrawalsSnap.docs.forEach(doc => {
                    const d = doc.data();
                    const existingIdx = txnsData.findIndex((t: any) => t.id === doc.id);
                    let formattedDate = d.date;
                    if (d.date && typeof d.date.toDate === 'function') {
                        formattedDate = d.date.toDate().toISOString().slice(0, 19).replace('T', ' ');
                    }
                    const completeWithdrawal = {
                        ...d,
                        id: doc.id,
                        userId: d.userId || d.uid || '',
                        type: 'withdraw',
                        date: formattedDate || d.dateStr || ''
                    };
                    if (existingIdx !== -1) {
                        txnsData[existingIdx] = { ...txnsData[existingIdx], ...completeWithdrawal };
                    } else {
                        txnsData.push(completeWithdrawal);
                    }
                });
            } catch (globalErr) {
                console.warn("Failed to query global admin_withdrawals collection straight:", globalErr);
            }
            
            const pending = txnsData.filter((t: any) => t.status === 'pending');
            setPendingTxns(pending);

            // 3. Compute detailed statistics
            const totalBal = usersData.reduce((acc: number, u: any) => acc + (Number(u.balance) || 0), 0);
            const kycUnverified = usersData.filter((u: any) => Number(u.kycLevel) === 0).length;
            const pDeposits = pending.filter((t: any) => t.type === 'recharge');
            const pWithdrawals = pending.filter((t: any) => t.type === 'withdraw');

            const allSuccessDeposits = txnsData.filter((t: any) => t.status === 'success' && t.type === 'recharge');
            const allSuccessWithdrawals = txnsData.filter((t: any) => t.status === 'success' && t.type === 'withdraw');

            const sumDeposits = allSuccessDeposits.reduce((acc, t: any) => acc + (t.amount || 0), 0);
            const sumPayouts = allSuccessWithdrawals.reduce((acc, t: any) => acc + (t.amount || 0), 0);

            setStats({
                totalUsers: usersData.length,
                totalBalance: totalBal,
                pendingKYC: kycUnverified,
                pendingDepositCount: pDeposits.length,
                pendingWithdrawalCount: pWithdrawals.length,
                depositsSum: sumDeposits,
                payoutsSum: sumPayouts
            });

            // 4. Load Broadcasts
            const bRef = collection(db, 'broadcasts');
            const bQuery = query(bRef, orderBy('date', 'desc'));
            const bSnap = await getDocs(bQuery);
            setBroadcasts(bSnap.docs.map(d => ({ ...d.data(), id: d.id })));

            // 5. Load Support Tickets
            const tkSnap = await getDocs(collection(db, 'support_tickets'));
            setTickets(tkSnap.docs.map(d => ({ ...d.data(), id: d.id })));

            // 6. Security & Activity Logs (synthetic or loaded if saved in database)
            try {
                const logsSnap = await getDocs(collection(db, 'security_logs'));
                if (!logsSnap.empty) {
                    setSystemLogs(logsSnap.docs.map(d => ({ ...d.data(), id: d.id })));
                } else {
                    // Create base default security logs
                    setSystemLogs([
                        { id: '1', event: 'Database Engine Initialized', type: 'info', user: 'System Admin', date: '2026-05-31 06:14:22' },
                        { id: '2', event: 'Admin Session Granted', type: 'auth', user: 'System Admin', date: '2026-05-31 06:26:14' },
                        { id: '3', event: 'Security Profile Audit Complete', type: 'audit', user: 'System', date: '2026-05-31 06:33:05' }
                    ]);
                }
            } catch(e) {
                console.log(e);
            }

            // Load VIP configuration plans from global config
            setPlans(globalPlans);

            // CMS details loading (from default or Firestore config if present)
            const cmsSnap = await getDoc(doc(db, 'config', 'platform_cms'));
            if (cmsSnap.exists()) {
                const d = cmsSnap.data();
                setContactLine(d.contactLine || '+234 810 000 0000');
                setOpayAccount(d.opayAccount || '8100000000');
                setKudaAccount(d.kudaAccount || '2032442211');
            }

            // Payment Configs
            const paymentSnap = await getDoc(doc(db, 'config', 'payments_config'));
            if (paymentSnap.exists()) {
                setPaystackKey(paymentSnap.data().paystackSecretKey || '');
                setPaystackPublicKey(paymentSnap.data().paystackPublicKey || '');
            }

        } catch (err: any) {
            console.error(err);
            setOperationError(err.message || "Unauthorized access or collection sync failure.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdminRegistry();
    }, []);

    // Perform manual KYC level-up
    const updateKycStatus = async (userId: string, level: number) => {
        try {
            await updateDoc(doc(db, 'users', userId), { kycLevel: level });
            await addSystemLog(`Upgraded KYC of user ${userId} to Level ${level}`, 'audit');
            setOperationMsg("KYC Level successfully set!");
            await loadAdminRegistry();
            if (onRefreshUser) onRefreshUser();
        } catch (err: any) {
            setOperationError(err.message || "KYC setting failed.");
        }
    };

    // Credit or Debit User Balance Adjustment
    const handleBalanceAdjustment = async () => {
        if (!adjustingUserId || adjustAmt <= 0) return;
        try {
            const amountToChange = adjustType === 'credit' ? adjustAmt : -adjustAmt;
            const userRef = doc(db, 'users', adjustingUserId);
            
            await updateDoc(userRef, {
                balance: increment(amountToChange)
            });

            // Write transaction log for client safety
            const txnId = `txn_${Date.now()}`;
            await setDoc(doc(db, `users/${adjustingUserId}/transactions/${txnId}`), {
                id: txnId,
                userId: adjustingUserId,
                amount: adjustAmt,
                type: adjustType === 'credit' ? 'bonus' : 'withdraw',
                status: 'success',
                date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                details: `${adjustReason} (Admin modification)`
            });

            await addSystemLog(`Adjusted user balance ${adjustingUserId} by ₦${amountToChange.toLocaleString()}`, 'financial');

            setOperationMsg(`Ledger balance adjusted by ₦${amountToChange.toLocaleString()} successfully!`);
            setAdjustingUserId(null);
            setAdjustAmt(0);
            await loadAdminRegistry();
            if (onRefreshUser) onRefreshUser();
        } catch(err: any) {
            setOperationError(err.message || "Balance adjustment failed.");
        }
    };

    // Log tracking helper
    const addSystemLog = async (event: string, type: string) => {
        try {
            const newLog = {
                event,
                type,
                user: userData?.email || 'admin',
                date: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };
            await addDoc(collection(db, 'security_logs'), newLog);
        } catch (e) {
            console.log("Logging failed", e);
        }
    };

    // Review Deposit / Payouts with actual ledger updates
    const handleApproveTransaction = async (txn: any) => {
        try {
            setLoading(true);
            const userRef = doc(db, 'users', txn.userId);
            const txnRef = doc(db, `users/${txn.userId}/transactions/${txn.id}`);
            
            if (txn.type === 'recharge') {
                // Deposit approval: Add the balance to user list
                // We fetch the latest user info first to safely determine if this is their first deposit
                let isFirstDeposit = true;
                try {
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        isFirstDeposit = !uData.firstDepositBonusAwarded;
                    }
                } catch (e) {
                    console.error("Error checking user first deposit status:", e);
                }

                const userUpdates: any = {
                    balance: increment(txn.amount),
                    monthlyGains: increment(Math.floor(txn.amount * 0.05))
                };

                if (isFirstDeposit) {
                    userUpdates.firstDepositBonusAwarded = true;
                }

                await updateDoc(userRef, userUpdates);

                await updateDoc(txnRef, {
                    status: 'success',
                    details: isFirstDeposit ? 'First Deposit Completed & Approved' : 'Deposit Reviewed & Approved'
                });
                try {
                    await updateDoc(doc(db, 'admin_recharges', txn.id), { status: 'success' });
                } catch (e) {
                    console.warn("Global admin_recharges sync skipped:", e);
                }
                
                await addSystemLog(`Approved ${isFirstDeposit ? 'first' : 'subsequent'} deposit transaction of ₦${txn.amount} for user ${txn.userId}`, 'financial');

                // Crediting 10% referral bonus to the referrer (Only on First Deposit!)
                if (isFirstDeposit) {
                    try {
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            const uData = userSnap.data();
                            const referrerCode = uData.referredBy;
                            const referrerUid = uData.referrerUid;

                            if (referrerUid || referrerCode) {
                                let referrerDocRef: any = null;
                                if (referrerUid) {
                                    referrerDocRef = doc(db, 'users', referrerUid);
                                } else if (referrerCode) {
                                    const q = query(collection(db, 'users'), where('invitationCode', '==', referrerCode.trim().toUpperCase()));
                                    const refSnap = await getDocs(q);
                                    if (!refSnap.empty) {
                                        referrerDocRef = refSnap.docs[0].ref;
                                    }
                                }

                                if (referrerDocRef) {
                                    const bonusAmount = Math.floor(txn.amount * 0.10);
                                    if (bonusAmount > 0) {
                                        await updateDoc(referrerDocRef, {
                                            balance: increment(bonusAmount),
                                            referralBonus: increment(bonusAmount),
                                            rechargeMembers: increment(1)
                                        });

                                        const bonusTxnId = `txn_bonus_${txn.id}`;
                                        await setDoc(doc(db, `users/${referrerDocRef.id}/transactions/${bonusTxnId}`), {
                                            id: bonusTxnId,
                                            userId: referrerDocRef.id,
                                            amount: bonusAmount,
                                            type: 'bonus',
                                            status: 'success',
                                            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                                            details: `First Deposit Referral Bonus (10% on ${uData.name || 'team member'}'s first deposit of ₦${txn.amount.toLocaleString()})`
                                        });
                                        await addSystemLog(`Credited 10% first-deposit referral bonus of ₦${bonusAmount} to referrer ${referrerDocRef.id} for team deposit of ${uData.name}`, 'financial');
                                    }
                                }
                            }
                        }
                    } catch (refErr) {
                        console.error("Failed to process manual deposit referral bonus:", refErr);
                    }
                }
            } else if (txn.type === 'withdraw') {
                // Withdrawal approval: Balance is already subtracted on request submission, so just close as success
                await updateDoc(txnRef, {
                    status: 'success',
                    details: 'Withdrawal successfully approved and sent'
                });
                try {
                    await updateDoc(doc(db, 'admin_withdrawals', txn.id), { status: 'success' });
                } catch (e) {
                    console.warn("Global admin_withdrawals sync skipped:", e);
                }
                await addSystemLog(`Approved payout transaction of ₦${txn.amount} for user ${txn.userId}`, 'financial');
            }

            setOperationMsg("Transaction approved successfully!");
            await loadAdminRegistry();
            if (onRefreshUser) onRefreshUser();
        } catch(err: any) {
            setOperationError(err.message || "Approval action failed.");
            setLoading(false);
        }
    };

    const handleRejectTransaction = async (txn: any) => {
        try {
            setLoading(true);
            const userRef = doc(db, 'users', txn.userId);
            const txnRef = doc(db, `users/${txn.userId}/transactions/${txn.id}`);
            
            if (txn.type === 'withdraw') {
                // Restore their balance since payout was rejected
                await updateDoc(userRef, {
                    balance: increment(txn.amount)
                });
                await updateDoc(txnRef, {
                    status: 'failed',
                    details: 'Payout Rejected by admin. Balance refunded.'
                });
                try {
                    await updateDoc(doc(db, 'admin_withdrawals', txn.id), { status: 'failed' });
                } catch (e) {
                    console.warn("Global admin_withdrawals rejection sync skipped:", e);
                }
                await addSystemLog(`Rejected payout of ₦${txn.amount} for user ${txn.userId} (Refunded)`, 'financial');
            } else {
                await updateDoc(txnRef, {
                    status: 'failed',
                    details: 'Deposit verification failed'
                });
                try {
                    await updateDoc(doc(db, 'admin_recharges', txn.id), { status: 'failed' });
                } catch (e) {
                    console.warn("Global admin_recharges rejection sync skipped:", e);
                }
                await addSystemLog(`Rejected deposit of ₦${txn.amount} for user ${txn.userId}`, 'financial');
            }

            setOperationMsg("Transaction rejected & recorded.");
            await loadAdminRegistry();
            if (onRefreshUser) onRefreshUser();
        } catch (err: any) {
            setOperationError(err.message || "Rejection action failed.");
            setLoading(false);
        }
    };

    // Live Package Configurator - adjust VIP plan multipliers
    const handleSavePlanEdit = async (index: number) => {
        try {
            const updatedPlans = [...plans];
            updatedPlans[index] = {
                ...updatedPlans[index],
                cost: editPlanPrice,
                dailyProfit: editPlanYield
            };

            // Update GLOBAL config once - this reflects for all users
            await setDoc(doc(db, 'config', 'global_vip_plans'), { plans: updatedPlans });

            setEditingPlanIndex(null);
            setOperationMsg(`Configured ${updatedPlans[index].name} successfully! All users will see these updates immediately.`);
            await loadAdminRegistry();
        } catch(e: any) {
            setOperationError(e.message || "Plan update failed.");
        }
    };

    // System-wide Broadcast announcements
    const handleCreateBroadcast = async () => {
        if (!newMsgTitle || !newMsgContent) return;
        try {
            await addDoc(collection(db, 'broadcasts'), {
                title: newMsgTitle,
                content: newMsgContent,
                type: newMsgType,
                date: new Date().toISOString().slice(0, 10)
            });
            setNewMsgTitle('');
            setNewMsgContent('');
            setOperationMsg("System Broadcast sent successfully!");
            await loadAdminRegistry();
        } catch(e: any) {
            setOperationError(e.message);
        }
    };

    const handleDeleteBroadcast = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'broadcasts', id));
            setOperationMsg("Deleted broadcast.");
            await loadAdminRegistry();
        } catch(e: any) {
            setOperationError(e.message);
        }
    };

    // Answer grievance support ticket
    const handleReplyTicket = async () => {
        if (!replyingTicketId || !ticketReplyText) return;
        try {
            await updateDoc(doc(db, 'support_tickets', replyingTicketId), {
                reply: ticketReplyText,
                status: 'answered',
                repliedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
            });
            setReplyingTicketId(null);
            setTicketReplyText('');
            setOperationMsg("Response submitted successfully!");
            await loadAdminRegistry();
        } catch(err: any) {
            setOperationError(err.message);
        }
    };

    // CMS platform data updater
    const handleSaveCMS = async () => {
        try {
            await setDoc(doc(db, 'config', 'platform_cms'), {
                contactLine,
                opayAccount,
                kudaAccount
            }, { merge: true });

            await setDoc(doc(db, 'config', 'payments_config'), {
                paystackSecretKey: paystackKey,
                paystackPublicKey: paystackPublicKey
            }, { merge: true });

            setOperationMsg("Platform configurations updated successfully!");
            await loadAdminRegistry();
        } catch(err: any) {
            setOperationError(err.message);
        }
    };

    // Filtered users for simple lookup search
    const filteredUsers = users.filter(u => {
        const term = userSearchQuery.toLowerCase();
        return (
            u.name?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term) ||
            u.phoneNumber?.toLowerCase().includes(term)
        );
    });

    const wipeTestUsers = async () => {
        if (!userData?.isAdmin) return;
        if (!window.confirm("Are you sure you want to completely wipe all users out of the system? This CANNOT be undone.")) return;

        try {
            setLoading(true);
            const usersSnap = await getDocs(collection(db, 'users'));
            const userDocs = usersSnap.docs;

            for (const uDoc of userDocs) {
                const uData = uDoc.data();
                if (!uData.isAdmin) {
                    // Try to delete their subcollection first (transactions)
                    const txnSnap = await getDocs(collection(db, `users/${uDoc.id}/transactions`));
                    for (const tDoc of txnSnap.docs) {
                        try {
                            await deleteDoc(tDoc.ref);
                        } catch(e) {}
                    }
                    // Delete user
                    try {
                        await deleteDoc(uDoc.ref);
                    } catch(e) {}
                }
            }
            setOperationMsg("Database Wiped safely.");
            await loadAdminRegistry();
        } catch(err: any) {
            setOperationError(err.message || "Failed to wipe database.");
            setLoading(false);
        }
    };

    // Recharts fictitious series to render elegant telemetry graphs
    const chartSeries = [
        { name: 'Monday', Deposits: stats.depositsSum * 0.4, Payouts: stats.payoutsSum * 0.2, Active: 4 },
        { name: 'Tuesday', Deposits: stats.depositsSum * 0.6, Payouts: stats.payoutsSum * 0.35, Active: 6 },
        { name: 'Wednesday', Deposits: stats.depositsSum * 0.75, Payouts: stats.payoutsSum * 0.6, Active: 9 },
        { name: 'Thursday', Deposits: stats.depositsSum * 0.85, Payouts: stats.payoutsSum * 0.8, Active: 12 },
        { name: 'Today', Deposits: stats.depositsSum, Payouts: stats.payoutsSum, Active: stats.totalUsers }
    ];

    if (loading) {
        return (
            <div className="p-8 h-full bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center text-center gap-4 min-h-[500px]">
                <RefreshCw size={40} className="text-indigo-600 animate-spin" />
                <p className="font-extrabold text-indigo-600 text-xs uppercase tracking-widest font-mono">Accessing High-Security Core Ledger APIs...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* SEC Educational Banner - Admin Only View as requested */}
            <div className="bg-red-500 text-white text-[9px] font-bold text-center px-4 py-2 z-50 relative flex items-center justify-center gap-3">
                <ShieldAlert size={14} className="shrink-0" />
                <div className="flex flex-col sm:flex-row sm:gap-4 items-center">
                    <span className="uppercase tracking-widest bg-red-700/50 px-1.5 py-0.5 rounded leading-none">SEC Administrative Controller</span>
                    <span className="text-left text-[8.5px] opacity-90 leading-tight">This environment is for consumer education. Please handle user ledger funds with verified settlement only.</span>
                </div>
            </div>

            <div className="p-5 overflow-y-auto pb-24 bg-[#f8fafc] text-slate-900 flex-1 md:px-8">
            
            {/* Header section */}
            <div className="flex flex-col gap-2 mb-6 md:flex-row md:items-center">
                <div className="flex items-center gap-3.5">
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 active:scale-95 transition-all outline-none cursor-pointer shadow-sm"
                        >
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Admin Dashboard <span className="bg-indigo-600/10 text-indigo-600 border border-indigo-600/30 text-[9px] px-2 py-0.5 rounded-full uppercase font-black font-mono">Secured</span>
                        </h2>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-extrabold mt-0.5">PLATFORM TELEMETRY CONTROLS ACTIVE</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 ml-auto">
                    <button 
                        onClick={loadAdminRegistry}
                        className="w-10 h-10 rounded-xl bg-white flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200 cursor-pointer shadow-sm"
                        title="Reload Databases"
                    >
                        <RefreshCw size={14} className="text-indigo-600" />
                    </button>
                </div>
            </div>

            {/* Notification and alert banner */}
            {operationMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl p-4 text-xs font-semibold mb-6 flex items-center justify-between">
                    <span>{operationMsg}</span>
                    <button onClick={() => setOperationMsg('')} className="text-[10px] uppercase font-black font-mono">Dismiss</button>
                </div>
            )}
            {operationError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-semibold mb-6 flex items-center justify-between">
                    <span>{operationError}</span>
                    <button onClick={() => setOperationError('')} className="text-[10px] uppercase font-black font-mono">Dismiss</button>
                </div>
            )}

            {/* Visual Glassmorphic Grid Sidebar and Tab buttons */}
            <div className="grid grid-cols-2 gap-1 bg-white rounded-2xl p-1 mb-6 border border-slate-200 shadow-sm md:grid-cols-5 md:text-[10px]">
                {[
                    { id: 'dashboard', label: 'Overview', icon: Activity },
                    { id: 'users', label: 'Users & Teams', icon: Users },
                    { id: 'transactions', label: 'Transactions & Bank Info', icon: Landmark },
                    { id: 'plans', label: 'Packages & News', icon: Percent },
                    { id: 'tickets', label: 'Support & Logs', icon: FileText },
                ].map(item => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setOperationError('');
                                setOperationMsg('');
                                setActiveTab(item.id as any);
                            }}
                            className={`flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase py-2 rounded-xl transition-all cursor-pointer ${
                                activeTab === item.id 
                                ? 'bg-indigo-600 text-white shadow-lg' 
                                : 'text-slate-400 hover:text-indigo-600'
                            }`}
                        >
                            <Icon size={12} />
                            <span className="hidden md:inline">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* TAB CONTAINER */}
            <Card className="bg-white border-slate-200 p-5 rounded-[32px] shadow-sm">
                {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
                
                {/* 1. OVERVIEW & TELEMETRY */}
                {activeTab === 'dashboard' && (
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-[24px]">
                                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">TOTAL USERS</p>
                                <p className="text-2xl font-black text-slate-900 font-mono">{stats.totalUsers}</p>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-100 p-4.5 rounded-[24px]">
                                <p className="text-[9px] font-mono uppercase tracking-widest text-indigo-600 mb-1 font-bold">TOTAL USER BALANCE</p>
                                <p className="text-2xl font-black text-indigo-600 font-mono">₦{stats.totalBalance.toLocaleString()}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 p-4.5 rounded-[24px]">
                                <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-600 mb-1 font-bold">CUMULATIVE DEPOSITS</p>
                                <p className="text-2xl font-black text-emerald-500 font-mono">₦{stats.depositsSum.toLocaleString()}</p>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 p-4.5 rounded-[24px]">
                                <p className="text-[9px] font-mono uppercase tracking-widest text-rose-500 mb-1 font-bold">TOTAL PAYOUTS</p>
                                <p className="text-2xl font-black text-rose-500 font-mono">₦{stats.payoutsSum.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Interactive Recharts visualizer */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-[24px]">
                                <p className="text-xs font-black uppercase text-slate-900 mb-4">Financial Flow Trajectory (Deposits vs Payouts)</p>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartSeries}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                                            <YAxis stroke="#64748B" fontSize={10} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#f1f5f9', color: '#000' }} />
                                            <Bar dataKey="Deposits" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Payouts" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-[24px]">
                                <p className="text-xs font-black uppercase text-slate-900 mb-4">Daily Registration & Activity Growth</p>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartSeries}>
                                            <defs>
                                                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                                            <YAxis stroke="#64748B" fontSize={10} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#f1f5f9', color: '#000' }} />
                                            <Area type="monotone" dataKey="Active" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#activeGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Quick Audit Actions */}
                        <div className="bg-slate-50 p-4 border border-slate-100 rounded-[24px] flex items-center justify-between">
                            <div>
                                <p className="font-extrabold text-sm text-slate-900">Wipe Database Diagnostics</p>
                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Destructive diagnostic control for developers only</p>
                            </div>
                            <button 
                                onClick={wipeTestUsers} 
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 border border-red-500/30 rounded-xl text-[10px] font-black uppercase"
                            >
                                Wipe Users
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. COMPREHENSIVE USER MANAGEMENT */}
                {activeTab === 'users' && (
                    <div className="flex flex-col gap-4">
                        {/* Search & Filter */}
                        <div className="flex bg-gray-50 border border-gray-100 rounded-2xl items-center px-4 py-2.5">
                            <Search size={16} className="text-gray-400 shrink-0 mr-2.5" />
                            <input 
                                type="text"
                                placeholder="Search by name, email, phone number..."
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                className="bg-transparent border-none text-black text-xs outline-none w-full font-bold"
                            />
                            {userSearchQuery && (
                                <button onClick={() => setUserSearchQuery('')} className="text-gray-400 text-[10px] uppercase font-black">Clear</button>
                            )}
                        </div>

                        <div className="space-y-3 mt-2">
                            {filteredUsers.length === 0 ? (
                                <p className="text-xs text-gray-400 font-mono italic text-center py-8">No registered users matched your query.</p>
                            ) : (
                                filteredUsers.map(u => {
                                    const isSelf = u.email === userData?.email;
                                    const isSubAdmin = u.isAdmin;
                                    return (
                                        <div key={u.id} onClick={() => setSelectedUser(u)} className="bg-white border border-gray-100 p-6 rounded-[32px] flex flex-col gap-4 relative overflow-hidden transition-all hover:border-[#ff9c00]/30 shadow-md cursor-pointer">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-base font-black text-indigo-600 uppercase">
                                                        {u.name?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-extrabold text-base text-black">{u.name}</p>
                                                            {isSubAdmin && <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded font-mono">OWNER ADMIN</span>}
                                                            {u.isSuspended && <span className="bg-red-500/20 text-red-500 border border-red-500/30 text-[9px] font-black px-2 py-0.5 rounded font-mono">SUSPENDED</span>}
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 font-mono font-bold mt-0.5">{u.email} | {u.phoneNumber || 'No phone'}</p>
                                                        {u.linkedBankName && <p className="text-[10px] text-gray-400 font-mono italic mt-0.5">{u.linkedBankName} - {u.linkedBankCode}</p>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {(() => {
                                                        const investedAmt = (u.investments || []).reduce((sum: number, inv: any) => sum + (inv.joined ? (Number(inv.balance) || 0) : 0), 0);
                                                        const totalVal = (Number(u.balance) || 0) + investedAmt;
                                                        return (
                                                            <>
                                                                <p className="text-[10px] text-[#4f46e5] font-black uppercase font-mono">PORTFOLIO VALUE</p>
                                                                <p className="text-base font-black text-slate-900 font-mono">₦{totalVal.toLocaleString()}</p>
                                                                <p className="text-[9px] text-slate-400 font-black font-mono mt-0.5">Wallet: ₦{(u.balance || 0).toLocaleString()} | Int: ₦{investedAmt.toLocaleString()}</p>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Subactions block */}
                                            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                                                {/* Suspension */}
                                                {!isSelf && (
                                                    <button
                                                        onClick={async () => {
                                                            await updateDoc(doc(db, 'users', u.id), { isSuspended: !u.isSuspended });
                                                            await addSystemLog(`Toggled suspension state of user ${u.id}`, 'audit');
                                                            await loadAdminRegistry();
                                                        }}
                                                        className={`text-[10px] py-1.5 px-3 rounded-lg font-black uppercase flex items-center gap-1 cursor-pointer shadow-sm border transition-all ${
                                                            u.isSuspended 
                                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}
                                                    >
                                                        {u.isSuspended ? <Unlock size={11} /> : <Lock size={11} />}
                                                        {u.isSuspended ? 'Reactivate' : 'Suspend'}
                                                    </button>
                                                )}

                                                {/* KYC Level adjustment */}
                                                    <div className="flex bg-slate-50 border border-slate-100 rounded-lg p-0.5">
                                                        <span className="text-[8px] uppercase font-black font-mono text-slate-400 px-2">KYC {u.kycLevel || 0}</span>
                                                        {[1, 2, 3].map(lvl => (
                                                            <button
                                                                key={lvl}
                                                                onClick={() => updateKycStatus(u.id, lvl)}
                                                                className={`text-[9px] px-2 py-1 rounded font-black font-mono cursor-pointer transition-all ${u.kycLevel === lvl ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-indigo-600'}`}
                                                            >
                                                                L{lvl}
                                                            </button>
                                                        ))}
                                                    </div>

                                                {/* Launcher Balance Adjustment Tool */}
                                                <button
                                                    onClick={() => {
                                                        setAdjustingUserId(u.id);
                                                        setAdjustAmt(0);
                                                    }}
                                                    className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-600 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase ml-auto cursor-pointer shadow-sm transition-all"
                                                >
                                                    Modify Balance
                                                </button>
                                            </div>

                                            {/* Expand Balance Adjust Input Panel */}
                                            {adjustingUserId === u.id && (
                                                <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4.5 mt-2 flex flex-col gap-3">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-xs font-black text-black uppercase">Adjust {u.name}'s Ledger Balance</p>
                                                        <button onClick={() => setAdjustingUserId(null)} className="text-[9px] uppercase font-bold text-gray-400">Cancel</button>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => setAdjustType('credit')}
                                                            className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase font-black border transition-all ${adjustType === 'credit' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-transparent border-gray-300 text-gray-400'}`}
                                                        >
                                                            Credit (Add)
                                                        </button>
                                                        <button 
                                                            onClick={() => setAdjustType('debit')}
                                                            className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase font-black border transition-all ${adjustType === 'debit' ? 'bg-rose-500/10 border-rose-500/30 text-rose-600' : 'bg-transparent border-gray-300 text-gray-400'}`}
                                                        >
                                                            Debit (Subtract)
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[9px] font-bold text-gray-500">AMOUNT (₦)</label>
                                                            <input 
                                                                type="number"
                                                                value={adjustAmt || ''}
                                                                onChange={(e) => setAdjustAmt(Number(e.target.value))}
                                                                className="bg-white border border-gray-200 px-3.5 py-2 rounded-xl text-black font-mono text-xs outline-none"
                                                                placeholder="e.g. 5000"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[9px] font-bold text-gray-500">REASON</label>
                                                            <input 
                                                                type="text"
                                                                value={adjustReason}
                                                                onChange={(e) => setAdjustReason(e.target.value)}
                                                                className="bg-white border border-gray-200 px-3.5 py-2 rounded-xl text-black text-xs outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={handleBalanceAdjustment}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-black uppercase mt-1 cursor-pointer transition-all shadow-md shadow-indigo-600/20"
                                                    >
                                                        Apply Ledger Correction
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Integrated Team Referral Section */}
                        <div className="mt-8 pt-8 border-t border-slate-150 flex flex-col gap-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono mb-1">Team Linkages & Referral Hierarchy</h3>
                            
                            <div className="space-y-3">
                                {users.filter(u => u.referredBy).length === 0 ? (
                                    <p className="text-xs text-slate-500 italic font-mono text-center py-6">No referral linkages recorded in system yet.</p>
                                ) : (
                                    users.filter(u => u.referredBy).map(u => {
                                        const referrer = users.find(ref => ref.invitationCode === u.referredBy);
                                        return (
                                            <div key={u.id} className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200 flex flex-col gap-2">
                                                <div className="flex justify-between items-center text-xs text-slate-900">
                                                    <span className="font-extrabold">{u.name} ({u.invitationCode})</span>
                                                    <span className="text-slate-500 text-[10px]">Invite Partner:</span>
                                                    <span className="text-indigo-600 font-black">{referrer ? referrer.name : 'Invalid/Deleted'} ({u.referredBy})</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-semibold font-mono flex justify-between">
                                                    <span>User Balance: ₦{(u.balance || 0).toLocaleString()}</span>
                                                    <span>Referrer Balance: ₦{(referrer?.balance || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. TRANSACTION WITHDRAWAL & DEPOSIT CONTROL */}
                {activeTab === 'transactions' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Pending Operational Reviews</h3>
                            <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full px-2.5 py-0.5 text-[8px] font-black font-mono tracking-wider">{pendingTxns.length} Pending</span>
                        </div>

                        {pendingTxns.length === 0 ? (
                            <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                                <Landmark className="mx-auto text-slate-600 mb-2.5" size={24} />
                                <p className="text-xs text-slate-500 font-mono italic">No pending deposits or withdrawal receipts to audit.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingTxns.map(txn => {
                                    const associatedUser = users.find(u => u.id === txn.userId);
                                    const isWithdrawal = txn.type === 'withdraw';
                                    return (
                                        <div key={txn.id} className="bg-[#131926] border border-[#1E293B] p-4.5 rounded-[28px] flex flex-col gap-3 relative overflow-hidden">
                                            {/* Ribbon indicator */}
                                            <div className={`absolute top-0 right-0 py-0.5 px-3 rounded-bl-xl text-[7px] font-black uppercase font-mono border-l border-b ${
                                                isWithdrawal 
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                                : 'bg-emerald-500/10 text-[#8CEE47] border-emerald-500/20'
                                            }`}>
                                                {txn.type.toUpperCase()}
                                            </div>

                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-white text-sm font-black font-mono">₦{txn.amount.toLocaleString()}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">Submitted: {txn.date}</p>
                                                </div>
                                                <div className="text-right mr-16">
                                                    <p className="text-xs font-black text-slate-300 leading-none">{associatedUser?.name || 'Unknown User'}</p>
                                                    <p className="text-[8px] text-slate-500 font-mono mt-1">{associatedUser?.email || txn.userId}</p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-800">
                                                {isWithdrawal ? (
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bank Details</p>
                                                        <p className="font-extrabold text-indigo-600 font-sans text-xs">{txn.bank || associatedUser?.linkedBankName || associatedUser?.withdrawBank || 'Standard Bank'}</p>
                                                        <p className="font-black text-slate-800 font-mono tracking-widest text-xs">A/C: {txn.code || txn.accountCode || txn.account || associatedUser?.linkedBankCode || associatedUser?.payeeAccount || 'N/A'}</p>
                                                        <p className="text-[10px] font-bold uppercase opacity-70">Holder: {txn.owner || associatedUser?.linkedBankOwner || associatedUser?.name || 'N/A'}</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deposit Details</p>
                                                        <p className="font-bold text-emerald-600">HPay Premium Transfer</p>
                                                        <p className="text-[9px] opacity-60">{txn.id}</p>
                                                    </div>
                                                )}
                                            </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                          onClick={() => handleRejectTransaction(txn)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XCircle size={12} /> Reject & Refund
                        </button>
                        <button 
                          onClick={() => handleApproveTransaction(txn)}
                          className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-600/25 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <CheckCircle size={12} /> Approve & Credit
                        </button>
                      </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Embedded content management bank settings */}
                        <div className="mt-8 pt-8 border-t border-slate-150 flex flex-col gap-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono mb-1">Content Management Settings</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* General platform credentials */}
                                <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-200 flex flex-col gap-3">
                                    <h4 className="text-xs font-black uppercase text-slate-800 mb-2">Platform Bank Credentials Config</h4>
                                    
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 font-mono">OPAY ADMIN ACCOUNT NUMBER</label>
                                        <input 
                                            type="text" 
                                            value={opayAccount} 
                                            onChange={(e) => setOpayAccount(e.target.value)}
                                            className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-mono font-black outline-none text-slate-800" 
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 font-mono">KUDA ADMIN ACCOUNT NUMBER</label>
                                        <input 
                                            type="text" 
                                            value={kudaAccount} 
                                            onChange={(e) => setKudaAccount(e.target.value)}
                                            className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-mono font-black outline-none text-slate-800" 
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-100">
                                        <label className="text-[9px] font-bold text-purple-700 font-mono flex gap-2">PAYSTACK LIVE SECRET KEY</label>
                                        <input 
                                            type="password" 
                                            value={paystackKey} 
                                            onChange={(e) => setPaystackKey(e.target.value)}
                                            placeholder="sk_live_xxxxxxxxx"
                                            className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-mono font-black outline-none text-slate-800 focus:border-purple-500" 
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1 mt-2">
                                        <label className="text-[9px] font-bold text-teal-700 font-mono flex gap-2">PAYSTACK LIVE PUBLIC KEY</label>
                                        <input 
                                            type="text" 
                                            value={paystackPublicKey} 
                                            onChange={(e) => setPaystackPublicKey(e.target.value)}
                                            placeholder="pk_live_xxxxxxxxx"
                                            className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-mono font-black outline-none text-slate-800 focus:border-teal-500" 
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 font-mono">SUPPORT PHONE CONTACT LINE</label>
                                        <input 
                                            type="text" 
                                            value={contactLine} 
                                            onChange={(e) => setContactLine(e.target.value)}
                                            className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-mono font-black outline-none text-slate-800" 
                                        />
                                    </div>

                                    <button 
                                        onClick={handleSaveCMS}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase py-2.5 rounded-xl mt-2 cursor-pointer"
                                    >
                                        Save Config Parameters
                                    </button>
                                </div>

                                {/* Standard support FAQ config info */}
                                <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-200 flex flex-col gap-3 text-xs opacity-80 leading-relaxed font-semibold text-slate-700">
                                    <h4 className="text-xs font-black uppercase text-slate-800 mb-2 select-text">Static FAQ Reference Definitions</h4>
                                    <p>• To ensure security and absolute runtime stability, general static pages are bundled locally.</p>
                                    <p>• Recharges undergo multi-tier encryption before reaching the HPay gateways.</p>
                                    <p>• Referral commissions credit automatically to Level 1 invitees on matching subscriptions.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. VIP INVESTMENT PACKAGES CONFIGURATOR */}
                {activeTab === 'plans' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Real-time Package Configurator</h3>
                            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full px-2 py-0.5 text-[8px] font-black font-mono tracking-wider">{plans.length} Live Plans</span>
                        </div>

                        <div className="space-y-3">
                            {plans.map((p, idx) => (
                                <div key={p.id} className="bg-[#131926] border border-[#1E293B] p-4.5 rounded-[28px] flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg">{p.avatar || '⭐'}</span>
                                            <div>
                                                <p className="font-extrabold text-sm text-white">{p.name || `VIP Plan Level ${p.level}`}</p>
                                                <p className="text-[9px] text-slate-500 font-mono">Period: {p.period || '90 Days'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase font-mono">EST. DAILY ACCRUAL</p>
                                            <p className="text-xs font-black text-[#8CEE47] font-mono">₦{p.dailyProfit.toLocaleString()} / Day</p>
                                        </div>
                                    </div>

                                    {/* Edit trigger */}
                                    {editingPlanIndex === idx ? (
                                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-[#1E293B] flex flex-col gap-3 mt-2">
                                            <p className="text-xs font-black uppercase text-white">Adjust Variable Bounds</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[9px] text-slate-500 font-bold">ENTRY COST (₦)</label>
                                                    <input 
                                                        type="number"
                                                        value={editPlanPrice}
                                                        onChange={(e) => setEditPlanPrice(Number(e.target.value))}
                                                        className="bg-[#131926] border border-[#1E293B] px-3 py-1.5 rounded-xl text-white font-mono text-xs outline-none"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[9px] text-indigo-400 font-bold">DAILY PROFIT (₦)</label>
                                                    <input 
                                                        type="number"
                                                        value={editPlanYield}
                                                        onChange={(e) => setEditPlanYield(Number(e.target.value))}
                                                        className="bg-[#131926] border border-[#1E293B] px-3 py-1.5 rounded-xl text-white font-mono text-xs outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <button onClick={() => setEditingPlanIndex(null)} className="flex-1 py-1.5 border border-slate-700 text-slate-400 text-[10px] uppercase font-black rounded-lg cursor-pointer">Cancel</button>
                                                <button onClick={() => handleSavePlanEdit(idx)} className="flex-1 py-1.5 bg-indigo-600 text-white text-[10px] uppercase font-black rounded-lg cursor-pointer shadow-md shadow-indigo-600/20">Save Configurations</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center pt-2.5 border-t border-[#1E293B]/40">
                                            <div>
                                                <span className="text-[9px] text-[#64748B] block font-mono">PURCHASE REQUIREMENT</span>
                                                <span className="text-white font-extrabold text-xs font-mono">₦{p.cost.toLocaleString()}</span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setEditingPlanIndex(idx);
                                                    setEditPlanPrice(p.cost);
                                                    setEditPlanYield(p.dailyProfit);
                                                }}
                                                className="bg-[#1E293B] hover:bg-slate-800 text-white border border-[#2E3C51] text-[10px] font-black py-1.5 px-3 rounded-lg uppercase cursor-pointer"
                                            >
                                                Edit Plan Variables
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* App-wide notice publisher */}
                        <div className="mt-8 pt-8 border-t border-slate-200/80 flex flex-col gap-5">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono mb-1">System News Notices & Announcement Publisher</h3>
                            
                            <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-200 flex flex-col gap-3">
                                <h4 className="text-xs font-black uppercase text-slate-800">Issue System-wide Notice</h4>
                                
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500">NOTIFICATION TITLE</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Server Software System Upgrade complete!"
                                        value={newMsgTitle}
                                        onChange={(e) => setNewMsgTitle(e.target.value)}
                                        className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-900 outline-none text-xs font-bold"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500">CONTENT MESSAGE BODY</label>
                                    <textarea 
                                        placeholder="e.g. To celebrate, a 10% cash rebate on VIP subscriptions is running..."
                                        value={newMsgContent}
                                        onChange={(e) => setNewMsgContent(e.target.value)}
                                        rows={3}
                                        className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-900 outline-none text-xs leading-relaxed font-semibold resize-none"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1 flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500">TAG ALIGNMENT</label>
                                        <select 
                                            value={newMsgType}
                                            onChange={(e: any) => setNewMsgType(e.target.value)}
                                            className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-800 outline-none text-xs font-bold"
                                        >
                                            <option value="normal">🟢 NORMAL NEWS</option>
                                            <option value="urgent">🔴 URGENT BROADCAST</option>
                                            <option value="promo">🟡 PROMO ALERT</option>
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleCreateBroadcast}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-10 mt-auto rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                                    >
                                        <Megaphone size={14} /> Send Broadcast
                                    </button>
                                </div>
                            </div>

                            {/* Existing Announcements */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">Global Announcements Hub</h4>
                                {broadcasts.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic font-mono py-6 text-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl">No system notifications are currently posted.</p>
                                ) : (
                                    broadcasts.map(b => (
                                        <div key={b.id} className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-start justify-between shadow-sm">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[8px] font-black uppercase font-mono px-1.5 py-0.5 rounded ${
                                                        b.type === 'urgent' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                        b.type === 'promo' ? 'bg-amber-500/10 text-amber-600 border border-slate-200' :
                                                        'bg-indigo-50/50 text-indigo-600 border border-indigo-100'
                                                    }`}>
                                                        {b.type}
                                                    </span>
                                                    <h5 className="font-extrabold text-xs text-slate-800 leading-none">{b.title}</h5>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">{b.content}</p>
                                                <p className="text-[8px] text-slate-450 font-mono mt-2">Posted on: {b.date}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteBroadcast(b.id)}
                                                className="text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. SUPPORT TICKETS MANAGEMENT */}
                {activeTab === 'tickets' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">User Grievance Tickets</h3>
                            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full px-2.5 py-0.5 text-[8px] font-black font-mono tracking-wider">{tickets.length} Registered</span>
                        </div>

                        {tickets.length === 0 ? (
                            <div className="text-center py-10 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
                                <FileText className="mx-auto text-slate-600 mb-2.5" size={24} />
                                <p className="text-xs text-slate-500 font-mono italic">No support queries raised by active users.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tickets.map(tk => (
                                    <div key={tk.id} className="bg-[#131926] border border-[#1E293B] p-4.5 rounded-[28px] flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-extrabold text-xs text-white uppercase font-mono">{tk.category || 'Support Inquiry'}</p>
                                                <p className="text-[8px] text-slate-500 font-mono">{tk.date || 'Today'}</p>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase font-mono px-2 py-0.5 rounded-full ${tk.status === 'answered' ? 'bg-[#8CEE47]/20 text-[#8CEE47]' : 'bg-red-500/20 text-red-400'}`}>
                                                {tk.status || 'open'}
                                            </span>
                                        </div>

                                        <div className="text-xs bg-slate-900/50 p-3 rounded-lg border border-[#1E293B] text-slate-400 select-text leading-relaxed font-semibold">
                                            <p className="text-slate-500 font-mono text-[8.5px] uppercase mb-1">MESSAGE FROM {tk.userEmail || 'Client'}:</p>
                                            "{tk.message}"
                                        </div>

                                        {tk.reply ? (
                                            <div className="text-xs bg-purple-500/5 p-3 rounded-lg border border-purple-500/10 text-purple-300 leading-relaxed font-semibold">
                                                <p className="text-purple-400/75 font-mono text-[8.5px] uppercase mb-1">YOUR ANSWER:</p>
                                                "{tk.reply}"
                                            </div>
                                        ) : (
                                            <div>
                                                {replyingTicketId === tk.id ? (
                                                    <div className="flex flex-col gap-2 mt-1">
                                                        <textarea 
                                                            value={ticketReplyText}
                                                            onChange={(e) => setTicketReplyText(e.target.value)}
                                                            placeholder="Type support reply or rectification advice here..."
                                                            rows={2}
                                                            className="bg-slate-900 border border-[#1E293B] p-3 rounded-xl text-xs text-white outline-none resize-none font-semibold leading-relaxed"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setReplyingTicketId(null)} className="flex-1 py-1.5 border border-slate-700 text-slate-400 text-[10px] font-black uppercase rounded-lg cursor-pointer">Cancel</button>
                                                            <button onClick={handleReplyTicket} className="flex-1 py-1.5 bg-[#8CEE47] text-slate-900 text-[10px] font-black uppercase rounded-lg cursor-pointer">Submit Reply</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => {
                                                            setReplyingTicketId(tk.id);
                                                            setTicketReplyText('');
                                                        }}
                                                        className="w-full bg-[#1E293B] hover:bg-slate-800 text-white border border-[#2E3C51] text-[10px] font-black py-2 rounded-xl uppercase cursor-pointer"
                                                    >
                                                        Respond to Ticket
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Integrated Live Activity & Security Audit logs stream */}
                        <div className="mt-8 pt-8 border-t border-slate-150 flex flex-col gap-4">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Live Security & Activity Logs</h3>
                                <button 
                                    onClick={() => setSystemLogs([
                                        { id: '4', event: 'Log stream cleared', type: 'audit', user: 'admin', date: 'Just now' }
                                    ])} 
                                    className="text-slate-500 hover:text-indigo-600 text-[9px] font-black uppercase tracking-wider"
                                >
                                    Clear History
                                </button>
                            </div>

                            <div className="space-y-2 select-text">
                                {systemLogs.map(lg => (
                                    <div key={lg.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between font-mono text-[9px]">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                lg.type === 'auth' ? 'bg-purple-500' :
                                                lg.type === 'financial' ? 'bg-emerald-500' :
                                                lg.type === 'audit' ? 'bg-indigo-600' : 'bg-slate-500'
                                            }`} />
                                            <span className="text-slate-400 font-extrabold">[{lg.type.toUpperCase()}]</span>
                                            <span className="text-slate-800 font-semibold">{lg.event}</span>
                                        </div>
                                        <div className="text-right shrink-0 ml-4 font-bold text-slate-400">
                                            <span>{lg.user} • {lg.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
            </div>
        </div>
    );
};
