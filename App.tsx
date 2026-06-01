import React, { useState, useEffect, useRef } from 'react';
import { Screen, UserState } from './types';
import Layout from './components/Layout';
import Memoji from './components/Memoji';
import { Button, Input, Card } from './components/UI';
import { useFirebase } from './components/FirebaseProvider';
import { AdminPanel } from './components/AdminPanel';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Tooltip, 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Users,
  Wallet,
  Coins,
  ChevronRight,
  AlertCircle,
  Copy,
  Plus,
  RefreshCw,
  Gift,
  Building2,
  Lock,
  UserCheck,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';

const CLIENT_DEFAULT_VIP_PLANS = [
  { id: 'vip-1', name: 'Seed Capital', period: '365 Days', workingDays: 0, cost: 3000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 1, avatar: '🌱', dailyProfit: 150 },
  { id: 'vip-2', name: 'Wealth Builder', period: '365 Days', workingDays: 0, cost: 15000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 2, avatar: '📈', dailyProfit: 900 },
  { id: 'vip-3', name: 'Revenue Stream', period: '365 Days', workingDays: 0, cost: 50000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 3, avatar: '💧', dailyProfit: 3500 },
  { id: 'vip-4', name: 'Asset Reserve', period: '365 Days', workingDays: 0, cost: 150000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 4, avatar: '🏦', dailyProfit: 12000 },
  { id: 'vip-5', name: 'Capital Fortress', period: '365 Days', workingDays: 0, cost: 300000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 5, avatar: '🏰', dailyProfit: 27000 },
  { id: 'vip-6', name: 'Executive Portfolio', period: '365 Days', workingDays: 0, cost: 500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 6, avatar: '💼', dailyProfit: 50000 },
  { id: 'vip-7', name: 'Royal Sovereign', period: '365 Days', workingDays: 0, cost: 1000000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 7, avatar: '👑', dailyProfit: 110000 },
  { id: 'vip-8', name: 'Diamond Infinity', period: '365 Days', workingDays: 0, cost: 2500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 8, avatar: '💎', dailyProfit: 300000 }
];

const App: React.FC = () => {
  const { 
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
    refreshProfile 
  } = useFirebase();

  const isSpecificAdmin = userData?.isAdmin;
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    const paymentSuccess = params.get('payment') === 'success';

    if (reference || paymentSuccess) {
      const verifyPaymentReference = async (ref: string) => {
        // Small timeout to allow Toast and component state initialization
        await new Promise(resolve => setTimeout(resolve, 800));
        showToast("Verifying payment with Paystack secure server...");
        try {
          const response = await fetch("/api/payments/paystack/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reference: ref })
          });
          const textRes = await response.text();
          let data;
          try {
            data = JSON.parse(textRes);
          } catch(e) {
            console.error("Non-JSON verify response:", textRes);
            showToast("Server returned invalid response. Checking backend...");
            return;
          }

          if (response.ok && data?.success) {
            showToast(data.message || "Payment verified and credited!");
            // Refresh user profile so the UI instantly updates the balance
            refreshProfile();
          } else {
            showToast(data?.error || "We're verifying your payment. Your balance will sync shortly.");
          }
        } catch (err) {
          console.error("Verification error:", err);
          showToast("Network is busy. Our webhook will automatically credit your deposit.");
        }
      };

      if (reference) {
        verifyPaymentReference(reference);
      } else if (paymentSuccess) {
        setTimeout(() => {
          showToast("Payment processed! Your balance will update momentarily.");
          refreshProfile();
        }, 800);
      }

      // Clear the query params from browser address bar as UX and security best practice
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Custom alerts/toast system
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Auth);
  const [selectedIntent, setSelectedIntent] = useState<string>('safe');
  
  // Auth states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('3861');
  const [agreePrivacy, setAgreePrivacy] = useState(true);
  const [authError, setAuthError] = useState('');

  // Re-generate Verification / Captcha Code code
  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Fund screen states
  const [fundTab, setFundTab] = useState<'recharge' | 'withdrawal'>('recharge');
  
  // Check daily processing window: 9 AM - 2 PM WAT Monday-Saturday (Excluding Sunday)
  const checkWithdrawalAvailability = () => {
    const now = new Date();
    // Calculate current WAT time based on offset
    const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
    const watDate = new Date(utcTimestamp + 3600000);
    
    const watDay = watDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const watHour = watDate.getHours(); // Hour 0-23
    
    const isSunday = watDay === 0;
    const isWithinHours = watHour >= 9 && watHour < 14;
    
    return {
      watDay,
      watHour,
      isSunday,
      isWithinHours,
      canWithdraw: !isSunday && isWithinHours
    };
  };

  const triggerPaystackCheckout = async () => {
    if (rechargeAmt < 1000) {
      showToast("Minimum deposit is ₦1,000 NGN");
      return;
    }
    
    try {
      showToast("Initiating secure payment...");
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData?.email || `${userData?.phoneNumber?.replace(/\s+/g, '')}@seedstreet.internal`,
          amount: rechargeAmt,
          first_name: userData?.name?.split(' ')[0] || '',
          last_name: userData?.name?.split(' ').slice(1).join(' ') || '',
          metadata: {
            userId: userData?.id,
            custom_fields: [
              { display_name: "User Name", variable_name: "user_name", value: userData?.name || "Unknown" },
              { display_name: "User ID", variable_name: "user_id", value: userData?.id || "Unknown" }
            ]
          }
        })
      });
      
      let data;
      try {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch (e) {
          console.error("Non-JSON Response from Server:", textResponse);
          showToast("Payment server error. Please try again.");
          return;
        }
      } catch (e) {
        showToast("Network error reading response");
        return;
      }

      if (response.ok && data?.authorization_url) {
        // Clear local state and redirect to Paystack
        window.location.href = data.authorization_url;
      } else {
        showToast(data?.error || "Failed to initialize payment gateway");
      }
    } catch (e: any) {
      showToast("Payment service unreachable: " + (e.message || "Network error"));
    }
  };

  // Recharge states
  const [rechargeAmt, setRechargeAmt] = useState<number>(10000);
  const [selectedGateway, setSelectedGateway] = useState<string>('Hpay');
  const [rechargeStep, setRechargeStep] = useState<'input' | 'payment_instructions' | 'confirming' | 'success'>('input');
  const [rechargeSenderName, setRechargeSenderName] = useState('');
  const [rechargeTimer, setRechargeTimer] = useState(600); // 10 minutes in seconds

  // Handle timer countdown during active transfer screen
  useEffect(() => {
    if (rechargeStep === 'payment_instructions' && rechargeTimer > 0) {
      const interval = setInterval(() => {
        setRechargeTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [rechargeStep, rechargeTimer]);

  const formatTimer = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Withdrawal fields
  const [withdrawAmt, setWithdrawAmt] = useState<number>(1000);
  const [payeeAccount, setPayeeAccount] = useState<string>('');
  const [withdrawBank, setWithdrawBank] = useState<string>('OPay');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string>('');
  const [withdrawErrorMsg, setWithdrawErrorMsg] = useState<string>('');
  
  // Receipt Generator state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Set default account based on Bank settings
  useEffect(() => {
    if (userData?.linkedBankCode) {
      setPayeeAccount(userData.linkedBankCode);
      setWithdrawBank(userData.linkedBankName || 'OPay');
    }
  }, [userData?.linkedBankCode, userData?.linkedBankName]);

  // Referral Program States
  const [activeTeamLevel, setActiveTeamLevel] = useState<number>(1);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Derived Traditional Financial VIP Pools directly from session profile
  const investmentPlans = userData?.investments || CLIENT_DEFAULT_VIP_PLANS;

  // Yield accrual running logs modal states
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [yieldPlanActive, setYieldPlanActive] = useState<any>(null);
  const [yieldProgress, setYieldProgress] = useState(0);
  const [yieldLog, setYieldLog] = useState<string[]>([]);
  const [plansCompletedToday, setPlansCompletedToday] = useState<string[]>([]);

  // AI Advisor State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Profile Overlay States
  const [activeProfileOverlay, setActiveProfileOverlay] = useState<'personal' | 'security' | 'bank' | 'referral' | null>(null);

  // Profile overlay forms
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editMemoji, setEditMemoji] = useState<'Neutral' | 'Happy' | 'Focused' | 'Celebration' | 'Concerned'>('Neutral');

  const [bankSettingsName, setBankSettingsName] = useState('OPay');
  const [bankSettingsAccount, setBankSettingsAccount] = useState('');
  const [bankSettingsOwner, setBankSettingsOwner] = useState('');

  const [bankSettingsTab, setBankSettingsTab] = useState<'account' | 'card'>('account');
  const [linkedCardNumber, setLinkedCardNumber] = useState('');
  const [linkedCardExpiry, setLinkedCardExpiry] = useState('');
  const [linkedCardCvv, setLinkedCardCvv] = useState('');

  const [securityNewPass, setSecurityNewPass] = useState('');
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [hasShownNoticeThisSession, setHasShownNoticeThisSession] = useState(false);
  const [hasShownTelegramThisSession, setHasShownTelegramThisSession] = useState(false);

  // Side-effect mapping user state correctly to profiles forms
  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setEditEmail(userData.email || '');
      setEditPhone(userData.phoneNumber || '');
      setEditMemoji(userData.memojiState || 'Neutral');
      setBankSettingsName(userData.linkedBankName || 'OPay');
      setBankSettingsAccount(userData.linkedBankCode || '');
      setBankSettingsOwner(userData.linkedBankOwner || '');
      setBankSettingsTab(userData.linkedCardNumber ? 'card' : 'account');
      setLinkedCardNumber(userData.linkedCardNumber || '');
      setLinkedCardExpiry(userData.linkedCardExpiry || '');
      setLinkedCardCvv(userData.linkedCardCvv || '');
    }
  }, [userData]);

  // Load team data when referral tree is active
  useEffect(() => {
    if (activeProfileOverlay === 'referral_tree' && userData) {
      let isMounted = true;
      const fetchTeam = async () => {
        const data = await loadTeamData();
        if (isMounted && data && data.members) {
          setTeamMembers(data.members);
        }
      };
      
      fetchTeam();
      const interval = setInterval(fetchTeam, 15000); // 15s polling for team tree
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [activeProfileOverlay, userData?.uid]);

  // Load broadcasts for the dashboard banner (Real-time)
  useEffect(() => {
    if (userData) {
      const fetchAnnouncements = async () => {
        try {
          const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore');
          const { db } = await import('./lib/firebase');
          const broadcastsRef = collection(db, 'broadcasts');
          const q = query(broadcastsRef, orderBy('date', 'desc'));
          
          const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setBroadcasts(data);
            
            // Auto-show notice modal if there are broadcasts and we haven't shown it this session
            if (data.length > 0 && !hasShownNoticeThisSession) {
              setShowNoticeModal(true);
              setHasShownNoticeThisSession(true);
            } else if (!hasShownTelegramThisSession && data.length === 0) {
              // If no notices, show telegram prompt instead
              setShowTelegramModal(true);
              setHasShownTelegramThisSession(true);
            }
          });
          
          return unsub;
        } catch(e) {
          console.log("No broadcasts stream loaded", e);
        }
      };
      const unsubPromise = fetchAnnouncements();
      return () => {
        unsubPromise.then(unsub => unsub && unsub());
      };
    }
  }, [userData?.uid]);

  // Direct redirection to dashboard on sessions found
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (userData) {
          if (currentScreen === Screen.Auth) {
            if (userData?.isAdmin) {
              setCurrentScreen(Screen.Admin);
            } else {
              setCurrentScreen(Screen.Dashboard);
            }
          }
        }
      } else {
        setCurrentScreen(Screen.Auth);
      }
    }
  }, [user, userData, loading, currentScreen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const navigate = (screen: Screen) => setCurrentScreen(screen);

  const refreshTeamData = async () => {
    try {
      const sessionId = localStorage.getItem('brex_session_id');
      if (!sessionId) return;
      const team = await loadTeamData();
      if (team && team.members) {
        setTeamMembers(team.members);
      }
    } catch (err) {
      console.error("Failed to load real-time referral team logs:", err);
    }
  };

  useEffect(() => {
    if (userData?.isLoggedIn) {
      refreshTeamData();
    }
  }, [userData?.isLoggedIn, currentScreen]);

  // Native login REST handling
  const handleNativeLogin = async () => {
    const entered = phoneNumber.trim();
    if (entered.length < 8) {
      setAuthError('Please enter a valid mobile number or email address');
      return;
    }
    if (!password.trim()) {
      setAuthError('Please enter your password credentials');
      return;
    }

    try {
      setAuthError('');
      await login(entered, password);
      // Removed dependent loggedProfile name since it returns void now
      setPhoneNumber('');
      setPassword('');
      navigate(Screen.Dashboard);
      showToast('Welcome back! Account loaded.');
    } catch (err: any) {
      setAuthError(err.message || 'Login credentials mismatch. Please try again.');
    }
  };

  // Register REST handling
  const handleNativeRegister = async () => {
    const enteredPhone = phoneNumber.trim();
    if (enteredPhone.length < 8) {
      setAuthError('Please enter a valid mobile number');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    try {
      setAuthError('');
      const payload = {
        name: userName.trim() || 'Brex Member',
        phoneNumber: enteredPhone,
        password: password,
        invitationCode: invitationCode || '16662861',
        selectedIntent: 'safe'
      };
      await register(payload);
      
      setAuthError('');
      setAuthMode('login');
      showToast('Registration successful! Your investment account is initialized.');
      navigate(Screen.Dashboard);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to complete registration records.');
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate(Screen.Auth);
    showToast('Session logged out successfully.');
  };

  const callAIAdvisor = async (message: string) => {
    if (!message.trim()) return;
    const userMsg = { role: 'user' as const, text: message };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          selectedIntent: userData?.selectedIntent || 'safe'
        })
      });
      const data = await response.json();
      if (response.ok) {
        setChatMessages(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'model', text: data.error || "I'm having a connection glitch. Let me try again!" }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Connection error. Ensure server is online or try in a moment." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Fund screen manual recharge instant credit
  const handleFundSubmit = () => {
    if (rechargeAmt < 1000) {
      alert('Minimum instant recharge is ₦1,000');
      return;
    }
    if (!rechargeSenderName.trim()) {
      alert('Sender legal account name is required');
      return;
    }
    
    setRechargeStep('payment_instructions');
    setRechargeTimer(600);
  };

  const handleConfirmTransferComplete = async () => {
    setRechargeStep('confirming');
    
    setTimeout(async () => {
      try {
        await recharge(rechargeAmt, rechargeSenderName);
        setRechargeStep('success');
        showToast(`₦${rechargeAmt.toLocaleString()} Deposit verified and settled!`);
      } catch (err: any) {
        alert(err.message || "Failed to settle recharge. Try again.");
        setRechargeStep('input');
      }
    }, 4000);
  };

  // Withdrawal validation REST submit
  const handleWithdrawSubmit = async () => {
    // 1. Time check restriction: Daily 9am - 2pm WAT (UTC+1), excluding Sunday
    const { canWithdraw, isSunday } = checkWithdrawalAvailability();
    if (!canWithdraw) {
      setWithdrawErrorMsg(isSunday 
        ? "Withdrawals are closed on Sundays. Standard payouts take place from Monday to Saturday." 
        : "Standard settlements are only open between 9:00 AM and 2:00 PM WAT daily."
      );
      return;
    }

    const activeBank = userData?.linkedBankName || withdrawBank;
    const activeAccount = userData?.linkedBankCode || payeeAccount;
    const activeOwner = userData?.linkedBankOwner || userData?.name || "Verified Holder";

    if (withdrawAmt < 1000) {
      setWithdrawErrorMsg('Minimum payout threshold is ₦1,000');
      return;
    }
    if (!userData || withdrawAmt > userData.balance) {
      setWithdrawErrorMsg('Insufficient account balance');
      return;
    }
    if (!activeAccount || activeAccount.trim().length !== 10) {
      setWithdrawErrorMsg('Recipient account must be exactly a 10-digit NUBAN number/card link');
      return;
    }

    setWithdrawErrorMsg('');
    try {
      await withdraw(withdrawAmt, activeBank, activeAccount, activeOwner);
      
      const expectedPayout = withdrawAmt * 0.98;
      const receipt = {
        amount: withdrawAmt,
        netAmount: expectedPayout,
        bank: activeBank,
        account: activeAccount,
        date: new Date().toLocaleString(),
        ref: `BRX-${Math.floor(100000 + Math.random() * 900000)}`
      };
      
      setReceiptData(receipt);
      setShowReceipt(true);
      
      setWithdrawSuccessMsg(`Request settled! Beneficiary: ${activeOwner}. Net expected: ₦${expectedPayout.toLocaleString()}`);
      showToast(`Payout of ₦${withdrawAmt.toLocaleString()} dispatched successfully.`);
      setTimeout(() => {
        setWithdrawSuccessMsg('');
      }, 5000);
    } catch (err: any) {
      setWithdrawErrorMsg(err.message || "Payout rejected. Contact system administrator.");
    }
  };

  // Subscribe / Invest in yield plans
  const handleSubscribeInvestmentPlan = async (planId: string, cost: number) => {
    if (!userData || userData.balance < cost) {
      showToast(`Insufficient balance. You need at least ₦${cost.toLocaleString()} to activate this pool.`);
      navigate(Screen.Fund);
      setFundTab('recharge');
      setRechargeStep('input');
      return;
    }

    try {
      await subscribeToPlan(planId);
      showToast(`Successfully joined plan! Daily yield starts immediately.`);
    } catch (err: any) {
      showToast(err.message || "Subscription failed. Try again.");
    }
  };

  // Claim Daily Earnings
  const claimDailyEarnings = async (plan: any) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (plan.lastClaimedDate === todayStr) {
      showToast("This plan yield has already been claimed for today.");
      return;
    }

    try {
      await accrueYield(plan.id);
      showToast(`Earned +₦${plan.dailyProfit.toLocaleString()} daily profit!`);
    } catch (err: any) {
      showToast(err.message || "Failed to claim daily profit. Try again.");
    }
  };

  // Profile overrides updates confirmations
  const handleSavePersonalInfo = async () => {
    try {
      await updateUser({
        name: editName,
        phoneNumber: editPhone,
        memojiState: editMemoji
      });
      setActiveProfileOverlay(null);
      showToast('Personal details updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Details update failed');
    }
  };

  const handleSaveBankDetails = async () => {
    if (bankSettingsTab === 'account') {
      if (bankSettingsAccount.length !== 10) {
        showToast('Linked bank account must be a 10-digit NUBAN number');
        return;
      }
      try {
        await updateBank({
          linkedBankName: bankSettingsName,
          linkedBankCode: bankSettingsAccount,
          linkedBankOwner: bankSettingsOwner.toUpperCase(),
          linkedCardNumber: '',
          linkedCardExpiry: '',
          linkedCardCvv: ''
        });
        setActiveProfileOverlay(null);
        showToast('Bank details saved successfully!');
      } catch (err: any) {
        showToast(err.message || 'Details update failed');
      }
    } else {
      // ATM Card setup
      if (linkedCardNumber.replace(/\s/g, '').length < 16) {
        showToast('Please enter a valid 16-digit ATM card number');
        return;
      }
      if (!linkedCardExpiry || linkedCardCvv.length < 3) {
        showToast('Please enter complete expiry (MM/YY) and CVV codes');
        return;
      }
      try {
        await updateBank({
          linkedBankName: 'ATM Bank Card',
          linkedBankCode: linkedCardNumber.replace(/\s/g, ''),
          linkedBankOwner: (userData.name || 'HPay Member').toUpperCase(),
          linkedCardNumber: linkedCardNumber.replace(/\s/g, ''),
          linkedCardExpiry: linkedCardExpiry,
          linkedCardCvv: linkedCardCvv
        });
        setActiveProfileOverlay(null);
        showToast('Secure withdrawal bank card linked successfully!');
      } catch (err: any) {
        showToast(err.message || 'Details update failed');
      }
    }
  };

  const handleSaveSecurity = async () => {
    if (!securityNewPass) {
      showToast('Please enter a new password.');
      return;
    }
    try {
      if (securityNewPass) {
        await updateSecurity(securityNewPass);
      }
      setActiveProfileOverlay(null);
      setSecurityNewPass('');
      showToast('Login security password updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Security details update failed');
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const renderAuth = () => {
    return (
      <div className="h-full bg-white flex flex-col min-h-screen">
        {/* Header Section */}
        <div className="pt-12 pb-16 px-8 relative bg-blue-600">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => {
                if (authMode === 'register') {
                  setAuthMode('login');
                }
              }}
              className="p-1"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <h1 className="flex-1 text-center text-lg font-black text-white -ml-8 uppercase tracking-widest">
              {authMode === 'login' ? 'Login' : 'Register'}
            </h1>
          </div>

          <div className="mb-0">
            <h2 className="text-4xl font-black text-white mb-2 tracking-tighter italic">BREX</h2>
            <p className="text-white/80 text-sm font-bold uppercase tracking-tight">
              {authMode === 'login' 
                ? 'Sign in to your account' 
                : 'Create your savings account'}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 bg-white rounded-t-[40px] -mt-10 px-8 pt-12 pb-12 shadow-2xl z-10">
          <div className="flex flex-col gap-6 max-w-sm mx-auto">
            
            {/* User Name Field (Register Mode) */}
            {authMode === 'register' && (
              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                  <input 
                    type="text"
                    placeholder="Enter your full name" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-transparent flex-1 px-5 py-4 text-sm font-black outline-none placeholder:text-slate-300 text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Phone Field */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                <input 
                  type="tel"
                  placeholder={authMode === 'login' ? "Phone number" : "e.g. 07077599057"} 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-transparent flex-1 px-5 py-4 text-sm font-black outline-none placeholder:text-slate-300 text-slate-900"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-100 transition-all items-center pr-4">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent flex-1 px-5 py-4 text-sm font-black outline-none placeholder:text-slate-300 text-slate-900"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <>
                {/* Confirm Password Field */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                    <input 
                      type="password"
                      placeholder="Repeat your password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-transparent flex-1 px-5 py-4 text-sm font-black outline-none placeholder:text-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                {/* Invitation Field */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invitation Code (Optional)</label>
                  <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                    <input 
                      type="text"
                      placeholder="Invitation code" 
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      className="bg-transparent flex-1 px-5 py-4 text-sm font-black outline-none placeholder:text-slate-300 text-slate-900"
                    />
                  </div>
                </div>
              </>
            )}

            {authMode === 'login' && (
              <div className="flex items-center gap-2.5 mt-1">
                <div 
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-slate-200'}`}
                >
                   {rememberMe && <Check size={14} className="text-white" />}
                </div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Remember me</span>
              </div>
            )}

            {authError && <p className="text-rose-500 text-[10px] font-black text-center animate-bounce uppercase tracking-widest">{authError}</p>}

            <button 
              onClick={authMode === 'login' ? handleNativeLogin : handleNativeRegister} 
              className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-blue-600/20 active:scale-[0.95] transition-all mt-4 uppercase tracking-[0.2em] text-xs"
            >
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>

            {authMode === 'login' ? (
              <p className="text-center text-[10px] font-black text-slate-400 mt-6 uppercase tracking-widest">
                Don't have an account? <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-blue-600 ml-1">Register</button>
              </p>
            ) : (
              <p className="text-center text-[10px] font-black text-slate-400 mt-6 uppercase tracking-widest">
                Already have an account? <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-blue-600 ml-1">Login</button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    if (!userData) return null;
    
    const chartData = [
      { name: 'Mon', value: userData.balance - 25000 },
      { name: 'Tue', value: userData.balance - 17000 },
      { name: 'Wed', value: userData.balance - 8000 },
      { name: 'Thu', value: userData.balance - 3000 },
      { name: 'Fri', value: userData.balance },
    ];

    const currentNotice = broadcasts && broadcasts.length > 0 ? broadcasts[0] : null;

    return (
      <div className="px-5 pt-8 pb-14 flex flex-col gap-6 bg-[#f8f8f8] min-h-screen">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic text-white text-lg shadow-lg shadow-blue-600/20">
              B
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-black m-0 tracking-widest italic">BREX</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">Account Active</span>
              </div>
            </div>
          </div>
          <div onClick={() => navigate(Screen.Profile)} className="cursor-pointer active:scale-95 transition-transform ring-4 ring-gray-100 rounded-2xl p-0.5 bg-white shadow-sm">
            <Memoji state={userData.memojiState} size="sm" />
          </div>
        </div>

        {/* Improved Broadcast banner - triggers Modal */}
        {currentNotice && (
          <div 
            onClick={() => setShowNoticeModal(true)}
            className="bg-white border border-gray-100 p-4 rounded-2xl flex flex-col gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="font-black font-mono text-[8px] uppercase tracking-wider text-[#ff9c00] flex items-center gap-1">
                <AlertCircle size={10} /> Official Announcement
              </span>
              <span className="text-[8px] font-bold text-gray-400 font-mono">{currentNotice.date}</span>
            </div>
            <p className="text-black font-black text-[11px] truncate group-hover:text-[#ff9c00] transition-colors">{currentNotice.title}</p>
            <div className="flex items-center justify-between mt-0.5">
               <p className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">Tap to read details</p>
               <ChevronRight size={12} className="text-gray-300" />
            </div>
          </div>
        )}



        {/* Balance block */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[32px] p-6 relative overflow-hidden shadow-xl shadow-indigo-600/20">
          <p className="text-black/60 text-[10px] font-bold tracking-widest uppercase mb-1 font-mono">Available Balance</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-black text-black font-mono">₦{userData.balance.toLocaleString()}</span>
            <div className="flex items-center gap-0.5 text-[9px] bg-white/30 text-black px-2 py-0.5 rounded-full font-bold">
              <TrendingUp size={10} /> +14.5% Daily Interest
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <button 
              onClick={() => {
                setFundTab('recharge');
                setRechargeStep('input');
                navigate(Screen.Fund);
              }}
              className="bg-black text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-900 transition-all cursor-pointer outline-none shadow-lg "
            >
              <Coins size={14} /> Recharge
            </button>
            <button 
              onClick={() => {
                setFundTab('withdrawal');
                navigate(Screen.Fund);
              }}
              className="bg-white/20 hover:bg-white/30 text-black border border-black/10 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none"
            >
              <Wallet size={14} /> Withdraw
            </button>
          </div>
        </div>

        {/* Balance Trend Line */}
        <div className="h-28 w-full -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ borderRadius: '16px', backgroundColor: '#131926', border: '1px solid #1E293B', color: 'white', fontSize: '10px', fontWeight: 'bold' }} 
              />
              <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#balanceGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Floating AI Assistant block */}
        <div 
          onClick={() => navigate(Screen.AIAdvisor)}
          className="p-4 bg-gradient-to-r from-slate-900 to-[#131926] border border-[#1E293B] rounded-3xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff9c00]/10 rounded-full blur-xl" />
          <div className="flex items-center gap-3 relative z-10 font-semibold">
              <div className="w-10 h-10 bg-[#ff9c00]/10 border border-[#ff9c00]/20 rounded-xl flex items-center justify-center text-xl shadow-md">🤖</div>
              <div>
                  <p className="text-white font-black text-xs">AI Advisor</p>
                  <p className="text-slate-400 text-[10px] font-medium italic">"How can I maximize my daily savings profit?"</p>
              </div>
          </div>
          <div className="w-7 h-7 bg-black/5 rounded-full flex items-center justify-center text-black relative z-10 group-hover:bg-[#ff9c00] group-hover:text-black transition-all">
            <ArrowUpRight size={14} />
          </div>
        </div>

        {/* Performance metrics gains */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 p-4.5 rounded-[24px]">
            <div className="flex items-center gap-2 mb-1.5 text-[#ff9c00]">
              <Zap size={13} />
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-mono">Total Earnings</p>
            </div>
            <p className="text-[17px] font-black text-[#ff9c00] font-mono">₦{userData.monthlyGains.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 p-4.5 rounded-[24px]">
            <div className="flex items-center gap-2 mb-1.5 text-black">
              <ShieldCheck size={13} className="text-gray-400" />
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-mono">Account Status</p>
            </div>
            <p className="text-sm font-black text-black tracking-tight mt-0.5">
              {userData.balance > 0 ? 'Active Account' : `New Account`}
            </p>
          </div>
        </div>

        {/* Advisor Insight */}
        <div className="bg-white border border-gray-200 rounded-[24px] p-5 font-semibold text-xs leading-relaxed">
          <div className="flex items-center gap-2 mb-2 text-black">
            <ShieldCheck size={16} className="text-[#ff9c00]" />
            <h4 className="text-black font-extrabold text-[13px] tracking-tight">Trust & Security</h4>
          </div>
          <p className="text-gray-500 font-medium">
            Your accounts and savings are fully secured. Earnings are calculated and added daily in real-time.
          </p>
        </div>
      </div>
    );
  };

  const renderMarket = () => {
    return (
      <div className="px-5 pt-8 pb-10 flex flex-col gap-5 bg-[#f8f8f8] min-h-screen">
        
        {/* Title */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Market Plans</h2>
            <p className="text-slate-500 text-xs font-bold leading-none mt-1">View available savings plans</p>
          </div>
          <div className="bg-blue-600/10 text-blue-600 p-1.5 rounded-xl border border-blue-600/20 flex items-center justify-center text-[10px] font-black font-mono px-3">
            ACTIVE DEPOSITS
          </div>
        </div>

        {/* Explain info */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs text-slate-500 font-semibold leading-relaxed shadow-sm">
          💡 <span className="text-slate-900 font-bold">Plan Rule:</span> Active savings plans let you claim your earnings daily. You can claim once per day to add your profit directly to your balance.
        </div>

        {/* Interactive VIP Tier Progression Slider */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl mb-2 shadow-sm">
            <h3 className="text-slate-900 font-black text-xs mb-1">Profit Calculator</h3>
            <p className="text-slate-500 font-mono text-[9px] mb-4 font-bold">Drag slider to preview yield potential</p>
            <div className="flex flex-col gap-3">
              <input type="range" min="1" max="8" defaultValue="3" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" onChange={(e) => {
                const el = document.getElementById('vip-tier-preview');
                const val = parseInt(e.target.value);
                const plan = (userData?.investments || CLIENT_DEFAULT_VIP_PLANS)[val-1];
                if (el) {
                  el.innerHTML = `
                    <div class="flex flex-col gap-2 scale-in">
                      <div class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div>
                          <p class="text-[9px] font-black text-slate-500 uppercase font-mono mb-1">Daily Profit</p>
                          <p class="text-xl font-black text-blue-600 font-mono">₦${plan.dailyProfit.toLocaleString()}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-[9px] font-black text-slate-500 uppercase font-mono mb-1">Activation</p>
                          <p class="text-sm font-black text-slate-900 font-mono">₦${plan.cost.toLocaleString()}</p>
                        </div>
                      </div>
                      <div class="bg-emerald-600 p-4 rounded-2xl border border-emerald-500 shadow-lg shadow-emerald-600/10 flex justify-between items-center">
                        <p class="text-[10px] font-black text-white/80 uppercase tracking-widest font-mono">365-Day Revenue</p>
                        <p class="text-lg font-black text-white font-mono italic">₦${(plan.dailyProfit * 365).toLocaleString()}</p>
                      </div>
                    </div>
                  `;
                }
              }} />
              <div id="vip-tier-preview" className="mt-2">
                 <div className="flex flex-col gap-2">
                   <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase font-mono mb-1">Daily Profit</p>
                        <p className="text-xl font-black text-blue-600 font-mono">₦{(userData?.investments || CLIENT_DEFAULT_VIP_PLANS)[2].dailyProfit.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase font-mono mb-1">Activation</p>
                        <p className="text-sm font-black text-slate-900 font-mono">₦{(userData?.investments || CLIENT_DEFAULT_VIP_PLANS)[2].cost.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-emerald-600 p-4 rounded-2xl border border-emerald-500 shadow-lg shadow-emerald-600/10 flex justify-between items-center">
                      <p className="text-[10px] font-black text-white/80 uppercase tracking-widest font-mono">365-Day Revenue</p>
                      <p className="text-lg font-black text-white font-mono italic">₦{((userData?.investments || CLIENT_DEFAULT_VIP_PLANS)[2].dailyProfit * 365).toLocaleString()}</p>
                    </div>
                 </div>
              </div>
            </div>
        </div>

        {/* Investment Plans Grid */}
        <div className="flex flex-col gap-4">
          {(userData?.investments || CLIENT_DEFAULT_VIP_PLANS).map((plan: any) => {
            const isJoined = plan.joined;
            const isClaimable = isJoined && plan.lastClaimedDate !== new Date().toISOString().slice(0, 10);

            return (
              <div key={plan.id} className="bg-white border border-slate-200 p-5 rounded-[32px] shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                    {plan.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-slate-900 font-black text-sm">{plan.name}</h4>
                      {isJoined && <span className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase font-mono animate-pulse">Running</span>}
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider font-mono mt-0.5">Cycle: {plan.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase font-mono mb-1">Project Cost</p>
                    <div className="bg-rose-600 text-white px-4 py-1.5 rounded-xl text-[12px] font-black font-mono shadow-lg shadow-rose-600/20 active:scale-105 transition-transform">
                       ₦{plan.cost.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-emerald-50/50 border border-emerald-100 px-4 py-3 rounded-2xl text-center">
                    <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5 font-mono">Total Annual Revenue</p>
                    <p className="text-[15px] font-black text-emerald-700 font-mono tracking-tighter">₦{(plan.dailyProfit * 365).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100 px-4 py-3 rounded-2xl text-center">
                    <p className="text-[8px] text-blue-600 font-bold uppercase tracking-widest mb-0.5 font-mono">Daily Yield</p>
                    <p className="text-[15px] font-black text-blue-700 font-mono tracking-tighter">₦{plan.dailyProfit.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex gap-2.5">
                  {isJoined ? (
                    <button 
                      onClick={() => claimDailyEarnings(plan)}
                      disabled={!isClaimable}
                      className={`flex-[2] text-[9px] font-black uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 outline-none ${
                        !isClaimable 
                          ? 'bg-slate-100 text-slate-400 border border-transparent cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                      }`}
                    >
                      <Zap size={10} /> {isClaimable ? 'Collect Daily Profit' : 'Profit Collected'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSubscribeInvestmentPlan(plan.id, plan.cost)}
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1 outline-none"
                    >
                      <Plus size={12} /> Activate Plan
                    </button>
                  )}
                  <button 
                    disabled
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-400 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest cursor-default outline-none"
                  >
                    Stats
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPortfolio = () => {
    if (!userData) return null;

    const currentLevelUsers = teamMembers.filter(u => u.lvl === activeTeamLevel);

    return (
      <div className="px-5 pt-8 pb-10 flex flex-col gap-6 bg-[#f8f8f8] min-h-screen">
        
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase font-sans">My Team</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] font-mono">Team members and referrals</p>
        </div>

        {/* Highlight statistics card */}
        <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 relative z-10">
            <div>
              <p className="text-[9px] uppercase opacity-70 leading-none mb-2 font-mono font-black tracking-widest">Total Members</p>
              <p className="text-4xl font-black leading-none font-sans italic">{userData.teamSize || 0}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase opacity-70 leading-none mb-2 font-mono font-black tracking-widest">Active Members</p>
              <p className="text-4xl font-black leading-none font-sans italic">{userData.rechargeMembers || 0}</p>
            </div>
            <div className="pt-2 border-t border-white/20">
              <p className="text-[9px] uppercase opacity-70 leading-none mb-2 font-mono font-black tracking-widest">New Today</p>
              <p className="text-xl font-black font-mono leading-none">+{userData.teamSizeToday || 0}</p>
            </div>
            <div className="pt-2 border-t border-white/20">
              <p className="text-[9px] uppercase opacity-70 leading-none mb-2 font-mono font-black tracking-widest">Commission Today</p>
              <p className="text-xl font-black font-mono leading-none">₦{userData.effectiveSizeToday || 0}</p>
            </div>
          </div>
        </div>

        {/* Visual Team Map */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-7 flex flex-col items-center gap-8 relative shadow-sm">
          <div className="absolute inset-0 bg-blue-50/50 rounded-full blur-3xl" />
          
          <div className="relative w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/30 z-10 border-4 border-white">
             <Users size={28} />
          </div>

          <div className="grid grid-cols-3 w-full gap-4 relative z-10">
            {[1, 2, 3].map(lvl => {
              const count = teamMembers.filter((u: any) => u.lvl === lvl).length;
              const isActive = activeTeamLevel === lvl;
              return (
                <button 
                  key={lvl}
                  onClick={() => setActiveTeamLevel(lvl)}
                  className={`flex flex-col items-center gap-3 transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg shadow-sm font-black border transition-all ${
                     isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    L{lvl}
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-black uppercase ${isActive ? 'text-blue-600' : 'text-slate-600'}`}>Tier {lvl}</p>
                    <p className="text-[9px] font-mono font-bold text-slate-400">{count} Active</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Connection Visual Lines */}
          <svg className="absolute top-[80px] left-0 w-full h-24 pointer-events-none opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M50 0 L20 100 M50 0 L50 100 M50 0 L80 100" stroke="#2563eb" strokeWidth="1" fill="none" />
          </svg>
        </div>

        {/* Commission indicator node */}
        <div className="bg-white border border-slate-200 p-6 rounded-[28px] flex justify-between items-center shadow-sm relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600" />
          <div>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 font-mono">Level {activeTeamLevel} Commission</p>
             <p className="text-xs font-black text-slate-900 italic">Profit from your team members</p>
          </div>
          <span className="text-3xl font-black text-blue-600 font-mono tracking-tighter">
            {activeTeamLevel === 1 ? '10' : activeTeamLevel === 2 ? '5' : '3'}%
          </span>
        </div>

        {/* Detailed agent stream */}
        <div className="flex flex-col gap-3.5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 ml-2 px-1">Network Sub-nodes List</p>
          {currentLevelUsers.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-[32px] py-16 text-center shadow-sm">
               <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono italic">No team members yet</p>
            </div>
          ) : (
            currentLevelUsers.map((p, pidx) => (
              <div key={pidx} className="bg-white border border-slate-200 p-5 rounded-[32px] flex items-center justify-between hover:bg-blue-50/30 transition-all shadow-sm">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-sm font-black text-slate-600 border border-slate-200">
                       {p.phone.slice(-2)}
                    </div>
                    <div>
                       <p className="text-sm font-black text-slate-900 font-mono">*** {p.phone.slice(-4)}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase mt-1 font-mono">{p.date}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[8px] font-black text-blue-600 uppercase font-mono mb-1 tracking-widest">Balance Index</p>
                    <p className="text-sm font-black text-slate-900 font-mono">₦{p.recharge.toLocaleString()}</p>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderFund = () => {
    if (!userData) return null;

    const { canWithdraw } = checkWithdrawalAvailability();
    // Use linkedBankCode directly and ensure it's a valid string to show withdrawal amount form
    // Check linkedBankCode for presence to switch from binding to withdrawal form
    const hasSavedPayout = !!(userData?.linkedBankCode && String(userData.linkedBankCode).length >= 10);

    return (
      <div className="px-5 pt-8 pb-12 flex flex-col gap-6 bg-[#f8f8f8] min-h-screen">
        
        {/* Navigation title header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Fund Management</h2>
            <p className="text-slate-500 text-xs font-bold leading-none mt-1">Recharge and Withdraw funds</p>
          </div>
        </div>

        {/* Tab switcher buttons for recharge and withdrawal */}
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => {
              setFundTab('recharge');
              setRechargeStep('input');
            }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer outline-none ${
              fundTab === 'recharge' 
                ? 'bg-blue-600 text-white shadow-md font-black' 
                : 'bg-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Recharge
          </button>
          <button 
            onClick={() => setFundTab('withdrawal')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer outline-none ${
              fundTab === 'withdrawal' 
                ? 'bg-blue-600 text-white shadow-md font-black' 
                : 'bg-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Withdraw
          </button>
          <button 
            onClick={() => setFundTab('history')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer outline-none ${
               fundTab === 'history' 
                 ? 'bg-blue-600 text-white shadow-md font-black' 
                 : 'bg-transparent text-slate-400 hover:text-slate-600'
             }`}
          >
            History
          </button>
        </div>

        {fundTab === 'recharge' ? (
          /* WEBHOOK-DRIVEN DEPOSIT FLOW */
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
            <div className="bg-blue-50 border border-blue-100 text-blue-700 p-5 rounded-[28px] text-[11px] flex items-start gap-3 shadow-sm font-semibold">
              <Zap size={18} className="shrink-0 mt-0.5 text-blue-600" />
              <p className="leading-relaxed">
                Please enter a deposit amount. Your funds are securely processed via standard financial settlement nodes.
              </p>
            </div>

            <div className="flex flex-col gap-2 font-semibold">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono ml-1">Input Amount (₦ NGN)</label>
              <div className="flex items-center gap-1 text-2xl font-black text-slate-900 bg-white border border-slate-200 rounded-[24px] px-6 py-5 focus-within:ring-4 focus-within:ring-blue-100 transition-all shadow-sm">
                <span className="text-blue-600 font-extrabold pr-1">₦</span>
                <input 
                  type="number" 
                  value={rechargeAmt || ''}
                  onChange={(e) => setRechargeAmt(Number(e.target.value))}
                  placeholder="Min 1,000"
                  className="bg-transparent text-slate-900 w-full outline-none font-black text-xl font-mono"
                />
              </div>
            </div>

            {/* Selector presets */}
            <div className="grid grid-cols-4 gap-2.5">
              {[2000, 10000, 30000, 50000, 100000, 250000, 500000, 1000000].map((val) => (
                <button
                  key={val}
                  onClick={() => setRechargeAmt(val)}
                  className={`py-3.5 rounded-xl text-[10px] font-black tracking-tight transition-all cursor-pointer font-mono outline-none shadow-sm ${
                    rechargeAmt === val 
                      ? 'bg-blue-600 text-white font-bold scale-[1.03] shadow-lg shadow-blue-500/20' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-200'
                  }`}
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              onClick={triggerPaystackCheckout}
              disabled={rechargeAmt < 1000}
              className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-[24px] text-white font-black text-sm tracking-widest uppercase transition-all mt-2 cursor-pointer disabled:opacity-50 outline-none flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30"
            >
              <CreditCard size={20} /> Secure Recharge
            </button>
          </div>
        ) : fundTab === 'withdrawal' ? (
          /* WITHDRAWAL FLOW */
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
            <div className={`p-5 rounded-[28px] text-xs flex items-start gap-4 shadow-sm font-semibold ${
              canWithdraw 
                ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border border-rose-100 text-rose-800'
            }`}>
              <Clock size={20} className={`shrink-0 mt-0.5 ${canWithdraw ? 'text-emerald-600' : 'text-rose-600'}`} />
              <div>
                <p className="font-black uppercase tracking-widest text-[11px] mb-1">
                  {canWithdraw ? 'Withdrawal Status: Open' : 'Withdrawal Status: Closed'}
                </p>
                <p className="leading-relaxed opacity-70">
                  Withdrawal hours: <span className="font-black">9:00 AM - 2:00 PM WAT</span> (Mon-Sat). Closed on Sundays.
                </p>
              </div>
            </div>

            {!hasSavedPayout ? (
              /* BINDING FLOW */
              <div className="bg-white border border-slate-200 p-7 rounded-[40px] shadow-sm animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">🏦</div>
                  <div>
                    <h3 className="text-slate-900 text-base font-black">Link Bank Account</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Bind your payout destination</p>
                  </div>
                </div>

                <div className="space-y-5 pt-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono ml-1">Bank Name</label>
                    <select 
                      value={withdrawBank}
                      onChange={(e) => setWithdrawBank(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-900 px-5 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-black text-xs font-mono appearance-none"
                    >
                      <option value="OPay">OPay Wallet (Standard)</option>
                      <option value="Moniepoint">Moniepoint MFB</option>
                      <option value="PalmPay">PalmPay Financials</option>
                      <option value="Kuda Bank">Kuda Technologies</option>
                      <option value="Access Bank">Access Bank PLC</option>
                      <option value="Fidelity Bank">Fidelity Bank</option>
                      <option value="FirstBank">FirstBank of Nigeria</option>
                      <option value="GTBank">Guaranty Trust Bank</option>
                      <option value="Zenith Bank">Zenith Bank PLC</option>
                      <option value="UBA">United Bank for Africa</option>
                      <option value="Union Bank">Union Bank of Nigeria</option>
                      <option value="Sterling Bank">Sterling Bank</option>
                      <option value="Stanbic IBTC">Stanbic IBTC Bank</option>
                      <option value="Wema Bank">Wema Bank / ALAT</option>
                      <option value="FCMB">First City Monument Bank</option>
                      <option value="Polaris Bank">Polaris Bank</option>
                      <option value="VFD">VFD Microfinance Bank</option>
                      <option value="Standard Chartered">Standard Chartered</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono ml-1">Account Number</label>
                    <input 
                      type="text" 
                      maxLength={10}
                      value={payeeAccount}
                      onChange={(e) => setPayeeAccount(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit account"
                      className="bg-slate-50 border border-slate-200 text-slate-900 px-5 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-black text-xs font-mono"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (payeeAccount.trim().length !== 10) return showToast("Account number must be 10 digits");
                      const name = userData.name || "HOLDER";
                      await updateBank({ linkedBankName: withdrawBank, linkedBankCode: payeeAccount, linkedBankOwner: name.toUpperCase() });
                      showToast("Bank account linked! 💳");
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-4.5 rounded-[22px] text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/20"
                  >
                    Save Bank Account
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE WITHDRAWAL SUBMISSION FLOW */
              <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-5 duration-500">
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
                   <div className="flex justify-between items-start mb-10">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] bg-white/10 px-3 py-1.5 rounded-lg inline-block font-mono">Linked Bank Account</p>
                        <h4 className="text-2xl font-black mt-5 font-sans tracking-tight">{userData.linkedBankName}</h4>
                        <p className="text-xs font-bold font-mono opacity-60 mt-1">**** **** {userData.linkedBankCode?.slice(-4)}</p>
                      </div>
                      <button onClick={async () => { if(confirm("Unlink bank?")) await updateBank({linkedBankCode:'',linkedBankName:'',linkedBankOwner:''}); }} className="text-[9px] font-black uppercase underline opacity-40">Reset</button>
                   </div>
                   <div className="flex justify-between pt-5 border-t border-white/10 text-[10px] font-mono">
                      <span className="opacity-50 uppercase tracking-widest">Beneficiary Name</span>
                      <span className="font-black uppercase">{userData.linkedBankOwner || userData.name}</span>
                   </div>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-[32px] flex justify-between items-center shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Available Balance</p>
                   <p className="text-xl font-black text-blue-600 font-mono italic">₦{userData.balance.toLocaleString()}</p>
                </div>

                <div className="flex flex-col gap-2.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono ml-2">Withdrawal Amount (₦)</label>
                   <div className="flex items-center gap-1 text-3xl font-black text-slate-900 bg-white border border-slate-200 rounded-[32px] px-8 py-6 shadow-sm focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                      <span className="text-blue-600">₦</span>
                      <input type="number" value={withdrawAmt || ''} onChange={(e) => setWithdrawAmt(Number(e.target.value))} className="bg-transparent text-slate-900 w-full outline-none font-black font-mono text-2xl" placeholder="0.00" />
                   </div>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                   {[1000, 5000, 10000, 30000, 50000, 100000, 250000, 500000].map(v => (
                     <button key={v} onClick={() => setWithdrawAmt(v)} className={`py-3.5 rounded-2xl text-[10px] font-black tracking-tight font-mono transition-all ${withdrawAmt === v ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'}`}>{v.toLocaleString()}</button>
                   ))}
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-[32px] space-y-3 shadow-sm font-semibold">
                   <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      <span>Service Fee (2%)</span>
                      <span className="text-rose-500">-₦{(withdrawAmt * 0.02).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-base font-sans pt-3 border-t border-slate-50">
                      <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">You will receive</span>
                      <span className="text-blue-600 font-black font-mono">₦{(withdrawAmt * 0.98).toLocaleString()}</span>
                   </div>
                </div>

                {withdrawSuccessMsg && (
                  <div className="bg-emerald-50 p-4 rounded-xl text-[10px] text-emerald-800 font-black leading-relaxed font-mono mt-2 border border-emerald-200">
                    {withdrawSuccessMsg}
                  </div>
                )}
                
                {withdrawErrorMsg && (
                  <div className="bg-rose-50 p-4 rounded-xl text-[10px] text-rose-800 font-black leading-relaxed font-mono mt-2 border border-rose-200">
                    {withdrawErrorMsg}
                  </div>
                )}

                <button onClick={handleWithdrawSubmit} disabled={withdrawAmt < 1000 || !canWithdraw} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-[28px] text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 h-20 transition-all active:scale-95 disabled:grayscale">
                   <ShieldCheck size={24} /> Withdraw Now
                </button>
              </div>
            )}

          </div>
        ) : (
          /* HISTORY */
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
             <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm font-semibold">
                <h3 className="text-slate-900 font-black text-sm mb-1 uppercase tracking-tight">Transaction Records</h3>
                <p className="text-slate-500 text-[11px] font-medium leading-relaxed italic">Your recent recharge and withdrawal history.</p>
             </div>
             <div className="flex flex-col gap-3.5">
                {!userData.transactions || userData.transactions.length === 0 ? (
                  <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[40px] bg-white opacity-50 px-10">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono italic">No transaction history found.</p>
                  </div>
                ) : (
                  userData.transactions.map((t: any) => {
                    const isPlus = ['recharge', 'claim', 'bonus'].includes(t.type);
                    return (
                      <div key={t.id} className="bg-white border border-slate-200 p-5 rounded-[32px] flex items-center justify-between shadow-sm group hover:border-blue-200 transition-all font-semibold">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isPlus ? 'bg-blue-50' : 'bg-slate-50'}`}>
                              {t.type === 'recharge' ? '📥' : t.type === 'withdraw' ? '📤' : t.type === 'subscribe' ? '💼' : '🎁'}
                           </div>
                           <div>
                              <p className="text-[11px] font-black uppercase text-slate-900 font-mono group-hover:text-blue-600 transition-colors uppercase">{t.type}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-mono">{t.date}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={`font-black font-mono text-sm ${isPlus ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {isPlus ? '+' : '-'}₦{t.amount.toLocaleString()}
                           </p>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 italic font-mono">{t.status || 'Success'}</p>
                        </div>
                      </div>
                    )
                  })
                )}
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => {
    if (!userData) return null;

    return (
      <div className="px-5 pt-8 animate-in zoom-in-95 pb-10 bg-[#0C1017] min-h-screen">
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="absolute -inset-3 bg-indigo-600 rounded-full blur-xl opacity-10 group-hover:opacity-20 transition-all duration-500" />
            <div className="ring-2 ring-indigo-600/30 rounded-full p-1 bg-[#131926]">
              <Memoji state={userData.memojiState} size="xl" />
            </div>
          </div>
          <h2 className="text-2xl font-black mt-6 tracking-tight text-white mb-1">{userData.name}</h2>
          <p className="text-slate-400 font-extrabold uppercase text-[9px] tracking-[0.2em] font-mono">Account Email: {userData.email}</p>
          <p className="text-slate-400 font-extrabold uppercase text-[9px] tracking-[0.2em] font-mono mt-1">Telephone Account: {userData.phoneNumber}</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-center font-semibold">
          <div className="bg-[#131926] border border-[#1E293B] p-4 rounded-2xl">
            <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1 font-mono">Total Referrals</span>
            <span className="text-indigo-400 text-md font-extrabold font-mono">{userData.teamSize || 0} friends</span>
          </div>
          <div className="bg-[#131926] border border-[#1E293B] p-4 rounded-2xl">
            <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1 font-mono">Trust Score</span>
            <span className="text-white text-md font-extrabold">Excellent</span>
          </div>
        </div>

        {/* Menu choices */}
        <div className="bg-[#131926] rounded-[28px] border border-[#1E293B] overflow-hidden mb-6 select-none font-semibold">
          {[
            { id: 'personal', icon: '👤', label: 'Personal Information', sub: 'Update username and phone details', show: true, action: () => {
              setActiveProfileOverlay('personal');
            }},
            { id: 'security', icon: '🔓', label: 'Security Password', sub: 'Update account password & withdrawal PIN', show: true, action: () => {
              setSecurityNewPass('');
              setActiveProfileOverlay('security');
            }},
            { id: 'bank', icon: '🏦', label: 'Link Bank Account', sub: 'Add your bank details for withdrawals', show: true, action: () => {
              setActiveProfileOverlay('bank');
            }},
            { id: 'referral', icon: '🎁', label: 'Referral Invitation Code', sub: 'View referral invitation code', show: true, action: () => {
              setActiveProfileOverlay('referral');
            }},
            { id: 'referral_tree', icon: '🌳', label: 'My Referral Team', sub: 'View your team and referral count', show: true, action: () => {
              setActiveProfileOverlay('referral_tree');
            }},
            { id: 'support', icon: '🎫', label: 'Submit Support Ticket', sub: 'Contact system administrators', show: true, action: () => {
              setActiveProfileOverlay('support');
            }},
            { id: 'admin', icon: '🛠️', label: 'Admin Control Panel', sub: 'Approve transactions & manage users', show: isSpecificAdmin, action: () => navigate(Screen.Admin) }
          ].filter(item => item.show).map((item, i) => (
            <div 
              key={i} 
              className="flex items-center gap-4 p-4.5 hover:bg-[#1E293B]/60 cursor-pointer transition-colors border-b border-[#1E293B]/40 last:border-0" 
              onClick={item.action}
            >
              <div className="w-10 h-10 bg-[#0C1017] rounded-xl flex items-center justify-center text-lg">{item.icon}</div>
              <div className="flex-1">
                <p className="font-extrabold text-white text-xs leading-snug">{item.label}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-none">{item.sub}</p>
              </div>
              <ChevronRight size={14} className="text-slate-600" />
            </div>
          ))}
        </div>

        <button 
          onClick={handleSignOut}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 py-4.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer outline-none"
        >
          Sign Out of Account Session
        </button>
      </div>
    );
  };

  const renderAIAdvisor = () => {
    return (
      <div className="h-full bg-[#0C1017] flex flex-col justify-between min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#1E293B] bg-[#131926]">
          <button onClick={() => navigate(Screen.Dashboard)} className="p-2 hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer outline-none">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex-1 font-semibold">
            <h3 className="text-sm font-black text-white">AI Brex Advisor</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">SECURE INTERACTION WITH AI ADVISORY PLANNER</p>
          </div>
        </div>

        {/* Chat logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-140px)]">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3 min-h-[350px]">
              <span className="text-5xl">🤖</span>
              <p className="text-sm font-black text-white">How can I assist your Brex journey today?</p>
              <p className="text-xs text-slate-500 max-w-xs font-semibold">Ask about Treasury yield spreads, ideal lock options, and payout limits.</p>
              <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-xs">
                {[
                  "Naira bond rates",
                  "Explain sovereign interest index",
                  "Why does withdraw have a 25% levy?"
                ].map((txt, ti) => (
                  <button 
                    key={ti}
                    onClick={() => callAIAdvisor(txt)}
                    className="text-[10px] bg-[#131926] hover:bg-[#1E293B] border border-[#1E293B] text-slate-400 px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer outline-none"
                  >
                    "{txt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#8CEE47]' : 'bg-[#1E293B]'}`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${msg.role === 'user' ? 'bg-[#8CEE47] text-slate-900 rounded-tr-none' : 'bg-[#131926] text-white rounded-tl-none border border-[#1E293B]'}`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex gap-3 max-w-[80%] mr-auto items-center animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center">🤖</div>
              <div className="bg-[#131926] text-slate-400 text-xs font-black p-3 rounded-2xl border border-[#1E293B] rounded-tl-none font-mono tracking-widest">
                Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Action input bar */}
        <div className="p-4 bg-[#131926] border-t border-[#1E293B] flex gap-3 pb-safe items-center">
          <input 
            type="text" 
            placeholder="Type your question..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                callAIAdvisor(chatInput);
              }
            }}
            className="flex-1 bg-[#0C1017] border border-[#1E293B] px-4.5 py-3.5 rounded-2xl text-white text-xs outline-none focus:border-[#8CEE47] font-semibold"
          />
          <button 
            onClick={() => callAIAdvisor(chatInput)}
            disabled={!chatInput.trim() || isTyping}
            className="bg-[#8CEE47] hover:bg-[#7BE13A] disabled:opacity-50 text-slate-900 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer outline-none"
          >
            Send
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
           key={currentScreen}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.2, ease: "easeOut" }}
           className="h-full"
        >
          {(() => {
            switch (currentScreen) {
              case Screen.Auth: return renderAuth();
              case Screen.Admin: return <AdminPanel onBack={() => navigate(Screen.Profile)} onRefreshUser={refreshProfile} />;
              case Screen.Dashboard: return renderDashboard();
              case Screen.Market: return renderMarket();
              case Screen.Portfolio: return renderPortfolio();
              case Screen.Profile: return renderProfile();
              case Screen.Fund: return renderFund();
              case Screen.AIAdvisor: return renderAIAdvisor();
              default: return renderDashboard();
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
  };

  const isNavHidden = [Screen.Auth, Screen.AIAdvisor].includes(currentScreen);

  return (
    <Layout activeScreen={currentScreen} onNavigate={navigate} hideNav={isNavHidden} isAdmin={isSpecificAdmin}>
      
      {/* Toast Notification overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm pointer-events-none"
          >
            <div className="bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#ff9c00] animate-pulse shrink-0" />
              <p className="text-[11px] font-black uppercase tracking-wider leading-tight">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telegram Channel Modal */}
      <AnimatePresence>
        {showTelegramModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg shadow-blue-500/20">
                📢
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Join Our Community</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                Stay updated with live payment proofs and the latest app developments in our official Telegram channel.
              </p>
              <div className="flex flex-col gap-3">
                <a 
                  href="https://t.me/brexgroup6" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-sm"
                  onClick={() => setShowTelegramModal(false)}
                >
                  Join Telegram Channel
                </a>
                <button 
                  onClick={() => setShowTelegramModal(false)}
                  className="w-full bg-slate-100 text-slate-500 font-black py-3 rounded-2xl text-[11px] uppercase tracking-widest transition-all"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast Notice Modal */}
      <AnimatePresence>
        {showNoticeModal && broadcasts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-0 overflow-hidden shadow-2xl"
            >
              <div className="bg-blue-600 p-6 text-white text-center">
                <h3 className="text-xl font-black tracking-tight">{broadcasts[0].title}</h3>
                <p className="text-[10px] uppercase font-black opacity-60 tracking-widest font-mono mt-1">{broadcasts[0].date}</p>
              </div>
              <div className="p-8">
                <div className="text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {broadcasts[0].content}
                </div>
                <button 
                  onClick={() => {
                    setShowNoticeModal(false);
                    if (!hasShownTelegramThisSession) {
                      setShowTelegramModal(true);
                      setHasShownTelegramThisSession(true);
                    }
                  }}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl mt-8 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal Overlay */}
      <AnimatePresence>
        {showReceipt && receiptData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-[340px] rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col text-slate-900"
            >
              {/* Receipt Visual Header */}
              <div className="bg-indigo-600 p-8 text-center text-white relative">
                 <div className="absolute top-4 left-4 w-12 h-12 border-2 border-white/10 rounded-full" />
                 <div className="absolute bottom-4 right-4 w-8 h-8 border border-white/20 rounded-full" />
                 
                 <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
                    <Check size={32} className="text-white" />
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-widest mb-1">Transfer Result</h3>
                 <p className="text-[10px] font-black opacity-60 tracking-[0.2em] font-mono">{receiptData.ref}</p>
              </div>

              {/* Receipt Body */}
              <div className="p-8 flex flex-col gap-8 relative">
                 {/* Punch holes in receipt side */}
                 <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-around -ml-2.5">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="w-5 h-5 bg-black/80 rounded-full" />)}
                 </div>
                 <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-around -mr-2.5">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="w-5 h-5 bg-black/80 rounded-full" />)}
                 </div>

                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 font-mono">Recharge Amount</p>
                    <p className="text-4xl font-black text-slate-900 font-mono tracking-tighter">₦{receiptData.amount.toLocaleString()}</p>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 pb-3">
                       <span className="text-slate-400 uppercase tracking-widest text-[9px]">Channel</span>
                       <span className="text-slate-900">{receiptData.bank}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 pb-3">
                       <span className="text-slate-400 uppercase tracking-widest text-[9px]">Value Name</span>
                       <span className="text-slate-900 uppercase">{userData.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 pb-3">
                       <span className="text-slate-400 uppercase tracking-widest text-[9px]">Net Sum</span>
                       <span className="text-indigo-600 font-black font-mono">₦{receiptData.netAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                       <span className="text-slate-400 uppercase tracking-widest text-[9px]">System Date</span>
                       <span className="text-slate-900 font-mono text-[10px]">{receiptData.date}</span>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center gap-2 border border-slate-100">
                    <div className="text-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                       <p className="text-[11px] font-black text-indigo-600 flex items-center gap-1.5 uppercase font-mono">
                          <Check size={12} className="shrink-0" /> Payment Successful
                       </p>
                    </div>
                 </div>
              </div>

              {/* Action */}
              <div className="p-8 pt-0 flex flex-col gap-3">
                 <button 
                  onClick={() => {
                    // Logic to "Download" - in web we can just alert or show toast for now or use a screenshot lib if requested
                    showToast("Receipt saved to your documents! 📤");
                    setShowReceipt(false);
                  }}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/10 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                 >
                    <ArrowUpRight size={16} /> Download Receipt
                 </button>
                 <button 
                  onClick={() => setShowReceipt(false)}
                  className="w-full bg-white text-slate-400 font-black py-2 rounded-2xl text-[10px] uppercase tracking-widest"
                 >
                    Maybe Later
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderContent()}

      {/* INVESTMENT CLAIM RUNNING PIPELINE MODAL */}
      {showYieldModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-5 z-50 backdrop-blur-md">
          <div className="bg-[#131926] border border-[#1E293B] p-6 rounded-[32px] max-w-sm w-full font-semibold text-xs text-slate-400">
            <div className="flex flex-col items-center justify-center text-center gap-4 mb-6">
              <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-600/30 rounded-full flex items-center justify-center text-3xl animate-spin" style={{ animationDuration: '6s' }}>
                ⚡
              </div>
              <div>
                <h3 className="text-white text-lg font-black tracking-tight">{yieldPlanActive?.name} Accruing...</h3>
                <p className="text-[#64748B] text-[9px] uppercase tracking-wider font-mono">Real-time dynamic yield updates</p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="w-full bg-[#0C1017] rounded-full h-2.5 mb-5 relative overflow-hidden animate-pulse">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${yieldProgress}%` }}
              />
            </div>

            {/* Logger terminal output */}
            <div className="bg-[#0C1017] p-4.5 rounded-2xl h-44 overflow-y-auto flex flex-col gap-2 font-mono text-[10px] text-indigo-400 leading-relaxed border border-[#1E293B]/60 align-left text-left">
              {yieldLog.map((log, logIdx) => (
                <div key={logIdx} className="flex gap-1.5 items-start">
                  <span className="opacity-50 select-none">&gt;</span>
                  <span className="text-slate-200">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE DIALOG OVERLAYS */}
      {activeProfileOverlay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-5 z-40 backdrop-blur-sm">
          <div className="bg-[#131926] border border-[#1E293B] p-6 rounded-[32px] max-w-sm w-full font-semibold text-xs text-slate-300 flex flex-col gap-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]/70 m-0">
              <h3 className="text-white text-base font-black uppercase tracking-wider font-mono">
                {activeProfileOverlay === 'personal' && '👤 Personal Information'}
                {activeProfileOverlay === 'bank' && '🏦 Link Bank Account'}
                {activeProfileOverlay === 'security' && '🔒 Change Password'}
                {activeProfileOverlay === 'referral' && '🎁 Referral Code'}
                {activeProfileOverlay === 'referral_tree' && '🌳 My Referral Team'}
                {activeProfileOverlay === 'support' && '🎫 Submit support ticket'}
              </h3>
              <button 
                onClick={() => setActiveProfileOverlay(null)}
                className="w-7 h-7 bg-[#0C1017] hover:bg-[#1E293B] rounded-full border border-slate-700 flex items-center justify-center text-slate-400 font-extrabold text-xs cursor-pointer outline-none"
              >
                ✕
              </button>
            </div>

            {activeProfileOverlay === 'personal' && (
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[#64748B] font-mono text-[9px] uppercase">Legal Name</span>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#64748B] font-mono text-[9px] uppercase">Mobile Number</span>
                  <input 
                    type="text" 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#64748B] font-mono text-[9px] uppercase">Memoji focus state</span>
                  <select 
                    value={editMemoji}
                    onChange={(e) => setEditMemoji(e.target.value as any)}
                    className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47]"
                  >
                    <option value="Neutral">Neutral State 😐</option>
                    <option value="Happy">Happy State 😊</option>
                    <option value="Focused">Focused Analytical 🧐</option>
                    <option value="Celebration">Victory Profit Party 🥳</option>
                    <option value="Concerned">Risk mitigation mode 🤨</option>
                  </select>
                </div>
                <button 
                  onClick={handleSavePersonalInfo} 
                  className="w-full bg-[#8CEE47] py-3 text-slate-900 rounded-xl font-bold uppercase transition-all tracking-wider font-mono mt-2 text-xs cursor-pointer outline-none shadow-md"
                >
                  Save Personal Details
                </button>
              </div>
            )}

            {activeProfileOverlay === 'bank' && (
              <div className="space-y-3.5 mt-1">
                {/* Tabs to select Payout Preset Channel */}
                <div className="grid grid-cols-2 bg-[#0C1017] p-1 rounded-xl border border-[#1E293B]">
                  <button 
                    onClick={() => setBankSettingsTab('account')}
                    className={`py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold transition-all cursor-pointer outline-none ${bankSettingsTab === 'account' ? 'bg-[#8CEE47]/10 text-[#8CEE47] border border-[#8CEE47]/25' : 'text-slate-500'}`}
                  >
                    🏦 Bank Preset
                  </button>
                  <button 
                    onClick={() => setBankSettingsTab('card')}
                    className={`py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold transition-all cursor-pointer outline-none ${bankSettingsTab === 'card' ? 'bg-[#8CEE47]/10 text-[#8CEE47] border border-[#8CEE47]/25' : 'text-slate-500'}`}
                  >
                    💳 ATM Card
                  </button>
                </div>

                {bankSettingsTab === 'account' ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#64748B] font-mono text-[9px] uppercase">Recipient bank target</span>
                      <select 
                        value={bankSettingsName}
                        onChange={(e) => {
                          setBankSettingsName(e.target.value);
                          setBankSettingsOwner(editName);
                        }}
                        className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-mono"
                      >
                        <option value="OPay">OPay Wallet (Standard)</option>
                        <option value="Moniepoint">Moniepoint Microfinance</option>
                        <option value="PalmPay">PalmPay Financials</option>
                        <option value="Kuda Bank">Kuda Technologies</option>
                        <option value="Access Bank">Access Bank PLC</option>
                        <option value="Fidelity Bank">Fidelity Bank</option>
                        <option value="FirstBank">FirstBank of Nigeria</option>
                        <option value="GTBank">Guaranty Trust Bank</option>
                        <option value="Zenith Bank">Zenith Bank PLC</option>
                        <option value="UBA">United Bank for Africa (UBA)</option>
                        <option value="Union Bank">Union Bank of Nigeria</option>
                        <option value="Sterling Bank">Sterling Bank</option>
                        <option value="Stanbic IBTC">Stanbic IBTC Bank</option>
                        <option value="Wema Bank">Wema Bank / ALAT</option>
                        <option value="FCMB">First City Monument Bank</option>
                        <option value="Polaris Bank">Polaris Bank</option>
                        <option value="VFD">VFD Microfinance Bank</option>
                        <option value="Standard Chartered">Standard Chartered</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[#64748B] font-mono text-[9px] uppercase">10-Digit NUBAN code</span>
                      <input 
                        type="text" 
                        maxLength={10}
                        value={bankSettingsAccount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setBankSettingsAccount(val);
                          if (val.length === 10) {
                            setBankSettingsOwner(editName ? editName.toUpperCase() + ' BINDING' : 'RECIPIENT BINDING');
                          }
                        }}
                        placeholder="7077599057"
                        className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[#64748B] font-mono text-[9px] uppercase">verified Owner name</span>
                      <div className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-slate-400 font-mono text-[10px] break-all">
                        {bankSettingsOwner || 'Resolving payee...'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#64748B] font-mono text-[9px] uppercase">16-Digit ATM Card Number</span>
                      <input 
                        type="text" 
                        maxLength={19}
                        value={linkedCardNumber}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                          setLinkedCardNumber(formatted);
                        }}
                        placeholder="5399 4120 8854 1120"
                        className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[#64748B] font-mono text-[9px] uppercase">Expiration (MM/YY)</span>
                        <input 
                          type="text" 
                          maxLength={5}
                          value={linkedCardExpiry}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val.length === 2 && !val.includes('/')) {
                              val += '/';
                            }
                            setLinkedCardExpiry(val);
                          }}
                          placeholder="12/28"
                          className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-mono text-center"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[#64748B] font-mono text-[9px] uppercase">CVV Code</span>
                        <input 
                          type="password" 
                          maxLength={3}
                          value={linkedCardCvv}
                          onChange={(e) => setLinkedCardCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="***"
                          className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-mono text-center"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                      🔒 Highly encrypted: Card data is bound and only used for fast-checking out automated withdrawal settlements without sharing with secondary networks.
                    </p>
                  </>
                )}

                <button 
                  onClick={handleSaveBankDetails} 
                  className="w-full bg-[#8CEE47] py-3 text-slate-900 rounded-xl font-bold uppercase transition-all tracking-wider font-mono mt-2 text-xs cursor-pointer outline-none shadow-md"
                >
                  Confirm Payout Route Binding
                </button>
              </div>
            )}

            {activeProfileOverlay === 'security' && (
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[#64748B] font-mono text-[9px] uppercase">New strong login Password</span>
                  <input 
                    type="password" 
                    value={securityNewPass}
                    onChange={(e) => setSecurityNewPass(e.target.value)}
                    placeholder="Enter strong login password"
                    className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <button 
                  onClick={handleSaveSecurity} 
                  className="w-full bg-indigo-600 py-3 text-white rounded-xl font-bold uppercase transition-all tracking-wider font-mono mt-2 text-xs cursor-pointer outline-none shadow-lg"
                >
                  Authorize passphrase reset
                </button>
              </div>
            )}

            {activeProfileOverlay === 'referral' && (
              <div className="space-y-4">
                <div className="bg-[#0C1017] p-4.5 rounded-2xl flex flex-col gap-3 font-mono">
                  <div>
                    <span className="text-[#64748B] text-[8px] uppercase font-black block mb-0.5">Your invitation code</span>
                    <div className="flex items-center justify-between bg-[#131926] p-2 rounded-xl text-[#8CEE47] font-bold text-sm border border-[#1E293B]">
                      <span>{userData.invitationCode || 'BREX-8854'}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(userData.invitationCode || 'BREX-8854');
                          showToast('Referral code copied to clipboard!');
                        }}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[8px] uppercase font-black block mb-0.5">Your unique referral link</span>
                    <div className="flex items-center justify-between bg-[#131926] p-2 rounded-xl text-xs text-slate-300 border border-[#1E293B] select-all truncate text-[9px]">
                      <span>https://brex.com/join?ref={userData.invitationCode || 'BREX-8854'}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`https://brex.com/join?ref=${userData.invitationCode || 'BREX-8854'}`);
                          showToast('Referral link copied!');
                        }}
                        className="text-slate-400 hover:text-white transition-colors ml-1"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] leading-relaxed text-slate-400 font-semibold">
                  🎁 Invite friends to Brex and claim <span className="text-[#ff9c00] font-bold">₦2,500 active referral reward</span> once your invited friends register and fund their first standard deposit pool!
                </div>
              </div>
            )}
            {activeProfileOverlay === 'referral_tree' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <p className="text-white text-xs font-black uppercase tracking-wider font-mono">My Referral Team</p>
                  <span className="bg-[#8CEE47]/10 text-[#8CEE47] text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1.5 border border-[#8CEE47]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8CEE47] animate-pulse" />
                    {teamMembers.length} Active
                  </span>
                </div>
                
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {teamMembers.length === 0 ? (
                    <div className="bg-[#131926] p-10 rounded-[32px] border border-[#1E293B] text-center flex flex-col items-center gap-4">
                      <div className="w-14 h-14 bg-[#0C1017] rounded-full flex items-center justify-center text-2xl grayscale opacity-40 shadow-inner">👥</div>
                      <div>
                        <p className="text-white text-xs font-black uppercase tracking-tighter">No Genealogy Records</p>
                        <p className="text-slate-500 text-[10px] font-bold mt-1 max-w-[180px] mx-auto leading-relaxed">Refer your partners to start building your wealth architecture.</p>
                      </div>
                    </div>
                  ) : (
                    teamMembers.map((m: any, idx: number) => (
                      <div key={idx} className="bg-[#131926] p-4 rounded-[28px] border border-[#1E293B] flex items-center justify-between border-l-4 border-l-blue-600 transition-all hover:bg-[#1E293B]/50">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black ${m.lvl === 1 ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-slate-800 text-slate-500'}`}>
                            L{m.lvl}
                          </div>
                          <div>
                            <p className="text-white text-xs font-black tracking-tight">{m.phone}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase font-mono mt-0.5">{m.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[10px] font-black uppercase tracking-wide ${m.recharge > 2000 ? 'text-[#8CEE47]' : 'text-slate-600'}`}>
                             {m.recharge > 2000 ? 'Verified' : 'Pending'}
                          </p>
                          <p className="text-[12px] font-black text-white font-mono mt-0.5 tracking-tighter">₦{m.recharge.toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-[#131926] p-4 rounded-[28px] border border-[#1E293B] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400">💡</div>
                  <p className="text-[10px] leading-relaxed text-slate-400 font-semibold flex-1">
                    Invite partners using your code <span className="text-white font-bold">{userData.invitationCode}</span> to grow your genealogy and claim rewards!
                  </p>
                </div>
              </div>
            )}

            {activeProfileOverlay === 'support' && (
              <div className="space-y-4">
                <p className="text-white text-xs font-black uppercase tracking-wider font-mono">🎫 Submit Grievance Dispute</p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const category = target.category.value;
                  const message = target.message.value;
                  
                  if (!message) {
                    alert('Please enter your dispute message details');
                    return;
                  }
                  
                  try {
                    const { collection, addDoc } = await import('firebase/firestore');
                    const { db } = await import('./lib/firebase');
                    
                    await addDoc(collection(db, 'support_tickets'), {
                      category,
                      message,
                      userEmail: userData.email,
                      userId: userData.uid || 'unknown',
                      status: 'open',
                      date: new Date().toISOString().slice(0, 10)
                    });
                    
                    showToast('Dispute grievance submitted! Support team is reviewing.');
                    setActiveProfileOverlay(null);
                  } catch(err: any) {
                    alert(err.message || 'Ticket creation error');
                  }
                }} className="space-y-3.5 mt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#64748B] font-mono text-[9px] uppercase">Support Category</span>
                    <select name="category" className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-mono">
                      <option value="Deposit pending check">Deposit delay</option>
                      <option value="Withdrawal pending check">Withdrawal follow up</option>
                      <option value="Referral award missing">Referral reward missing</option>
                      <option value="VIP plan calculations">VIP plan calculations</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[#64748B] font-mono text-[9px] uppercase">Ticket Description</span>
                    <textarea 
                      name="message" 
                      rows={3}
                      placeholder="Type details of your deposit, withdrawal, or referral issue here..."
                      className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] resize-none leading-relaxed font-semibold animate-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#8CEE47] py-3 text-slate-900 rounded-xl font-bold uppercase transition-all tracking-wider font-mono mt-2 text-xs cursor-pointer outline-none block border-none"
                  >
                    Submit Ticket
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </Layout>
  );
};

export default App;
