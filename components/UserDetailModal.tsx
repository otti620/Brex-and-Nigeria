import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserDetailModalProps {
  user: any;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchTransactions();
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">User Activity: {user.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Portfolio</p>
                <p className="text-3xl font-black text-slate-900">₦{Number(user.balance || 0).toLocaleString()}</p>
            </div>
            
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Transaction History</h3>
            {loading ? (
                <div className="py-8 text-center"><RefreshCw className="animate-spin text-indigo-600 mx-auto" /></div>
            ) : transactions.length === 0 ? (
                <p className="text-center text-xs text-gray-400 p-8">No transaction history found.</p>
            ) : (
                <div className="space-y-2">
                    {transactions.map(t => (
                        <div key={t.id} className="bg-white border p-3 rounded-xl border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-[11px] font-bold text-slate-900">{t.details || t.type}</p>
                                <p className="text-[9px] text-gray-400 font-mono">{t.date}</p>
                            </div>
                            <p className={`text-xs font-black ${
                                t.status === 'success' ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                                {t.type === 'withdraw' ? '-' : '+'}₦{t.amount?.toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
