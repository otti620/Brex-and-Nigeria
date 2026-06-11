import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Send, ShieldAlert, Trash2 } from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, setDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserDetailModalProps {
  user: any;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Ledger adjustment states
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmt, setAdjustAmt] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Capital settlement adjustment');
  const [adjusting, setAdjusting] = useState<boolean>(false);
  const [currentBalance, setCurrentBalance] = useState<number>(Number(user.balance || 0));
  const [suspended, setSuspended] = useState<boolean>(!!user.isSuspended);

  const fetchTransactions = async () => {
    try {
      const txnsRef = collection(db, `users/${user.id}/transactions`);
      const q = query(txnsRef, orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setTransactions(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    } catch (e) {
      console.error("Failed to load user transactions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user.id]);

  const handleAdjustBalance = async () => {
    const amt = Number(adjustAmt);
    if (!amt || amt <= 0 || isNaN(amt)) {
      alert("Please specify a valid adjustment amount above 0.");
      return;
    }
    
    setAdjusting(true);
    try {
      const change = adjustType === 'credit' ? amt : -amt;
      const userRef = doc(db, 'users', user.id);
      
      await updateDoc(userRef, {
        balance: increment(change)
      });

      // Write transaction history record
      const txnId = `txn_${Date.now()}`;
      await setDoc(doc(db, `users/${user.id}/transactions/${txnId}`), {
        id: txnId,
        userId: user.id,
        amount: amt,
        type: adjustType === 'credit' ? 'bonus' : 'withdraw',
        status: 'success',
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: `${adjustReason} (Admin Adjustment)`
      });

      // Insert audit system log
      const auditId = `audit_${Date.now()}`;
      await setDoc(doc(db, `system_logs/${auditId}`), {
        id: auditId,
        type: 'financial',
        timestamp: new Date().toISOString(),
        message: `Admin manually adjusted ${user.name}'s balance by ₦${change.toLocaleString()} NGN. Reason: ${adjustReason}`
      });

      setCurrentBalance(prev => prev + change);
      setAdjustAmt('');
      alert(`Successfully ${adjustType === 'credit' ? 'credited' : 'debited'} ₦${amt.toLocaleString()} NGN to/from ${user.name}'s balance!`);
      await fetchTransactions();
    } catch (e: any) {
      alert("Ledger injection error: " + (e.message || "Failed to update database records."));
    } finally {
      setAdjusting(false);
    }
  };

  const handleToggleSuspend = async () => {
    const actionWord = suspended ? 'reinstate' : 'FIRE';
    if (!window.confirm(`Are you sure you want to ${actionWord} the account for ${user.name}?`)) {
      return;
    }
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isSuspended: !suspended
      });
      
      const auditId = `audit_${Date.now()}`;
      await setDoc(doc(db, `system_logs/${auditId}`), {
        id: auditId,
        type: 'audit',
        timestamp: new Date().toISOString(),
        message: `Admin ${suspended ? 'reinstated' : 'suspended/fired'} user profile: ${user.name} (${user.email})`
      });

      setSuspended(!suspended);
      alert(`User has been successfully ${suspended ? 'reinstated' : 'suspended/fired'}!`);
    } catch (e: any) {
      alert("Failed to modify user state: " + e.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm(`☢️ WARNING: CRITICAL OPERATION ☢️\nAre you absolutely sure you want to PERMANENTLY DELETE and PURGE ${user.name}'s account data from Firestore?\nThis action is completely irreversible!`)) {
      return;
    }
    try {
      const userRef = doc(db, 'users', user.id);
      await deleteDoc(userRef);

      const auditId = `audit_${Date.now()}`;
      await setDoc(doc(db, `system_logs/${auditId}`), {
        id: auditId,
        type: 'audit',
        timestamp: new Date().toISOString(),
        message: `Admin permanently purged registered user profile: ${user.name} (${user.email})`
      });

      alert(`Account safely deleted and purged from the secure Firestore collection!`);
      onClose();
      window.location.reload();
    } catch (e: any) {
      alert("Failure purging customer ledger: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100 text-slate-950">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-6 relative shrink-0">
          <button 
            onClick={() => {
              onClose();
              window.location.reload();
            }} 
            className="absolute right-5 top-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
          >
            <X size={16} />
          </button>
          
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black text-white uppercase border border-white/15">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                {user.name}
                {suspended ? (
                  <span className="text-[9px] bg-red-650 text-red-100 border border-red-500 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Fired / Suspended</span>
                ) : (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Active Portfolio</span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
              <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">Telephone Profile: {user.phoneNumber || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50">
          
          {/* Main stats card */}
          <div className="grid grid-cols-2 gap-4 bg-white border border-slate-200/80 p-5 rounded-[24px] shadow-sm">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Wallet Balance (NGN)</p>
              <p className="text-2.5xl font-black text-slate-900 font-mono mt-1">₦{currentBalance.toLocaleString()}</p>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <p className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Invitation Code</p>
              <p className="text-2.5xl font-mono font-black text-indigo-600 mt-1">{user.invitationCode || 'N/A'}</p>
            </div>
          </div>

          {/* Balance adjustment control tool */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-[28px] space-y-4 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              ⚡ Action Ledger (Credit / Debit Balance)
            </h3>
            
            {/* Toggle credit or debit */}
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setAdjustType('credit')}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                  adjustType === 'credit' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-extrabold shadow-sm' 
                    : 'bg-transparent border-slate-200 text-slate-400'
                }`}
              >
                📥 Credit Wallet
              </button>
              <button 
                type="button"
                onClick={() => setAdjustType('debit')}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                  adjustType === 'debit' 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 font-extrabold shadow-sm' 
                    : 'bg-transparent border-slate-200 text-slate-400'
                }`}
              >
                📤 Debit Wallet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-450 uppercase font-mono tracking-wider">Adjustment Amount (₦)</label>
                <input 
                  type="number"
                  value={adjustAmt}
                  onChange={(e) => setAdjustAmt(e.target.value)}
                  placeholder="e.g. 10000"
                  className="bg-slate-50 border border-slate-200 focus:border-indigo-500 px-4 py-2.5 rounded-xl text-slate-900 font-mono text-xs outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-450 uppercase font-mono tracking-wider font-mono">Adjustment Narration / Reason</label>
                <input 
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="bg-slate-50 border border-slate-200 focus:border-indigo-500 px-4 py-2.5 rounded-xl text-slate-900 text-xs font-bold outline-none transition-colors"
                />
              </div>
            </div>

            <button 
              type="button"
              onClick={handleAdjustBalance}
              disabled={adjusting}
              className={`w-full text-white font-mono font-black py-3 px-4 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all ${
                adjustType === 'credit' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-650/10' 
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-650/10'
              }`}
            >
              <Send size={13} />
              {adjusting ? 'Committing Block Ledger...' : `Confirm ${adjustType === 'credit' ? 'Credit' : 'Debit'} Adjustment`}
            </button>
          </div>

          {/* Transactions list */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
              📋 Verified Ledger Transactions Flow
            </h3>
            
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="animate-spin text-indigo-600 mx-auto" />
                <p className="text-[10px] text-slate-400 font-mono font-black uppercase mt-2">Iterating account ledger snapshots...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-white border border-slate-200 text-slate-400 text-center text-xs p-8 rounded-2xl italic font-semibold">
                No verified transaction history logs found on this account.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {transactions.map(t => {
                  const isPositive = ['recharge', 'bonus', 'claim', 'credit'].includes(String(t.type).toLowerCase()) || !!t.details?.includes('Adjustment') && !t.details?.includes('Debit');
                  return (
                    <div key={t.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-none hover:border-slate-350 transition-colors">
                      <div>
                        <p className="text-xs font-black text-slate-800">{t.details || t.type}</p>
                        <p className="text-[8px] text-slate-400 font-mono mt-0.5 uppercase font-black tracking-wider">{t.date} • TYPE: {t.type || 'TXN'} • STATUS: {t.status || 'PENDING'}</p>
                      </div>
                      <p className={`text-xs font-black font-mono leading-none ${
                        isPositive ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {isPositive ? '+' : '-'}₦{Number(t.amount || 0).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Firing / Deleting Administration Panel */}
          <div className="bg-rose-50 border border-rose-100 rounded-[24px] p-5 space-y-3 shrink-0">
            <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <ShieldAlert size={14} /> DANGER AREA (Account Security Audit Intervention)
            </h4>
            <p className="text-[10px] text-rose-700/80 leading-relaxed font-bold">
              These tools allow you to temporarily fire (suspend) or permanently purge accounts. Suspended accounts are immediately blocked from logging in or claiming automated asset interest payouts.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
              <button 
                type="button"
                onClick={handleToggleSuspend}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  suspended 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                👤 {suspended ? 'Reactivate & Unblock User' : 'Fire / Suspend User'}
              </button>
              
              <button 
                type="button"
                onClick={handleDeleteUser}
                className="flex-1 bg-red-650 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={13} /> Delete Account permanently
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
