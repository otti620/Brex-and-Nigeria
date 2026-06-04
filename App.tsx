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
  Shield
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

  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Auth);
  const [selectedIntent, setSelectedIntent] = useState<string>('safe');

  // Promotions / Game States
  const [promoTab, setPromoTab] = useState<'spin' | 'lottery' | 'offers'>('spin');
  const [spinWheelType, setSpinWheelType] = useState<'regular' | 'mega'>('regular');
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResultModal, setSpinResultModal] = useState<{ show: boolean, reward: number, label: string } | null>(null);

  // Lottery configurations and inputs (Naija 2-Sure Lotto Redesign)
  const [selectedNums, setSelectedNums] = useState<[number, number]>([17, 88]);
  const [betStake, setBetStake] = useState<number>(200); // custom stake (₦50 to ₦10000)
  const [userTickets, setUserTickets] = useState<any[]>([]);
  const [lotteryLoading, setLotteryLoading] = useState(false);
  const [drawLoading, setDrawLoading] = useState(false);
  const [drawResult, setDrawResult] = useState<{ show: boolean, numbers: number[], reward: number, matched: any[] } | null>(null);
  const [nextDrawTime, setNextDrawTime] = useState({ hours: 1, minutes: 42, seconds: 19 });

  const fetchTickets = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/user/lottery/tickets", {
        headers: {
          "Authorization": user.uid
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUserTickets(data.tickets);
        }
      }
    } catch (e) {
      console.error("Error fetching tickets:", e);
    }
  };

  // Web Audio API tick generator mimicking physical wheel stops/pegs
  const playTickSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const win = window as any;
      if (!win.__brexAudioCtx) {
        win.__brexAudioCtx = new AudioCtx();
      }
      const ctx = win.__brexAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // High transient snap click
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.02);

      gain1.gain.setValueAtTime(0.06, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.025);

      // Lower body resonance wood click
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(280, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.035);

      gain2.gain.setValueAtTime(0.08, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("Tick audio error:", e);
    }
  };

  // Scheduled ticks simulating precise physical angular deceleration
  const startSpinTicks = () => {
    let delay = 35; // fast initial speed (35ms between pegs)
    let elapsed = 0;
    const maxDuration = 4050;

    const triggerNextTick = () => {
      if (elapsed >= maxDuration) return;

      playTickSound();

      elapsed += delay;

      // Easing/deceleration curve scaling
      if (elapsed < 1200) {
        delay += 4;
      } else if (elapsed < 2400) {
        delay += 11;
      } else if (elapsed < 3400) {
        delay = delay * 1.15;
      } else {
        delay = delay * 1.25;
      }

      if (delay > 550) delay = 550; // maximum interval cap

      setTimeout(triggerNextTick, delay);
    };

    triggerNextTick();
  };

  const handleSpinWheel = async () => {
    if (spinning || !user) return;
    setSpinning(true);
    showToast("Connecting live Brex Fortune server...");
    
    // reset wheel rotation first
    setWheelRotation(0);
    
    try {
      const res = await fetch("/api/user/spin-wheel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": user.uid
        }
      });
      
      if (!res.ok) {
        const errData = await res.json();
        showToast(errData.error || "Fortune spin failed");
        setSpinning(false);
        return;
      }
      
      const data = await res.json();
      
      // Select wedge index from server response
      const targetIndex = typeof data.targetIndex === 'number' ? data.targetIndex : 3;

      const targetRotationAngle = 360 - (targetIndex * 45 + 22.5);
      const spins = 6 * 360; // 6 full spins
      const finalRotation = spins + targetRotationAngle;
      
      // Trigger rotation
      setWheelRotation(finalRotation);

      // Play continuous slowing mechanical ticks
      startSpinTicks();
      
      // Wait for animation to finish
      setTimeout(() => {
        setSpinning(false);
        setSpinResultModal({
          show: true,
          reward: data.reward,
          label: data.rewardLabel
        });
        refreshProfile(); // refresh headers/wallet balances!
      }, 4100);
      
    } catch (e) {
      console.error(e);
      showToast("Network dispatch failed. Re-syncing database.");
      setSpinning(false);
    }
  };

  const handleBuyLottery = async () => {
    if (lotteryLoading || !user) return;
    setLotteryLoading(true);
    showToast("Locking combinations with server terminal...");
    try {
      const res = await fetch("/api/user/lottery/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": user.uid
        },
        body: JSON.stringify({ ticketNumbers: selectedNums, stake: betStake })
      });

      if (!res.ok) {
        const errData = await res.json();
        showToast(errData.error || "2-Sure staking failed");
        setLotteryLoading(false);
        return;
      }

      await res.json();
      showToast(`🎟️ [2-Sure] Registered [${selectedNums.join(", ")}] with ₦${betStake} stake successfully!`);
      fetchTickets(); // reload lottery tickets
      refreshProfile(); // reload balances
      setLotteryLoading(false);
    } catch (e) {
      console.error(e);
      showToast("Network error. Checking ledger logs.");
      setLotteryLoading(false);
    }
  };

  const handleExecuteLotteryDraw = async () => {
    if (drawLoading || !user) return;
    setDrawLoading(true);
    showToast("Spinning 2-Sure Lotto gravity balls... Standby!");
    
    try {
      const res = await fetch("/api/user/lottery/draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": user.uid
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        showToast(errData.error || "Drawing failed");
        setDrawLoading(false);
        return;
      }

      const data = await res.json();
      
      // suspense delay to simulates bouncing balls!
      setTimeout(() => {
        setDrawLoading(false);
        setDrawResult({
          show: true,
          numbers: data.drawnNumbers,
          reward: data.totalRewardAwarded,
          matched: data.matchedTickets
        });
        fetchTickets(); // reload tickets
        refreshProfile(); // update overall user state balances
      }, 3500); // 3.5s of intense suspense bouncing balls animation!
    } catch (e) {
      console.error(e);
      showToast("Drawing failed. Re-syncing system clock.");
      setDrawLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentScreen === Screen.Promotions) {
      fetchTickets();
    }
  }, [user, currentScreen]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextDrawTime(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 4, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
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

  const getWithdrawalFeeInfo = () => {
    const now = new Date();
    const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
    const watDate = new Date(utcTimestamp + 3600000);
    const dayOfMonth = watDate.getDate(); // 1 to 31
    const freeDays = [5, 20, 29];
    const isFreeDay = freeDays.includes(dayOfMonth);
    const feePercent = isFreeDay ? 0 : 10;
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
          <div className="flex items-center gap-2">
            <div onClick={() => navigate(Screen.Profile)} className="cursor-pointer active:scale-95 transition-transform ring-4 ring-gray-100 rounded-2xl p-0.5 bg-white shadow-sm">
              <Memoji state={userData.memojiState} size="sm" />
            </div>
          </div>
        </div>

        {/* Floating Telegram Button */}
        <button 
          onClick={() => setShowTelegramModal(true)} 
          className="fixed bottom-24 right-6 z-[200] bg-sky-600 text-white rounded-full p-4 shadow-[0_0_20px_rgba(2,132,199,0.5)] flex flex-col items-center gap-1 hover:bg-sky-700 transition-all border-4 border-white animate-bounce"
        >
          <Send size={32} />
          <span className="text-[12px] font-black uppercase text-center w-24">Join our telegram channel</span>
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

  const renderPromotions = () => {
    const sectors = [
      { label: "₦200", color: "#6366f1", reward: 200 },
      { label: "₦500", color: "#3b82f6", reward: 500 },
      { label: "₦1,000", color: "#10b981", reward: 1000 },
      { label: "Try again", color: "#64748b", reward: 0 },
      { label: "₦2,500", color: "#f59e0b", reward: 2500 },
      { label: "₦5,000", color: "#a855f7", reward: 5000 },
      { label: "₦10,000", color: "#ec4899", reward: 10000 },
      { label: "₦500+", color: "#14b8a6", reward: 500 }
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
            onClick={() => setPromoTab('spin')}
            className={`flex-1 py-3 px-1 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              promoTab === 'spin' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/10' 
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            🎡 Spin Wheel
          </button>
          <button
            onClick={() => setPromoTab('lottery')}
            className={`flex-1 py-3 px-1 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              promoTab === 'lottery' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/10' 
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            🎟️ 2-Sure Lotto
          </button>
          <button
            onClick={() => setPromoTab('offers')}
            className={`flex-1 py-3 px-1 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              promoTab === 'offers' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/10' 
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            📌 Specl. Banner
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
          </div>
        )}

        {/* Tab CONTENT 2: Brex Nigeria 2-Sure Lotto */}
        {promoTab === 'lottery' && (
          <div className="flex flex-col gap-5 bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm relative overflow-hidden">
            
            {/* Header / Payout Matrix Table */}
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-[9px] uppercase tracking-widest text-[#10b981] bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-mono">
                    Brex 2-Sure Lotto
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-2.5 tracking-tight">Naija Terminal Betslip</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Draw 5 balls out of 1-90. Pick 2 to win!
                  </p>
                </div>
                <div className="text-right bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-2xl">
                  <p className="text-[8px] text-rose-600 font-extrabold uppercase font-mono tracking-wider">Lotto Yield</p>
                  <p className="text-[13px] font-black font-mono text-rose-600 mt-0.5">150x Pay multiplier</p>
                </div>
              </div>

              {/* Multiplier Payout Box description */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-2xl">
                  <p className="text-[8px] text-slate-400 font-bold uppercase font-mono">✌️ 2-SURE HIT (Matches 2/2)</p>
                  <p className="text-[14px] font-black text-rose-600 font-mono mt-0.5">150x Returns</p>
                  <p className="text-[8.5px] text-slate-400 font-bold mt-0.5">₦1,000 stake wins ₦150k!</p>
                </div>
                <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-2xl">
                  <p className="text-[8px] text-slate-400 font-bold uppercase font-mono">☝️ 1-DIRECT CONSOLATION (Matches 1/2)</p>
                  <p className="text-[14px] font-black text-emerald-600 font-mono mt-0.5">3.5x Returns</p>
                  <p className="text-[8.5px] text-slate-400 font-bold mt-0.5">₦1,000 stake wins ₦3,500!</p>
                </div>
              </div>
            </div>

            {/* Lucky Ball Selection widgets */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-center">
                Configure your 2 Lucky combination numbers:
              </p>

              <div className="flex gap-4 justify-center items-center">
                {[0, 1].map((index) => (
                  <div key={index} className="flex flex-col items-center bg-slate-50 border border-slate-205 p-4 rounded-[28px] w-32 shadow-sm relative">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-2">BALL #{index+1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const copy = [...selectedNums] as [number, number];
                          copy[index] = copy[index] > 1 ? copy[index] - 1 : 90;
                          if (copy[0] === copy[1]) {
                            copy[index] = copy[index] > 1 ? copy[index] - 1 : 90;
                          }
                          setSelectedNums(copy);
                        }}
                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform shadow-sm"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={selectedNums[index]}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(90, parseInt(e.target.value) || 1));
                          const copy = [...selectedNums] as [number, number];
                          copy[index] = val;
                          setSelectedNums(copy);
                        }}
                        className="w-12 text-center text-2xl font-black font-mono text-slate-950 bg-transparent focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const copy = [...selectedNums] as [number, number];
                          copy[index] = copy[index] < 90 ? copy[index] + 1 : 1;
                          if (copy[0] === copy[1]) {
                            copy[index] = copy[index] < 90 ? copy[index] + 1 : 1;
                          }
                          setSelectedNums(copy);
                        }}
                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stake bets Selector presets to encourage spending */}
              <div className="flex flex-col gap-2 mt-2 bg-slate-50/50 border border-slate-150 p-4 rounded-3xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono text-center">
                  Select Your Bet Stake (NGN):
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBetStake(amt)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-black font-mono border-2 transition-all cursor-pointer ${
                        betStake === amt 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/10' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                  {/* Custom Stake field */}
                  <div className="col-span-2 flex items-center bg-white border-2 border-slate-200 rounded-xl px-2.5">
                    <span className="text-[11px] font-black font-mono text-slate-400">₦</span>
                    <input
                      type="number"
                      min="50"
                      max="10000"
                      value={betStake}
                      onChange={(e) => setBetStake(Math.max(50, Math.min(10000, parseInt(e.target.value) || 50)))}
                      className="w-full text-right text-[11px] font-black font-mono text-slate-800 bg-transparent focus:outline-none pl-1"
                      placeholder="Custom"
                    />
                  </div>
                </div>
              </div>

              {/* Instant Action buttons */}
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  onClick={() => {
                    const pool = Array.from({ length: 90 }, (_, i) => i + 1);
                    const r1 = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                    const r2 = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                    setSelectedNums([r1, r2]);
                    showToast(`⚡ Quick Pick randomly selected: [${r1}, ${r2}]!`);
                  }}
                  className="py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                >
                  ⚡ Quick Pick
                </button>
                <button
                  disabled={lotteryLoading}
                  onClick={handleBuyLottery}
                  className="py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-600/10 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                >
                  🎟️ Stake 2-Sure (₦{betStake})
                </button>
              </div>
            </div>

            {/* Drawing simulation block / Live countdown draws */}
            <div className="mt-4 bg-[#fbfbfe] border border-blue-100/50 rounded-[28px] p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-600 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider font-mono">Next Draw Timer</span>
                </div>
                <span className="text-xs font-black text-indigo-950 font-mono tracking-wider">
                  {String(nextDrawTime.hours).padStart(2, '0')}:{String(nextDrawTime.minutes).padStart(2, '0')}:{String(nextDrawTime.seconds).padStart(2, '0')}
                </span>
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-normal">
                  You can wait for the official timer, or click the button below to execute a LIVE gravity cage drawing for all pending combination tickets instantly!
                </p>

                <button
                  disabled={drawLoading || userTickets.filter(t => t.status === "pending").length === 0}
                  onClick={handleExecuteLotteryDraw}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    userTickets.filter(t => t.status === "pending").length === 0
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-700 to-indigo-600 text-white shadow-lg active:scale-95 shadow-indigo-600/15'
                  }`}
                >
                  {drawLoading ? (
                    <span className="flex items-center gap-2">
                       <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-white rounded-full animate-spin" />
                       Rolling gravity cages...
                    </span>
                  ) : userTickets.filter(t => t.status === "pending").length === 0 ? (
                    "🎟️ Purchase a ticket first to draw"
                  ) : (
                    `☘️ Run Live Prize Draw (${userTickets.filter(t => t.status === "pending").length} Pending)`
                  )}
                </button>
              </div>
            </div>

            {/* Ticket holdings list */}
            <div className="mt-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono mb-3 flex items-center justify-between">
                <span>📋 Ticket ledger entries</span>
                <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono lowercase">
                  {userTickets.length} registered
                </span>
              </h4>

              {userTickets.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <Ticket size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-widest">No tickets in this ledger</p>
                  <p className="text-[9px] text-slate-400 mt-1">Your purchased combination numbers list will show up here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {userTickets.map((tc, idx) => {
                    const isPending = tc.status === "pending";
                    const isWon = tc.status === "won";
                    return (
                      <div 
                        key={tc.id || idx} 
                        className={`flex justify-between items-center p-3 rounded-2xl border ${
                          isWon 
                            ? 'bg-emerald-50 border-emerald-100' 
                            : isPending 
                              ? 'bg-slate-50/70 border-slate-100' 
                              : 'bg-slate-50/20 border-slate-100 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Ticket size={16} className={isWon ? 'text-emerald-500' : isPending ? 'text-indigo-400' : 'text-slate-400'} />
                          <div>
                            <div className="flex gap-1.5 items-center">
                              {tc.ticketNumbers?.map((n: number, nIdx: number) => (
                                <span key={nIdx} className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-black text-[11px] flex items-center justify-center border border-white shadow-sm">
                                  {n}
                                </span>
                              ))}
                              <span className="text-[8.5px] font-black font-mono text-slate-500 bg-slate-150 px-1.5 py-0.5 rounded ml-1">
                                ₦{tc.purchasePrice || 200} Stake
                              </span>
                            </div>
                            <p className="text-[8px] text-slate-400 font-bold font-mono tracking-wider uppercase mt-1">ID: {tc.id?.slice(-8)} • {tc.entryDate}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          {isPending ? (
                            <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-full font-mono animate-pulse">
                              Pending
                            </span>
                          ) : isWon ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                                WON
                              </span>
                              <span className="text-[11px] font-black text-emerald-600 font-mono mt-0.5">
                                +₦{tc.rewardAmount.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end opacity-60">
                              <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                                Lost
                              </span>
                              {tc.drawNumbers && (
                                <span className="text-[8px] font-bold font-mono text-slate-400 mt-1">
                                  Drawn: [{tc.drawNumbers?.join(",")}]
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

        {/* Fortune Wheel Result Modal Dialog Overlay */}
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

        {/* Lottery Drawing Suspense Overlay Animation */}
        {drawLoading && (
          <div className="fixed inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-5 z-[230] select-none text-center">
            {/* Beautiful gravity bouncy balls animation */}
            <div className="flex gap-3 justify-center items-center my-6 flex-wrap max-w-xs">
              {[1, 2, 3, 4, 5].map((b) => {
                const randomDigit = Math.floor(Math.random() * 90) + 1;
                return (
                  <motion.div
                    key={b}
                    animate={{ 
                      y: [-25, 25, -25],
                      rotate: [0, 360],
                      scale: [1, 1.15, 1]
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: b * 0.08,
                      ease: "easeInOut"
                    }}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 via-orange-500 to-yellow-500 border-2 border-white text-white font-mono font-black text-sm flex items-center justify-center shadow-2xl shadow-rose-600/20"
                  >
                    {randomDigit}
                  </motion.div>
                );
              })}
            </div>
            
            <h3 className="text-base font-black text-white tracking-wider animate-pulse uppercase">
              Drawing 2-Sure Gravity Balls...
            </h3>
            <p className="text-[9px] font-mono text-amber-400 uppercase tracking-widest mt-2 max-w-xs leading-relaxed">
              Tumbling cage cylinders. Checking combination matrices...
            </p>
          </div>
        )}

        {/* Lottery Draw Result Modal Dialog Overlay */}
        {drawResult?.show && (
          <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-5 z-[230] select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[36px] w-full max-w-sm p-6 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute w-40 h-40 rounded-full bg-yellow-500/10 blur-3xl -top-10 -left-10" />
              <div className="absolute w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl -bottom-10 -right-10" />

              <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-3xl mb-4 shadow-sm animate-bounce">
                🏆
              </div>

              <h3 className="text-md font-black text-slate-900 tracking-tight">Official Draw Output (Lagos Live)</h3>
              <p className="text-[9px] font-extrabold text-slate-405 font-mono uppercase tracking-widest mt-1">
                Gravity Balls Drawn:
              </p>

              {/* Drawn Winning Balls */}
              <div className="flex gap-2 my-5 justify-center flex-wrap">
                {drawResult.numbers.map((n, idx) => (
                  <div key={idx} className="w-10 h-10 rounded-full bg-slate-900 text-white border-2 border-yellow-500 text-sm font-black font-mono flex items-center justify-center shadow-md animate-bounce" style={{ animationDelay: `${idx * 0.15}s` }}>
                    {n}
                  </div>
                ))}
              </div>

              {drawResult.reward > 0 ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 w-full mb-3 text-center">
                  <p className="text-[9px] text-emerald-600 font-extrabold uppercase font-mono tracking-widest">
                    🎉 Jackpot payout achieved!
                  </p>
                  <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
                    +₦{drawResult.reward.toLocaleString()} NGN
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full mb-3 text-center">
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase font-mono tracking-widest">
                    No matching direct balls
                  </p>
                  <p className="text-xs font-black text-slate-700 mt-1">
                    Better luck in the next drawing!
                  </p>
                </div>
              )}

              {/* Matched Tickets breakdown list */}
              <div className="w-full text-left mt-1 border-t border-slate-100 pt-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-2">
                  Betslip Ledger Match Report:
                </p>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {drawResult.matched.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-50 last:border-0 font-mono text-slate-600">
                      <span className="font-bold">Comb: [{m.ticketNumbers.join(",")}]</span>
                      <span className="font-bold text-slate-400">{m.matchCount}/2 Matches</span>
                      <span className={`font-black uppercase ${m.prize > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {m.prize > 0 ? `+₦${m.prize}` : 'Lost'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setDrawResult(null)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-950 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg mt-5 active:scale-95 transition-all cursor-pointer"
              >
                Clear Draw Interface
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
                    const isWithdrawal = t.type === 'withdraw';
                    return (
                      <div key={t.id} className="bg-white border border-slate-200 p-5 rounded-[32px] flex flex-col gap-4 shadow-sm group hover:border-blue-200 transition-all font-semibold">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isPlus ? 'bg-blue-50' : 'bg-slate-50'}`}>
                                {t.type === 'recharge' ? '📥' : t.type === 'withdraw' ? '📤' : t.type === 'subscribe' ? '💼' : '🎁'}
                             </div>
                             <div>
                                <p className="text-[11px] font-black uppercase text-slate-900 font-mono group-hover:text-blue-600 transition-colors">{t.type}</p>
                                {t.details && <p className="text-[10px] text-slate-500 font-semibold leading-relaxed my-0.5">{t.details}</p>}
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
              case Screen.Promotions: return renderPromotions();
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

      <FlyerPopup isOpen={showFlyerModal} onClose={() => setShowFlyerModal(false)} />
      <TelegramModal isOpen={showTelegramModal} onClose={() => setShowTelegramModal(false)} />

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

    </Layout>
  );
};

export default App;
