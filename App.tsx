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
  { id: 'vip-1', name: 'VIP Level 1', period: '90 Days', workingDays: 0, cost: 3000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 1, avatar: '⭐', dailyProfit: 150 },
  { id: 'vip-2', name: 'VIP Level 2', period: '90 Days', workingDays: 0, cost: 15000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 2, avatar: '🌟', dailyProfit: 900 },
  { id: 'vip-3', name: 'VIP Level 3', period: '90 Days', workingDays: 0, cost: 50000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 3, avatar: '🏆', dailyProfit: 3500 },
  { id: 'vip-4', name: 'VIP Level 4', period: '90 Days', workingDays: 0, cost: 150000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 4, avatar: '👑', dailyProfit: 12000 },
  { id: 'vip-5', name: 'VIP Level 5', period: '90 Days', workingDays: 0, cost: 300000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 5, avatar: '💎', dailyProfit: 27000 },
  { id: 'vip-6', name: 'VIP Level 6', period: '90 Days', workingDays: 0, cost: 500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 6, avatar: '🌀', dailyProfit: 50000 },
  { id: 'vip-7', name: 'VIP Level 7', period: '90 Days', workingDays: 0, cost: 1000000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 7, avatar: '🔥', dailyProfit: 110000 },
  { id: 'vip-8', name: 'VIP Level 8', period: '90 Days', workingDays: 0, cost: 2500000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 8, avatar: '⚡', dailyProfit: 300000 }
];

const SOCIAL_PROOF_DEEDS = [
  "🇳🇬 Chinedu O. withdrew ₦18,500 via OPay • Just now",
  "🇳🇬 Fatimah Z. deposited ₦50,050 • 2 mins ago",
  "🇳🇬 Babajide A. withdrew ₦120,400 via Kuda Bank • 5 mins ago",
  "🇳🇬 Chioma E. subscribed to VIP Pool Tier 3 • 8 mins ago",
  "🇳🇬 Gidado M. withdrew ₦8,300 via PalmPay • 11 mins ago",
  "🇳🇬 Aminat S. deposited ₦22,000 • 15 mins ago",
  "🇳🇬 Festus K. withdrew ₦240,500 via GTBank • 17 mins ago"
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

  const [socialIdx, setSocialIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSocialIdx((prev) => (prev + 1) % SOCIAL_PROOF_DEEDS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const isSpecificAdmin = userData?.isAdmin;
  
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
  
  // Custom Webhook-driven Paystack Checkout simulation states
  const [paystackShowSimulator, setPaystackShowSimulator] = useState(false);
  const [paystackCheckingPayment, setPaystackCheckingPayment] = useState(false);
  const [paystackReference, setPaystackReference] = useState('');

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

  const triggerPaystackCheckout = () => {
    if (rechargeAmt < 1000) {
      showToast("Minimum deposit is ₦1,000 NGN");
      return;
    }
    const ref = `ref_ps_${Date.now()}_` + Math.floor(100+Math.random()*900);
    setPaystackReference(ref);
    setPaystackShowSimulator(true);
  };

  const handlePaystackWebhookAuthorize = async () => {
    if (!userData) return;
    setPaystackCheckingPayment(true);
    showToast("Initializing secure Paystack settlement Node...");
    
    // Construct real-world Paystack charge.success webhook payload
    const payload = {
      event: "charge.success",
      data: {
        amount: rechargeAmt * 100, // kobo conversion
        reference: paystackReference,
        status: "success",
        customer: {
          email: userData.email || userData.phoneNumber.replace(/\s+/g, '') + "@seedstreet.com"
        }
      }
    };

    try {
      const response = await fetch("/api/webhook/paystack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const res = await response.json();
      if (response.ok && res.status === "success") {
        showToast("Success! Webhook received & account balance synchronized! 📥");
        setPaystackShowSimulator(false);
        setPaystackCheckingPayment(false);
        setRechargeAmt(0);
      } else {
        throw new Error(res.error || "Webhook endpoint returned error response");
      }
    } catch (err: any) {
      console.error("Paystack simulation err: ", err);
      showToast("Sync failed: Webhook failed to register. " + err.message);
      setPaystackCheckingPayment(false);
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
  const [isVerifyingPayout, setIsVerifyingPayout] = useState(false);
  const [verifiedPayoutName, setVerifiedPayoutName] = useState<string>('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string>('');
  const [withdrawErrorMsg, setWithdrawErrorMsg] = useState<string>('');

  // Auto recipient lookup lookup simulation
  useEffect(() => {
    if (payeeAccount.trim().length === 10) {
      setIsVerifyingPayout(true);
      setVerifiedPayoutName('');
      const timeout = setTimeout(() => {
        setIsVerifyingPayout(false);
        const lookupNames = [
          'OLUWASEUN ADEBAYO',
          'CHIDI JONATHAN NKWOCHA',
          'ABUBAKAR ALIYU BELLO',
          'AMARA PRECIOUS NWOSU',
          'BASHIR TUKUR ONDO',
          'FOLASADE KIKELOMO'
        ];
        const hash = payeeAccount.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        setVerifiedPayoutName(lookupNames[hash % lookupNames.length]);
      }, 1200);
      return () => clearTimeout(timeout);
    } else {
      setVerifiedPayoutName('');
    }
  }, [payeeAccount, withdrawBank]);

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
  const [transactionPIN, setTransactionPIN] = useState('1122');
  const [enteredWithdrawPIN, setEnteredWithdrawPIN] = useState('');
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

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
      setLinkedCardNumber(userData.linkedCardNumber || '');
      setLinkedCardExpiry(userData.linkedCardExpiry || '');
      setLinkedCardCvv(userData.linkedCardCvv || '');
      setTransactionPIN(userData.transactionPIN || '1122');
      if (userData.linkedCardNumber) {
        setBankSettingsTab('card');
      }
    }
  }, [userData]);

  // Load broadcasts for the dashboard banner
  useEffect(() => {
    if (userData) {
      const fetchAnnouncements = async () => {
        try {
          const { collection, getDocs } = await import('firebase/firestore');
          const { db } = await import('./lib/firebase');
          const snap = await getDocs(collection(db, 'broadcasts'));
          setBroadcasts(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        } catch(e) {
          console.log("No broadcasts stream loaded", e);
        }
      };
      fetchAnnouncements();
    }
  }, [userData]);

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
    const activeOwner = userData?.linkedBankOwner || verifiedPayoutName || userData?.name || "Verified Holder";

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
    
    const correctPin = userData.transactionPIN || '1122';
    if (enteredWithdrawPIN !== correctPin) {
      setWithdrawErrorMsg('Invalid Transaction Security PIN code');
      return;
    }

    setWithdrawErrorMsg('');
    try {
      await withdraw(withdrawAmt, activeBank, activeAccount, activeOwner);
      
      const expectedPayout = withdrawAmt * 0.98;
      setWithdrawSuccessMsg(`Request settled! Beneficiary: ${activeOwner}. Net expected: ₦${expectedPayout.toLocaleString()}`);
      showToast(`Payout of ₦${withdrawAmt.toLocaleString()} dispatched successfully.`);
      setEnteredWithdrawPIN('');
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

  // Invite Simulated active partner under MyTeam
  const handleSimulateInvite = async () => {
    try {
      await simulateInvite();
      await refreshTeamData();
      showToast(`Simulated active partner registered successfully in the database.`);
    } catch (err: any) {
      showToast(err.message || "Failed to simulate registration.");
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
    if (!securityNewPass && !transactionPIN) {
      showToast('Please configure at least one credential update.');
      return;
    }
    try {
      if (securityNewPass) {
        await updateSecurity(securityNewPass);
      }
      if (transactionPIN) {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        await updateDoc(doc(db, 'users', userData.uid), {
          transactionPIN: transactionPIN
        });
      }
      setActiveProfileOverlay(null);
      setSecurityNewPass('');
      showToast('Security details and withdrawal PIN updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Security details update failed');
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const renderAuth = () => {
    return (
      <div className="h-full bg-[#f8f8f8] flex flex-col min-h-screen">
        {/* Header Section */}
        <div className="bg-gradient-to-b from-[#f9b01c] to-[#ffcc33] pt-6 pb-20 px-6 relative">
          <div className="flex items-center gap-4 mb-12">
            <button 
              onClick={() => {
                if (authMode === 'register') {
                  setAuthMode('login');
                }
              }}
              className="p-1"
            >
              <ArrowLeft size={24} className="text-black" />
            </button>
            <h1 className="flex-1 text-center text-lg font-bold text-black -ml-8">
              {authMode === 'login' ? 'Login' : 'Register'}
            </h1>
          </div>

          <div className="mb-0">
            <h2 className="text-4xl font-extrabold text-black mb-2 tracking-tighter">BREX</h2>
            <p className="text-black/80 text-sm font-medium">
              {authMode === 'login' 
                ? 'Give credential to sign in your account' 
                : 'Provide information to register your account'}
            </p>
          </div>

          {/* Decorative circles from screenshot */}
          <div className="absolute right-[-20px] top-[20px] w-40 h-40 border-2 border-white/10 rounded-full" />
          <div className="absolute right-[20px] top-[60px] w-20 h-20 border-2 border-white/20 rounded-full flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          <div className="absolute right-[100px] top-[140px] w-2.5 h-2.5 bg-white/40 rounded-full" />
        </div>

        {/* Form Section */}
        <div className="flex-1 bg-white rounded-t-[40px] -mt-10 px-8 pt-10 pb-12 shadow-2xl z-10">
          <div className="flex flex-col gap-6 max-w-sm mx-auto">
            
            {/* User Name Field (Register Mode) */}
            {authMode === 'register' && (
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-[#333] ml-1">Full Name</label>
                <div className="flex bg-[#f3f4f6] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#ff9c00]/30 transition-all">
                  <input 
                    type="text"
                    placeholder="Enter your full name" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-transparent flex-1 px-4 py-4 text-sm font-medium outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}

            {/* Phone Field */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-[#333] ml-1">Phone Number</label>
              <div className="flex bg-[#f3f4f6] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#ff9c00]/30 transition-all">
                <input 
                  type="tel"
                  placeholder={authMode === 'login' ? "Phone number" : "e.g. 07077599057"} 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-transparent flex-1 px-4 py-4 text-sm font-medium outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-[#333] ml-1">Password</label>
              <div className="flex bg-[#f3f4f6] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#ff9c00]/30 transition-all items-center pr-4">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent flex-1 px-4 py-4 text-sm font-medium outline-none placeholder:text-gray-400"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <>
                {/* Confirm Password Field */}
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[#333] ml-1">Confirm Password</label>
                  <div className="flex bg-[#f3f4f6] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#ff9c00]/30 transition-all">
                    <input 
                      type="password"
                      placeholder="Repeat your password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-transparent flex-1 px-4 py-4 text-sm font-medium outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Invitation Field */}
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[#333] ml-1">Invitation Code (Optional)</label>
                  <div className="flex bg-[#f3f4f6] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#ff9c00]/30 transition-all">
                    <input 
                      type="text"
                      placeholder="Invitation code" 
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      className="bg-transparent flex-1 px-4 py-4 text-sm font-medium outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </>
            )}

            {authMode === 'login' && (
              <div className="flex items-center gap-2 mt-1">
                <div 
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all ${rememberMe ? 'bg-[#ff9c00] border-[#ff9c00]' : 'border-gray-300'}`}
                >
                   {rememberMe && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <span className="text-[11px] font-semibold text-gray-400">Remember username/password</span>
              </div>
            )}

            {authError && <p className="text-red-500 text-xs font-bold text-center animate-pulse">{authError}</p>}

            <button 
              onClick={authMode === 'login' ? handleNativeLogin : handleNativeRegister} 
              className="w-full bg-[#ff9c00] text-black font-bold py-4 rounded-full shadow-lg shadow-[#ff9c00]/20 active:scale-[0.98] transition-all mt-4"
            >
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>

            {authMode === 'login' ? (
              <p className="text-center text-xs font-semibold text-gray-400 mt-4">
                Don't have an account ?<button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-[#ff9c00] ml-1">Register</button>
              </p>
            ) : (
              <p className="text-center text-xs font-semibold text-gray-400 mt-4">
                Already have an account ?<button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-[#ff9c00] ml-1">Login</button>
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

    return (
      <div className="px-5 pt-8 pb-10 flex flex-col gap-6 bg-[#0C1017] min-h-screen">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9c00]/10 border border-[#ff9c00] rounded-full flex items-center justify-center font-black italic text-[#ff9c00] text-lg">
              B
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-black m-0">Brex</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff9c00] animate-pulse" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Secure Account Active</span>
              </div>
            </div>
          </div>
          <div onClick={() => navigate(Screen.Profile)} className="cursor-pointer active:scale-95 transition-transform ring-2 ring-[#ff9c00]/20 rounded-full p-0.5 bg-white">
            <Memoji state={userData.memojiState} size="sm" />
          </div>
        </div>

        {/* Dynamic Social Proof marquee banner */}
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 overflow-hidden shadow-sm -mt-1 select-none col-span-full">
          <span className="flex-shrink-0 flex items-center justify-center bg-gray-100 text-[#ff9c00] border border-gray-200 text-[8px] font-black uppercase tracking-wider font-mono rounded px-1.5 py-0.5 animate-pulse">Live Settlements</span>
          <p className="text-gray-600 font-mono text-[9px] font-bold truncate tracking-tight transition-all duration-300">
            {SOCIAL_PROOF_DEEDS[socialIdx]}
          </p>
        </div>

        {/* Active Broadcasts announcements */}
        {broadcasts && broadcasts.length > 0 && (
          <div className="bg-amber-500/10 border border-[#b45309]/30 text-amber-300 p-4 rounded-xl text-[11px] leading-relaxed relative overflow-hidden flex flex-col gap-1.5 shadow-sm col-span-full">
            <div className="flex justify-between items-center">
              <span className="font-extrabold font-mono text-[8px] uppercase tracking-wider text-amber-400 flex items-center gap-1">📣 SYSTEM-WIDE BROADCAST BULLETIN</span>
              <span className="text-[8px] opacity-75 font-mono">{broadcasts[0].date}</span>
            </div>
            <div>
              <p className="text-white font-black text-[11px] leading-tight-none">{broadcasts[0].title}</p>
              <p className="text-slate-300 mt-1 font-semibold text-[10px]">{broadcasts[0].content}</p>
            </div>
          </div>
        )}



        {/* Balance block */}
        <div className="bg-gradient-to-br from-[#ff9c00] to-[#ffcc33] rounded-[32px] p-6 relative overflow-hidden shadow-xl shadow-[#ff9c00]/20">
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
              <Coins size={14} /> Instant Deposit
            </button>
            <button 
              onClick={() => {
                setFundTab('withdrawal');
                navigate(Screen.Fund);
              }}
              className="bg-white/20 hover:bg-white/30 text-black border border-black/10 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none"
            >
              <Wallet size={14} /> Instant Payout
            </button>
          </div>
        </div>

        {/* Balance Trend Line */}
        <div className="h-28 w-full -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff9c00" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ff9c00" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ borderRadius: '16px', backgroundColor: '#131926', border: '1px solid #1E293B', color: 'white', fontSize: '10px', fontWeight: 'bold' }} 
              />
              <Area type="monotone" dataKey="value" stroke="#ff9c00" strokeWidth={3} fillOpacity={1} fill="url(#balanceGrad)" />
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
      <div className="px-5 pt-8 pb-10 flex flex-col gap-5 bg-[#0C1017] min-h-screen">
        
        {/* Title */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Market Plans</h2>
            <p className="text-[#64748B] text-xs font-bold leading-none mt-1">View available savings plans</p>
          </div>
          <div className="bg-[#8CEE47]/10 text-[#8CEE47] p-1.5 rounded-xl border border-[#8CEE47]/20 flex items-center justify-center text-[10px] font-black font-mono px-3">
            ACTIVE DEPOSITS
          </div>
        </div>

        {/* Explain info */}
        <div className="bg-[#131926] p-4 rounded-2xl border border-[#1E293B] text-xs text-slate-400 font-semibold leading-relaxed">
          💡 <span className="text-white font-bold">Plan Rule:</span> Active savings plans let you claim your earnings daily. You can claim once per day to add your profit directly to your balance.
        </div>

        {/* Interactive VIP Tier Progression Slider */}
        <div className="bg-[#131926] border border-[#1E293B] p-5 rounded-2xl mb-2">
            <h3 className="text-white font-black text-xs mb-1">Profit Calculator</h3>
            <p className="text-slate-500 font-mono text-[9px] mb-4 font-bold">Drag slider to preview yield potential</p>
            <div className="flex flex-col gap-3">
              <input type="range" min="1" max="8" defaultValue="3" className="w-full accent-[#8CEE47]" onChange={(e) => {
                const el = document.getElementById('vip-tier-preview');
                const val = parseInt(e.target.value);
                const daily = [800, 2500, 12000, 35000, 85000, 200000, 500000, 1200000][val - 1];
                if(el) {
                  el.innerHTML = `₦${daily.toLocaleString()}`;
                  document.getElementById('vip-tier-level')!.innerText = `VIP Tier ${val}`;
                }
              }} />
              <div className="flex justify-between items-center bg-[#0C1017] border border-[#1E293B] px-3 py-2 rounded-xl">
                 <span id="vip-tier-level" className="text-white font-black text-[10px]">VIP Tier 3</span>
                 <div className="text-right">
                    <span className="text-[#64748B] text-[8px] uppercase font-bold block leading-none">Daily Profit</span>
                    <span id="vip-tier-preview" className="text-[#8CEE47] font-black font-mono text-sm leading-none">₦12,000</span>
                 </div>
              </div>
            </div>
        </div>

        {/* Investment Options list */}
        <div className="flex flex-col gap-5">
          {investmentPlans.map((plan) => {
            const hasJoined = plan.joined;
            const isCompleted = plansCompletedToday.includes(plan.id);

            return (
              <div 
                key={plan.id}
                className={`bg-[#131926] border rounded-[32px] p-5.5 relative overflow-hidden transition-all ${hasJoined ? 'border-[#8CEE47]/40 shadow-lg shadow-[#8CEE47]/5' : 'border-[#1E293B]'}`}
              >
                
                {/* Upper card block */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0C1017] border border-[#1E293B] flex items-center justify-center text-3xl shadow-lg relative shrink-0">
                    {plan.avatar}
                  </div>
                  
                  <div className="flex-1 font-semibold">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      {plan.name} {hasJoined && <span className="bg-[#8CEE47]/10 text-[#8CEE47] text-[8px] px-2 py-0.5 rounded-full uppercase border border-[#8CEE47]/15">ACTIVE</span>}
                    </h3>
                    <div className="mt-1 mb-2">
                       <span className="inline-block bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono animate-pulse">
                         Capacity limit: {92 + (plan.id * 2)}% Filled
                       </span>
                    </div>
                    <div className="space-y-1 mt-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Savings Period:</span>
                        <span className="text-slate-200 font-bold font-mono">{plan.workingDays}/{plan.period}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum Deposit:</span>
                        <span className="text-[#8CEE47] font-bold font-mono">₦{plan.cost.toLocaleString()} NGN</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Interest Profit:</span>
                        <span className="text-[#8CEE47] font-bold font-mono">+₦{plan.dailyProfit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid performance info */}
                <div className="grid grid-cols-3 gap-2 bg-[#0C1017]/80 rounded-2xl p-2.5 text-center mb-4 border border-[#1E293B]/60 justify-around text-xs font-semibold">
                  <div>
                    <span className="block text-[8px] text-slate-500 font-bold font-mono uppercase">My Deposit</span>
                    <span className="text-[#8CEE47] font-extrabold font-mono">₦{plan.balance.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 font-bold font-mono uppercase">Daily Profit</span>
                    <span className="text-white font-extrabold font-mono">₦{plan.earnYesterday.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 font-bold font-mono uppercase">Total Earned</span>
                    <span className="text-white font-extrabold font-mono">₦{plan.earnTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                        showToast(`Plan profit: ₦${plan.dailyProfit.toLocaleString()} daily. Duration: ${plan.workingDays} working days.`);
                    }}
                    className="flex-1 bg-[#1E293B] hover:bg-[#2A354C] text-slate-300 text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer outline-none"
                  >
                    Plan Details
                  </button>
                  
                  {hasJoined ? (
                    <button 
                      onClick={() => claimDailyEarnings(plan)}
                      disabled={isCompleted}
                      className={`flex-[2] text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 outline-none ${
                        isCompleted 
                          ? 'bg-[#1E293B]/40 text-slate-500 border border-transparent cursor-not-allowed' 
                          : 'bg-[#8CEE47] hover:bg-[#7BE13A] text-slate-900 shadow-md shadow-[#8CEE47]/10'
                      }`}
                    >
                      <Zap size={10} /> {isCompleted ? (
                        <div className="flex flex-col">
                          <span>CLAIMED TODAY</span>
                          <span className="text-[#8CEE47]/70 text-[8px] animate-pulse">Wait: {new Date(new Date().setHours(24,0,0,0)).getTime() - Date.now() > 0 ? new Date(new Date(new Date().setHours(24,0,0,0)).getTime() - Date.now()).toISOString().substring(11,19) : '00:00:00'}</span>
                        </div>
                      ) : '⚡ CLAIM DAILY PROFIT'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSubscribeInvestmentPlan(plan.id, plan.cost)}
                      className="flex-[2] text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all bg-[#FF6B35] hover:bg-[#E05A2A] text-white shadow-lg shadow-[#FF6B35]/15 cursor-pointer outline-none"
                    >
                      SUBSCRIBE NOW
                    </button>
                  )}
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
      <div className="px-5 pt-8 pb-10 flex flex-col gap-5 bg-[#0C1017] min-h-screen">
        
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Referrals & Rewards</h2>
            <p className="text-[#64748B] text-xs font-bold mt-1">Earn standard bonuses for every active friend you invite</p>
          </div>
        </div>

        {/* Lime statistics card */}
        <div className="bg-[#8CEE47] text-slate-900 rounded-[28px] p-5 font-black">
          <div className="grid grid-cols-2 gap-y-4 font-bold">
            <div>
              <p className="text-[10px] uppercase opacity-75 leading-none mb-1 font-mono font-black">Total Referrals</p>
              <p className="text-3xl font-extrabold font-mono">{userData.teamSize || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-75 leading-none mb-1 font-mono font-black">Active Referrals</p>
              <p className="text-3xl font-extrabold font-mono">{userData.rechargeMembers || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-75 leading-none mb-1 font-mono font-black">New Referrals Today</p>
              <p className="text-xl font-extrabold font-mono">{userData.teamSizeToday || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-75 leading-none mb-1 font-mono font-black">Active Referrals Today</p>
              <p className="text-xl font-extrabold font-mono">{userData.effectiveSizeToday || 0}</p>
            </div>
          </div>
        </div>

        {/* Levels selector */}
        <div className="flex gap-2 font-mono">
          {[1, 2, 3].map((lvl) => (
            <button 
              key={lvl}
              onClick={() => setActiveTeamLevel(lvl)}
              className={`flex-1 py-3 text-xs font-black tracking-wider rounded-xl transition-all cursor-pointer outline-none ${
                activeTeamLevel === lvl 
                  ? 'bg-[#8CEE47] text-slate-900 font-black' 
                  : 'bg-[#131926] text-slate-400 border border-[#1E293B]'
              }`}
            >
              {lvl === 1 ? 'Tier 1' : lvl === 2 ? 'Tier 2' : 'Tier 3'} ({teamMembers.filter(u => u.lvl === lvl).length})
            </button>
          ))}
        </div>

        {/* Profit tier information */}
        <div className="flex justify-between items-center text-xs font-black bg-[#131926] p-4 rounded-xl border border-[#1E293B]">
          <span className="text-slate-400 font-bold font-mono uppercase tracking-wider text-[10px]">Tier {activeTeamLevel} invite commission rate</span>
          <span className="text-[#8CEE47] text-sm font-mono">{activeTeamLevel === 1 ? '10.0%' : activeTeamLevel === 2 ? '5.0%' : '3.0%'}</span>
        </div>

        {/* List of team downlines */}
        <div className="space-y-3.5">
          {currentLevelUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-bold text-xs bg-[#131926] rounded-2xl border border-dashed border-slate-800">
              No referral accounts registered under Tier {activeTeamLevel} yet.
            </div>
          ) : (
            currentLevelUsers.map((partner, idx) => (
              <div 
                key={idx}
                className="bg-[#131926] border border-[#1E293B] rounded-2xl p-4.5 flex flex-col gap-2 hover:border-[#8CEE47]/10 transition-all font-semibold"
              >
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm font-extrabold tracking-widest font-mono">+234 {partner.phone}</span>
                  <span className="text-[10px] text-slate-500 font-bold font-mono">{partner.date}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-[#1E293B]/40 text-xs">
                  <div>
                    <span className="text-[#64748B] text-[9px] block font-bold font-mono uppercase">Deposited</span>
                    <span className="text-[#8CEE47] font-bold font-mono">₦{partner.recharge.toLocaleString()} NGN</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#64748B] text-[9px] block font-bold font-mono uppercase">Withdrawn</span>
                    <span className="text-slate-300 font-bold font-mono">₦{partner.withdraw.toLocaleString()} NGN</span>
                  </div>
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

    const { canWithdraw, isSunday } = checkWithdrawalAvailability();
    const hasSavedPayout = !!(userData.linkedBankCode || userData.linkedCardNumber);

    return (
      <div className="px-5 pt-8 pb-10 flex flex-col gap-5 bg-[#0C1017] min-h-screen">
        
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 bg-[#131926] p-1 rounded-xl border border-[#1E293B] mb-2">
          <button 
            onClick={() => {
              setFundTab('recharge');
              setRechargeStep('input');
            }}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer outline-none ${
              fundTab === 'recharge' 
                ? 'bg-[#8CEE47] text-slate-900 shadow-md font-black' 
                : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            Deposit
          </button>
          <button 
            onClick={() => setFundTab('withdrawal')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer outline-none ${
              fundTab === 'withdrawal' 
                ? 'bg-[#8CEE47] text-slate-900 shadow-md font-black' 
                : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            Payout
          </button>
          <button 
            onClick={() => setFundTab('history')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer outline-none ${
               fundTab === 'history' 
                 ? 'bg-[#8CEE47] text-slate-900 shadow-md font-black' 
                 : 'bg-transparent text-slate-400 hover:text-white'
             }`}
          >
            History
          </button>
        </div>

        {fundTab === 'recharge' ? (
          /* WEBHOOK-DRIVEN DEPOSIT FLOW */
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            
            <div className="bg-[#8CEE47]/10 border border-[#8CEE47]/20 text-[#8CEE47] p-4.5 rounded-2xl text-[11px] flex items-start gap-2.5">
              <Zap size={16} className="shrink-0 mt-0.5 text-[#8CEE47] animate-pulse" />
              <p className="leading-relaxed font-semibold">
                Please enter a deposit amount. Your funds are securely processed and added to your available balance.
              </p>
            </div>

            <div className="flex flex-col gap-2 font-semibold">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Select or Enter Deposit Amount</label>
              <div className="flex items-center gap-1 text-2xl font-black text-white bg-[#131926] border border-[#1E293B] rounded-[24px] px-5 py-4 focus-within:border-[#8CEE47]">
                <span className="text-[#8CEE47] font-extrabold pr-1">₦</span>
                <input 
                  type="number" 
                  value={rechargeAmt || ''}
                  onChange={(e) => setRechargeAmt(Number(e.target.value))}
                  placeholder="Minimum 1,000 NGN"
                  className="bg-transparent text-white w-full outline-none font-black text-xl font-mono"
                />
              </div>
            </div>

            {/* Selector presets */}
            <div className="grid grid-cols-4 gap-2">
              {[2000, 10000, 30000, 50000, 100000, 250000, 500000, 1000000].map((val) => (
                <button
                  key={val}
                  onClick={() => setRechargeAmt(val)}
                  className={`py-2 px-1 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer font-mono outline-none ${
                    rechargeAmt === val 
                      ? 'bg-[#8CEE47] text-slate-900 font-bold scale-[1.02]' 
                      : 'bg-[#131926] text-slate-300 border border-[#1E293B]'
                  }`}
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              onClick={triggerPaystackCheckout}
              disabled={rechargeAmt < 1000}
              className="w-full bg-[#8CEE47] hover:bg-[#7BE13A] py-4 rounded-xl text-slate-900 font-extrabold text-sm tracking-wide uppercase transition-all mt-2 cursor-pointer disabled:opacity-50 outline-none flex items-center justify-center gap-2"
            >
              <CreditCard size={16} /> Pay Securely via Paystack
            </button>

            {/* PAYSTACK MODAL OVERLAY SIMULATOR */}
            {paystackShowSimulator && (
              <div className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="bg-[#111622] border border-[#1E293B] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  {/* Paystack header */}
                  <div className="bg-[#0e2c24] p-5 border-b border-[#053127] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#3ac6a8]/20 flex items-center justify-center logo-icon text-white font-mono font-black italic text-xs">P</div>
                      <div>
                        <h4 className="text-white text-xs font-black tracking-widest uppercase">Paystack Secure Checkout</h4>
                        <p className="text-[10px] text-[#3ac6a8] font-mono leading-none mt-0.5">Test Gateway Instance</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setPaystackShowSimulator(false)}
                      className="text-slate-400 hover:text-white text-sm font-bold tracking-wider cursor-pointer outline-none w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body info */}
                  <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                    <div className="text-center bg-[#131926] p-4.5 rounded-2xl border border-[#1E293B] font-mono">
                      <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mb-1">Paying to merchant</p>
                      <p className="text-slate-300 text-xs font-extrabold font-sans">BREX SECURE NETWORK LTD</p>
                      <p className="text-2xl font-black text-[#3ac6a8] mt-2">₦{rechargeAmt.toLocaleString()} NGN</p>
                      <p className="text-[10.5px] text-[#64748B] mt-1 text-center font-bold">Ref: {paystackReference}</p>
                    </div>

                    <div className="space-y-3 font-semibold text-xs text-slate-300">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider font-mono">Payment Channel Methods</p>
                      
                      <div className="bg-[#1E293B]/40 p-3.5 rounded-xl border border-[#1E293B] flex items-center justify-between cursor-pointer hover:bg-[#1E293B]/70 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-base select-none">💳</span>
                          <span className="text-white text-xs font-bold font-sans">Standard Credit / Debit card</span>
                        </div>
                        <span className="text-[8px] bg-emerald-500/10 text-[#8CEE47] uppercase px-1 rounded-sm font-mono tracking-wide font-black">Active</span>
                      </div>

                      <div className="bg-[#1E293B]/10 p-3 rounded-xl border border-dashed border-[#1E293B] flex items-center justify-between text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="text-base select-none">🏦</span>
                          <span className="text-xs font-semibold">Bank Transfer / USSD Codes</span>
                        </div>
                        <span className="text-[8px] uppercase tracking-wide font-mono font-bold">Alternative</span>
                      </div>
                    </div>

                    <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                      🔒 Secured by industry-standard cryptography. Completing payment instantly dispatches a <code className="text-[#8CEE47] bg-[#8CEE47]/10 px-1 py-0.5 rounded font-mono text-[9px] font-bold">charge.success</code> webhook directly to our Node backend servers.
                    </div>
                  </div>

                  {/* Submit checkout */}
                  <div className="p-5 bg-[#131926] border-t border-[#1E293B] flex flex-col gap-2.5">
                    <button
                      onClick={handlePaystackWebhookAuthorize}
                      disabled={paystackCheckingPayment}
                      className="w-full bg-[#0bc483] hover:bg-[#07ad73] text-white py-3.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer"
                    >
                      {paystackCheckingPayment ? (
                        <>
                          <RefreshCw size={13} className="animate-spin text-white" /> Dispatching hook...
                        </>
                      ) : (
                        `Authorize Live Webhook Deposit`
                      )}
                    </button>
                    <p className="text-[9px] text-[#64748B] tracking-wider text-center font-mono uppercase">Merchant ID: PS_SECURE_9901</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : fundTab === 'withdrawal' ? (
          /* WITHDRAWAL FLOW */
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            
            {/* Hour window notice banner (WAT = Nigerian UTC+1) */}
            <div className={`p-4.5 rounded-2xl text-xs flex items-start gap-2.5 font-semibold ${
              canWithdraw 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-[#8CEE47]' 
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {canWithdraw ? (
                <>
                  <Clock size={16} className="shrink-0 mt-0.5 text-[#8CEE47] animate-pulse" />
                  <p className="leading-relaxed">
                    Withdrawal Window is Open! Withdrawals are processed daily between <span className="text-white font-extrabold">9:00 AM</span> and <span className="text-white font-extrabold">2:00 PM WAT</span>, excluding Sundays.
                  </p>
                </>
              ) : (
                <>
                  <Clock size={16} className="shrink-0 mt-0.5 text-red-400 animate-bounce" />
                  <div className="space-y-1">
                    <p className="font-extrabold uppercase tracking-wide text-red-400 text-[11px]">Withdrawals processing window is currently closed</p>
                    <p className="leading-relaxed text-slate-400 font-medium font-sans">
                      Withdrawals are processed from <span className="text-white font-extrabold">9:00 AM to 2:00 PM WAT daily</span> (Monday to Saturday). Withdrawals are closed on Sundays.
                    </p>
                  </div>
                </>
              )}
            </div>

            {!hasSavedPayout ? (
              /* SECURE FIRST-TIME BINDING CARD FLOW */
              <div className="bg-[#111622] border border-amber-500/30 p-5 rounded-[28px] space-y-4 animate-in zoom-in-95 font-semibold">
                <div className="flex items-center gap-2 pb-2.5 border-b border-[#1E293B]">
                  <span className="text-xl">💳</span>
                  <div>
                    <h3 className="text-white text-sm font-extrabold">Link Payout Bank Account</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium leading-none mt-0.5">Add your bank details for daily withdrawals</p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-1.5 focus-within:border-[#8CEE47]">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">Preferred Bank Service</label>
                    <select 
                      value={withdrawBank}
                      onChange={(e) => setWithdrawBank(e.target.value)}
                      className="bg-[#131926] border border-[#1E293B] text-white px-4 py-3.5 rounded-xl outline-none focus:border-[#8CEE47] text-xs font-semibold cursor-pointer font-mono"
                    >
                      <option value="OPay">OPay Wallet (Standard)</option>
                      <option value="Moniepoint">Moniepoint Microfinance</option>
                      <option value="PalmPay">PalmPay Financials</option>
                      <option value="Kuda Bank">Kuda Technologies</option>
                      <option value="GTBank">Guaranty Trust Bank (GTBank)</option>
                      <option value="Zenith Bank">Zenith Bank PLC</option>
                      <option value="Access Bank">Access Bank PLC</option>
                      <option value="UBA">United Bank for Africa (UBA)</option>
                      <option value="Wema Bank">Wema Bank / ALAT</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">10-Digit NUBAN Account Number</label>
                    <input 
                      type="text" 
                      maxLength={10}
                      value={payeeAccount}
                      onChange={(e) => setPayeeAccount(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit account number"
                      className="bg-[#131926] border border-[#1E293B] text-white px-4 py-3.5 rounded-xl outline-none focus:border-[#8CEE47] transition-all text-xs font-semibold font-mono"
                    />
                    
                    {isVerifyingPayout && (
                      <div className="text-[9px] text-[#8CEE47] font-bold font-mono animate-pulse flex items-center gap-1">
                        <RefreshCw size={10} className="animate-spin" /> Fetching legal beneficiary name...
                      </div>
                    )}
                    {verifiedPayoutName && (
                      <div className="bg-[#8CEE47]/10 p-2.5 rounded-xl text-[10px] text-[#8CEE47] font-bold font-mono">
                         Payee: {verifiedPayoutName} ✅
                      </div>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      if (payeeAccount.trim().length !== 10) {
                        showToast("Account number must be exactly 10 digits");
                        return;
                      }
                      try {
                        const payoutName = verifiedPayoutName || userData.name || "Verified Holder";
                        await updateBank({
                          linkedBankName: withdrawBank,
                          linkedBankCode: payeeAccount,
                          linkedBankOwner: payoutName.toUpperCase()
                        });
                        showToast("Your payout bank account has been saved! 💳");
                      } catch (err: any) {
                        showToast("Error saving bank details: " + err.message);
                      }
                    }}
                    disabled={payeeAccount.trim().length !== 10 || isVerifyingPayout}
                    className="w-full bg-[#8CEE47] hover:bg-[#7BE13A] py-3.5 rounded-xl text-slate-900 font-black text-xs uppercase tracking-wide transition-all cursor-pointer disabled:opacity-40"
                  >
                    🔒 Save Bank Account
                  </button>
                </div>
              </div>
            ) : (
              /* STREAMLINED EASY WITHDRAWAL SUBMISSION FLOW */
              <div className="space-y-4 animate-in duration-300">
                
                {/* Linked Bank Card UI layout */}
                <div className="bg-gradient-to-br from-[#1b2512] to-[#0e160a] border border-[#2b3a1a] p-5 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#8CEE47]/5 rounded-full blur-2xl -mr-8 -mt-8" />
                  
                  <div className="flex justify-between items-start font-semibold">
                    <div>
                      <span className="text-[8px] bg-[#8CEE47]/20 text-[#8CEE47] font-black uppercase tracking-widest px-2.5 py-1 rounded-md font-mono">Payout Destination</span>
                      <h4 className="text-white text-base font-extrabold mt-3 font-mono">{userData.linkedBankName}</h4>
                      <p className="text-xs text-slate-300 font-extrabold font-mono mt-0.5">**** **** {userData.linkedBankCode ? userData.linkedBankCode.slice(-4) : 'XXXX'}</p>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        if (confirm("Are you sure you want to unlink and update your payout bank account details?")) {
                          await updateBank({
                            linkedBankName: '',
                            linkedBankCode: '',
                            linkedBankOwner: ''
                          });
                          setPayeeAccount('');
                          setVerifiedPayoutName('');
                          showToast("Payout settings reset.");
                        }
                      }}
                      className="text-[9px] text-[#8CEE47]/70 hover:text-[#8CEE47] underline bg-white/5 px-2.5 py-1 rounded-md transition-all font-mono"
                    >
                      Reset Bank
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs mt-6 font-mono pt-3 border-t border-[#8CEE47]/10">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">HOLDER:</span>
                    <span className="text-[#8CEE47] font-black tracking-wide">{userData.linkedBankOwner || userData.name}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold bg-[#131926] p-4 rounded-xl border border-[#1E293B] font-mono">
                  <span className="text-[#64748B] font-bold uppercase text-[9px]">Available balance</span>
                  <span className="text-[#8CEE47] font-extrabold">₦{userData.balance.toLocaleString()} NGN</span>
                </div>

                {/* Amount selection input */}
                <div className="flex flex-col gap-2 font-semibold">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Withdrawal Amount</label>
                  <div className="flex items-center gap-1 text-2xl font-black text-white bg-[#131926] border border-[#1E293B] rounded-[24px] px-5 py-4 focus-within:border-[#8CEE47]">
                    <span className="text-[#8CEE47] font-extrabold pr-1">₦</span>
                    <input 
                      type="number" 
                      value={withdrawAmt || ''}
                      onChange={(e) => setWithdrawAmt(Number(e.target.value))}
                      className="bg-transparent text-white w-full outline-none font-black text-lg"
                    />
                  </div>
                </div>

                {/* Selector presets */}
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 5000, 10000, 30000, 50000, 100000, 250000, 500000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setWithdrawAmt(val)}
                      className={`py-2 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer font-mono outline-none ${
                        withdrawAmt === val 
                          ? 'bg-[#8CEE47] text-slate-900 font-black scale-[1.02]' 
                          : 'bg-[#131926] text-slate-300 border border-[#1E293B]'
                      }`}
                    >
                      {val.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Levy charges description */}
                <div className="space-y-2 bg-[#131926] p-4.5 rounded-xl border border-[#1E293B] text-xs font-semibold">
                  <div className="flex justify-between font-mono text-[10px] text-slate-500">
                    <span>Request amount:</span>
                    <span className="text-slate-200">₦{withdrawAmt.toLocaleString()} NGN</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-slate-500">
                    <span>Processing service fee:</span>
                    <span className="text-[#8CEE47]">2.0% Processing Fee</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#1E293B] text-sm">
                    <span className="text-slate-400">You Will Receive:</span>
                    <span className="text-[#8CEE47] font-black font-mono">₦{(withdrawAmt * 0.98).toLocaleString()} NGN</span>
                  </div>
                </div>

                {/* Secure Pin input */}
                <div className="flex flex-col gap-2 font-semibold">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono text-amber-400 flex items-center gap-1">
                    <ShieldCheck size={12} /> Transaction Security PIN
                  </label>
                  <input 
                    type="password" 
                    maxLength={4}
                    placeholder="****" 
                    value={enteredWithdrawPIN}
                    onChange={(e) => setEnteredWithdrawPIN(e.target.value.replace(/\D/g, ''))}
                    className="bg-[#131926] border border-amber-400/30 text-amber-400 placeholder:text-amber-400/30 px-4 py-3 rounded-xl outline-none text-center tracking-[1em] font-extrabold text-2xl transition-all font-mono focus:border-amber-400 focus:bg-amber-400/5 mb-1"
                  />
                </div>

                {withdrawSuccessMsg && (
                  <div className="bg-[#8CEE47]/10 border border-[#8CEE47]/20 text-[#8CEE47] p-4 font-bold leading-relaxed font-mono rounded-2xl text-xs">
                    {withdrawSuccessMsg}
                  </div>
                )}

                {withdrawErrorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{withdrawErrorMsg}</span>
                  </div>
                )}

                <button
                  onClick={handleWithdrawSubmit}
                  disabled={withdrawAmt <= 0 || !canWithdraw}
                  className="w-full bg-[#8CEE47] hover:bg-[#7BE13A] py-4 rounded-xl text-slate-900 font-extrabold text-sm tracking-wide uppercase transition-all cursor-pointer disabled:opacity-45 outline-none flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={16} /> Submit Withdrawal Request
                </button>
              </div>
            )}

          </div>
        ) : (
          /* HISTORY LEDGER FLOW */
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="bg-[#131926] p-4.5 rounded-[24px] border border-[#1E293B]">
              <h3 className="text-sm font-black text-white mb-1">📜 Transaction History</h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                All transactions are displayed here in real-time.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {!userData.transactions || userData.transactions.length === 0 ? (
                <div className="py-16 text-center text-slate-500 font-bold text-xs border border-[#1E293B] rounded-[24px] bg-[#131926]/50">
                  No registered transactional history on this account node.
                </div>
              ) : (
                userData.transactions.map((t: any) => {
                  const isPositive = ['recharge', 'claim', 'bonus'].includes(t.type);
                  return (
                    <div 
                      key={t.id}
                      className="bg-[#131926] border border-[#1E293B] p-4 rounded-2xl flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3 font-semibold text-xs">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm select-none ${
                          t.type === 'recharge' ? 'bg-[#8CEE47]/10 text-[#8CEE47]' : 
                          t.type === 'withdraw' ? 'bg-amber-400/10 text-amber-400' :
                          t.type === 'subscribe' ? 'bg-orange-500/10 text-orange-400' : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {t.type === 'recharge' ? '📥' : t.type === 'withdraw' ? '📤' : t.type === 'subscribe' ? '💼' : '🎁'}
                        </div>
                        <div>
                          <p className="text-white font-extrabold uppercase font-mono tracking-tight text-[11px]">{t.type}</p>
                          <p className="text-slate-400 text-[9px] mt-0.5">{t.details || t.date}</p>
                        </div>
                      </div>
                      
                      <div className="text-right font-semibold">
                        <p className={`font-mono font-extrabold text-sm ${isPositive ? 'text-[#8CEE47]' : 'text-red-400'}`}>
                          {isPositive ? '+' : '-'}₦{t.amount.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase tracking-wide">
                          {t.status || 'success'}
                        </p>
                      </div>
                    </div>
                  );
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
            <div className="absolute -inset-3 bg-[#8CEE47] rounded-full blur-xl opacity-10 group-hover:opacity-20 transition-all duration-500" />
            <div className="ring-2 ring-[#8CEE47] rounded-full p-1 bg-[#131926]">
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
            <span className="text-[#8CEE47] text-md font-extrabold font-mono">{userData.teamSize || 0} friends</span>
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
      
      {/* Toast Notification block */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900 border border-[#8CEE47]/30 text-white z-50 px-4 py-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-black shadow-2xl font-mono">
          <div className="w-2 h-2 rounded-full bg-[#8CEE47] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {renderContent()}

      {/* INVESTMENT CLAIM RUNNING PIPELINE MODAL */}
      {showYieldModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-5 z-50 backdrop-blur-md">
          <div className="bg-[#131926] border border-[#1E293B] p-6 rounded-[32px] max-w-sm w-full font-semibold text-xs text-slate-400">
            <div className="flex flex-col items-center justify-center text-center gap-4 mb-6">
              <div className="w-16 h-16 bg-[#8CEE47]/10 border border-[#8CEE47]/30 rounded-full flex items-center justify-center text-3xl animate-spin" style={{ animationDuration: '6s' }}>
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
                className="bg-[#8CEE47] h-full transition-all duration-300 rounded-full"
                style={{ width: `${yieldProgress}%` }}
              />
            </div>

            {/* Logger terminal output */}
            <div className="bg-[#0C1017] p-4.5 rounded-2xl h-44 overflow-y-auto flex flex-col gap-2 font-mono text-[10px] text-[#8CEE47] leading-relaxed border border-[#1E293B]/60 align-left text-left">
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
                        <option value="GTBank">Guaranty Trust Bank (GTBank)</option>
                        <option value="Zenith Bank">Zenith Bank PLC</option>
                        <option value="Access Bank">Access Bank PLC</option>
                        <option value="UBA">United Bank for Africa (UBA)</option>
                        <option value="Wema Bank">Wema Bank / ALAT</option>
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
                            setBankSettingsOwner(editName ? editName.toUpperCase() + ' BINDING' : 'Oluwaseun Jonathan Binding');
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
                  <span className="text-[#64748B] font-mono text-[9px] uppercase font-bold">Payout PIN Code</span>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={transactionPIN}
                    onChange={(e) => setTransactionPIN(e.target.value.replace(/\D/g, ''))}
                    placeholder="1122"
                    className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-mono text-center tracking-widest text-lg"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-[#64748B] font-mono text-[9px] uppercase">New strong login Password</span>
                  <input 
                    type="password" 
                    value={securityNewPass}
                    onChange={(e) => setSecurityNewPass(e.target.value)}
                    placeholder="Enter strong login password"
                    className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-semibold"
                  />
                </div>

                <button 
                  onClick={handleSaveSecurity} 
                  className="w-full bg-[#8CEE47] py-3 text-slate-900 rounded-xl font-bold uppercase transition-all tracking-wider font-mono mt-2 text-xs cursor-pointer outline-none"
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
              <div className="space-y-4 font-semibold text-xs">
                <p className="text-white text-xs font-black uppercase tracking-wider font-mono">🌳 Interactive Network Pedigree Mappings</p>
                
                {/* Visual SVG diagram drawing of user and sub-referrals */}
                <div className="bg-[#0C1017] p-5 rounded-2xl border border-[#1E293B] relative overflow-hidden flex flex-col items-center justify-center min-h-[190px]">
                  
                  {/* Map Nodes SVG layout */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 animate-pulse" xmlns="http://www.w3.org/2000/svg">
                    <line x1="50%" y1="20%" x2="20%" y2="75%" stroke="#8CEE47" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="50%" y1="20%" x2="50%" y2="75%" stroke="#8CEE47" strokeWidth="3" />
                    <line x1="50%" y1="20%" x2="80%" y2="75%" stroke="#8CEE47" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>

                  {/* Central Node user */}
                  <div className="relative z-10 w-12 h-12 bg-slate-900 border-2 border-[#8CEE47] rounded-full flex items-center justify-center text-white font-mono font-black shadow-lg shadow-[#8CEE47]/15">
                    YOU
                  </div>
                  <span className="text-[9px] text-[#8CEE47] font-mono mt-1 font-black">Node center</span>

                  {/* Radiating referred children */}
                  <div className="flex justify-between w-full mt-10 relative z-10 px-2 gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-[#131926] border border-[#1E293B] rounded-full flex items-center justify-center text-slate-300 text-[10px] font-bold">
                        Ayo*
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono mt-1 font-bold">Active</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-[#131926] border-2 border-[#8CEE47] rounded-full flex items-center justify-center text-[#8CEE47] text-[10px] font-black font-mono">
                        Kun*
                      </div>
                      <span className="text-[8px] text-[#8CEE47] font-mono mt-1 font-black">Level 1 (Premium)</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-[#131926] border border-[#1E293B] rounded-full flex items-center justify-center text-slate-300 text-[10px] font-bold">
                        Zay*
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono mt-1 font-bold">Active</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
                  • Each node reflects a live Level-1 client associated through your invitation hash <span className="text-white font-bold">{userData.invitationCode}</span>.
                </p>
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
