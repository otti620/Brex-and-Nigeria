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
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              {user.name}
              {user.isSuspended && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Fired</span>}
            </h2>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Portfolio</p>
                <p className="text-3xl font-black text-slate-900">₦{Number(user.balance || 0).toLocaleString()}</p>
              </div>
              <button 
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to ${user.isSuspended ? 'reinstate' : 'FIRE'} ${user.name}?`)) {
                    try {
                      const { doc, updateDoc } = await import('firebase/firestore');
                      await updateDoc(doc(db, 'users', user.id), {
                        isSuspended: !user.isSuspended
                      });
                      onClose(); // Close to refresh visually
                    } catch (err) {
                      alert('Failed to modify user status');
                    }
                  }
                }}
                className={`px-4 py-2 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all ${user.isSuspended ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
              >
                {user.isSuspended ? 'Reinstate User' : 'Fire User'}
              </button>
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
