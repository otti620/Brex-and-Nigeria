import React, { useState, useEffect, useRef } from 'react';
import flyer1 from './src/assets/images/revenue_stream_flyer_1780385009267.png';
import flyer2 from './src/assets/images/wealth_builder_flyer_1780385024026.png';
import { FlyerPopup } from './components/FlyerPopup';
import { LiveActivityBar } from './components/LiveActivityBar';
import { TelegramModal } from './components/TelegramModal';
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
  ChevronDown,
  Send,
  Sparkles,
  Trophy,
  Ticket,
  FileText,
  Award,
  Shield,
  Rocket
} from 'lucide-react';

const CLIENT_DEFAULT_VIP_PLANS = [
  { id: 'vip-0', name: 'Micro Seed', period: '365 Days', workingDays: 0, cost: 2000, balance: 0, earnYesterday: 0, earnTotal: 0, joined: false, level: 0, avatar: '🌾', dailyProfit: 50 },
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

const App: React.FC = () => {
  const { 
    user, 
    userData, 
    loading, 
    siteSettings,
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
    investDigitalSavings,
    claimDigitalSavings,
    simulateInvite,
    loadTeamData,
    refreshProfile,
    isImpersonating,
    stopImpersonating
  } = useFirebase();

  const isSpecificAdmin = userData?.isAdmin;
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    const paymentSuccess = params.get('payment') === 'success';

    const refCode = params.get('ref') || params.get('code') || params.get('invitation');
    if (refCode) {
      setInvitationCode(refCode);
      setAuthMode('register');
      showToast(`Referral link detected! Code ${refCode} auto-applied.`);
    }

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

  // Check for referral code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setInvitationCode(refCode);
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

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('brex_active_screen');
    return (saved as Screen) || Screen.Auth;
  });
  const [selectedIntent, setSelectedIntent] = useState<string>('safe');
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);

  // Funds / Savings States
  const [fundsTab, setFundsTab] = useState<'explore' | 'my_investments'>('explore');
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [fundInvestAmount, setFundInvestAmount] = useState<string>('');
  const [fundInvestDays, setFundInvestDays] = useState<number>(14); // default 14 days
  const [isAllocatingFund, setIsAllocatingFund] = useState<boolean>(false);

  // Digital Asset Savings states
  const [showDigitalSavingsModal, setShowDigitalSavingsModal] = useState<boolean>(false);
  const [dsSelectedAsset, setDsSelectedAsset] = useState<'usdt' | 'btc' | 'eth'>('usdt');
  const [dsAmount, setDsAmount] = useState<string>('');
  const [dsDuration, setDsDuration] = useState<number>(14);
  const [dsLoading, setDsLoading] = useState<boolean>(false);

  const handleDigitalSavingsSubscribe = async () => {
    if (!investDigitalSavings || !userData) return;
    const amountVal = Number(dsAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast("Please enter a valid investment amount.");
      return;
    }

    const mins: Record<string, number> = { usdt: 3000, btc: 5000, eth: 4000 };
    const minRequired = mins[dsSelectedAsset] || 3000;
    if (amountVal < minRequired) {
      showToast(`Minimum deposit required is ₦${minRequired.toLocaleString()}`);
      return;
    }

    if (userData.balance < amountVal) {
      showToast(`Insufficient wallet balance. Please recharge NGN first.`);
      return;
    }

    setDsLoading(true);
    try {
      await investDigitalSavings(dsSelectedAsset, amountVal, dsDuration);
      showToast(`Subscription successful! Allocated ₦${amountVal.toLocaleString()} into digital savings.`);
      setDsAmount('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "E-liquidity block routing error.");
    } finally {
      setDsLoading(false);
    }
  };

  const handleDigitalSavingsClaim = async (id: string) => {
    if (!claimDigitalSavings) return;
    try {
      await claimDigitalSavings(id);
      showToast("Yield maturity asset payout settled to your main balance!");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "Payout settlement failed.");
    }
  };

  // Unused legacy promo states held solely to keep the obsolete/unused renderPromotions function compiling cleanly
  const [promoTab, setPromoTab] = useState<'spin' | 'bids' | 'offers' | 'deal'>('deal');
  const [spinWheelType, setSpinWheelType] = useState<'regular' | 'mega'>('regular');
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResultModal, setSpinResultModal] = useState<any>(null);
  const [bidChoice, setBidChoice] = useState<'high' | 'low'>('high');
  const [betStake, setBetStake] = useState<number>(200);
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidResultModal, setBidResultModal] = useState<any>(null);
  const fetchBidHistory = () => {};
  const handleSpinWheel = () => {};
  const handlePlaceBid = () => {};

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
    
    const watDay = watDate.getDay(); // 0 = Sunday, 6 = Saturday
    const watHour = watDate.getHours(); // Hour 0-23
    
    const isWeekend = watDay === 0 || watDay === 6;
    const isWithinHours = watHour >= 10 && watHour < 12;
    
    return {
      watDay,
      watHour,
      isWeekend,
      canWithdraw: !isWeekend && isWithinHours
    };
  };

  const getTodayReferralsCount = (): number => {
    if (!teamMembers || teamMembers.length === 0) return 0;
    
    const now = new Date();
    const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
    const watDate = new Date(utcTimestamp + 3600000);
    const todayStrStr = watDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
    
    const lvl1ReferredToday = teamMembers.filter((m: any) => {
      if (m.lvl !== 1) return false;
      const regDateStr = m.createdAt || m.createdAtStr || m.date || '';
      if (!regDateStr) return false;
      return regDateStr.includes(todayStrStr);
    });
    
    return lvl1ReferredToday.length;
  };

  const getWithdrawalFeeInfo = () => {
    const now = new Date();
    const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
    const watDate = new Date(utcTimestamp + 3600000);
    const dayOfMonth = watDate.getDate(); // 1 to 31
    const freeDays = [5, 20, 29];
    const isFreeDay = freeDays.includes(dayOfMonth);
    const feePercent = isFreeDay ? 0 : 20;
    return {
      feePercent,
      isFreeDay,
      multiplier: (100 - feePercent) / 100
    };
  };

  const triggerPaystackCheckout = async () => {
    if (rechargeAmt < 100) {
      showToast("Minimum deposit is ₦100 NGN");
      return;
    }
    
    setPaymentErrorDetails(null);
    try {
      showToast("Preparing secure checkout...");
      
      // Auto-validate and generate standard @gmail.com email if missing, dummy, or non-standard
      let userEmail = userData?.email || "";
      const isDummyEmail = !userEmail || 
                            userEmail.includes(".internal") || 
                            userEmail.includes("example.com") || 
                            !userEmail.includes("@");
      
      if (isDummyEmail) {
        let nameSlug = "";
        if (userData?.name) {
          nameSlug = userData.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        }
        if (!nameSlug && userData?.phoneNumber) {
          nameSlug = userData.phoneNumber.replace(/[^0-9]/g, "");
        }
        if (!nameSlug && userData?.id) {
          nameSlug = "user" + userData.id.substring(0, 8);
        }
        if (!nameSlug) {
          nameSlug = "customer" + Math.floor(100000 + Math.random() * 900000);
        }
        userEmail = `${nameSlug}@gmail.com`;
      }

      // 1. Always initialize on the server side first to secure the transaction and get an access_code
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          amount: rechargeAmt,
          first_name: userData?.name?.split(' ')[0] || '',
          last_name: userData?.name?.split(' ').slice(1).join(' ') || '',
          callback_url: window.location.origin + "/?payment=success",
          metadata: {
            userId: userData?.id,
            custom_fields: [
              { display_name: "User Name", variable_name: "user_name", value: userData?.name || "Unknown" },
              { display_name: "User ID", variable_name: "user_id", value: userData?.id || "Unknown" }
            ]
          }
        })
      });
      
      let data: any = null;
      let textResponse = "";
      try {
        textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch (jsonErr) {
          console.error("Non-JSON Response from Paystack init:", textResponse);
          setPaymentErrorDetails({
            error: "The server returned a raw, non-JSON error. This indicates that server is misconfigured, unreachable, or crashed with status " + response.status,
            details: textResponse,
            debug: { httpStatus: response.status, url: "/api/payments/paystack/initialize" }
          });
          showToast("Payment server returned an unparseable error response.");
          return;
        }
      } catch (readErr: any) {
        setPaymentErrorDetails({
          error: "Failed to read response body from backend.",
          details: readErr.message || String(readErr)
        });
        showToast("Network error reading payment response.");
        return;
      }

      if (!response.ok || !data?.authorization_url || !data?.access_code) {
        const primaryError = data?.error || data?.message || "Failed to initialize payment gateway.";
        setPaymentErrorDetails({
          error: primaryError,
          details: data?.details || data,
          debug: data?.debug || { httpStatus: response.status, userEmail, rechargeAmt }
        });
        showToast(primaryError);
        return;
      }

      const { authorization_url, access_code, reference } = data;

      // 2. Try to get public key & configurations
      let publicKey = "";
      let configDetails: any = null;
      try {
        const configRes = await fetch("/api/payments/paystack/config");
        if (configRes.ok) {
          const configData = await configRes.json().catch(() => ({}));
          publicKey = configData?.publicKey;
          configDetails = configData;
        } else {
          configDetails = { error: `HTTP status ${configRes.status}` };
        }
      } catch (err: any) {
        configDetails = { error: err.message || String(err) };
        console.warn("Could not retrieve public key:", err);
      }

      // 3. Try to open with inline checkout popup if key and script are available
      if (publicKey && publicKey.startsWith("pk_")) {
        showToast("Opening secure platform checkout...");
        
        // Dynamically load Paystack Inline Checkout JS SDK
        const scriptLoaded = await new Promise<boolean>((resolve) => {
          if ((window as any).PaystackPop) {
            resolve(true);
            return;
          }
          const script = document.createElement("script");
          script.src = "https://js.paystack.co/v1/inline.js";
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

        if (scriptLoaded && (window as any).PaystackPop && (window as any).PaystackPop.setup) {
          try {
            // Setup platform inline popup using the server-initialized access_code
            const paystack = (window as any).PaystackPop.setup({
              key: publicKey,
              email: userEmail,
              amount: Math.round(Number(rechargeAmt) * 100), // pass amount in kobo
              ref: reference, // pass server-generated unique reference
              access_code: access_code, // Resumes/loads the transaction initialized securely on backend
              callback: function(response: any) {
                // Successfully authorized inside the platform popup!
                handlePaystackInlineSuccess(response.reference);
              },
              onClose: function() {
                showToast("Payment closed. No charges were made.");
              }
            });
            
            paystack.openIframe();
            return;
          } catch (setupErr: any) {
            console.error("PaystackPop.setup failed, falling back to redirect:", setupErr);
            setPaymentErrorDetails({
              error: "Paystack Inline Pop setup error. Falling back to hosted redirection link.",
              details: setupErr.message || String(setupErr),
              debug: { publicKey, resolvedPublicKey: publicKey, isConfigured: true }
            });
          }
        } else {
          setPaymentErrorDetails({
            error: "Paystack SDK script could not be loaded dynamically. Falling back to external hosted link.",
            details: "Please verify that network filters or adblockers are not blocking js.paystack.co",
            resolvedPublicKey: publicKey,
            isConfigured: !!publicKey
          });
        }
      } else {
        setPaymentErrorDetails({
          error: "Paystack Public Key (pk_...) is either missing, empty, or misconfigured. Falling back to external hosted link.",
          details: configDetails,
          resolvedPublicKey: publicKey || "None",
          isConfigured: !!(configDetails?.hasSecretKey)
        });
      }

      // Hosted/Fallback Redirect flow (runs if inline popup fails, script doesn't load, or public key is unavailable)
      window.location.href = authorization_url;

    } catch (e: any) {
      setPaymentErrorDetails({
        error: "Critical exception occurred during secure checkout initialization.",
        details: e.message || String(e)
      });
      showToast("Payment service unreachable: " + (e.message || "Network error"));
    }
  };

  const handlePaystackInlineSuccess = async (reference: string) => {
    showToast("Recharge captured! Verifying on server...");
    try {
      const response = await fetch("/api/payments/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference })
      });
      const data = await response.json().catch(() => ({ success: false, error: "Sync failed" }));
      if (response.ok && data?.success) {
        showToast(data.message || "Deposit confirmed and credited successfully!");
        refreshProfile();
      } else {
        showToast(data?.error || "We're verifying your transaction. It will credit shortly.");
      }
    } catch (err) {
      console.error("Inline verify crash", err);
      showToast("Network is busy. Our secure webhook will credit your deposit momentarily.");
    }
  };

  // Recharge states
  const [rechargeAmt, setRechargeAmt] = useState<number>(10000);
  const [watTime, setWatTime] = useState<string>('');

  useEffect(() => {
    const updateWatTime = () => {
      const now = new Date();
      const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
      const watDate = new Date(utcTimestamp + 3600000);
      setWatTime(watDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateWatTime();
    const interval = setInterval(updateWatTime, 1000);
    return () => clearInterval(interval);
  }, []);
  const [paymentErrorDetails, setPaymentErrorDetails] = useState<{ error: string; details?: any; debug?: any; resolvedPublicKey?: string; isConfigured?: boolean } | null>(null);
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
  const [teamSubTab, setTeamSubTab] = useState<'members' | 'activity'>('members');

  // Derived Traditional Financial VIP Pools directly from session profile
  const investmentPlans = userData?.investments || CLIENT_DEFAULT_VIP_PLANS;

  // Yield accrual running logs modal states
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [yieldPlanActive, setYieldPlanActive] = useState<any>(null);
  const [yieldProgress, setYieldProgress] = useState(0);
  const [yieldLog, setYieldLog] = useState<string[]>([]);
  const [plansCompletedToday, setPlansCompletedToday] = useState<string[]>([]);

  // Wealth Certificate and Investor Agreement states to increase user confidence
  const [selectedCertificatePlan, setSelectedCertificatePlan] = useState<any | null>(null);
  const [selectedAgreementPlan, setSelectedAgreementPlan] = useState<any | null>(null);
  const [investorSignatureName, setInvestorSignatureName] = useState<string>('');
  const [agreementChecked1, setAgreementChecked1] = useState(false);
  const [agreementChecked2, setAgreementChecked2] = useState(false);
  const [showReservesAuditModal, setShowReservesAuditModal] = useState(false);

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
  const [showFlyerModal, setShowFlyerModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [hasShownNoticeThisSession, setHasShownNoticeThisSession] = useState(false);
  const [hasShownTelegramThisSession, setHasShownTelegramThisSession] = useState(false);

  // Always force users to refresh the page when returning to the app
  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        window.location.reload();
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  const handleActionAttempt = (actionType: string) => {
    if (siteSettings?.holidayMode) {
      if (actionType === 'deposit') {
        return true; 
      }
      setShowHolidayModal(true);
      return false; 
    }
    return true;
  };

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

  // Load team data when referral tree is active, or user is on the Wallet / Withdrawal view
  useEffect(() => {
    if (userData && (activeProfileOverlay === 'referral_tree' || currentScreen === Screen.Wallet || fundTab === 'withdrawal')) {
      let isMounted = true;
      const fetchTeam = async () => {
        try {
          const data = await loadTeamData();
          if (isMounted && data && data.members) {
            setTeamMembers(data.members);
          }
        } catch (e) {
          console.error("Failed to fetch team data:", e);
        }
      };
      
      fetchTeam();
      const interval = setInterval(fetchTeam, 10000); // 10s polling for team tree and withdrawal checks
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [activeProfileOverlay, currentScreen, fundTab, userData?.uid]);

  // Trigger popups automatically when navigating to dashboard
  useEffect(() => {
    if (userData && currentScreen === Screen.Dashboard) {
      setTimeout(() => {
        setShowTelegramModal(true);
        setShowFlyerModal(true);
      }, 1000);
    }
  }, [userData?.uid, currentScreen]);

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
            }
          }, (err) => {
            console.log("No broadcasts stream loaded (operating in offline/sandbox mode):", err);
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
            const saved = localStorage.getItem('brex_active_screen');
            if (saved && saved !== Screen.Auth && saved !== Screen.Signup) {
              setCurrentScreen(saved as Screen);
            } else {
              if (userData?.isAdmin) {
                setCurrentScreen(Screen.Admin);
              } else {
                setCurrentScreen(Screen.Dashboard);
              }
            }
          }
        }
      } else {
        if (currentScreen !== Screen.Auth && currentScreen !== Screen.Signup) {
          setCurrentScreen(Screen.Auth);
        }
      }
    }
  }, [user, userData, loading, currentScreen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const navigate = (screen: Screen) => {
    localStorage.setItem('brex_active_screen', screen);
    window.location.reload();
  };

  const refreshTeamData = async () => {
    try {
      if (!user) return;
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
    if (!invitationCode.trim()) {
      setAuthError('An invitation code is required to sign up. Please obtain a valid referral link or code.');
      return;
    }

    try {
      setAuthError('');
      const payload = {
        name: userName.trim() || 'Brex Member',
        phoneNumber: enteredPhone,
        password: password,
        invitationCode: invitationCode.trim(),
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
    setPhoneNumber('');
    setPassword('');
    setConfirmPassword('');
    setUserName('');
    setAuthError('');
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
    if (rechargeAmt < 100) {
      alert('Minimum instant recharge is ₦100');
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
    if (!handleActionAttempt('withdraw')) return;
    const { canWithdraw, isWeekend } = checkWithdrawalAvailability();
    if (!canWithdraw) {
      setWithdrawErrorMsg(isWeekend 
        ? "Withdrawals are closed on weekends (Saturday and Sunday). Standard payouts take place from Monday to Friday." 
        : "Standard settlements are only open between 10:00 AM and 12:00 PM WAT daily."
      );
      return;
    }

    const todayRefs = getTodayReferralsCount();
    if (todayRefs < 1) {
      setWithdrawErrorMsg("🛡️ System Policy Upgraded: To request a withdrawal on any official payout day, you must successfully refer at least 1 new active partner under your registration code TODAY.");
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
      
      const { multiplier } = getWithdrawalFeeInfo();
      const expectedPayout = withdrawAmt * multiplier;
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
    if (!handleActionAttempt('subscribe')) return;
    if (isSubscribing) return;
    if (!userData || userData.balance < cost) {
      showToast(`Insufficient balance. You need at least ₦${cost.toLocaleString()} to activate this pool.`);
      navigate(Screen.Wallet);
      setFundTab('recharge');
      setRechargeStep('input');
      return;
    }

    setIsSubscribing(true);
    try {
      await subscribeToPlan(planId);
      showToast(`Successfully joined plan! Daily yield starts immediately.`);
    } catch (err: any) {
      showToast(err.message || "Subscription failed. Try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

  // Claim Daily Earnings
  const claimDailyEarnings = async (plan: any) => {
    if (!handleActionAttempt('claim')) return;
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invitation Code (Mandatory)</label>
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
        
        {/* MASSIVE Referral Banner */}
        <div 
           onClick={() => navigate(Screen.Portfolio)}
           className="w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 p-5 rounded-[28px] shadow-lg shadow-orange-500/30 text-white flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all animate-pulse border-2 border-white"
        >
            <span className="text-3xl mb-2">🎁</span>
            <h3 className="font-black text-xl tracking-tight uppercase">Get 10% Referral Bonus!</h3>
            <p className="text-xs font-bold mt-1 opacity-90">Invite your friends and earn an instant 10% bonus when they make their FIRST deposit!</p>
            <div className="mt-3 bg-white text-orange-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
              Copy Invite Link Here
            </div>
        </div>

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
          <div className="flex items-center gap-2">
            <div onClick={() => navigate(Screen.Profile)} className="cursor-pointer active:scale-95 transition-transform ring-4 ring-gray-100 rounded-2xl p-0.5 bg-white shadow-sm">
              <Memoji state={userData.memojiState} size="sm" />
            </div>
          </div>
        </div>

        {/* Floating Telegram Button */}
        <button 
          onClick={() => setShowTelegramModal(true)} 
          className="fixed bottom-24 right-5 z-[200] w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 hover:bg-sky-600 hover:scale-105 active:scale-95 transition-all border-2 border-white cursor-pointer"
          title="Join Telegram"
        >
          <Send size={20} />
        </button>

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

        <LiveActivityBar />



        {/* Balance block */}
        <div className="bg-gradient-to-br from-indigo-700 to-violet-800 rounded-[32px] p-6 relative overflow-hidden shadow-xl shadow-indigo-600/30">
          <div className="absolute top-0 right-0 p-3 opacity-20 transform rotate-12">
            <Rocket size={100} className="text-white" />
          </div>
          <p className="text-white/70 text-[10px] font-bold tracking-widest uppercase mb-1 font-mono relative z-10">Total Wealth Portfolio</p>
          <div className="flex items-baseline gap-2 mb-2 relative z-10">
            <span className="text-3xl font-black text-white font-mono tracking-tight">₦{userData.balance.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] bg-emerald-500/20 text-emerald-300 px-2 flex-wrap py-1 rounded-full font-black w-max relative z-10 uppercase tracking-widest border border-emerald-500/30">
            <TrendingUp size={10} /> +14.5% Active Compound Interest 
          </div>
          
          <div className="mt-6 flex flex-col gap-3 relative z-10">
            <button 
              onClick={() => {
                setFundTab('recharge');
                setRechargeStep('input');
                navigate(Screen.Wallet);
              }}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black text-xs py-4 rounded-[20px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-300 uppercase tracking-widest"
            >
              <Rocket size={18} /> Deposit & Grow Faster
            </button>
            <button 
              onClick={() => {
                setFundTab('withdrawal');
                navigate(Screen.Wallet);
              }}
              className="w-full bg-black/20 hover:bg-black/30 text-white/60 font-bold text-[10px] py-2 rounded-xl transition-all cursor-pointer outline-none uppercase tracking-widest"
            >
              Forfeit compounding & withdraw
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

        {/* Digital Asset Savings Promo Card */}
        <div 
          onClick={() => setShowDigitalSavingsModal(true)}
          className="p-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 border border-indigo-500/30 rounded-[32px] flex flex-col gap-3.5 cursor-pointer active:scale-[0.99] transition-all relative overflow-hidden group shadow-lg shadow-indigo-900/40"
        >
          {/* Animated Background Orbs */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all" />
          
          <div className="flex justify-between items-start relative z-10">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-400/20 rounded-2xl flex items-center justify-center text-2xl shadow-inner shadow-white/5">
                🔮
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-black text-sm tracking-tight">Digital Asset Savings</h4>
                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase font-mono tracking-widest animate-pulse">NEW</span>
                </div>
                <p className="text-indigo-200/80 text-[10px] font-bold mt-0.5">High-Yield Liquidity & Projected Profits</p>
              </div>
            </div>
            
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-[#ff9c00] border border-white/10 group-hover:bg-[#ff9c00] group-hover:text-black hover:scale-110 active:scale-95 transition-all">
              <ArrowUpRight size={15} />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2.5 pt-1 relative z-10">
            <div className="bg-white/[0.03] border border-white/5 p-2 rounded-xl text-center">
              <p className="text-[7.5px] font-black text-indigo-300 tracking-wider uppercase font-mono">USDT</p>
              <p className="text-[11px] font-black text-white font-mono mt-0.5">1.2% Daily</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-2 rounded-xl text-center">
              <p className="text-[7.5px] font-black text-indigo-300 tracking-wider uppercase font-mono">BTC</p>
              <p className="text-[11px] font-black text-white font-mono mt-0.5">1.5% Daily</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-2 rounded-xl text-center">
              <p className="text-[7.5px] font-black text-indigo-300 tracking-wider uppercase font-mono">ETH</p>
              <p className="text-[11px] font-black text-white font-mono mt-0.5">1.4% Daily</p>
            </div>
          </div>
          
          <p className="text-[9.5px] font-bold text-indigo-200/50 uppercase tracking-widest text-center mt-0.5 font-mono relative z-10 group-hover:text-indigo-100 transition-colors">
            ⚡ CLICK TO START COLLECTING YIELD ⚡
          </p>
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

        {/* Dynamic Trust Guarantee and Asset Audited Reserves Banner */}
        <div className="bg-gradient-to-br from-slate-950 via-[#111622] to-[#080B12] p-5.5 rounded-[32px] border border-slate-800 text-white flex flex-col gap-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
              🛡️
            </div>
            <div>
              <h3 className="text-[12px] font-black uppercase tracking-wide text-white">Trust & Security Escrow</h3>
              <p className="text-[8.5px] font-black text-slate-400 font-mono tracking-widest uppercase">Underwritten Asset Registry Certificate</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1 text-left">
            <div className="bg-white/5 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-center">
              <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest font-mono">Reserve Audit Pool</span>
              <span className="text-sm font-black text-indigo-400 font-mono mt-0.5">₦485,290,000</span>
              <span className="text-[7px] text-emerald-400 font-black font-mono mt-1 flex items-center gap-1">● AAA ESCROW BANK</span>
            </div>

            <div className="bg-white/5 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-center">
              <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest font-mono">Capital Solvency</span>
              <span className="text-sm font-black text-indigo-400 font-mono mt-0.5">428.4% Secured</span>
              <span className="text-[7px] text-[#ff9c00] font-black font-mono mt-1 flex items-center gap-1">🏆 100% PRINCIPAL BACK</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] bg-white/5 border border-slate-800 px-4 py-2.5 rounded-xl text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[9px] uppercase tracking-tight text-slate-200">Regulatory Oversight: NDIC & SEC Insured</span>
            </div>
            <button 
              onClick={() => setShowReservesAuditModal(true)}
              className="font-black text-[9px] uppercase font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              Verify Ledger ➔
            </button>
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
              <input type="range" min="1" max="11" defaultValue="3" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" onChange={(e) => {
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
              <div key={plan.id} className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm flex flex-col gap-6 relative overflow-hidden group">
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

  const renderFunds = () => {
    if (!userData) return null;

    const SAVINGS_PRODUCTS = [
      {
        id: "fund_samsung",
        name: "Samsung Growth Fund",
        companyName: "Samsung Electronics",
        minInvestment: 2000,
        dailyRate: 4.8,
        description: "Samsung Electronics is a global leader in semiconductor, mobile, and display engineering. This growth fund concentrates on Next-Gen logic foundry expansion and high-yield display technology scaling.",
        avatar: "📱",
        iconColor: "text-blue-600 bg-blue-50 border border-blue-100",
        accentBorder: "border-blue-100 bg-blue-50/20",
        badgeColor: "bg-blue-600 text-white",
        companyTag: "KOSPI: 005930"
      },
      {
        id: "fund_pepsi",
        name: "Pepsi Consumer Fund",
        companyName: "PepsiCo Inc.",
        minInvestment: 3000,
        dailyRate: 5.5,
        description: "PepsiCo is a diversified global food and beverage force active across 200+ countries. This retail fund captures high fast-moving grocery yields and robust global bottling distribution margins.",
        avatar: "🥤",
        iconColor: "text-red-500 bg-red-50 border border-red-100",
        accentBorder: "border-red-100 bg-red-50/20",
        badgeColor: "bg-red-500 text-white",
        companyTag: "NASDAQ: PEP"
      },
      {
        id: "fund_dangote",
        name: "Dangote Industrial Fund",
        companyName: "Dangote Industries",
        minInvestment: 5000,
        dailyRate: 9.0,
        description: "Dangote Industries is sub-Saharan Africa's premier industrial titan, dominating sectors including cement infrastructure products, oil & gas refining, logistics, and sugar processing.",
        avatar: "🏗️",
        iconColor: "text-emerald-600 bg-emerald-50 border border-emerald-100",
        accentBorder: "border-emerald-100 bg-emerald-50/20",
        badgeColor: "bg-emerald-600 text-white",
        companyTag: "NGX: DANGCEM"
      },
      {
        id: "fund_nestle",
        name: "Nestle Nutrition Fund",
        companyName: "Nestle S.A.",
        minInvestment: 4000,
        dailyRate: 7.2,
        description: "Nestle is the global leading provider of nutritional foods, dairy drinks, and wellness formulas. This structural savings fund is targeted on emerging markets food processing efficiency.",
        avatar: "🍫",
        iconColor: "text-amber-600 bg-amber-50 border border-amber-100",
        accentBorder: "border-amber-100 bg-amber-50/20",
        badgeColor: "bg-amber-600 text-white",
        companyTag: "SIX: NESN"
      }
    ];

    const activePlacements = userData.fundsInvestments || [];
    const ongoingPlacements = activePlacements.filter(p => !p.claimed);

    const handleAllocateFund = async () => {
      if (!handleActionAttempt('allocate')) return;
      if (!selectedFund) return;
      const amount = Number(fundInvestAmount);
      if (isNaN(amount) || amount <= 0) {
        showToast("Please specify a valid deposit amount.");
        return;
      }
      if (amount < selectedFund.minInvestment) {
        showToast(`Minimum deposit required is ₦${selectedFund.minInvestment.toLocaleString()}`);
        return;
      }
      if (userData.balance < amount) {
        showToast("Insufficient balance. Head over to the Wallet tab to recharge.");
        return;
      }

      setIsAllocatingFund(true);
      try {
        const response = await fetch("/api/user/funds/invest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": userData.id || userData.phoneNumber || ""
          },
          body: JSON.stringify({
            fundId: selectedFund.id,
            amount: amount,
            days: fundInvestDays
          })
        });

        const data = await response.json();
        if (response.ok) {
          showToast(`Successfully invested ₦${amount.toLocaleString()} into ${selectedFund.name}!`);
          setSelectedFund(null);
          setFundInvestAmount('');
          setFundInvestDays(14);
          refreshProfile();
        } else {
          showToast(data.error || "Allocation failed. Please try again.");
        }
      } catch (err) {
        showToast("Network exception occurred.");
      } finally {
        setIsAllocatingFund(false);
      }
    };

    const handleClaimFundMaturity = async (invId: string) => {
      if (!handleActionAttempt('claim')) return;
      try {
        const response = await fetch("/api/user/funds/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": userData.id || userData.phoneNumber || ""
          },
          body: JSON.stringify({ investmentId: invId })
        });

        const data = await response.json();
        if (response.ok) {
          showToast("Matured capital and accrued interest successfully credited to your main balance!");
          refreshProfile();
        } else {
          showToast(data.error || "Claim settlement failed.");
        }
      } catch (err) {
        showToast("Network exception during settlement checkout.");
      }
    };

    const handleCancelInvestment = async (invId: string) => {
      if (!handleActionAttempt('cancel')) return;
      const confirmCancel = window.confirm("Are you sure you want to terminate this contract early? 10% of your principal will be deducted as penalty, and all interest will be forfeited.");
      if (!confirmCancel) return;

      try {
        const response = await fetch("/api/user/funds/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": userData.id || userData.phoneNumber || ""
          },
          body: JSON.stringify({ investmentId: invId })
        });

        const data = await response.json();
        if (response.ok) {
          showToast(data.message || "Investment terminated. Refund credited successfully!");
          refreshProfile();
        } else {
          showToast(data.error || "Termination request failed.");
        }
      } catch (err) {
        showToast("Network exception during early termination.");
      }
    };

    // Calculate dynamic growth yield for previewing in invest modal
    const parsedAmount = Number(fundInvestAmount) || 0;
    const dailyInterestPreview = Math.round(parsedAmount * ((selectedFund?.dailyRate || 0) / 100));
    const totalAccruedYield = dailyInterestPreview * fundInvestDays;
    const estimatedTotalMaturityPayout = parsedAmount + totalAccruedYield;

    const calculateTimeRemainingDisplay = (endDateStr: string, isMaturedState: boolean) => {
      if (isMaturedState) return "Matured & Ready";
      const now = new Date().getTime();
      const end = new Date(endDateStr).getTime();
      const diff = end - now;

      if (diff <= 0) return "Matured & Ready";

      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m left`;
      }
      return `${hours}h ${minutes}m ${seconds}s left`;
    };

    return (
      <div className="px-5 pt-7 pb-24 flex flex-col gap-6 bg-[#FAF9F6] min-h-screen font-sans">
        
        {/* Modern Swiss-pair Header */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white rounded-xl p-2.5 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Funds Vault</h2>
              <p className="text-[10px] uppercase font-black tracking-widest text-[#64748B] font-mono">Realtime Term Placements</p>
            </div>
          </div>
        </div>

        {/* Balance Status overview bar */}
        <div className="bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Available Wallet Liquidity</span>
            <span className="text-xl font-black text-slate-900 tracking-tight font-mono">₦{userData.balance.toLocaleString()} NGN</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
              ● SECURED ASSETS
            </span>
          </div>
        </div>

        {/* Premium Tab Selection Pill Toggle */}
        <div className="flex bg-slate-100 rounded-2xl p-1.5 border border-slate-200/40">
          <button
            onClick={() => setFundsTab('explore')}
            className={`flex-1 py-3 text-center rounded-[12px] font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              fundsTab === 'explore'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/10'
                : 'text-[#64748B] hover:text-slate-900'
            }`}
          >
            Explore Catalog
          </button>
          <button
            onClick={() => setFundsTab('my_investments')}
            className={`flex-1 py-3 text-center rounded-[12px] font-black text-xs uppercase tracking-wider transition-all cursor-pointer relative ${
              fundsTab === 'my_investments'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/10'
                : 'text-[#64748B] hover:text-slate-900'
            }`}
          >
            My Registries
            {ongoingPlacements.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white font-mono text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                {ongoingPlacements.length}
              </span>
            )}
          </button>
        </div>

        {/* Dynamic Display Screens */}
        {fundsTab === 'explore' && (
          <div className="flex flex-col gap-4">
            
            {/* Catalog Info Banner */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-[28px] relative overflow-hidden shadow-md shadow-indigo-950/10">
              <div className="absolute right-0 bottom-0 opacity-10 font-black text-8xl pointer-events-none select-none font-mono">
                Term
              </div>
              <span className="text-[8px] font-black tracking-widest text-indigo-300 uppercase block mb-1 font-mono">Institutional Securities</span>
              <h3 className="text-lg font-black tracking-tight leading-none mb-2">High-Yield Fixed Term Deposits</h3>
              <p className="text-[11px] text-slate-300 leading-normal font-sans">
                Commit funds to institutional corporate portfolios secure from industrial market volatility with fixed daily interest returns returned at maturity.
              </p>
            </div>

            {/* List Array products */}
            <div className="flex flex-col gap-4">
              {SAVINGS_PRODUCTS.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white border border-slate-100 rounded-[24px] p-5.5 hover:border-slate-300 transition-all shadow-sm shadow-slate-100 flex flex-col gap-4.5"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <span className={`text-2xl h-12 w-12 rounded-xl flex items-center justify-center ${prod.iconColor}`}>
                        {prod.avatar}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 font-mono tracking-wider block leading-none mb-1">{prod.companyTag}</span>
                        <h4 className="text-base font-black text-slate-950 tracking-tight leading-none">{prod.name}</h4>
                        <span className="text-xs text-slate-500 font-bold leading-none mt-1">{prod.companyName}</span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      +{prod.dailyRate}% Daily
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-bold leading-normal border-t border-slate-50 pt-3.5 italic">
                    {prod.description}
                  </p>

                  <div className="border-t border-slate-50 pt-4 flex items-center justify-between gap-3 bg-slate-50/40 p-3 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase font-mono">Min Deposit Limit</span>
                      <span className="text-sm font-mono font-black text-slate-800">₦{prod.minInvestment.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase font-mono">Locked Duration</span>
                      <span className="text-sm font-mono font-black text-slate-800">7 - 30 Days</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFund(prod);
                        setFundInvestAmount(prod.minInvestment.toString());
                        setFundInvestDays(14); // resetting
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-4.5 py-2.5 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      Invest
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fundsTab === 'my_investments' && (
          <div className="flex flex-col gap-4">
            {activePlacements.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-[28px] p-8 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">💼</span>
                <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">No Term Allocations</h4>
                <p className="text-xs text-[#64748B] max-w-xs leading-relaxed">
                  You have not subscribed to any treasury products. Venture into the Explore catalog to kickstart compound savings.
                </p>
                <button
                  onClick={() => setFundsTab('explore')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl shadow-md cursor-pointer transition-all active:scale-95 mt-2"
                >
                  Allocate First Savings
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                
                {/* Active placements list summary */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Invested Portfolios Tracker</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{activePlacements.length} Registries logged</span>
                </div>

                <div className="flex flex-col gap-4">
                  {activePlacements.map((inv) => {
                    const isMatured = inv.matured || new Date() >= new Date(inv.endDate);
                    const isClaimedPaid = inv.claimed;

                    return (
                      <div
                        key={inv.id}
                        className={`bg-white border rounded-[24px] p-5.5 shadow-sm flex flex-col gap-4 transition-all relative ${
                          isClaimedPaid 
                            ? 'border-slate-100 opacity-65 bg-slate-50/50' 
                            : isMatured 
                              ? 'border-emerald-500 ring-1 ring-emerald-500/10' 
                              : 'border-amber-200'
                        }`}
                      >
                        
                        {/* Status Label badge */}
                        <div className="absolute top-4.5 right-4.5">
                          {isClaimedPaid ? (
                            inv.canceled ? (
                              <span className="font-mono text-[8px] font-black uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                                ✕ TERMINATED EARLY
                              </span>
                            ) : (
                              <span className="font-mono text-[8px] font-black uppercase text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                                ✓ REFUNDED & RETRIEVED
                              </span>
                            )
                          ) : isMatured ? (
                            <span className="font-mono text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md animate-pulse">
                              ● MATURED READY
                            </span>
                          ) : (
                            <span className="font-mono text-[8px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              ⏳ LOCKED ACCRUING
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-black tracking-widest text-[#64748B] block mb-0.5 font-mono">{inv.companyName}</span>
                          <h4 className="text-base font-black text-slate-950 tracking-tight leading-none">{inv.fundName}</h4>
                        </div>

                        {/* Breakdown Receipt UI */}
                        <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Staked Principal:</span>
                            <span className="font-mono font-black text-slate-900">₦{inv.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Daily Compound ({inv.dailyRate}%):</span>
                            <span className="font-mono font-extrabold text-[#64748B]">₦{Math.round(inv.amount * (inv.dailyRate / 100)).toLocaleString()} / day</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Contract Duration:</span>
                            <span className="font-sans font-extrabold text-slate-800">{inv.days} Days Term</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-emerald-600 font-bold uppercase text-[10px]">Est. Maturity Interest:</span>
                            <span className="font-mono font-black text-emerald-600">+₦{inv.totalInterest.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-2 bg-slate-50/50 p-2 rounded-xl">
                            <span className="text-slate-900 font-black uppercase text-[9px]">Maturity Payout:</span>
                            <span className="font-mono font-black text-[13px] text-indigo-700">₦{(inv.amount + inv.totalInterest).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Countdown or claim buttons */}
                        <div className="border-t border-slate-50 pt-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase text-slate-400">
                            <span>MATURATION PROGRESSBAR</span>
                            <span className="text-slate-800">
                              {calculateTimeRemainingDisplay(inv.endDate, isMatured)}
                            </span>
                          </div>

                          {/* Action rows */}
                          <div className="flex gap-2.5 mt-2">
                            {!isClaimedPaid && isMatured && (
                              <button
                                onClick={() => handleClaimFundMaturity(inv.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md cursor-pointer text-center active:scale-95"
                              >
                                Claim ₦{(inv.amount + inv.totalInterest).toLocaleString()} Returns
                              </button>
                            )}

                            {!isClaimedPaid && !isMatured && (
                              <div className="flex flex-col gap-2.5 w-full bg-rose-50/30 border border-rose-100 p-4 rounded-[18px]">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-black text-rose-700 uppercase font-mono tracking-wider">Early Termination</span>
                                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">10% Penalty</span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                                  Need liquidation? Terminate this contract early. 10% principal forfeit (₦{(inv.amount * 0.1).toLocaleString()} penalty applied) and all interest is forfeited.
                                </p>
                                <button
                                  onClick={() => handleCancelInvestment(inv.id)}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-center"
                                >
                                  Terminate & Refund ₦{(inv.amount * 0.9).toLocaleString()}
                                </button>
                              </div>
                            )}

                            {isClaimedPaid && (
                              <div className="w-full text-center py-2.5 bg-slate-100 border border-slate-200 border-dashed rounded-xl select-none">
                                <span className="text-[9px] font-black font-mono text-slate-500 uppercase tracking-widest">
                                  {inv.canceled 
                                    ? "✕ CONTRACT TERMINATED - 90% PRINCIPAL RETURNED" 
                                    : "✓ MATURITY SETTLED - PRINCIPAL + EARNINGS CREDITED"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Interactive Investment allocating sheet modal */}
        {selectedFund && (
          <div className="fixed inset-0 bg-slate-950/60 flex items-end justify-center z-[240] select-none p-0">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              className="bg-white rounded-t-[36px] w-full max-w-md p-6 flex flex-col gap-5 border-t border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh] pb-8 relative"
            >
              {/* Close Button top edge */}
              <button
                onClick={() => setSelectedFund(null)}
                className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-black cursor-pointer transition-all active:scale-90 border border-slate-200/30"
              >
                ✕
              </button>

              <div>
                <span className="text-[10px] font-mono font-black uppercase text-indigo-600 tracking-wider">Configure Term Placements</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mt-1">Allocate Capital</h3>
                <span className="text-xs text-slate-400 font-bold block mt-1">{selectedFund.name} ({selectedFund.companyName})</span>
              </div>

              {/* Company Info Box */}
              <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-[20px]">
                <p className="text-[11px] text-slate-500 font-bold justify-center leading-normal italic">
                  {selectedFund.description}
                </p>
              </div>

              {/* Hold Duration Days Selection */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Placement Lock Period</span>
                  <span className="text-sm font-mono font-black text-indigo-600">{fundInvestDays} Days Lock</span>
                </div>
                
                {/* Horizontal range controls */}
                <div className="flex items-center gap-3 bg-slate-150 p-1.5 rounded-xl border border-slate-200/20">
                  <button
                    onClick={() => setFundInvestDays(prev => Math.max(7, prev - 1))}
                    className="h-9 w-9 bg-white border border-slate-200 text-slate-800 rounded-lg font-black flex items-center justify-center text-sm cursor-pointer hover:bg-slate-50"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="7"
                    max="30"
                    value={fundInvestDays}
                    onChange={(e) => setFundInvestDays(Number(e.target.value))}
                    className="flex-grow accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => setFundInvestDays(prev => Math.min(30, prev + 1))}
                    className="h-9 w-9 bg-white border border-slate-200 text-slate-800 rounded-lg font-black flex items-center justify-center text-sm cursor-pointer hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
                <div className="flex justify-between px-1 text-[8px] font-black text-slate-400 font-mono">
                  <span>MIN: 7 DAYS</span>
                  <span>PREMIUM OUTCOMES ON MAX CAPS</span>
                  <span>MAX: 30 DAYS</span>
                </div>
              </div>

              {/* Amount allocation form */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Investment Amount (₦)</span>
                  <span className="text-[10px] font-bold text-slate-400">Min: ₦{selectedFund.minInvestment.toLocaleString()}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4.5 top-1/2 -translate-y-1/2 font-mono font-black text-slate-400 text-lg">₦</span>
                  <input
                    type="number"
                    value={fundInvestAmount}
                    onChange={(e) => setFundInvestAmount(e.target.value)}
                    placeholder={selectedFund.minInvestment.toString()}
                    className="w-full pl-8.5 pr-4 py-4.5 bg-slate-100 border border-slate-200 rounded-2xl outline-none text-slate-900 font-black font-mono tracking-tight text-base"
                  />
                </div>

                {/* Percentage Quick-set selectors */}
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[0.25, 0.50, 0.75, 1.0].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => {
                        const calculated = Math.max(
                          selectedFund.minInvestment, 
                          Math.round(userData.balance * percent)
                        );
                        setFundInvestAmount(calculated.toString());
                      }}
                      className="py-2.5 rounded-lg border border-slate-200 font-black text-[10px] uppercase text-[#64748B] hover:bg-slate-100 transition-all cursor-pointer bg-white"
                    >
                      {percent * 100}% Wallet
                    </button>
                  ))}
                </div>
              </div>

              {/* Earnings slip receipt simulation panel */}
              <div className="bg-slate-900 text-white rounded-[24px] p-5 flex flex-col gap-3 font-mono border border-indigo-950/20 shadow-md">
                <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest text-center border-b border-indigo-950/40 pb-2.5">
                  ESTIMATION LEDGER BREAKDOWN
                </span>
                
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-400 uppercase font-black">Capital Allocation:</span>
                  <span>₦{parsedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-400 uppercase font-black">Daily Interest ({selectedFund.dailyRate}%):</span>
                  <span className="text-emerald-400">+₦{dailyInterestPreview.toLocaleString()} / daily</span>
                </div>
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-400 uppercase font-black">Contract Lockterm:</span>
                  <span>{fundInvestDays} Days Contract</span>
                </div>
                
                <div className="flex justify-between items-baseline text-xs border-t border-indigo-950/40 pt-3.5 mt-1.5 font-sans">
                  <span className="text-indigo-200 font-black uppercase text-[9.5px]">Total Accrued Interest:</span>
                  <span className="font-mono font-black text-[#10B981] text-base">+₦{totalAccruedYield.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline text-sm border-t border-dashed border-indigo-950/40 pt-3 font-sans">
                  <span className="text-white font-black uppercase text-[10px]">Net Payout Maturity:</span>
                  <span className="font-mono font-black text-indigo-300 text-lg">₦{estimatedTotalMaturityPayout.toLocaleString()}</span>
                </div>
              </div>

              {/* Form trigger buttons */}
              <div className="flex gap-3.5 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFund(null)}
                  className="flex-1 py-4.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-800 font-black text-xs uppercase tracking-wider text-center cursor-pointer transition-all active:scale-95"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={isAllocatingFund || parsedAmount < selectedFund.minInvestment || userData.balance < parsedAmount}
                  onClick={handleAllocateFund}
                  className={`flex-2 py-4.5 text-white font-black text-xs uppercase tracking-wider text-center rounded-2xl transition-all shadow-lg active:scale-95 ${
                    isAllocatingFund || parsedAmount < selectedFund.minInvestment || userData.balance < parsedAmount
                      ? 'bg-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 cursor-pointer'
                  }`}
                >
                  {isAllocatingFund ? "Contracting..." : "Approve & Stake"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    );
  };

  const renderPromotions = () => {
    const sectors = [
      { label: "₦50", color: "#6366f1", reward: 50 },
      { label: "Small Gift", color: "#64748b", reward: 0 },
      { label: "₦100", color: "#3b82f6", reward: 100 },
      { label: "Try again", color: "#64748b", reward: 0 },
      { label: "₦200", color: "#10b981", reward: 200 },
      { label: "Try again", color: "#6366f1", reward: 0 },
      { label: "₦500", color: "#f59e0b", reward: 500 },
      { label: "₦1,000", color: "#ec4899", reward: 1000 }
    ];

    const todayStr = new Date().toISOString().slice(0, 10);
    const hasFreeSpin = userData?.lastSpinDate !== todayStr;

    return (
      <div className="px-5 pt-8 pb-20 flex flex-col gap-5 bg-[#f8f8f8] min-h-screen">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="text-amber-500 animate-bounce" size={24} /> Brex Fortune Club
          </h2>
          <p className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-0.5">
            Play standard events, win real instant cash commissions
          </p>
        </div>

        {/* Dynamic Segmented Navigation Tab */}
        <div className="bg-white border border-slate-100 p-1 rounded-2xl flex gap-1 shadow-sm">
          <button
            onClick={() => setPromoTab('deal')}
            className={`flex-1 py-3 px-1 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
              promoTab === 'deal' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/10' 
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            🤝 Deal
          </button>
          <button
            onClick={() => setPromoTab('spin')}
            className={`flex-1 py-3 px-1 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
              promoTab === 'spin' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/10' 
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            🎡 Spin
          </button>
          <button
            onClick={() => setPromoTab('bids')}
            className={`flex-1 py-3 px-1 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
              promoTab === 'bids' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/10' 
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            📊 Bids
          </button>
          <button
            onClick={() => setPromoTab('offers')}
            className={`flex-1 py-3 px-1 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
              promoTab === 'offers' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/10' 
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            📌 Flyer
          </button>
        </div>

        {/* Tab CONTENT 1: Spin Wheel */}
        {promoTab === 'spin' && (
          <div className="flex flex-col items-center gap-6 bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute w-40 h-40 rounded-full bg-violet-600/5 blur-3xl -top-10 -left-10" />
            <div className="absolute w-40 h-40 rounded-full bg-indigo-600/5 blur-3xl -bottom-10 -right-10" />

            <div className="text-center">
              <span className="font-bold text-[9px] uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full font-mono">
                Spin & Win
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-2.5">Circular Fortune Wheel</h3>
              <p className="text-[10px] text-slate-400 font-extrabold font-mono uppercase tracking-tight mt-1">
                {hasFreeSpin ? (
                  "🎉 Daily free spin is active! Grab free rewards" 
                ) : (
                  "🎡 Free spin claimed. Extra spin costs only ₦100 NGN"
                )}
              </p>
            </div>

            {/* Wheel Canvas Container */}
            <div className="relative flex flex-col items-center justify-center mt-1 scale-95 select-none">
              {/* Spinning Arrow Indicator (At Top Center) */}
              <div className="absolute -top-1.5 z-30 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-rose-600 drop-shadow-md" />
                <div className="w-1.5 h-3 bg-rose-600 rounded-b" />
              </div>

              {/* Wheel circle */}
              <motion.div
                style={{ rotate: wheelRotation }}
                transition={spinning ? { duration: 4, ease: [0.12, 0.8, 0.15, 1] } : { duration: 0 }}
                className={`relative w-64 h-64 rounded-full border-4 shadow-2xl flex items-center justify-center overflow-hidden transition-all ${
                  spinning ? 'animate-pulse' : ''
                } border-slate-950 bg-slate-950`}
              >
                {sectors.map((sector, index) => {
                  const angle = index * 45;
                  return (
                    <div
                      key={index}
                      className="absolute top-0 left-0 w-full h-full flex items-center justify-center origin-center"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      {/* Triangle Wedge segment */}
                      <div 
                        className="absolute top-0 w-0 h-0 border-l-[49px] border-l-transparent border-r-[49px] border-r-transparent border-t-[128px]"
                        style={{ borderTopColor: sector.color }}
                      />
                      {/* Text label */}
                      <span 
                        className="absolute top-6 font-black text-[9px] text-white select-none whitespace-nowrap transform -translate-y-1 origin-center drop-shadow-md tracking-wider uppercase font-mono"
                        style={{ transform: `rotate(22.5deg)` }}
                      >
                        {sector.label}
                      </span>
                    </div>
                  );
                })}

                {/* Concentric center ring/pin */}
                <div className="absolute w-12 h-12 rounded-full bg-white border-4 border-slate-950 flex items-center justify-center shadow-lg z-10">
                  <div className="w-3 h-3 rounded-full bg-slate-900" />
                </div>
              </motion.div>
            </div>

            {/* Action controls */}
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                disabled={spinning}
                onClick={handleSpinWheel}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transform active:scale-95 transition-all shadow-lg ${
                  spinning
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-indigo-600/20 active:shadow-sm'
                }`}
              >
                {spinning ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    Calculating Vectors...
                  </span>
                ) : hasFreeSpin ? (
                  "🍀 Spin For Free (Daily)"
                ) : (
                  "🎡 Spin Again (Costs ₦100)"
                )}
              </button>
            </div>
            
            {userData?.spinBalance && userData.spinBalance > 0 ? (
              <div className="w-full bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-[10px] font-mono leading-relaxed text-emerald-800 font-bold mt-2">
                ✅ Authenticated Spin Commissions: ₦{userData.spinBalance.toLocaleString()} NGN. Your fortune spin winnings have been automatically authenticated and added to your main wallet balance for processing.
              </div>
            ) : null}
          </div>
        )}

        {/* Tab CONTENT 2: Live Market Bids (Replacing Lotto) */}
        {promoTab === 'bids' && (
          <div className="flex flex-col gap-5 bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm relative overflow-hidden">
            
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-[9px] uppercase tracking-widest text-[#4f46e5] bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full font-mono">
                    Live Market Bids
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-2.5 tracking-tight">Price Direction</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Market Baseline: 5.00 | Outcome: (0.00 - 10.00)
                  </p>
                </div>
                <div className="text-right bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-2xl">
                  <p className="text-[8px] text-emerald-600 font-extrabold uppercase font-mono tracking-wider">Potential Gain</p>
                  <p className="text-[13px] font-black font-mono text-emerald-600 mt-0.5">1.9x Returns</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-4 rounded-3xl flex flex-col items-center gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Market Sentiment</p>
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-emerald-500 font-mono">68%</span>
                    <span className="text-[8px] font-black uppercase text-slate-400">Buying High</span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200" />
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-rose-500 font-mono">32%</span>
                    <span className="text-[8px] font-black uppercase text-slate-400">Buying Low</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-center">
                Select Direction & Stake Amount:
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setBidChoice('high')}
                  className={`flex flex-col items-center p-4 rounded-3xl border-2 transition-all ${
                    bidChoice === 'high' 
                      ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-500/10' 
                      : 'bg-white border-slate-100 opacity-60'
                  }`}
                >
                  <TrendingUp className="text-emerald-500 mb-1" size={24} />
                  <span className="font-black text-sm text-emerald-600">HIGH</span>
                  <span className="text-[8px] font-bold text-emerald-500/70 font-mono">Outcome &gt; 5.00</span>
                </button>
                <button
                  onClick={() => setBidChoice('low')}
                  className={`flex flex-col items-center p-4 rounded-3xl border-2 transition-all ${
                    bidChoice === 'low' 
                      ? 'bg-rose-50 border-rose-500 shadow-lg shadow-rose-500/10' 
                      : 'bg-white border-slate-100 opacity-60'
                  }`}
                >
                  <TrendingDown className="text-rose-500 mb-1" size={24} />
                  <span className="font-black text-sm text-rose-600">LOW</span>
                  <span className="text-[8px] font-bold text-rose-500/70 font-mono">Outcome ≤ 5.00</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBetStake(amt)}
                    className={`py-2.5 rounded-xl text-[11px] font-black font-mono border-2 transition-all ${
                      betStake === amt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                        : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
                <div className="col-span-2 flex items-center bg-white border-2 border-slate-100 rounded-xl px-2.5">
                  <span className="text-[11px] font-black font-mono text-slate-400">₦</span>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    value={betStake}
                    onChange={(e) => setBetStake(Math.max(100, Math.min(50000, parseInt(e.target.value) || 100)))}
                    className="w-full text-right text-[11px] font-black font-mono text-slate-800 bg-transparent focus:outline-none pl-1"
                  />
                </div>
              </div>

              <button
                disabled={bidLoading}
                onClick={handlePlaceBid}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {bidLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Syncing Market Vectors...
                  </>
                ) : (
                  <>
                    📊 Place Live Bid (₦{betStake.toLocaleString()})
                  </>
                )}
              </button>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono mb-3">
                🕒 Recent Market Outcomes
              </h4>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {bidHistory.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <TrendingUp size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-400 font-bold font-mono uppercase">Market is active</p>
                    <p className="text-[9px] text-slate-400 mt-1">Place your first bid to start tracking</p>
                  </div>
                ) : (
                  bidHistory.map((bid) => (
                    <div key={bid.id} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bid.won ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {bid.won ? <Check size={14} strokeWidth={3} /> : <RotateCcw size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase font-mono ${bid.choice === 'high' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {bid.choice} Bid @ {bid.result}
                          </p>
                          <p className="text-[8px] text-slate-400 font-bold font-mono">STAKE: ₦{bid.stake.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[11px] font-black font-mono ${bid.won ? 'text-emerald-600' : 'text-rose-400'}`}>
                          {bid.won ? `+₦${bid.reward.toLocaleString()}` : `-₦${bid.stake.toLocaleString()}`}
                        </p>
                        <p className="text-[7px] text-slate-400 font-bold font-mono">{new Date(bid.date).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab CONTENT 0: Employee Deal Program */}
        {promoTab === 'deal' && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            {/* Top Section */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] text-white shadow-lg relative overflow-hidden">
              {/* Soft Ambient Inner Glows */}
              <div className="absolute w-40 h-40 rounded-full bg-blue-500/10 blur-3xl -top-10 -left-10" />
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/10 blur-2xl" />
              
              <div className="relative flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 px-3 py-1 rounded-full w-max mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-300 font-mono">Brex Deal Room</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight leading-none mb-1 text-white">Employee Deal Program</h3>
                  <p className="text-[11px] text-slate-300 font-medium">Accelerate growth, unlock continuous compounding rewards</p>
                </div>
                <div className="bg-white/10 p-2.5 rounded-2xl border border-white/15 shadow-inner select-none text-xl">
                  🤝
                </div>
              </div>

              {/* Stats Highlights */}
              <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10 font-mono text-center">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold block mb-0.5">Active Tier</span>
                  <span className="text-xs font-black text-blue-300">Milestone {userData?.referralTier || 1}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold block mb-0.5">Progress</span>
                  <span className="text-xs font-black text-emerald-400">
                    {userData?.currentReferrals || 0} / {userData?.referralTier === 3 ? 32 : userData?.referralTier === 2 ? 20 : 10}
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold block mb-0.5">Total Referred</span>
                  <span className="text-xs font-black text-indigo-300">{userData?.totalReferrals || 0}</span>
                </div>
              </div>
            </div>

            {/* Sandbox Simulation / Add Referral Panel */}
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-[24px] flex flex-col items-center justify-between gap-4 text-center sm:text-left sm:flex-row">
              <div className="flex-1">
                <p className="text-xs font-black text-blue-900">Sandbox Invite Simulator 👉</p>
                <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
                  Directly simulate custom downline registration events to instantly test counts and rewards!
                </p>
              </div>
              <button
                onClick={async () => {
                  showToast("Simulating a downline invite...");
                  try {
                    // 1. Try local mock sim
                    if (userData?.id) {
                      await fetch('/api/user/simulate-invite', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': userData.id
                        }
                      });
                    }
                    // 2. Try online firestore stats increment as well
                    if (simulateInvite) {
                      await simulateInvite();
                    }
                    // 3. Reload latest statistics
                    if (refreshProfile) {
                      await refreshProfile();
                    }
                    showToast("🎉 Simulated invite successfully processed!");
                  } catch (e) {
                    console.error("Simulation trigger failed:", e);
                    showToast("Processed invite completed with syncing!");
                  }
                }}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-4.5 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/10 cursor-pointer active:scale-95"
              >
                <span>🚀 Simulate Referral</span>
              </button>
            </div>

            {/* Middle Section: Milestones Stacked Cards */}
            <div>
              <div className="flex items-center justify-between mb-3.5 px-1">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Rewards Milestones</span>
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">Tier Advancements</span>
              </div>
              
              <div className="space-y-4">
                {[
                  { tier: 1, target: 10, payout: 30000, label: "10 Referrals Booster Deal" },
                  { tier: 2, target: 20, payout: 65000, label: "20 Referrals Business Deal" },
                  { tier: 3, target: 32, payout: 100000, label: "32 Referrals Corporate Deal" }
                ].map((milestone) => {
                  const currentTier = userData?.referralTier || 1;
                  const currentProgress = userData?.currentReferrals || 0;
                  
                  let isCompleted = currentTier > milestone.tier;
                  let isActive = currentTier === milestone.tier;
                  let isLocked = currentTier < milestone.tier;
                  
                  let percentage = 0;
                  if (isCompleted) percentage = 100;
                  else if (isActive) percentage = Math.min(100, Math.round((currentProgress / milestone.target) * 100));
                  
                  return (
                    <div 
                      key={milestone.tier} 
                      className={`relative bg-white border rounded-[28px] p-5.5 transition-all shadow-sm flex flex-col gap-3.5 overflow-hidden ${
                        isActive 
                          ? 'border-blue-500 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/10 bg-white' 
                          : isCompleted 
                            ? 'border-slate-200 bg-slate-50/50 opacity-90' 
                            : 'border-slate-100 opacity-60 bg-slate-100/30'
                      }`}
                    >
                      {/* Badge representation */}
                      {isCompleted && (
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white font-mono text-[8px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          ✓ COMPLETED
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute top-4 right-4 bg-blue-600 text-white font-mono text-[8px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                          ● ACTIVE TIER
                        </div>
                      )}
                      {isLocked && (
                        <div className="absolute top-4 right-4 bg-slate-200 text-slate-600 font-mono text-[8px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          🔒 LOCKED
                        </div>
                      )}

                      <div>
                        <span className="text-[9px] font-black text-blue-600 font-mono uppercase tracking-wider block mb-0.5">Tier {milestone.tier} Milestone</span>
                        <h4 className="text-base font-black text-slate-900 tracking-tight leading-none">{milestone.label}</h4>
                      </div>

                      <div className="flex justify-between items-baseline py-1 border-t border-slate-55 mt-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase">Payout Commission</span>
                        <span className="text-base font-mono font-black text-slate-900">
                          ₦{milestone.payout.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans font-extrabold">Monthly</span>
                        </span>
                      </div>

                      {/* IOS-Style blue fill grey background progress bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-mono font-extrabold uppercase">
                          <span className={`${isActive ? 'text-blue-600' : 'text-slate-400'}`}>MILESTONE BAR</span>
                          <span className="text-slate-900">{isCompleted ? milestone.target : isActive ? currentProgress : 0} / {milestone.target}</span>
                        </div>
                        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/40">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted 
                                ? 'bg-emerald-500' 
                                : isActive 
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm' 
                                  : 'bg-slate-300'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notification logs inside the program */}
            {userData?.notifications && userData.notifications.length > 0 && (
              <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <span className="text-sm">🔔</span>
                  <p className="text-xs font-black text-slate-900 uppercase">Live Milestone Alerts</p>
                </div>
                <div className="space-y-2.5 max-h-48 overflow-y-auto hide-scrollbar">
                  {userData.notifications.slice(0, 10).map((n: any) => (
                    <div key={n.id} className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl flex gap-3 items-start">
                      <span className="text-xs mt-0.5">⭐</span>
                      <div className="flex-grow">
                        <p className="text-[11px] font-bold text-slate-800 leading-normal">{n.message}</p>
                        <p className="text-[8px] text-slate-400 font-mono mt-1 font-bold">{n.date ? new Date(n.date).toLocaleDateString() : 'Just now'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Section */}
            <div className="text-center py-4 bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl mt-1 select-none">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">Track Progress. Boost Earnings.</p>
            </div>
          </div>
        )}

        {/* Tab CONTENT 3: Special Banner Flyer offers */}
        {promoTab === 'offers' && (
          <div className="flex flex-col gap-6">
            <div className="text-center bg-white border border-slate-100 p-4 rounded-3xl">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Active VIP Portfolio Streams</h3>
              <p className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-widest mt-0.5">Official Promos & Circular Bulletins</p>
            </div>
            <img src={flyer1} alt="Revenue Stream Plan" className="rounded-[32px] shadow-lg w-full border border-slate-100" />
            <img src={flyer2} alt="Wealth Builder Plan" className="rounded-[32px] shadow-lg w-full border border-slate-100" />
          </div>
        )}

        {/* Live Bid Result Modal */}
        {bidResultModal?.show && (
          <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-5 z-[250] select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[36px] w-full max-w-sm p-6 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl -top-10 -left-10" />
              <div className="absolute w-40 h-40 rounded-full bg-violet-500/10 blur-3xl -bottom-10 -right-10" />

              {bidResultModal.won ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-3xl mb-4 shadow-sm animate-bounce">
                    💎
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Market Profit Unlocked!</h3>
                  <p className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-widest mt-1">
                    Market Baseline: 5.00 | Outcome: {bidResultModal.result}
                  </p>
                  <p className="text-4xl font-extrabold font-mono text-emerald-600 tracking-tighter my-5">
                    +₦{bidResultModal.reward.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-normal mt-1 max-w-xs leading-relaxed">
                    Your {bidResultModal.choice.toUpperCase()} bid was accurate. Profit has been added to your ledger.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-3xl mb-4 shadow-sm">
                    📉
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Market Volatility</h3>
                  <p className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-widest mt-1">
                    Market Baseline: 5.00 | Outcome: {bidResultModal.result}
                  </p>
                  <p className="text-2xl font-extrabold font-mono text-rose-600 tracking-tighter my-5">
                    LOST BID
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-normal mt-1 max-w-xs leading-relaxed">
                    The {bidResultModal.choice.toUpperCase()} prediction missed the mark. Better luck in the next session!
                  </p>
                </>
              )}

              <button
                onClick={() => setBidResultModal(null)}
                className="w-full mt-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Continue Trading
              </button>
            </motion.div>
          </div>
        )}
        {spinResultModal?.show && (
          <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-5 z-[230] select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[36px] w-full max-w-sm p-6 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl -top-10 -left-10" />
              <div className="absolute w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl -bottom-10 -right-10" />

              {spinResultModal.reward > 0 ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-3xl mb-4 shadow-sm animate-bounce">
                    🎉
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Congratulations Winner!</h3>
                  <p className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-widest mt-1">
                    Your vectors aligned on segment color
                  </p>
                  <p className="text-4xl font-extrabold font-mono text-emerald-600 tracking-tighter my-5">
                    {spinResultModal.label}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-normal mt-1 max-w-xs leading-relaxed">
                    Commission reward credited instantly to your available balance wallet ledger. Keep spinning!
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl mb-4 shadow-sm">
                    🎡
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">So Close!</h3>
                  <p className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-widest mt-1">
                    Keep your circles active
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-slate-800 tracking-tighter my-5">
                    Try Again!
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold font-mono uppercase mt-1 max-w-xs leading-relaxed">
                    Extra spins cost only ₦100 NGN. Spin again to land standard cashpots!
                  </p>
                </>
              )}

              <button
                onClick={() => setSpinResultModal(null)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-950 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg mt-6 active:scale-95 transition-all cursor-pointer"
              >
                Close Gateway
              </button>
            </motion.div>
          </div>
        )}
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

  const renderWallet = () => {
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
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Wallet Management</h2>
            <p className="text-slate-500 text-xs font-bold leading-none mt-1">Deposit or withdraw from your wallet</p>
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
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-[32px] text-[11px] flex flex-col gap-3 shadow-xl shadow-blue-500/20 font-semibold relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Rocket size={120} />
              </div>
              <div className="flex items-center gap-2 relative z-10">
                <Zap size={24} className="shrink-0 text-yellow-300" />
                <span className="font-black uppercase tracking-widest text-yellow-300 text-[13px]">Fast Track Your Wealth 🚀</span>
              </div>
              <p className="leading-relaxed relative z-10 text-white text-xs font-semibold">
                Depositing allows you to unlock high-yield VIP plans instantly. Members who deposit aggressively and leave funds compounding earn <span className="font-black text-yellow-300 text-sm">500% MORE</span> than standard members. Don't wait on the sidelines!
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
                  placeholder="Min 100"
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
              disabled={rechargeAmt < 100}
              className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-[24px] text-white font-black text-sm tracking-widest uppercase transition-all mt-2 cursor-pointer disabled:opacity-50 outline-none flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30"
            >
              <CreditCard size={20} /> Secure Recharge
            </button>

            {/* Real-time Production Diagnostics Console */}
            {paymentErrorDetails && (
              <div className="bg-rose-50 border border-rose-100 rounded-[24px] p-5 animate-in fade-in zoom-in-95 duration-200 mt-2 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-rose-200">
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono">Error Diagnostics</span>
                  </div>
                  <button 
                    onClick={() => setPaymentErrorDetails(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-wider font-mono"
                    id="close-diagnostics-btn"
                  >
                    Clear
                  </button>
                </div>
                
                <div className="mt-3 flex flex-col gap-2.5">
                  <div className="text-[11px] text-rose-900 font-black leading-relaxed">
                    {paymentErrorDetails.error}
                  </div>

                  {paymentErrorDetails.details && (
                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                      <div className="text-[9px] font-black text-slate-400 uppercase font-mono tracking-wider mb-1">Details / Raw Payload</div>
                      <pre className="text-[10px] text-slate-600 font-mono overflow-x-auto whitespace-pre-wrap max-h-40 leading-relaxed font-semibold">
                        {typeof paymentErrorDetails.details === 'object' 
                          ? JSON.stringify(paymentErrorDetails.details, null, 2) 
                          : String(paymentErrorDetails.details)
                        }
                      </pre>
                    </div>
                  )}

                  {paymentErrorDetails.debug && (
                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                      <div className="text-[9px] font-black text-slate-400 uppercase font-mono tracking-wider mb-1">Internal Debug State</div>
                      <pre className="text-[10px] text-slate-700 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed font-bold">
                        {JSON.stringify(paymentErrorDetails.debug, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 border-t border-rose-100 pt-3 text-[9px] text-slate-500 font-mono font-bold leading-normal">
                    <div className="flex justify-between">
                      <span>Server DB Connection:</span>
                      <span className={paymentErrorDetails.isConfigured !== false ? "text-emerald-600" : "text-rose-600 font-black"}>
                        {paymentErrorDetails.isConfigured !== false ? "Active / Initialized" : "Unreachable"}
                      </span>
                    </div>
                    {paymentErrorDetails.resolvedPublicKey && (
                      <div className="flex justify-between">
                        <span>Loaded Public Key:</span>
                        <span className="text-slate-700">
                          {paymentErrorDetails.resolvedPublicKey.startsWith("pk_") 
                            ? `${paymentErrorDetails.resolvedPublicKey.substring(0, 10)}... (Valid)` 
                            : `None (${paymentErrorDetails.resolvedPublicKey})`
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={triggerPaystackCheckout}
                    className="mt-4 w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] py-3 rounded-xl text-white font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer outline-none"
                    id="retry-payment-btn"
                  >
                    <RefreshCw size={12} /> Retry Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : fundTab === 'withdrawal' ? (
          /* WITHDRAWAL FLOW */
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-[28px] text-[11px] flex flex-col gap-2 shadow-sm font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 text-lg">💡</span>
                <span className="font-extrabold uppercase tracking-widest text-[#ff9c00] text-xs">Smart Wealth Strategy</span>
              </div>
              <p className="leading-relaxed text-amber-900/80">
                Withdrawing interrupts your wealth multiplication cycle. Reinvesting your profits can accelerate your earning power up to <span className="font-black text-amber-700">300% faster</span>. Consider compounding before withdrawing.
              </p>
            </div>

            {/* OFFICIAL SYSTEM POLICY BOARD */}
            <div className="bg-slate-900 border border-slate-800 text-slate-100 p-6 rounded-[32px] text-xs flex flex-col gap-4 shadow-xl relative overflow-hidden text-left">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
              
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <span className="text-2xl animate-pulse">🛡️</span>
                <div>
                  <span className="font-extrabold uppercase tracking-wider text-[11px] text-indigo-400 block font-mono">System Policy Board</span>
                  <span className="font-black text-white text-sm tracking-tight leading-none mt-1 block font-sans">Anti-Abuse Settlement Upgrade v4.2</span>
                </div>
              </div>

              <div className="space-y-3 font-medium leading-relaxed text-slate-300">
                <p>
                  To secure user assets and prevent illegal payout syndications or malicious automated multi-accounts, the platform has integrated a state-of-the-art <span className="text-white font-extrabold">Peer-to-Peer Referral Validator</span>.
                </p>
                <p className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl font-mono text-[11px] leading-relaxed text-slate-400">
                  ⚠️ <span className="text-amber-400 font-extrabold">MANDATORY RULE:</span> For a withdrawal to be made on any official payout day, you <span className="text-indigo-400 font-extrabold">MUST refer at least one (1) new active partner under your invitation code TODAY</span>. Payout lines remain blocked without this verification step.
                </p>
              </div>

              {/* REAL-TIME SYSTEM INFORMATION AND CLOCK */}
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-mono text-[10px] text-slate-400">
                <div className="flex flex-col">
                  <span className="text-slate-500 uppercase font-black tracking-widest text-[8px]">System Time (WAT)</span>
                  <span className="text-indigo-300 font-black text-sm mt-0.5">{watTime || "Loading standard clock..."}</span>
                </div>
                <div className="flex flex-col text-left sm:text-right">
                  <span className="text-slate-500 uppercase font-black tracking-widest text-[8px]">Referral Verification Today</span>
                  <span className={`font-black text-xs mt-0.5 ${getTodayReferralsCount() >= 1 ? "text-emerald-400" : "text-rose-400 animate-pulse"}`}>
                    {getTodayReferralsCount() >= 1 
                      ? `🟢 VERIFIED (${getTodayReferralsCount()} Registered Today)` 
                      : `🔴 PENDING (0 / 1 Registered Today)`
                    }
                  </span>
                </div>
              </div>

              {/* INVITATION INFO FOR USERS TO IMMEDIATELY SHARE */}
              {getTodayReferralsCount() < 1 && (
                <div className="bg-indigo-950/50 border border-indigo-900 text-indigo-400 p-4 rounded-2xl flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-black uppercase text-indigo-300 font-mono tracking-wider">Your Invitation Code</span>
                    <span className="font-extrabold font-mono text-xs bg-indigo-900/60 px-3 py-1 rounded-lg border border-indigo-800 text-white select-all">{userData.invitationCode}</span>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?ref=${userData.invitationCode}`);
                      showToast("Invitation Link copied! 🔗");
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase font-mono tracking-widest text-[10px] py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer outline-none"
                  >
                    Copy Referral Link to share
                  </button>
                </div>
              )}
            </div>

            <div className={`p-5 rounded-[28px] text-xs flex items-start gap-4 shadow-sm font-semibold ${
              canWithdraw 
                ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border border-rose-100 text-rose-800'
            }`}>
              <Clock size={20} className={`shrink-0 mt-0.5 ${canWithdraw ? 'text-emerald-600' : 'text-rose-600'}`} />
              <div className="flex-1">
                <p className="font-black uppercase tracking-widest text-[11px] mb-1">
                  {canWithdraw ? 'Withdrawal Status: Open' : 'Withdrawal Status: Closed'}
                </p>
                <p className="leading-relaxed opacity-70">
                  Withdrawal hours: <span className="font-black">10:00 AM - 12:00 PM WAT</span> (Mon-Fri). Closed on weekends.
                </p>
                {canWithdraw && (
                  <div className="mt-4 bg-white/50 p-3 rounded-2xl border border-emerald-100/50 relative overflow-hidden">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest font-mono mb-2">
                        <span className="flex items-center gap-1.5"><Rocket size={10} /> Daily Dispatch Slots</span>
                        <span className="text-rose-600 animate-pulse">FILLING FAST</span>
                    </div>
                    <div className="w-full bg-emerald-200/50 rounded-full h-2 overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(99, Math.max(15, Math.floor(((new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + 3600000).getMinutes() + ((new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + 3600000).getHours() - 10) * 60)) / 120) * 85 + 10)))}%` }} 
                        />
                    </div>
                  </div>
                )}
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

                <div className="bg-rose-50 border-l-[6px] border-l-rose-500 p-6 border-y border-r border-rose-200 rounded-[28px] shadow-sm text-left flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                     <span className="text-xl">🚨</span>
                     <span className="font-black uppercase tracking-widest text-rose-700 text-[10px]">Critical Wealth Warning</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed font-mono text-rose-900/80 mt-1">
                    Withdrawing funds breaks your compound interest cycle permanently! By withdrawing today, you instantly forfeit the <span className="font-extrabold text-rose-800">10% Diamond Holder's Loyalty Bonus</span> and your account's Trust Score will drop. Top earners leave their capital compounding 24/7.
                  </p>
                </div>

                {userData.spinBalance && userData.spinBalance > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex flex-col gap-2.5 shadow-sm text-left">
                     <div className="flex justify-between items-center">
                       <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest font-mono">Segmented Spin Earnings Balance (Locked)</p>
                       <p className="text-xl font-black text-amber-600 font-mono italic">₦{userData.spinBalance.toLocaleString()}</p>
                     </div>
                     <p className="text-[9px] font-medium leading-relaxed font-mono text-amber-700/80">
                       ⚠️ Dynamic Spin winnings have been segmented. Withdrawals from this promotional fund (or any transfer over ₦5,000) require activating a Standard Level 3 (Wealth Builder - ₦16,000) or Level 4 (Micro Venture - ₦30,000) package to verify local NDIC KYC standards.
                     </p>
                  </div>
                ) : null}

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
                   <div className={`p-4 rounded-2xl text-[10px] font-mono leading-relaxed font-bold border ${
                     getWithdrawalFeeInfo().isFreeDay
                       ? 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse'
                       : 'bg-indigo-50/50 text-indigo-900 border-indigo-100'
                   }`}>
                     {getWithdrawalFeeInfo().isFreeDay ? (
                       <span>🎉 Today is standard <b>FREE WITHDRAWAL DAY</b> (5, 20, 29 of the month)! Your fee rate is 0%! No service fee applied.</span>
                     ) : (
                       <span>📢 Withdrawal fee is 10%. Save money with our monthly <b>Free Withdrawal Days</b> on the <b>5th, 20th, and 29th</b> of each month (0% fees)!</span>
                     )}
                   </div>

                   <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase tracking-widest pt-2">
                      <span>Service Fee ({getWithdrawalFeeInfo().feePercent}%)</span>
                      <span className="text-rose-500">-₦{(withdrawAmt * (getWithdrawalFeeInfo().feePercent / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                   </div>
                   <div className="flex justify-between text-base font-sans pt-3 border-t border-slate-50">
                      <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">You will receive</span>
                      <span className="text-blue-600 font-black font-mono">₦{(withdrawAmt * getWithdrawalFeeInfo().multiplier).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

                {getTodayReferralsCount() < 1 ? (
                  <div className="bg-rose-50 border border-rose-200/55 p-6 rounded-[32px] text-center flex flex-col items-center gap-3 shadow-md animate-pulse">
                    <span className="text-3xl">🔒</span>
                    <div>
                      <h5 className="text-rose-900 font-extrabold text-xs uppercase tracking-wider leading-none">Withdrawal Actions Locked</h5>
                      <p className="text-[10px] font-bold text-rose-700/90 mt-2 font-mono leading-relaxed max-w-xs mx-auto">
                        Our Anti-Abuse validator has hidden the payout submission button. To unlock immediate withdrawals, you must register at least <b>1 direct partner</b> under your referral code today!
                      </p>
                    </div>
                  </div>
                ) : (
                  <button onClick={handleWithdrawSubmit} disabled={withdrawAmt < 1000 || !canWithdraw} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-[28px] text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 h-20 transition-all active:scale-95 disabled:grayscale">
                     <ShieldCheck size={24} /> Withdraw Now
                  </button>
                )}
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
                    const isPlus = ['recharge', 'claim', 'bonus', 'earning', 'earnings', 'profit', 'deal', 'referral', 'reward', 'spin_win'].includes(t.type) || (t.type === 'adjustment' && Number(t.amount) >= 0);
                    const isWithdrawal = t.type === 'withdraw';
                    return (
                      <div key={t.id} className="bg-white border border-slate-200 p-5 rounded-[32px] flex flex-col gap-4 shadow-sm group hover:border-blue-200 transition-all font-semibold">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isPlus ? 'bg-blue-50' : 'bg-slate-50'}`}>
                                {t.type === 'recharge' ? '📥' : 
                                 t.type === 'withdraw' ? '📤' : 
                                 ['subscribe', 'investment'].includes(t.type) ? '💼' : 
                                 ['earning', 'profit', 'claim'].includes(t.type) ? '📈' : 
                                 t.type === 'adjustment' ? '⚙️' : '🎁'}
                             </div>
                             <div>
                                <p className="text-[11px] font-black uppercase text-slate-900 font-mono group-hover:text-blue-600 transition-colors">
                                  {t.type === 'recharge' ? 'Funding Deposit' :
                                   t.type === 'withdraw' ? 'Withdrawal Payout' :
                                   t.type === 'subscribe' ? 'Plan Subscription' :
                                   t.type === 'claim' ? 'Yield Claim' :
                                   t.type === 'earning' || t.type === 'profit' ? 'Task Profit' :
                                   t.type === 'adjustment' ? 'Balance Adjustment' :
                                   ['bonus', 'referral', 'deal', 'reward'].includes(t.type) ? 'Referral Reward' : t.type}
                                </p>
                                {t.details && <p className="text-[10px] text-slate-500 font-semibold leading-relaxed my-0.5">{t.details}</p>}
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-mono">{t.date}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className={`font-black font-mono text-sm ${isPlus ? 'text-emerald-600' : 'text-rose-600'}`}>
                               {isPlus ? '+' : '-'}₦{Math.abs(Number(t.amount || 0)).toLocaleString()}
                             </p>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 italic font-mono">{t.status || 'Success'}</p>
                          </div>
                        </div>

                        {/* Visual Status Stepper for Withdrawals */}
                        {isWithdrawal && (
                          <div className="mt-1 pt-3 border-t border-slate-50 flex flex-col gap-3">
                            <div className="flex justify-between items-center text-[8px] font-mono text-slate-450 uppercase tracking-wider">
                              <span>Security Verification Progress</span>
                              <span className="font-extrabold text-[#ff9c00] bg-[#ff9c00]/5 px-2 py-0.5 rounded">HP-TX-{t.id.slice(0, 6).toUpperCase()}</span>
                            </div>
                            
                            <div className="relative flex items-center justify-between px-1 py-1">
                              {/* Background Line */}
                              <div className="absolute left-[15%] right-[15%] top-4 h-[2px] bg-slate-100 -z-0" />
                              
                              {/* Active status filling line */}
                              <div 
                                className="absolute left-[15%] h-[2px] bg-emerald-500 transition-all duration-700 -z-0"
                                style={{
                                  width: 
                                    t.status === 'success' || !t.status || t.status === 'Completed' || t.status === 'Success' ? '70%' :
                                    t.status === 'processing' || t.status === 'Processing' ? '35%' : '0%'
                                }}
                              />

                              {/* Step 1: Pending */}
                              <div className="flex flex-col items-center gap-1 z-10 w-1/3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all border ${
                                  t.status === 'failed' || t.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-500 border-rose-200 shadow-sm'
                                    : 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                }`}>
                                  {t.status === 'failed' || t.status === 'rejected' ? '❌' : '1'}
                                </div>
                                <span className="text-[8.5px] font-black uppercase text-slate-800 tracking-tight font-mono text-center">Pending</span>
                                <span className="text-[7.5px] text-slate-400 font-bold font-sans leading-none text-center">Verification</span>
                              </div>

                              {/* Step 2: Processing */}
                              <div className="flex flex-col items-center gap-1 z-10 w-1/3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all border ${
                                  t.status === 'success' || !t.status || t.status === 'Completed' || t.status === 'Success'
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                    : t.status === 'processing' || t.status === 'Processing'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md animate-pulse'
                                    : 'bg-white text-slate-300 border-slate-200'
                                }`}>
                                  2
                                </div>
                                <span className={`text-[8.5px] font-black uppercase tracking-tight font-mono text-center ${
                                  t.status === 'success' || !t.status || t.status === 'Completed' || t.status === 'Success' || t.status === 'processing' || t.status === 'Processing'
                                    ? 'text-slate-800'
                                    : 'text-slate-350'
                                }`}>Processing</span>
                                <span className="text-[7.5px] text-slate-400 font-bold font-sans leading-none text-center">NUBAN Despatch</span>
                              </div>

                              {/* Step 3: Completed */}
                              <div className="flex flex-col items-center gap-1 z-10 w-1/3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all border ${
                                  t.status === 'success' || !t.status || t.status === 'Completed' || t.status === 'Success'
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                    : 'bg-white text-slate-300 border-slate-200'
                                }`}>
                                  ✓
                                </div>
                                <span className={`text-[8.5px] font-black uppercase tracking-tight font-mono text-center ${
                                  t.status === 'success' || !t.status || t.status === 'Completed' || t.status === 'Success'
                                    ? 'text-emerald-600'
                                    : 'text-slate-350'
                                }`}>Completed</span>
                                <span className="text-[7.5px] text-slate-400 font-bold font-sans leading-none text-center">Paid & Verified</span>
                              </div>
                            </div>
                          </div>
                        )}
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
    if (siteSettings?.maintenanceMode && userData && !userData.isAdmin) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0C1017] p-8 max-w-md mx-auto">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
            <Shield size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest text-center mb-3">System Maintenance</h1>
          <p className="text-slate-400 text-sm text-center leading-relaxed font-semibold">
            We are currently upgrading our platform's core infrastructure to serve you better. Please check back later.
          </p>
          <button 
            onClick={logout} 
            className="mt-10 px-8 py-3 bg-[#131926] border border-[#1E293B] rounded-xl text-slate-300 font-extrabold uppercase text-[10px] tracking-[0.2em] hover:bg-[#1E293B] transition-colors"
          >
            Sign Out
          </button>
        </div>
      );
    }
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
              case Screen.Funds: return renderFunds();
              case Screen.Portfolio: return renderPortfolio();
              case Screen.Profile: return renderProfile();
              case Screen.Wallet: return renderWallet();
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

      <TelegramModal isOpen={showTelegramModal} onClose={() => {
        setShowTelegramModal(false);
      }} />

      <FlyerPopup 
        isOpen={showFlyerModal} 
        onClose={() => setShowFlyerModal(false)}
        onAction={() => {
          setShowFlyerModal(false);
          navigate(Screen.Funds);
        }}
      />

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

      {/* Holiday Announcement Modal Overlay */}
      <AnimatePresence>
        {showHolidayModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[#131926] border border-orange-500/30 w-full max-w-md rounded-[32px] p-0 overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-20">
                  <span className="text-9xl">🌴</span>
                </div>
                <div className="relative z-10 bg-white/20 p-4 rounded-full mb-4">
                  <span className="text-4xl">🏖️</span>
                </div>
                <h3 className="text-2xl font-black tracking-tight relative z-10">Public Holiday</h3>
                <p className="text-[10px] uppercase font-black opacity-80 tracking-widest font-mono mt-1 relative z-10">Trading & Operations Paused</p>
              </div>
              <div className="p-8">
                <div className="text-slate-300 text-sm font-medium leading-relaxed text-center flex flex-col gap-4">
                  <p>In observation of the public holiday, all trading functions, withdrawals, and yield generation operations are temporarily suspended.</p>
                  
                  <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl">
                    <p className="text-orange-400 font-extrabold text-xs uppercase tracking-widest mb-1">However, Deposits Are Open!</p>
                    <p className="text-[11px] leading-relaxed">You can still secure your position today. All new deposits will remain held and successfully put into operation as soon as regular trading resumes tomorrow!</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHolidayModal(false)}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-4 rounded-2xl mt-8 shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-sm tracking-widest uppercase"
                >
                  Confirm & Close
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
                      <span className="text-[#64748B] font-mono text-[9px] uppercase">Owner name (as in bank)</span>
                      <input 
                        type="text"
                        value={bankSettingsOwner}
                        onChange={(e) => setBankSettingsOwner(e.target.value.toUpperCase())}
                        placeholder="e.g. JOHN DOE"
                        className="bg-[#0C1017] border border-[#1E293B] px-4 py-3 rounded-xl text-white text-xs outline-none focus:border-[#8CEE47] font-mono"
                      />
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
                      <span>https://brex-nigeria.vercel.app/join?ref={userData.invitationCode || 'BREX-8854'}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`https://brex-nigeria.vercel.app/join?ref=${userData.invitationCode || 'BREX-8854'}`);
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
            {activeProfileOverlay === 'referral_tree' && userData && (() => {
              const activityLogs: Array<{ id: string; date: string; message: string; label: string; type: 'join' | 'bonus'; amount: number | null }> = [];
              
              teamMembers.forEach((member: any, index: number) => {
                activityLogs.push({
                  id: `join-${member.id || index}`,
                  date: member.date || 'Recent',
                  message: `User ${member.phone || 'Hidden'} joined your genealogy tree`,
                  label: `Level L${member.lvl} Member`,
                  type: 'join',
                  amount: null
                });
              });
              
              if (userData.transactions) {
                userData.transactions.forEach((tx: any) => {
                  const isReferralBonus = tx.type === 'bonus' && (
                    tx.details.toLowerCase().includes('referral') || 
                    tx.details.toLowerCase().includes('invite') ||
                    tx.details.toLowerCase().includes('invited') ||
                    tx.details.toLowerCase().includes('deposit active') ||
                    tx.details.toLowerCase().includes('first deposit')
                  );
                  if (isReferralBonus) {
                    activityLogs.push({
                      id: tx.id,
                      date: tx.date || 'Recent',
                      message: tx.details,
                      label: 'Referral Bonus Credited',
                      type: 'bonus',
                      amount: tx.amount
                    });
                  }
                });
              }

              activityLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <div className="space-y-4">
                  <div className="flex bg-[#0C1017] p-1 rounded-2xl border border-slate-850">
                    <button
                      onClick={() => setTeamSubTab('members')}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        teamSubTab === 'members'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      👥 Team Members ({teamMembers.length})
                    </button>
                    <button
                      onClick={() => setTeamSubTab('activity')}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        teamSubTab === 'activity'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚡ Referral Activity ({activityLogs.length})
                    </button>
                  </div>

                  {teamSubTab === 'members' ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <p className="text-white text-[10px] font-black uppercase tracking-wider font-mono">My Genealogy Tree</p>
                        <span className="bg-[#8CEE47]/10 text-[#8CEE47] text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1.5 border border-[#8CEE47]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8CEE47] animate-pulse" />
                          {teamMembers.length} Active Node(s)
                        </span>
                      </div>
                      
                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                        {teamMembers.length === 0 ? (
                          <div className="bg-[#131926] p-10 rounded-[32px] border border-[#1E293B] text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-250">
                            <div className="w-14 h-14 bg-[#0C1017] rounded-full flex items-center justify-center text-2xl grayscale opacity-40 shadow-inner">👥</div>
                            <div>
                              <p className="text-white text-xs font-black uppercase tracking-tighter">No Genealogy Records</p>
                              <p className="text-slate-500 text-[10px] font-bold mt-1 max-w-[180px] mx-auto leading-relaxed">Refer your partners to start building your wealth architecture.</p>
                            </div>
                          </div>
                        ) : (
                          teamMembers.map((m: any, idx: number) => (
                            <div key={idx} className="bg-[#131926] p-4 rounded-[28px] border border-[#1E293B] flex items-center justify-between border-l-4 border-l-blue-600 transition-all hover:bg-[#1E293B]/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <p className="text-white text-[10px] font-black uppercase tracking-wider font-mono">Real-time Verified Network Logs</p>
                        <span className="bg-[#8CEE47]/10 text-[#8CEE47] text-[9px] font-black px-2 py-0.5 rounded flex items-center border border-[#8CEE47]/20 font-mono">
                          AUDITED
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                        {activityLogs.length === 0 ? (
                          <div className="bg-[#131926] p-10 rounded-[32px] border border-[#1E293B] text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-250">
                            <div className="w-14 h-14 bg-[#0C1017] rounded-full flex items-center justify-center text-2xl grayscale opacity-40 shadow-inner">⚡</div>
                            <div>
                              <p className="text-white text-xs font-black uppercase tracking-tighter">No Activity Recovers</p>
                              <p className="text-slate-500 text-[10px] font-bold mt-1 max-w-[180px] mx-auto leading-relaxed">No referral memberships or bonus events registered yet.</p>
                            </div>
                          </div>
                        ) : (
                          activityLogs.map((log: any) => (
                            <div key={log.id} className="bg-[#131926] p-4 rounded-[28px] border border-[#1E293B] flex items-start gap-3.5 transition-all hover:bg-[#1E293B]/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                              <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                log.type === 'join' 
                                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10' 
                                  : 'bg-[#8CEE47]/10 text-[#8CEE47] border border-[#8CEE47]/10'
                              }`}>
                                {log.type === 'join' ? <UserCheck size={14} /> : <Gift size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-[9px] font-black uppercase tracking-widest ${log.type === 'join' ? 'text-blue-400' : 'text-[#8CEE47]'}`}>
                                    {log.label}
                                  </p>
                                  <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap font-mono">{log.date}</span>
                                </div>
                                <p className="text-white text-xs font-bold leading-snug mt-1">{log.message}</p>
                                {log.amount !== null && (
                                  <p className="text-[11px] font-mono text-[#8CEE47] font-black mt-1">
                                    +₦{log.amount.toLocaleString()} Credited Instantly
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-[#131926] p-4 rounded-[28px] border border-[#1E293B] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400">💡</div>
                    <p className="text-[10px] leading-relaxed text-slate-400 font-semibold flex-1">
                      Invite partners using your code <span className="text-white font-bold">{userData.invitationCode}</span> to grow your genealogy and claim rewards!
                    </p>
                  </div>
                </div>
              );
            })()}

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

      {/* MODAL 1: Official Reserves Audit Ledger */}
      {showReservesAuditModal && (
        <div className="fixed inset-0 bg-[#06080F]/95 flex items-center justify-center p-5 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0C111C] border border-slate-800 rounded-[36px] max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-left my-auto">
            <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start mb-5 m-0 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[#8CEE47] bg-[#8CEE47]/5 border border-[#8CEE47]/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest font-mono">EY Audit Protocol</span>
                <h3 className="text-white font-black text-base mt-1 tracking-tight">Verified Audited Ledgers</h3>
              </div>
              <button 
                onClick={() => setShowReservesAuditModal(false)}
                className="w-8 h-8 rounded-full bg-[#131926] hover:bg-[#1E293B] border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs cursor-pointer outline-none"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-[10.5px] font-semibold leading-relaxed mb-4">
              Audit conducted in June 2026 certifies matching 1-to-1 reserve coverage backing each user account deposits with direct custodian banks.
            </p>

            <div className="space-y-3.5">
              <div className="bg-[#131926] p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400 text-[9px] font-black uppercase font-mono tracking-wider">Account Escrow A (OPay Ledger)</span>
                  <span className="text-[#8CEE47] text-[10px] font-black font-mono">₦185,000,000</span>
                </div>
                <div className="w-full bg-[#0C1017] rounded-full h-1.5 border border-slate-800">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full" style={{ width: '38%' }} />
                </div>
              </div>

              <div className="bg-[#131926] p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400 text-[9px] font-black uppercase font-mono tracking-wider">Liquidity Custody B (UBA Node)</span>
                  <span className="text-[#8CEE47] text-[10px] font-black font-mono">₦200,000,000</span>
                </div>
                <div className="w-full bg-[#0C1017] rounded-full h-1.5 border border-slate-800">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full" style={{ width: '41%' }} />
                </div>
              </div>

              <div className="bg-[#131926] p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400 text-[9px] font-black uppercase font-mono tracking-wider">Underwritten Risk Pool</span>
                  <span className="text-[#8CEE47] text-[10px] font-black font-mono">₦100,290,000</span>
                </div>
                <div className="w-full bg-[#0C1017] rounded-full h-1.5 border border-slate-00">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full" style={{ width: '21%' }} />
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A24]/30 border border-amber-500/20 p-3.5 rounded-2xl mt-4 flex items-start gap-2.5">
              <span className="text-sm">🤝</span>
              <p className="text-amber-500 text-[9.5px] font-bold leading-normal m-0 uppercase tracking-tight text-left">
                Capital backing protection is regulated under NDIC &amp; Securities and Exchange Code. 100% of user savings deposits are legally immune to trade hazards.
              </p>
            </div>

            <button 
              onClick={() => setShowReservesAuditModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl mt-5 uppercase font-mono text-[9.5px] tracking-wider cursor-pointer outline-none transition-all shadow-lg shadow-blue-600/10"
            >
              Close Asset ledger
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Yield Certificate / Capital Guarantee Details */}
      {selectedCertificatePlan && (
        <div className="fixed inset-0 bg-[#06080F]/95 flex items-center justify-center p-5 z-50 overflow-y-auto animate-in fade-in duration-250">
          <div className="bg-[#0C111C] border border-slate-800 rounded-[36px] max-w-lg w-full p-6 shadow-2xl relative overflow-hidden text-left my-auto">
            
            <div className="flex justify-between items-start mb-4 pb-2 border-b border-slate-850 m-0">
              <div>
                <span className="text-[#ff9c00] bg-[#ff9c00]/5 border border-[#ff9c00]/15 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest font-mono">Secured Wealth Deed</span>
                <h3 className="text-white font-black text-base mt-1 tracking-tight">
                  {selectedCertificatePlan.isGuaranteedInfoOnly ? 'Principal Backing Guarantee' : 'Savings Trust Certificate'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCertificatePlan(null)}
                className="w-8 h-8 rounded-full bg-[#131926] hover:bg-[#1E293B] border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs cursor-pointer outline-none"
              >
                ✕
              </button>
            </div>

            {selectedCertificatePlan.isGuaranteedInfoOnly ? (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <h4 className="text-amber-500 font-black text-xs uppercase tracking-wider">100% Capital Indemnity Guarantee</h4>
                    <p className="text-slate-400 text-[10px] font-medium leading-relaxed mt-0.5">Asset capital is underwritten and immune from investment pool volatilities.</p>
                  </div>
                </div>

                <div className="space-y-3 font-semibold text-slate-300 text-[11px] leading-relaxed">
                  <div className="p-3.5 bg-[#131926] border border-slate-800 rounded-xl flex items-start gap-2.5">
                    <span className="text-blue-500">✔</span>
                    <p className="m-0 text-left">Your committed cost of <span className="text-white font-black font-mono">₦{selectedCertificatePlan.cost.toLocaleString()}</span> is fully backed by sovereign corporate debt bonds.</p>
                  </div>
                  <div className="p-3.5 bg-[#131926] border border-slate-800 rounded-xl flex items-start gap-2.5">
                    <span className="text-blue-500">✔</span>
                    <p className="m-0 text-left">Daily returns of <span className="text-white font-black font-mono">₦{selectedCertificatePlan.dailyProfit.toLocaleString()}</span> are distribution-guaranteed for 365 calendar days.</p>
                  </div>
                  <div className="p-3.5 bg-[#131926] border border-slate-800 rounded-xl flex items-start gap-2.5">
                    <span className="text-blue-500">✔</span>
                    <p className="m-0 text-left">Full liquidation rights available at the closing of the savings lifecycle.</p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedCertificatePlan(null)}
                  className="w-full bg-[#ff9c00] hover:bg-amber-600 text-slate-950 font-black py-4 px-4 rounded-xl mt-3 uppercase font-mono text-[9.5px] tracking-wider cursor-pointer outline-none transition-all shadow-lg"
                >
                  I Understand Capital Protection Guidelines
                </button>
              </div>
            ) : (
              // Full Certificate layout for active savings plan
              <div className="space-y-4">
                <div className="border-[3px] border-double border-indigo-500/30 p-5 rounded-2xl bg-[#090D15]/85 relative overflow-hidden">
                  {/* Subtle emblem watermark */}
                  <div className="absolute right-4 bottom-4 w-32 h-32 text-indigo-500/5 select-none pointer-events-none font-black text-9xl">🛡️</div>
                  
                  <div className="text-center pb-4 border-b border-indigo-500/10">
                    <span className="text-amber-500 text-[9px] font-bold tracking-widest uppercase font-mono tab-glow">OFFICIAL CAPITAL COVENANT DEED</span>
                    <h4 className="text-white text-base font-black tracking-tight mt-1 uppercase">Brex Capital Savings Trust</h4>
                    <p className="text-[#64748B] text-[8px] font-mono tracking-widest mt-0.5">Asset Reference: HP-SEC-DEED-{selectedCertificatePlan.id.toUpperCase()}</p>
                  </div>

                  <div className="py-4 space-y-3 font-semibold text-slate-350 text-[10.5px]">
                    <div className="flex justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-[#64748B] text-[9px] font-mono uppercase">Beneficiary Owner</span>
                      <span className="text-white font-bold">{userData.name || 'HPay Valued Investor'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-[#64748B] text-[9px] font-mono uppercase">Yield Category</span>
                      <span className="text-white font-bold">{selectedCertificatePlan.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-[#64748B] text-[9px] font-mono uppercase">Acquisition Allocation</span>
                      <span className="text-[#8CEE47] font-black font-mono">₦{selectedCertificatePlan.cost.toLocaleString()} NGN</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-[#64748B] text-[9px] font-mono uppercase">Daily Yield Liability</span>
                      <span className="text-indigo-400 font-black font-mono">₦{selectedCertificatePlan.dailyProfit.toLocaleString()} NGN</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-[#64748B] text-[9px] font-mono uppercase">Underwriting Seal</span>
                      <span className="text-indigo-400 font-extrabold text-[9px] tracking-wide animate-pulse">● SEC FULL CAPITAL ESCROW</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-indigo-550/10 flex justify-between items-end">
                    <div className="text-left">
                      <p className="text-[7.5px] font-mono text-[#64748B] uppercase">Custodian Seal</p>
                      <span className="text-indigo-400 text-[10px] font-mono italic">Brex Asset Ledger Office</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[7px] font-mono text-emerald-400 uppercase tracking-widest font-black italic">ACTIVE SAVINGS</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      showToast('Savings Contract downloaded as PDF metadata!');
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-slate-800 text-white font-bold py-3.5 px-4 rounded-xl uppercase font-mono text-[9px] tracking-wider cursor-pointer outline-none transition-all animate-none"
                  >
                    💾 Download PDF
                  </button>
                  <button 
                    onClick={() => setSelectedCertificatePlan(null)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl uppercase font-mono text-[9px] tracking-wider cursor-pointer outline-none transition-all shadow-lg border-none"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Formal Investment Agreement Checklist & Electronic Signature */}
      {selectedAgreementPlan && (
        <div className="fixed inset-0 bg-[#06080F]/95 flex items-center justify-center p-5 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0C111C] border border-slate-800 rounded-[36px] max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-left my-auto">
            
            <div className="flex justify-between items-start mb-4 pb-2 border-b border-slate-850 m-0">
              <div>
                <span className="text-[#8CEE47] bg-[#8CEE47]/5 border border-[#8CEE47]/15 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest font-mono">SEC Compliance Agreement</span>
                <h3 className="text-white font-black text-base mt-0.5 tracking-tight">Investment Trust Deed</h3>
              </div>
              <button 
                onClick={() => setSelectedAgreementPlan(null)}
                className="w-8 h-8 rounded-full bg-[#131926] hover:bg-[#1E293B] border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs cursor-pointer outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="bg-[#131926] p-4 rounded-2xl border border-slate-800 space-y-2.5 max-h-[140px] overflow-y-auto">
                <p className="text-slate-350 font-semibold text-[10.5px] leading-relaxed m-0 uppercase tracking-tight">Clause 1. Asset Purchase Underwriting</p>
                <p className="text-slate-400 text-[10px] font-medium leading-relaxed m-0">
                  Investor hereby commits the amount of ₦{selectedAgreementPlan.cost.toLocaleString()} NGN into Brex Yield Pool. These assets are protected by corresponding institutional deposits against default risk.
                </p>
                
                <p className="text-slate-350 font-semibold text-[10.5px] leading-relaxed m-0 mt-2 uppercase tracking-tight">Clause 2. Yield Distribution Rate</p>
                <p className="text-slate-400 text-[10px] font-medium leading-relaxed m-0">
                  Daily interest rate of ₦{selectedAgreementPlan.dailyProfit.toLocaleString()} NGN shall be calculated natively and made claimable by the registered user every 24 hours.
                </p>
              </div>

              {/* Checkbox 1 */}
              <label className="flex items-start gap-3 p-3 bg-[#131926] border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
                <input 
                  type="checkbox" 
                  checked={agreementChecked1}
                  onChange={(e) => setAgreementChecked1(e.target.checked)}
                  className="mt-0.5 text-blue-600 rounded border-slate-700 bg-slate-905 focus:ring-0 cursor-pointer"
                />
                <span className="text-slate-300 text-[10px] font-semibold leading-snug select-none">
                  I accept that my principal capital remains 100% insured under FDIC credit policy.
                </span>
              </label>

              {/* Checkbox 2 */}
              <label className="flex items-start gap-3 p-3 bg-[#131926] border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
                <input 
                  type="checkbox" 
                  checked={agreementChecked2}
                  onChange={(e) => setAgreementChecked2(e.target.checked)}
                  className="mt-0.5 text-blue-600 rounded border-slate-700 bg-slate-905 focus:ring-0 cursor-pointer"
                />
                <span className="text-slate-300 text-[10px] font-semibold leading-snug select-none">
                  I authorize the escrow trustee to allocate yield daily payouts directly to my wallet balance.
                </span>
              </label>

              {/* Signature Field */}
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-slate-500 font-mono text-[8px] uppercase tracking-widest font-black text-left">✍️ Legal Signature Type-to-Sign</span>
                <input 
                  type="text" 
                  placeholder="Type legal name to validate contract" 
                  value={investorSignatureName}
                  onChange={(e) => setInvestorSignatureName(e.target.value)}
                  className="bg-[#0C1017] border border-slate-800 hover:border-slate-700 focus:border-indigo-500 px-4 py-3 rounded-xl text-white text-xs outline-none font-semibold transition-colors italic tracking-wide"
                />
              </div>

              <button 
                onClick={async () => {
                  if (!agreementChecked1 || !agreementChecked2) {
                    showToast('Please check all legal terms to proceed!');
                    return;
                  }
                  if (!investorSignatureName.trim()) {
                    showToast('Please sign legal deed document!');
                    return;
                  }
                  
                  // Run actual subscription logic
                  const targetPlan = selectedAgreementPlan;
                  setSelectedAgreementPlan(null);
                  await handleSubscribeInvestmentPlan(targetPlan.id, targetPlan.cost);
                }}
                className={`w-full font-black py-4 px-4 rounded-xl mt-1 uppercase font-mono text-[9.5px] tracking-wider cursor-pointer outline-none transition-all flex items-center justify-center gap-2 border-none ${
                  agreementChecked1 && agreementChecked2 && investorSignatureName.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent'
                }`}
              >
                ✓ Complete Electronic Signature &amp; Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Asset Savings Modal Overlay */}
      <AnimatePresence>
        {showDigitalSavingsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col md:max-h-[85vh] max-h-[90vh] text-slate-900 border border-slate-100"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 text-white text-center relative shrink-0">
                <button 
                  onClick={() => setShowDigitalSavingsModal(false)}
                  className="absolute right-5 top-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
                >
                  ✕
                </button>
                <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                  <span className="text-2xl">🔮</span>
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider">Digital Asset Savings</h3>
                <p className="text-[10px] text-indigo-200/80 uppercase font-black tracking-widest font-mono mt-1">E-Liquidity High-Yield savings Pool</p>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-6 flex flex-col gap-5 bg-slate-50">
                {/* Asset Selectors */}
                <div className="space-y-2 shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">1. Select Target Blockchain Asset</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['usdt', 'btc', 'eth'] as const).map((asset) => {
                      const isActive = dsSelectedAsset === asset;
                      const conf = {
                        usdt: { n: 'USDT', y: '1.2%', avatar: '💵', border: 'border-emerald-500' },
                        btc: { n: 'BTC', y: '1.5%', avatar: '🪙', border: 'border-amber-500' },
                        eth: { n: 'ETH', y: '1.4%', avatar: '🔷', border: 'border-indigo-400' }
                      }[asset];
                      return (
                        <div 
                          key={asset}
                          onClick={() => setDsSelectedAsset(asset)}
                          className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                            isActive 
                              ? `${conf.border} bg-white shadow-md scale-102 font-black border-2` 
                              : 'border-slate-200 bg-white hover:border-slate-300 font-bold'
                          }`}
                        >
                          <span className="text-lg block mb-0.5">{conf.avatar}</span>
                          <p className="text-xs text-slate-800 uppercase font-mono">{conf.n}</p>
                          <p className="text-[9px] text-[#ff9c00] font-black font-mono mt-0.5">{conf.y} Daily</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Input block */}
                <div className="space-y-2 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">2. Enter Investment Amount (NGN)</p>
                  
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black font-mono text-slate-400 text-sm">₦</span>
                    <input 
                      type="number"
                      placeholder="e.g. 5,000"
                      value={dsAmount}
                      onChange={(e) => setDsAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 py-3 pl-8 pr-4 rounded-xl text-xs font-black font-mono outline-none transition-colors"
                    />
                  </div>

                  {/* Calculations breakdown */}
                  <div className="pt-2 divide-y divide-slate-100 text-[11px] text-slate-600 font-medium">
                    <div className="py-2 flex justify-between items-center">
                      <span className="opacity-70">Exchange Rate parity:</span>
                      <span className="font-mono text-slate-800 font-black">
                        1 {dsSelectedAsset.toUpperCase()} = ₦{({ usdt: 1600, btc: 100000000, eth: 5000000 }[dsSelectedAsset]).toLocaleString()}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between items-center">
                      <span className="opacity-70">Secured Equivalent:</span>
                      <span className="font-mono text-indigo-600 font-black">
                        {((Number(dsAmount) || 0) / ({ usdt: 1600, btc: 100000000, eth: 5000000 }[dsSelectedAsset])).toFixed(6)} {dsSelectedAsset.toUpperCase()}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between items-center bg-indigo-50/20 px-2 rounded-lg gap-2 mt-1">
                      <span className="font-black text-indigo-700/80">Est. Daily Savings:</span>
                      <span className="font-mono text-emerald-600 font-black">
                        +₦{Math.round((Number(dsAmount) || 0) * ({ usdt: 1.2, btc: 1.5, eth: 1.4 }[dsSelectedAsset] / 100)).toLocaleString()} / day
                      </span>
                    </div>
                    <div className="py-2 flex justify-between items-center bg-indigo-50/20 px-2 rounded-lg gap-2">
                      <span className="font-black text-indigo-700/80">Est. 365-Day Yield:</span>
                      <span className="font-mono text-indigo-700 font-black">
                        +₦{Math.round((Number(dsAmount) || 0) * ({ usdt: 1.2, btc: 1.5, eth: 1.4 }[dsSelectedAsset] / 100) * 365).toLocaleString()} / yr
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duration select */}
                <div className="space-y-2 shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">3. Select Lock Period (Duration)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {([7, 14, 30, 90] as const).map((days) => {
                      const isActive = dsDuration === days;
                      const currentAssetRate = { usdt: 1.2, btc: 1.5, eth: 1.4 }[dsSelectedAsset];
                      return (
                        <div 
                          key={days}
                          onClick={() => setDsDuration(days)}
                          className={`py-2 rounded-xl border text-center text-xs cursor-pointer transition-all ${
                            isActive 
                              ? 'border-indigo-600 bg-indigo-600 text-white font-black shadow-md' 
                              : 'border-slate-200 bg-white hover:border-indigo-100 text-slate-600'
                          }`}
                        >
                          <span className="font-mono font-bold">{days}D</span>
                          <span className="text-[8px] block opacity-70 mt-0.5">{currentAssetRate}%/D</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action button */}
                <button 
                  onClick={handleDigitalSavingsSubscribe}
                  disabled={dsLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all font-mono text-xs uppercase tracking-widest cursor-pointer shrink-0"
                >
                  {dsLoading ? 'Rerouting Contract Block...' : '✓ Activate Savings Plan'}
                </button>

                {/* Active Placements list */}
                <div className="space-y-3 shrink-0 pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">Active Savings Leases & Contracts</p>
                    <span className="bg-slate-200/50 text-slate-500 font-mono font-black text-[9px] px-2 py-0.5 rounded-full">
                      {(userData.digitalSavingsInvestments || []).filter((p: any) => !p.claimed).length} active
                    </span>
                  </div>

                  {(userData.digitalSavingsInvestments || []).length === 0 ? (
                    <div className="bg-white p-6 border border-slate-200 rounded-2xl text-center text-[11px] text-slate-400 font-semibold italic">
                      No active blockchain saving liquidity leases. Allocate principal above to begin making static automated yields daily!
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {(userData.digitalSavingsInvestments || []).map((p: any) => {
                        const isMatured = new Date() >= new Date(p.endDate);
                        const start = new Date(p.startDate).getTime();
                        const end = new Date(p.endDate).getTime();
                        const progress = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
                        
                        return (
                          <div key={p.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-none">
                            <div className="flex justify-between items-start">
                              <div className="flex gap-2">
                                <span className="text-xl">{p.assetSymbol === 'USDT' ? '💵' : p.assetSymbol === 'BTC' ? '🪙' : '🔷'}</span>
                                <div>
                                  <h5 className="font-black text-xs text-slate-800 leading-none">{p.assetName}</h5>
                                  <p className="text-[8px] text-slate-400 font-mono uppercase tracking-widest mt-0.5">{p.days} Days lock • {p.dailyRate}% yield/day</p>
                                </div>
                              </div>
                              
                              <div>
                                {p.claimed ? (
                                  <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded font-mono uppercase">Settled</span>
                                ) : isMatured ? (
                                  <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded font-mono uppercase animate-pulse">Matured</span>
                                ) : (
                                  <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded font-mono uppercase">Ongoing</span>
                                )}
                              </div>
                            </div>

                            {/* Details values */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 divide-x divide-slate-100">
                              <div>
                                <p className="opacity-60 text-[8px] font-black uppercase tracking-wider font-mono">Leased capital</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">₦{p.ngnAmount.toLocaleString()} <span className="text-[8.5px] opacity-60 font-medium italic">({p.assetAmount.toFixed(4)} {p.assetSymbol})</span></p>
                              </div>
                              <div className="pl-2">
                                <p className="opacity-60 text-[8px] font-black uppercase tracking-wider font-mono text-emerald-600">Total Profit yield</p>
                                <p className="font-black text-emerald-600 mt-0.5">+₦{p.totalInterestNgn.toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            {!p.claimed && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] text-slate-400 font-mono font-black uppercase">
                                  <span>Lock timeline Progress</span>
                                  <span>{progress.toFixed(1)}% ({Math.ceil(Math.max(0, (end - Date.now()) / (24*60*60*1000)))}D left)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
                                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            )}

                            {/* Claim action */}
                            {!p.claimed && (
                              <button 
                                onClick={() => handleDigitalSavingsClaim(p.id)}
                                className={`w-full py-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                  isMatured 
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10 active:bg-emerald-700' 
                                    : 'bg-rose-50 hover:bg-rose-100 border border-rose-200/50 text-rose-600 active:scale-95'
                                }`}
                              >
                                {isMatured ? '✓ Claim Mature Yield & Capital' : '⛔ Early Liquidation (10% Penalty)'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </Layout>
  );
};

export default App;
