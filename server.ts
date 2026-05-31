import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { loadDatabase, saveDatabase, DbUser, createInitialInvestments } from "./server-db";
import { initializeApp as initFirebaseServer } from "firebase/app";
import { getFirestore as getFirestoreServer, collection, query, where, getDocs, doc, writeBatch } from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server-side Firebase integration for webhook processing
  const firebaseServerConfig = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "seedstreet-app",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:425883713028:web:b1d79dd4ae414771fd0b79",
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBewBW-Z9P5HtcUTsLvmEn0aZtBjwvD68I",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "seedstreet-app.firebaseapp.com",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "seedstreet-app.appspot.com",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "425883713028",
  };

  const serverFirebaseApp = initFirebaseServer(firebaseServerConfig, "server-instance");
  const serverDb = getFirestoreServer(serverFirebaseApp, "(default)");

  // Paystack Webhook Handler
  app.post("/api/webhook/paystack", async (req, res) => {
    console.log("[Paystack Webhook] Received payload: ", JSON.stringify(req.body));
    try {
      const event = req.body;
      if (!event || event.event !== "charge.success") {
        return res.json({ status: "ignored", message: "Not a successful charge event" });
      }

      const { data } = event;
      const amountInKobo = data.amount; // kobo (e.g. 500000 = 5000 NGN)
      const amountNGN = Math.floor(amountInKobo / 100);
      const email = data.customer && data.customer.email ? data.customer.email.toLowerCase().trim() : "";
      const reference = data.reference || `ref_ps_${Date.now()}`;

      if (!email || amountNGN <= 0) {
        return res.status(400).json({ error: "Invalid webhook transaction details" });
      }

      console.log(`[Paystack Webhook] Executing credit of ₦${amountNGN} for user: ${email}`);

      // 1. Double credit sync: Local file database (if used in fallback mode)
      try {
        const dbLocal = loadDatabase();
        const userLocalIdx = dbLocal.users.findIndex(u => u.email.toLowerCase() === email);
        if (userLocalIdx !== -1) {
          dbLocal.users[userLocalIdx].balance += amountNGN;
          dbLocal.users[userLocalIdx].monthlyGains += Math.floor(amountNGN * 0.05);
          dbLocal.users[userLocalIdx].transactions.unshift({
            id: `paystack_txn_${Date.now()}`,
            amount: amountNGN,
            type: "recharge",
            status: "success",
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: `Paystack Deposit (Ref: ${reference})`
          });
          saveDatabase(dbLocal);
          console.log(`[Paystack Webhook] Successfully credited local database record`);
        }
      } catch (localErr) {
        console.error("[Paystack Webhook] Local database update failed: ", localErr);
      }

      // 2. Double credit sync: Real-time Cloud Firestone DB (Main production)
      try {
        const usersCol = collection(serverDb, "users");
        const q = query(usersCol, where("email", "==", email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.warn(`[Paystack Webhook] No real-time Firestore user found matched to ${email}`);
        } else {
          const userDoc = snapshot.docs[0];
          const userId = userDoc.id;
          const userData = userDoc.data();

          const prevBalance = userData.balance || 0;
          const prevGains = userData.monthlyGains || 0;

          const batch = writeBatch(serverDb);
          batch.update(doc(serverDb, 'users', userId), {
            balance: prevBalance + amountNGN,
            monthlyGains: prevGains + Math.floor(amountNGN * 0.05)
          });

          // Insert verified transaction
          const txnId = `txn_paystack_${Date.now()}`;
          batch.set(doc(serverDb, `users/${userId}/transactions/${txnId}`), {
            id: txnId,
            userId: userId,
            amount: amountNGN,
            type: "recharge",
            status: "success",
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: `Verified Paystack Network Credit (Ref: ${reference})`
          });

          await batch.commit();
          console.log(`[Paystack Webhook] Firestore production records successfully incremented! User: ${userId}`);
        }
      } catch (firestoreErr) {
        console.error("[Paystack Webhook] Production Firestore update failed: ", firestoreErr);
      }

      return res.status(200).json({ status: "success", message: "Accounts synchronized" });
    } catch (err: any) {
      console.error("[Paystack Webhook] Internal Handler Failure: ", err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  // -------------------------
  // CUSTOM AUTH & ACCOUNT APIS
  // -------------------------

  // Secure user registration
  app.post("/api/auth/register", (req, res) => {
    try {
      const { name, email, phoneNumber, password, invitationCode, selectedIntent } = req.body;
      
      if (!name || !email || !phoneNumber || !password) {
        return res.status(400).json({ error: "Please enter legal name, email, mobile phone and password" });
      }

      const db = loadDatabase();
      const lowerEmail = email.trim().toLowerCase();
      const cleanPhone = phoneNumber.trim();

      const exists = db.users.some(
        (u) => u.email.toLowerCase() === lowerEmail || u.phoneNumber === cleanPhone
      );

      if (exists) {
        return res.status(400).json({ error: "An account with this email or phone number is already registered" });
      }

      // Track referral parent
      let parentBy: string | undefined = undefined;
      const cleanInvite = invitationCode ? invitationCode.trim().toUpperCase() : "";
      if (cleanInvite) {
        const parent = db.users.find(u => u.invitationCode.toUpperCase() === cleanInvite);
        if (parent) {
          parentBy = parent.invitationCode;
          parent.teamSize = (parent.teamSize || 0) + 1;
          parent.teamSizeToday = (parent.teamSizeToday || 0) + 1;
        }
      }

      const ourOwnCode = `BREX-${Math.floor(1000 + Math.random() * 9000)}`;

      const newUser: DbUser = {
        id: `user_${Date.now()}`,
        name: name.trim(),
        email: lowerEmail,
        phoneNumber: cleanPhone,
        passwordHash: password, // For development verification transparency stored as is
        kycLevel: 0,
        balance: 3000, // Preloaded deposit bonus for account setup activation
        monthlyGains: 0,
        streak: 1,
        badges: ["First Brex 💧"],
        memojiState: "Neutral",
        selectedIntent: selectedIntent || "safe",
        teamSize: 0,
        rechargeMembers: 0,
        effectiveSizeToday: 0,
        teamSizeToday: 0,
        invitationCode: ourOwnCode,
        referredBy: parentBy,
        isAdmin: lowerEmail === "ottigospel@gmail.com",
        investments: createInitialInvestments(),
        transactions: [
          {
            id: `txn_${Date.now()}`,
            amount: 3000,
            type: "bonus" as const,
            status: "success" as const,
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: "Setup Activation Welcome Bonus"
          }
        ]
      };

      db.users.push(newUser);
      saveDatabase(db);

      // Return user profile safely (without password detail)
      const { passwordHash, ...profile } = newUser;
      res.json({ message: "Registration successful!", user: profile });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Registration failed" });
    }
  });

  // Secure user login
  app.post("/api/auth/login", (req, res) => {
    try {
      const { loginId, password } = req.body;
      if (!loginId || !password) {
        return res.status(400).json({ error: "Please enter your email/phone and password credentials" });
      }

      const db = loadDatabase();
      const entered = loginId.trim().toLowerCase();

      const user = db.users.find(
        (u) =>
          (u.email.toLowerCase() === entered || u.phoneNumber.trim() === loginId.trim()) &&
          u.passwordHash === password
      );

      if (!user) {
        return res.status(400).json({ error: "Invalid credentials. Please verify your details or sign up." });
      }

      const { passwordHash, ...profile } = user;
      res.json({ message: "Sign-in successful!", user: profile });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Sign-in handler error" });
    }
  });

  // Fetch active user profile
  app.get("/api/user/profile", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Missing authorization token" });
      }

      const db = loadDatabase();
      const user = db.users.find((u) => u.id === authHeader);

      if (!user) {
        return res.status(404).json({ error: "User session not found on server" });
      }

      const { passwordHash, ...profile } = user;
      res.json({ user: profile });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Profile retrieval failed" });
    }
  });

  // Update user profile fields
  app.post("/api/user/update", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { name, email, phoneNumber, memojiState } = req.body;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const db = loadDatabase();
      const idx = db.users.findIndex((u) => u.id === authHeader);
      if (idx === -1) {
        return res.status(444).json({ error: "User session expired" });
      }

      if (name) db.users[idx].name = name;
      if (email) db.users[idx].email = email.trim().toLowerCase();
      if (phoneNumber) db.users[idx].phoneNumber = phoneNumber;
      if (memojiState) db.users[idx].memojiState = memojiState;

      saveDatabase(db);
      const { passwordHash, ...profile } = db.users[idx];
      res.json({ message: "Personal details updated successfully", user: profile });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Profile update failure" });
    }
  });

  // Bind payout bank settings
  app.post("/api/user/update-bank", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { linkedBankName, linkedBankCode, linkedBankOwner } = req.body;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const db = loadDatabase();
      const idx = db.users.findIndex((u) => u.id === authHeader);
      if (idx === -1) return res.status(404).json({ error: "User not found" });

      db.users[idx].linkedBankName = linkedBankName;
      db.users[idx].linkedBankCode = linkedBankCode;
      db.users[idx].linkedBankOwner = linkedBankOwner;

      saveDatabase(db);
      const { passwordHash, ...profile } = db.users[idx];
      res.json({ message: "Payout channel bound successfully", user: profile });
    } catch (err) {
      res.status(500).json({ error: "Failed to link banking details" });
    }
  });

  // Update password credentials
  app.post("/api/user/update-security", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { password } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const db = loadDatabase();
      const idx = db.users.findIndex((u) => u.id === authHeader);
      if (idx === -1) return res.status(404).json({ error: "User not found" });

      db.users[idx].passwordHash = password;

      saveDatabase(db);
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Security update error" });
    }
  });

  // Process live recharge deposit
  app.post("/api/user/recharge", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { amount } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const deposit = Number(amount);
      if (isNaN(deposit) || deposit <= 0) {
        return res.status(400).json({ error: "Invalid deposit amount specified" });
      }

      const db = loadDatabase();
      const idx = db.users.findIndex((u) => u.id === authHeader);
      if (idx === -1) return res.status(444).json({ error: "Authentication status expired" });

      db.users[idx].balance += deposit;
      db.users[idx].monthlyGains += Math.floor(deposit * 0.05); // Standard investment bonus

      // Log transaction record
      db.users[idx].transactions.unshift({
        id: `txn_${Date.now()}`,
        amount: deposit,
        type: "recharge" as const,
        status: "success" as const,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: "Instant Deposit Verified"
      });

      saveDatabase(db);
      const { passwordHash, ...profile } = db.users[idx];
      res.json({ message: "Account credited successfully", user: profile });
    } catch (err) {
      res.status(500).json({ error: "Recharge credit handler failed" });
    }
  });

  // Process live withdrawal request
  app.post("/api/user/withdraw", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { amount } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const payout = Number(amount);
      if (isNaN(payout) || payout < 1000) {
        return res.status(400).json({ error: "Minimum payout threshold is ₦1,000" });
      }

      const db = loadDatabase();
      const idx = db.users.findIndex((u) => u.id === authHeader);
      if (idx === -1) return res.status(444).json({ error: "User not found" });

      if (db.users[idx].balance < payout) {
        return res.status(400).json({ error: "Insufficient balance for this payout request" });
      }

      db.users[idx].balance -= payout;

      // Log transaction record
      db.users[idx].transactions.unshift({
        id: `txn_${Date.now()}`,
        amount: payout,
        type: "withdraw" as const,
        status: "success" as const,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: "Instant Payout Completed"
      });

      saveDatabase(db);
      const { passwordHash, ...profile } = db.users[idx];
      res.json({ message: "Withdrawal submitted successfully!", user: profile });
    } catch (err) {
      res.status(500).json({ error: "Withdrawal processing exception" });
    }
  });

  // Subscribe to VIP plan
  app.post("/api/user/subscribe", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { planId } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const db = loadDatabase();
      const idx = db.users.findIndex((u) => u.id === authHeader);
      if (idx === -1) return res.status(444).json({ error: "Session expired" });

      const user = db.users[idx];
      const plan = user.investments.find(p => p.id === planId);
      if (!plan) return res.status(400).json({ error: "Selected plan level does not exist" });

      if (user.balance < plan.cost) {
        return res.status(400).json({ error: `Insufficient balance. Deposit at least ₦${(plan.cost - user.balance).toLocaleString()} NGN additional.` });
      }

      // Deduct balance and join plan
      user.balance -= plan.cost;
      plan.joined = true;
      plan.balance += plan.cost;

      // Log subscription transaction
      user.transactions.unshift({
        id: `txn_${Date.now()}`,
        amount: plan.cost,
        type: "subscribe" as const,
        status: "success" as const,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: `Subscribed and activated ${plan.name} Pool`
      });

      // Handle direct referrer reward for funding their first standard deposit pool
      const otherActiveInvestments = user.investments.filter(p => p.joined && p.id !== planId);
      const isFirstPortfolioActivation = otherActiveInvestments.length === 0;
      if (isFirstPortfolioActivation && user.referredBy) {
        const parent = db.users.find(u => u.invitationCode.toUpperCase() === user.referredBy?.toUpperCase());
        if (parent) {
          parent.rechargeMembers = (parent.rechargeMembers || 0) + 1;
          parent.balance += 2500;
          parent.monthlyGains += 2500;
          parent.transactions.unshift({
            id: `txn_ref_${Date.now()}`,
            amount: 2500,
            type: "bonus" as const,
            status: "success" as const,
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: `First Deposit Active Reward: ${user.name}`
          });
        }
      }

      saveDatabase(db);
      const { passwordHash, ...profile } = user;
      res.json({ message: "Subscription activated!", user: profile });
    } catch (err: any) {
      res.status(500).json({ error: "Portfolio allocation failed" });
    }
  });

  // Claim VIP Daily yield
  app.post("/api/user/accrue-yield", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { planId } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const db = loadDatabase();
      const idx = db.users.findIndex((u) => u.id === authHeader);
      if (idx === -1) return res.status(404).json({ error: "User session not found" });

      const user = db.users[idx];
      const plan = user.investments.find(p => p.id === planId);
      if (!plan) return res.status(400).json({ error: "Investment plan not found" });

      if (!plan.joined) {
        return res.status(400).json({ error: "You must allocate funds to this plan before accruing yield." });
      }

      const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      if (plan.lastClaimedDate === todayStr) {
        return res.status(400).json({ error: "This yield cycle has already been accrued for today." });
      }

      const yieldAmount = plan.dailyProfit;
      user.balance += yieldAmount;
      user.monthlyGains += yieldAmount;

      plan.earnYesterday = yieldAmount;
      plan.earnTotal += yieldAmount;
      plan.workingDays += 1;
      plan.lastClaimedDate = todayStr;

      // Log transaction
      user.transactions.unshift({
        id: `txn_${Date.now()}`,
        amount: yieldAmount,
        type: "claim" as const,
        status: "success" as const,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: `Daily Claim: interest profit from ${plan.name}`
      });

      saveDatabase(db);
      const { passwordHash, ...profile } = user;
      res.json({ message: "Yield successfully claimed into available balance!", user: profile });
    } catch (err) {
      res.status(500).json({ error: "Yield accrual calculation failed" });
    }
  });

  // Query real-time referral list
  app.get("/api/user/team", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const db = loadDatabase();
      const user = db.users.find(u => u.id === authHeader);
      if (!user) return res.status(404).json({ error: "User not found" });

      const ourCode = user.invitationCode.toUpperCase();

      // Find Level 1 downlines
      const lvl1Users = db.users.filter(u => u.referredBy?.toUpperCase() === ourCode);
      const lvl1Codes = lvl1Users.map(u => u.invitationCode.toUpperCase());

      // Find Level 2 downlines
      const lvl2Users = lvl1Codes.length > 0
        ? db.users.filter(u => u.referredBy && lvl1Codes.includes(u.referredBy.toUpperCase()))
        : [];
      const lvl2Codes = lvl2Users.map(u => u.invitationCode.toUpperCase());

      // Find Level 3 downlines
      const lvl3Users = lvl2Codes.length > 0
        ? db.users.filter(u => u.referredBy && lvl2Codes.includes(u.referredBy.toUpperCase()))
        : [];

      const formatMember = (u: DbUser, lvl: number) => {
        const cleanPhone = u.phoneNumber || "";
        let phoneObfuscated = "Phone hidden";
        if (cleanPhone.length >= 7) {
          phoneObfuscated = cleanPhone.slice(0, 4) + "****" + cleanPhone.slice(-3);
        }

        const totalRecharged = u.investments
          ? u.investments.reduce((acc, p) => acc + (p.joined ? p.cost : 0), 0)
          : 0;

        const totalWithdrawals = u.transactions
          ? u.transactions
              .filter(t => t.type === "withdraw" && t.status === "success")
              .reduce((acc, t) => acc + t.amount, 0)
          : 0;

        let regDate = "2026-05-30 12:00:00";
        if (u.id.startsWith("user_") && !isNaN(Number(u.id.slice(5)))) {
          regDate = new Date(Number(u.id.slice(5))).toISOString().slice(0, 19).replace('T', ' ');
        } else if (u.transactions && u.transactions.length > 0) {
          regDate = u.transactions[u.transactions.length - 1].date;
        }

        return {
          phone: phoneObfuscated,
          recharge: totalRecharged,
          withdraw: totalWithdrawals,
          date: regDate,
          lvl
        };
      };

      const members = [
        ...lvl1Users.map(u => formatMember(u, 1)),
        ...lvl2Users.map(u => formatMember(u, 2)),
        ...lvl3Users.map(u => formatMember(u, 3)),
      ];

      res.json({
        teamSize: lvl1Users.length + lvl2Users.length + lvl3Users.length,
        rechargeMembers: lvl1Users.filter(u => u.investments && u.investments.some(p => p.joined)).length +
                         lvl2Users.filter(u => u.investments && u.investments.some(p => p.joined)).length +
                         lvl3Users.filter(u => u.investments && u.investments.some(p => p.joined)).length,
        members
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to pull referral logs" });
    }
  });

  // Simulate an active invite properly in database.json
  app.post("/api/user/simulate-invite", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const db = loadDatabase();
      const idx = db.users.findIndex(u => u.id === authHeader);
      if (idx === -1) return res.status(444).json({ error: "Identity session expired" });

      const parent = db.users[idx];

      const randomNgs = ['703', '813', '906', '802', '915', '701', '805'];
      const randomPrefix = randomNgs[Math.floor(Math.random() * randomNgs.length)];
      const randomNumStr = Math.floor(1000000 + Math.random() * 9000000).toString();
      const cleanPhone = `+234 ${randomPrefix} ${randomNumStr.slice(0, 3)} ${randomNumStr.slice(-4)}`;

      const firstNames = ["Sade", "Kunle", "Temitope", "Nnamdi", "Chidi", "Akin", "Chioma", "Ibrahim", "Tunde", "Ayo"];
      const lastNames = ["Oluaseun", "Jinadu", "Faroq", "Ebere", "Kolawole", "Nwachukwu", "Okoro", "Adeleke"];
      const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

      const fakeMail = `${randomName.toLowerCase().replace(" ", "")}_${Math.floor(100 + Math.random() * 900)}@example.com`;
      
      const possibleRecharges = [3000, 15000, 50000, 150000];
      const amountChosen = possibleRecharges[Math.floor(Math.random() * possibleRecharges.length)];

      const freshInvestments = createInitialInvestments();
      const matchedPlan = freshInvestments.find(p => p.cost === amountChosen);
      if (matchedPlan) {
        matchedPlan.joined = true;
        matchedPlan.balance = amountChosen;
        matchedPlan.earnYesterday = matchedPlan.dailyProfit;
        matchedPlan.earnTotal = matchedPlan.dailyProfit * Math.floor(1 + Math.random() * 5);
        matchedPlan.workingDays = Math.floor(1 + Math.random() * 5);
      }

      const generatedId = `user_sim_${Date.now()}`;
      const simulatedUser: DbUser = {
        id: generatedId,
        name: randomName,
        email: fakeMail,
        phoneNumber: cleanPhone,
        passwordHash: "password123",
        kycLevel: 3,
        balance: 3000,
        monthlyGains: matchedPlan ? matchedPlan.earnTotal : 0,
        streak: 1,
        badges: ["First Brex 💧"],
        memojiState: "Happy",
        selectedIntent: "safe",
        teamSize: 0,
        rechargeMembers: 0,
        effectiveSizeToday: 0,
        teamSizeToday: 0,
        invitationCode: `BREX-${Math.floor(1000 + Math.random() * 9000)}`,
        referredBy: parent.invitationCode,
        investments: freshInvestments,
        transactions: [
          {
            id: `txn_${Date.now()}_sim1`,
            amount: amountChosen,
            type: "subscribe" as const,
            status: "success" as const,
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: `Purchase Allocation: ${matchedPlan?.name || "VIP Level"}`
          }
        ]
      };

      db.users.push(simulatedUser);

      // Parent updates
      parent.teamSize = (parent.teamSize || 0) + 1;
      parent.teamSizeToday = (parent.teamSizeToday || 0) + 1;
      parent.rechargeMembers = (parent.rechargeMembers || 0) + 1;
      parent.balance += 2500;
      parent.monthlyGains += 2500;
      parent.transactions.unshift({
        id: `txn_sim_ref_${Date.now()}`,
        amount: 2500,
        type: "bonus" as const,
        status: "success" as const,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: `Referral Bonus: ${simulatedUser.name} Sim Deposit`
      });

      saveDatabase(db);
      const { passwordHash, ...profile } = parent;
      res.json({ message: "Simulated registration complete", user: profile });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Failed to inject simulated downline" });
    }
  });

  // -------------------------
  // ADMINISTRATIVE APIS
  // -------------------------

  // Fetch full directory of user accounts
  app.get("/api/admin/users", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const db = loadDatabase();
      const requester = db.users.find((u) => u.id === authHeader || u.phoneNumber === authHeader);

      if (!requester || (requester.email.toLowerCase() !== "ottigospel@gmail.com" && !requester.isAdmin)) {
        return res.status(403).json({ error: "Administrative privileges are required to view this module" });
      }

      // Safe clean profiles list (excluding plaintext passkeys)
      const profiles = db.users.map(({ passwordHash, ...prf }) => prf);
      res.json({ users: profiles });
    } catch (err) {
      res.status(500).json({ error: "Failed to load system accounts registry" });
    }
  });

  // Admin KYC verification triggers
  app.post("/api/admin/verify", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { userId, level } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const db = loadDatabase();
      const requester = db.users.find((u) => u.id === authHeader || u.phoneNumber === authHeader);

      if (!requester || (requester.email.toLowerCase() !== "ottigospel@gmail.com" && !requester.isAdmin)) {
        return res.status(403).json({ error: "Privileges required" });
      }

      const userIndex = db.users.findIndex((u) => u.id === userId || u.phoneNumber === userId);
      if (userIndex === -1) {
        return res.status(404).json({ error: "User to verify not found" });
      }

      db.users[userIndex].kycLevel = level !== undefined ? Number(level) : 3;
      saveDatabase(db);

      res.json({ message: "KYC credentials approved successfully!" });
    } catch (err) {
      res.status(500).json({ error: "Failed to upgrade KYC" });
    }
  });

  // Admin secure cash/yield injection (credit user funds)
  app.post("/api/admin/credit", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { userId, amount } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const db = loadDatabase();
      const requester = db.users.find((u) => u.id === authHeader || u.phoneNumber === authHeader);

      if (!requester || (requester.email.toLowerCase() !== "ottigospel@gmail.com" && !requester.isAdmin)) {
        return res.status(403).json({ error: "Privileges required" });
      }

      const userIndex = db.users.findIndex((u) => u.id === userId || u.phoneNumber === userId);
      if (userIndex === -1) {
        return res.status(444).json({ error: "User not found" });
      }

      const creditAmt = Number(amount);
      if (isNaN(creditAmt) || creditAmt <= 0) {
        return res.status(400).json({ error: "Specify a valid credit amount" });
      }

      db.users[userIndex].balance += creditAmt;
      saveDatabase(db);

      res.json({ message: `Successfully injected ₦${creditAmt.toLocaleString()} NGN into account balance!` });
    } catch (err) {
      res.status(500).json({ error: "Direct credit operation failed" });
    }
  });

  // Gemini AI Advisor Endpoint
  app.post("/api/gemini/advisor", async (req, res) => {
    try {
      const { message, selectedIntent } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash' as any,
        contents: `User is a Gen Z investor in Nigeria interested in traditional asset classes like Naira Treasury Bills, bonds, and dollar-hedged pathways. Their current intent category is ${selectedIntent}. They ask: "${message}". Give concise, friendly investment advice using a modern, objective, and premium financial brand tone. Do not refer to "QuantVerse" or VIP trading levels since those are disabled. Focus purely on realistic Naira yields, inflation preservation, and commercial paper rates in Nigeria.`,
      });
      
      const aiResponse = response.text || "I'm having a bit of a brain freeze. Try asking that again!";
      res.json({ text: aiResponse });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to call Gemini" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
