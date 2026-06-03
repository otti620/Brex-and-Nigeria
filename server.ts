import express from "express";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { loadDatabase, saveDatabase, DbUser, createInitialInvestments } from "./server-db";
import { initializeApp as initFirebaseServer, getApps, getApp } from "firebase/app";
import { getFirestore as getFirestoreServer, collection, query, where, getDocs, doc, getDoc, writeBatch, increment, updateDoc } from "firebase/firestore";
import { getAuth as getAuthServer, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

function startServer() {
  const app = express();
  const PORT = 3000;

  // Fix for Vercel serverless environment body parsing
  app.use((req: any, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req._body = true;
    }
    next();
  });
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // Server-side Firebase integration for webhook processing
  const firebaseServerConfig = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "brex-app",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:425883713028:web:b1d79dd4ae414771fd0b79",
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBewBW-Z9P5HtcUTsLvmEn0aZtBjwvD68I",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "brex-app.firebaseapp.com",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "brex-app.appspot.com",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "425883713028",
  };

  const isFirebaseConfigured = !!(firebaseServerConfig.apiKey && firebaseServerConfig.projectId);
  let serverDb: any = null;
  let loginPromise: Promise<void> | null = null;

  const ensureAuthenticated = async () => {
    if (loginPromise) {
      try {
        // Run with a 4-second timeout to avoid blocking serverless functions indefinitely
        await Promise.race([
          loginPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Auth Timed Out")), 4000))
        ]);
      } catch (e) {
        console.error("Error awaiting loginPromise:", e);
      }
    }
  };

  let PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

  // Helper to get Paystack Key (from env or Firestore fallback)
  const getPaystackKey = async () => {
    if (PAYSTACK_SECRET_KEY) return PAYSTACK_SECRET_KEY;
    await ensureAuthenticated();
    if (serverDb) {
      try {
        const configDocSnap = await getDoc(doc(serverDb, 'config', 'payments_config'));
        if (configDocSnap.exists() && configDocSnap.data().paystackSecretKey) {
          return configDocSnap.data().paystackSecretKey;
        }
      } catch(e) {
        console.error("[Paystack Key Load Error]", e);
      }
    }
    return "";
  };

  // Helper to get Paystack Public Key
  const getPaystackPublicKey = async () => {
    let PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";
    if (PAYSTACK_PUBLIC_KEY) return PAYSTACK_PUBLIC_KEY;
    await ensureAuthenticated();
    if (serverDb) {
      try {
        const configDocSnap = await getDoc(doc(serverDb, 'config', 'payments_config'));
        if (configDocSnap.exists() && configDocSnap.data().paystackPublicKey) {
          return configDocSnap.data().paystackPublicKey;
        }
      } catch(e) {
        console.error("[Paystack PubKey Load Error]", e);
      }
    }
    return "";
  };

  if (isFirebaseConfigured) {
    try {
      let serverFirebaseApp;
      const existingApps = getApps();
      const existing = existingApps.find(app => app.name === "server-instance");
      if (existing) {
        serverFirebaseApp = existing;
      } else {
        serverFirebaseApp = initFirebaseServer(firebaseServerConfig, "server-instance");
      }
      serverDb = getFirestoreServer(serverFirebaseApp, "(default)");

      // Automatically authenticate the container service as a system service account for authorized reads/writes
      const serverAuth = getAuthServer(serverFirebaseApp);
      const serviceEmail = "backend-system-service-account@brex.internal";
      const servicePassword = "SecureBackendPassword123-SystemServer-Token!";

      const loginServiceAccount = async () => {
        try {
          await signInWithEmailAndPassword(serverAuth, serviceEmail, servicePassword);
          console.log("[Firebase Server Auth] System service account signed in successfully.");
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/user-not-found' || signInErr.message?.includes('user-not-found') || signInErr.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(serverAuth, serviceEmail, servicePassword);
              console.log("[Firebase Server Auth] System service account created and signed in successfully.");
            } catch (createErr: any) {
              // If creation failed but because it exists, try to log in again, otherwise log error
              console.error("[Firebase Server Auth] System account setup fallback:", createErr.message);
              try {
                await signInWithEmailAndPassword(serverAuth, serviceEmail, servicePassword);
              } catch (retryErr) {
                console.error("[Firebase Server Auth] System account retry login failed.");
              }
            }
          } else {
            console.error("[Firebase Server Auth] System account auto-login failed:", signInErr.message);
          }
        }
      };
      
      loginPromise = loginServiceAccount();
    } catch (err) {
      console.error("Firebase server initialization failed:", err);
    }
  } else {
    console.warn("Firebase is not configured on the server. Webhooks will not sync to Firestore.");
  }

  // Paystack config helper for client-side inline checkout
  app.get("/api/payments/paystack/config", async (req, res) => {
    try {
      const publicKey = await getPaystackPublicKey();
      const secretKey = await getPaystackKey();
      res.json({ 
        publicKey,
        hasSecretKey: !!secretKey,
        secretKeyPrefix: secretKey ? secretKey.substring(0, 7) + "..." : "none",
        firebaseConfigured: isFirebaseConfigured,
        serverDbActive: !!serverDb
      });
    } catch (err: any) {
      console.error("[Paystack Config Error]", err);
      res.json({ 
        publicKey: "",
        hasSecretKey: false,
        firebaseConfigured: isFirebaseConfigured,
        serverDbActive: !!serverDb,
        error: err.message || String(err)
      });
    }
  });

  // Paystack transaction initialization
  app.post("/api/payments/paystack/initialize", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "Missing request body. Make sure Content-Type is application/json" });
      }

      const { email, amount, metadata, first_name, last_name, callback_url } = req.body;
      const paystackKey = await getPaystackKey();
      
      if (!paystackKey) {
        return res.status(500).json({ 
          error: "Paystack Secret Key is not configured on the server. Please define PAYSTACK_SECRET_KEY in your hosting platform environment variables OR configure it under System Rules / Admin Panel.",
          debug: {
            resolvedKeyStatus: "Missing / Empty String",
            firebaseConfigured: isFirebaseConfigured,
            serverDbActive: !!serverDb
          }
        });
      }

      // Check and sanitize email to avoid Paystack API errors
      let cleanEmail = email || "";
      const isDummyEmail = !cleanEmail || 
                            cleanEmail.includes(".internal") || 
                            cleanEmail.includes("example.com") || 
                            !cleanEmail.includes("@");
      
      if (isDummyEmail) {
        let nameSlug = "";
        const combinedName = `${first_name || ""} ${last_name || ""}`.trim();
        if (combinedName) {
          nameSlug = combinedName.toLowerCase().replace(/[^a-z0-9]/g, "");
        }
        if (!nameSlug && metadata?.userId) {
          nameSlug = "user" + String(metadata.userId).replace(/[^a-z0-9]/g, "").substring(0, 8);
        }
        if (!nameSlug) {
          nameSlug = "customer" + Math.floor(100000 + Math.random() * 900000);
        }
        cleanEmail = `${nameSlug}@gmail.com`;
      }

      // amount is in NGN, Paystack expects kobo
      const amountInKobo = Math.round(Number(amount) * 100);

      let proto = req.headers['x-forwarded-proto'] 
        ? (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto'].split(',')[0])
        : req.protocol;
      const host = req.headers['x-forwarded-host']
        ? (Array.isArray(req.headers['x-forwarded-host']) ? req.headers['x-forwarded-host'][0] : req.headers['x-forwarded-host'].split(',')[0])
        : req.get("host");

      // Upgrade protocol to https on production environments to prevent Paystack mixed content errors or SSL redirection breaks
      if (host && !host.includes("localhost") && !host.includes("127.0.0.1") && !host.includes(":3000")) {
        proto = "https";
      }

      let responseText = "";
      let responseJson: any = null;
      let isJson = false;

      let response;
      try {
        response = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
            amount: amountInKobo,
            first_name,
            last_name,
            metadata,
            callback_url: callback_url || `${proto}://${host}/?payment=success`,
          }),
        });
        
        responseText = await response.text();
        try {
          responseJson = JSON.parse(responseText);
          isJson = true;
        } catch (e) {
          isJson = false;
        }
      } catch (fetchErr: any) {
        return res.status(502).json({
          error: "Failed to connect to Paystack transaction API.",
          details: fetchErr.message || String(fetchErr),
          debug: {
            endpoint: "https://api.paystack.co/transaction/initialize",
            hasSecretKey: true,
            secretKeyPrefix: paystackKey ? paystackKey.substring(0, 7) + "..." : "none"
          }
        });
      }

      if (!response.ok || (isJson && !responseJson.status)) {
        return res.status(response.status || 400).json({
          error: responseJson?.message || `Paystack API returned an error status code ${response.status}`,
          details: isJson ? responseJson : responseText,
          debug: {
            httpStatus: response.status,
            hasSecretKey: true,
            secretKeyPrefix: paystackKey ? paystackKey.substring(0, 7) + "..." : "none",
            cleanEmail,
            originalAmount: amount,
            amountInKobo
          }
        });
      }

      res.json(responseJson.data);
    } catch (err: any) {
      console.error("[Paystack Init Error]", err);
      res.status(500).json({ 
        error: "An unexpected server crash occurred while communicating with Paystack",
        details: err.message || String(err)
      });
    }
  });

  // Helper function to verify a transaction reference on Paystack, credit the user, and pay referrals
  async function creditUserForPaystackTransaction(reference: string, paystackKey: string, serverDb: any) {
    await ensureAuthenticated();
    // 1. Verify transaction status directly from Paystack API
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });
    const verifyData: any = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      throw new Error("Transaction verification failed at source (Paystack returned error or pending status)");
    }

    const verifiedAmountKobo = verifyData.data.amount;
    const amountNGN = Math.floor(verifiedAmountKobo / 100);
    const email = verifyData.data.customer.email.toLowerCase().trim();

    console.log(`[Paystack Verification] Confirmed ₦${amountNGN} payment for customer ${email} using reference ${reference}`);

    if (!serverDb) {
      console.warn("[Paystack Verification] Firestore is not configured. Updating local mock DB.");
      // If serverDb is not set up, update local mock JSON DB backup
      const db = loadDatabase();
      const metadataUserId = verifyData.data.metadata?.userId || verifyData.data.metadata?.user_id;
      let idx = -1;
      if (metadataUserId) {
        idx = db.users.findIndex((u) => u.id === metadataUserId);
      }
      if (idx === -1) {
        idx = db.users.findIndex((u) => u.email?.toLowerCase().trim() === email);
      }
      if (idx !== -1) {
        const userId = db.users[idx].id;
        const txnId = `txn_ps_${reference}`;
        
        // Idempotency check 
        const exists = db.users[idx].transactions.some((t: any) => t.id === txnId);
        if (exists) {
          console.log(`[Paystack Verification] Local Transaction ${txnId} already processed previously.`);
          return { status: "already_processed", amount: amountNGN, email, userId };
        }

        const isFirstDeposit = !db.users[idx].firstDepositBonusAwarded;

        db.users[idx].balance += amountNGN;
        db.users[idx].monthlyGains += Math.floor(amountNGN * 0.05);
        if (isFirstDeposit) {
          db.users[idx].firstDepositBonusAwarded = true;
        }

        db.users[idx].transactions.unshift({
          id: txnId,
          amount: amountNGN,
          type: "recharge",
          status: "success",
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: isFirstDeposit ? `First Paystack Deposit (Ref: ${reference})` : `Paystack Deposit (Ref: ${reference})`
        });

        // Award referral bonus to the referrer (10% - ONLY ON FIRST DEPOSIT!)
        if (isFirstDeposit) {
          const referredByUserCode = db.users[idx].referredBy;
          if (referredByUserCode) {
            const referrerIdx = db.users.findIndex(u => u.invitationCode.toUpperCase() === referredByUserCode.trim().toUpperCase());
            if (referrerIdx !== -1) {
              const bonusAmount = Math.floor(amountNGN * 0.10);
              db.users[referrerIdx].balance += bonusAmount;
              db.users[referrerIdx].referralBonus = (db.users[referrerIdx].referralBonus || 0) + bonusAmount;
              db.users[referrerIdx].rechargeMembers = (db.users[referrerIdx].rechargeMembers || 0) + 1;
              db.users[referrerIdx].transactions.unshift({
                id: `txn_bonus_${reference}`,
                amount: bonusAmount,
                type: "bonus",
                status: "success",
                date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                details: `First Deposit Referral Bonus (10% on ${db.users[idx].name || 'team member'}'s first deposit of ₦${amountNGN.toLocaleString()})`
              });
              console.log(`[Paystack Verification Local] Credited 10% first-deposit referral bonus (₦${bonusAmount}) to referrer ${db.users[referrerIdx].id}`);
            }
          }
        }

        saveDatabase(db);
        console.log(`[Paystack Verification] Local account ${userId} credited successfully (₦${amountNGN}, First Deposit: ${isFirstDeposit})`);
        return { status: "success", amount: amountNGN, email, userId };
      }
      throw new Error(`User with email ${email} or metadata userId ${metadataUserId || 'N/A'} not found in local JSON database backup`);
    }

    // 2. Fetch User in Firestore
    let userId: string = "";
    let userData: any = null;
    const usersCol = collection(serverDb, "users");

    const metadataUserId = verifyData.data.metadata?.userId || verifyData.data.metadata?.user_id;
    if (metadataUserId) {
      try {
        const userDocRef = doc(serverDb, "users", metadataUserId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          userId = userDocSnap.id;
          userData = userDocSnap.data();
          console.log(`[Paystack Verification] Found user via metadata userId: ${userId}`);
        }
      } catch (err) {
        console.error("[Paystack Verification] Error looking up userId directly:", err);
      }
    }

    if (!userData) {
      const q = query(usersCol, where("email", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error(`User with email ${email} or metadata userId ${metadataUserId || 'N/A'} not found in Firestore database`);
      }

      const userDoc = snapshot.docs[0];
      userId = userDoc.id;
      userData = userDoc.data();
      console.log(`[Paystack Verification] Found user via email fallback: ${userId}`);
    }

    // 3. SECURE IDEMPOTENCY CHECK
    const txnId = `txn_ps_${reference}`;
    const txnRef = doc(serverDb, `users/${userId}/transactions/${txnId}`);
    const txnSnap = await getDoc(txnRef);

    if (txnSnap.exists()) {
      console.log(`[Paystack Verification] Transaction ${txnId} already registered in Firestore previously. Skipping double credit.`);
      return { status: "already_processed", amount: amountNGN, email, userId };
    }

    const isFirstDeposit = !userData.firstDepositBonusAwarded;

    // 4. Batch transaction updates to avoid race conditions and ensure atomicity
    const batch = writeBatch(serverDb);
    const userUpdates: any = {
      balance: (userData.balance || 0) + amountNGN,
      monthlyGains: (userData.monthlyGains || 0) + Math.floor(amountNGN * 0.05)
    };
    if (isFirstDeposit) {
      userUpdates.firstDepositBonusAwarded = true;
    }
    batch.update(doc(serverDb, 'users', userId), userUpdates);

    batch.set(txnRef, {
      id: txnId,
      userId: userId,
      amount: amountNGN,
      type: "recharge",
      status: "success",
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      details: isFirstDeposit ? `First Paystack Deposit (Ref: ${reference})` : `Paystack Deposit (Ref: ${reference})`
    });

    // Process 10% Referral Bonus (ONLY ON FIRST DEPOSIT!)
    const referrerCode = userData.referredBy;
    const referrerUid = userData.referrerUid;

    if (isFirstDeposit && (referrerUid || referrerCode)) {
      console.log(`[Paystack Verification] First Deposit Referral found. Code: ${referrerCode}, Uid: ${referrerUid}`);
      try {
        let referrerDoc: any = null;
        let referrerId: string = "";

        if (referrerUid) {
          const refSnap = await getDoc(doc(serverDb, "users", referrerUid));
          if (refSnap.exists()) {
            referrerDoc = refSnap;
            referrerId = refSnap.id;
          }
        }

        if (!referrerDoc && referrerCode) {
          const q = query(usersCol, where("invitationCode", "==", referrerCode.trim().toUpperCase()));
          const refSnap = await getDocs(q);
          if (!refSnap.empty) {
            referrerDoc = refSnap.docs[0];
            referrerId = refSnap.docs[0].id;
          }
        }

        if (referrerDoc) {
          const referrerData = referrerDoc.data() as any;
          const bonusAmount = Math.floor(amountNGN * 0.10); // 10%

          batch.update(doc(serverDb, 'users', referrerId), {
            balance: (referrerData.balance || 0) + bonusAmount,
            referralBonus: (referrerData.referralBonus || 0) + bonusAmount,
            rechargeMembers: (referrerData.rechargeMembers || 0) + 1,
          });

          const bonusTxnId = `txn_bonus_${reference}`;
          batch.set(doc(serverDb, `users/${referrerId}/transactions/${bonusTxnId}`), {
            id: bonusTxnId,
            userId: referrerId,
            amount: bonusAmount,
            type: "bonus",
            status: "success",
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: `First Deposit Referral Bonus (10% on ${userData.name || 'team member'}'s first deposit of ₦${amountNGN.toLocaleString()})`
          });
          
          console.log(`[Paystack Verification] Credited 10% referral bonus (₦${bonusAmount}) to referrer ${referrerId}`);
        } else {
          console.log(`[Paystack Verification] Referrer NOT FOUND for Code: ${referrerCode}, Uid: ${referrerUid}`);
        }
      } catch (refErr) {
        console.error("[Paystack Verification] Failed to process referral bonus:", refErr);
      }
    } else {
      console.log(`[Paystack Verification] First Deposit skip or No Referrer found for customer: ${email}. First deposit: ${isFirstDeposit}`);
    }

    await batch.commit();
    console.log(`[Paystack Verification] Firestore account ${userId} credited successfully for ₦${amountNGN}`);
    return { status: "success", amount: amountNGN, email, userId };
  }

  // Paystack Webhook Handler (Secure)
  app.post("/api/webhook/paystack", async (req, res) => {
    if (!req.body) {
      return res.status(400).send("No body");
    }
    const paystackKey = await getPaystackKey();
    if (!paystackKey) {
      console.error("[Paystack Webhook] Paystack Secret Key is missing.");
      return res.status(500).send("Server not configured");
    }

    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      return res.status(400).send("No signature found");
    }

    // Verify signature
    const hash = crypto
      .createHmac("sha512", paystackKey)
      .update((req as any).rawBody || JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      console.error("[Paystack Webhook] Signature mismatch. Received:", signature, "Computed:", hash);
      return res.status(400).send("Invalid signature");
    }

    console.log("[Paystack Webhook] Verified payload received successfully");
    
    try {
      const event = req.body;
      if (event.event !== "charge.success") {
        return res.json({ status: "ignored" });
      }

      const { data } = event;
      const reference = data.reference;

      // Handle credit and referrers safely using our verification helper
      const creditResult = await creditUserForPaystackTransaction(reference, paystackKey, serverDb);
      return res.status(200).json({ status: "success", result: creditResult.status });
    } catch (err: any) {
      console.error("[Paystack Webhook Error]", err);
      return res.status(500).send(err.message || "Webhook internal processing error");
    }
  });

  // Paystack Secure Server-Side Manual/Redirect Verification API
  app.post("/api/payments/paystack/verify", async (req, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ error: "Missing transaction reference in payload body" });
      }

      const paystackKey = await getPaystackKey();
      if (!paystackKey) {
        return res.status(500).json({ error: "Paystack Secret Key is not configured on the server." });
      }

      const result = await creditUserForPaystackTransaction(reference, paystackKey, serverDb);
      return res.json({
        success: true,
        status: result.status,
        amount: result.amount,
        message: result.status === "already_processed"
          ? "Payment has already been credited to your balance!"
          : `Successfully verified and credited ₦${result.amount.toLocaleString()} NGN into account balance!`
      });
    } catch (err: any) {
      console.error("[Paystack Verify API Error]", err);
      return res.status(400).json({ error: err.message || "Failed to verify transaction with Paystack" });
    }
  });

  // (Removed old mock webhook handler)

  // -------------------------
  // CUSTOM AUTH & ACCOUNT APIS
  // -------------------------

  // Secure referral verification route
  app.get("/api/referrer/lookup/:code", async (req, res) => {
    try {
      const code = req.params.code.trim().toUpperCase();
      if (!serverDb) {
        // Fallback to local DB list lookup
        const db = loadDatabase();
        const user = db.users.find(u => u.invitationCode && u.invitationCode.toUpperCase() === code);
        if (user) {
          return res.json({ found: true, id: user.id });
        }
        return res.json({ found: false });
      }

      const usersCol = collection(serverDb, "users");
      const q = query(usersCol, where("invitationCode", "==", code));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return res.json({ found: true, id: snap.docs[0].id });
      }
      return res.json({ found: false });
    } catch (e: any) {
      console.error("[Referrer Lookup Error]", e);
      return res.status(500).json({ error: e.message || "Failed to lookup referrer" });
    }
  });

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

      // Credit 10% referral bonus to local DB referrer!
      const referredByUserCode = db.users[idx].referredBy;
      if (referredByUserCode) {
        const referrerIdx = db.users.findIndex(u => u.invitationCode.toUpperCase() === referredByUserCode.trim().toUpperCase());
        if (referrerIdx !== -1) {
          const bonusAmount = Math.floor(deposit * 0.10);
          db.users[referrerIdx].balance += bonusAmount;
          db.users[referrerIdx].referralBonus = (db.users[referrerIdx].referralBonus || 0) + bonusAmount;
          db.users[referrerIdx].transactions.unshift({
            id: `txn_bonus_${Date.now()}`,
            amount: bonusAmount,
            type: "bonus" as const,
            status: "success" as const,
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: `Referral Bonus (10% from team recharge of ${db.users[idx].name})`
          });
          console.log(`[Referral Bonus Local API] Credited 10% referral bonus (₦${bonusAmount}) to referrer ${db.users[referrerIdx].id}`);
        }
      }

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
  app.post("/api/user/subscribe", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { planId } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      if (serverDb) {
        // Firestore active path
        const userRef = doc(serverDb, 'users', authHeader);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return res.status(444).json({ error: "Session expired" });

        const userDataSnapshot = userSnap.data();
        let userInvestments = userDataSnapshot.investments || [];
        if (userInvestments.length === 0) {
          userInvestments = createInitialInvestments();
        }

        const planIndex = userInvestments.findIndex((p: any) => p.id === planId);
        if (planIndex === -1) return res.status(400).json({ error: "Selected plan level does not exist" });

        const plan = { ...userInvestments[planIndex] };
        
        let globalPlan = plan;
        try {
          const configDoc = await getDoc(doc(serverDb, "config", "global_vip_plans"));
          if (configDoc.exists() && configDoc.data()?.plans) {
            const matched = configDoc.data().plans.find((gp: any) => gp.id === planId);
            if (matched) globalPlan = matched;
          }
        } catch (e) {
          console.warn("Could not retrieve latest globalPlans from config", e);
        }

        const userBalance = userDataSnapshot.balance || 0;
        if (userBalance < globalPlan.cost) {
          return res.status(400).json({ error: `Insufficient balance. Deposit at least ₦${(globalPlan.cost - userBalance).toLocaleString()} NGN additional.` });
        }

        plan.joined = true;
        plan.balance = (plan.balance || 0) + globalPlan.cost;
        userInvestments[planIndex] = plan;

        const batch = writeBatch(serverDb);
        batch.update(userRef, {
          balance: increment(-globalPlan.cost),
          investments: userInvestments
        });

        const txnId = `txn_${Date.now()}`;
        const txnRef = doc(serverDb, `users/${authHeader}/transactions/${txnId}`);
        batch.set(txnRef, {
          id: txnId,
          userId: authHeader,
          amount: globalPlan.cost,
          type: "subscribe",
          status: "success",
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `Subscribed and activated ${globalPlan.name} Pool`
        });

        const otherActiveInvestments = userInvestments.filter((p: any) => p.joined && p.id !== planId);
        const isFirstPortfolioActivation = otherActiveInvestments.length === 0;

        if (isFirstPortfolioActivation && (userDataSnapshot.referrerUid || userDataSnapshot.referredBy)) {
          try {
            let referrerDocRef: any = null;
            if (userDataSnapshot.referrerUid) {
              referrerDocRef = doc(serverDb, 'users', userDataSnapshot.referrerUid);
            } else if (userDataSnapshot.referredBy) {
              const q = query(collection(serverDb, 'users'), where('invitationCode', '==', userDataSnapshot.referredBy.trim().toUpperCase()));
              const refSnap = await getDocs(q);
              if (!refSnap.empty) {
                referrerDocRef = refSnap.docs[0].ref;
              }
            }

            if (referrerDocRef) {
              const refSnap = await getDoc(referrerDocRef);
              if (refSnap.exists()) {
                batch.update(referrerDocRef, {
                  balance: increment(2500),
                  rechargeMembers: increment(1)
                });

                const refTxnId = `txn_ref_${Date.now()}`;
                batch.set(doc(serverDb, `users/${referrerDocRef.id}/transactions/${refTxnId}`), {
                  id: refTxnId,
                  userId: referrerDocRef.id,
                  amount: 2500,
                  type: "bonus",
                  status: "success",
                  date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                  details: `First Deposit Active Reward: ${userDataSnapshot.name}`
                });
                console.log(`[Firestore API Subscribe] Added 2500 active referral reward to referrer ${referrerDocRef.id}`);
              }
            }
          } catch (refErr) {
            console.error("[Firestore API Subscribe] Failed to process active referral reward:", refErr);
          }
        }

        await batch.commit();
        return res.json({ message: "Subscription activated!" });
      }

      // JSON DB fallback path code
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
      console.error(err);
      res.status(500).json({ error: "Portfolio allocation failed" });
    }
  });

  // Claim VIP Daily yield
  app.post("/api/user/accrue-yield", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { planId } = req.body;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      if (serverDb) {
        const userRef = doc(serverDb, 'users', authHeader);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return res.status(404).json({ error: "User session not found" });

        const userDataSnapshot = userSnap.data();
        let userInvestments = userDataSnapshot.investments || [];
        
        const planIndex = userInvestments.findIndex((p: any) => p.id === planId);
        if (planIndex === -1) return res.status(400).json({ error: "Investment plan not found" });

        const plan = { ...userInvestments[planIndex] };
        if (!plan.joined) {
          return res.status(400).json({ error: "You must allocate funds to this plan before accruing yield." });
        }

        const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        if (plan.lastClaimedDate === todayStr) {
          return res.status(400).json({ error: "This yield cycle has already been accrued for today." });
        }

        let globalPlan = plan;
        try {
          const configDoc = await getDoc(doc(serverDb, "config", "global_vip_plans"));
          if (configDoc.exists() && configDoc.data()?.plans) {
            const matched = configDoc.data().plans.find((gp: any) => gp.id === planId);
            if (matched) globalPlan = matched;
          }
        } catch (e) {
          console.warn("Accrue yield API: failed match global plan:", e);
        }

        const yieldAmount = globalPlan.dailyProfit || plan.dailyProfit || 0;

        plan.earnYesterday = yieldAmount;
        plan.earnTotal = (plan.earnTotal || 0) + yieldAmount;
        plan.workingDays = (plan.workingDays || 0) + 1;
        plan.lastClaimedDate = todayStr;
        userInvestments[planIndex] = plan;

        const batch = writeBatch(serverDb);
        batch.update(userRef, {
          balance: increment(yieldAmount),
          monthlyGains: increment(yieldAmount),
          investments: userInvestments
        });

        const txnId = `txn_${Date.now()}`;
        const txnRef = doc(serverDb, `users/${authHeader}/transactions/${txnId}`);
        batch.set(txnRef, {
          id: txnId,
          userId: authHeader,
          amount: yieldAmount,
          type: "claim",
          status: "success",
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `Daily Claim: interest profit from ${globalPlan.name || plan.name}`
        });

        await batch.commit();
        return res.json({ message: "Yield successfully claimed into available balance!" });
      }

      // JSON DB fallback path code
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
      console.error(err);
      res.status(500).json({ error: "Yield accrual calculation failed" });
    }
  });

  // 1. Interactive Fortune Spin the wheel
  app.post("/api/user/spin-wheel", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { spinType } = req.body; // "regular" | "mega"
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const isMega = spinType === "mega";
      
      // Determine prize based on spin type
      const randValue = Math.random() * 100;
      let reward = 0;
      let label = "Try again";

      if (isMega) {
        if (randValue < 45) {
          reward = 0;
          label = "Try again";
        } else if (randValue < 68) {
          reward = 200;
          label = "₦200 NGN";
        } else if (randValue < 85) {
          reward = 500;
          label = "₦500 NGN";
        } else if (randValue < 93) {
          reward = 1500;
          label = "₦1,500 NGN";
        } else if (randValue < 98) {
          reward = 3500;
          label = "₦3,500 NGN";
        } else {
          reward = 15000;
          label = "₦15,000 NGN"; // Ultra reward with 2% success rate!
        }
      } else {
        if (randValue < 40) {
          reward = 0;
          label = "Try again";
        } else if (randValue < 70) {
          reward = 50;
          label = "₦50 NGN";
        } else if (randValue < 85) {
          reward = 100;
          label = "₦100 NGN";
        } else if (randValue < 93) {
          reward = 500;
          label = "₦500 NGN";
        } else if (randValue < 98.2) {
          reward = 700;
          label = "₦700 NGN";
        } else {
          reward = 2000;
          label = "₦2,000 NGN";
        }
      }

      if (serverDb) {
        const userRef = doc(serverDb, 'users', authHeader);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return res.status(404).json({ error: "User profile not found" });

        const userDataSnapshot = userSnap.data();
        const lastSpin = userDataSnapshot.lastSpinDate || "";
        const isFree = !isMega && lastSpin !== todayStr;
        const spinCost = isMega ? 1000 : (isFree ? 0 : 100);

        if ((userDataSnapshot.balance || 0) < spinCost) {
          return res.status(400).json({ error: `Insufficient wallet balance. Spin costs ₦${spinCost}.` });
        }

        const finalBalance = (userDataSnapshot.balance || 0) - spinCost + reward;
        const finalMonthlyGains = (userDataSnapshot.monthlyGains || 0) + reward;

        const batch = writeBatch(serverDb);
        const updateFields: any = {
          balance: finalBalance,
          monthlyGains: finalMonthlyGains
        };
        if (!isMega) {
          updateFields.lastSpinDate = todayStr;
        }
        batch.update(userRef, updateFields);

        // Save transaction
        const txnId = `txn_spin_${Date.now()}`;
        const txnRef = doc(serverDb, `users/${authHeader}/transactions/${txnId}`);
        batch.set(txnRef, {
          id: txnId,
          userId: authHeader,
          amount: spinCost,
          type: "bonus",
          status: "success",
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: isMega
            ? `Mega VIP Fortune Spin (Stake: ₦1,000): ${reward > 0 ? `Won ${label}` : 'Try again'}`
            : (isFree 
                ? `Daily Free Fortune Spin: ${reward > 0 ? `Won ${label}` : 'Try again'}`
                : `Regular Paid Fortune Spin (Cost: ₦100): ${reward > 0 ? `Won ${label}` : 'Try again'}`)
        });

        await batch.commit();
        return res.json({
          success: true,
          reward,
          rewardLabel: label,
          isFree,
          cost: spinCost,
          balance: finalBalance
        });
      }

      // Fallback JSON DB
      const db = loadDatabase();
      const idx = db.users.findIndex(u => u.id === authHeader);
      if (idx === -1) return res.status(404).json({ error: "User session not found" });

      const user = db.users[idx];
      const lastSpin = (user as any).lastSpinDate || "";
      const isFree = !isMega && lastSpin !== todayStr;
      const spinCost = isMega ? 1000 : (isFree ? 0 : 100);

      if (user.balance < spinCost) {
        return res.status(400).json({ error: `Insufficient wallet balance. Spin costs ₦${spinCost}.` });
      }

      user.balance = user.balance - spinCost + reward;
      user.monthlyGains += reward;
      if (!isMega) {
        (user as any).lastSpinDate = todayStr;
      }

      user.transactions.unshift({
        id: `txn_spin_${Date.now()}`,
        amount: spinCost,
        type: "bonus" as const,
        status: "success" as const,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: isMega
          ? `Mega VIP Fortune Spin (Stake: ₦1,000): ${reward > 0 ? `Won ${label}` : 'Try again'}`
          : (isFree 
              ? `Daily Free Fortune Spin: ${reward > 0 ? `Won ${label}` : 'Try again'}`
              : `Regular Paid Fortune Spin (Cost: ₦100): ${reward > 0 ? `Won ${label}` : 'Try again'}`)
      });

      saveDatabase(db);
      const { passwordHash, ...profile } = user;
      res.json({
        success: true,
        reward,
        rewardLabel: label,
        isFree,
        cost: spinCost,
        balance: user.balance,
        user: profile
      });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Spin processing failed" });
    }
  });

  // 2. Buy Brex 2-Sure Lotto Tickets
  app.post("/api/user/lottery/buy", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { ticketNumbers, stake } = req.body; // e.g., [17, 88], stake: 500
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });
      
      if (!Array.isArray(ticketNumbers) || ticketNumbers.length !== 2) {
        return res.status(400).json({ error: "Invalid selection: Pick exactly 2 lucky numbers for 2-Sure Lotto." });
      }

      const n1 = parseInt(ticketNumbers[0]);
      const n2 = parseInt(ticketNumbers[1]);
      if (isNaN(n1) || isNaN(n2) || n1 < 1 || n1 > 90 || n2 < 1 || n2 > 90) {
        return res.status(400).json({ error: "Numbers must be integers between 1 and 90." });
      }
      if (n1 === n2) {
        return res.status(400).json({ error: "Please choose two unique numbers. Duplicate entries are invalid." });
      }

      const betStake = Math.max(50, Math.min(10000, parseInt(stake) || 200));

      if (serverDb) {
        const userRef = doc(serverDb, 'users', authHeader);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return res.status(404).json({ error: "User profile not found" });

        const userDataSnapshot = userSnap.data();
        if ((userDataSnapshot.balance || 0) < betStake) {
          return res.status(400).json({ error: `Insufficient wallet balance. Redeposit or adjust your stake (Min: ₦50).` });
        }

        const finalBalance = (userDataSnapshot.balance || 0) - betStake;
        const batch = writeBatch(serverDb);

        batch.update(userRef, {
          balance: finalBalance
        });

        const ticketId = `lot_reg_${Date.now()}`;
        const ticketRef = doc(serverDb, `users/${authHeader}/lottery_tickets/${ticketId}`);
        const ticketData = {
          id: ticketId,
          userId: authHeader,
          ticketNumbers: [n1, n2],
          entryDate: new Date().toISOString().slice(0, 10),
          purchasePrice: betStake,
          drawId: `draw_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
          status: "pending",
          rewardAmount: 0,
          drawNumbers: null
        };
        batch.set(ticketRef, ticketData);

        const txnId = `txn_lot_${Date.now()}`;
        const txnRef = doc(serverDb, `users/${authHeader}/transactions/${txnId}`);
        batch.set(txnRef, {
          id: txnId,
          userId: authHeader,
          amount: betStake,
          type: "subscribe",
          status: "success",
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `Staked ₦${betStake} on 2-Sure Lotto Combination: [${n1}, ${n2}]`
        });

        await batch.commit();
        return res.json({
          success: true,
          ticket: ticketData,
          balance: finalBalance
        });
      }

      // Local Fallback JSON DB
      const db = loadDatabase();
      const idx = db.users.findIndex(u => u.id === authHeader);
      if (idx === -1) return res.status(404).json({ error: "User session not found" });

      const user = db.users[idx];
      if (user.balance < betStake) {
        return res.status(400).json({ error: `Insufficient wallet balance. Redeposit or adjust your stake (Min: ₦50).` });
      }

      user.balance -= betStake;
      const ticketId = `lot_reg_${Date.now()}`;
      const ticketData = {
        id: ticketId,
        userId: authHeader,
        ticketNumbers: [n1, n2],
        entryDate: new Date().toISOString().slice(0, 10),
        purchasePrice: betStake,
        drawId: `draw_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
        status: "pending",
        rewardAmount: 0,
        drawNumbers: null
      };

      (user as any).lottery_tickets = (user as any).lottery_tickets || [];
      (user as any).lottery_tickets.unshift(ticketData);

      user.transactions.unshift({
        id: `txn_lot_${Date.now()}`,
        amount: betStake,
        type: "subscribe" as const,
        status: "success" as const,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        details: `Staked ₦${betStake} on 2-Sure Lotto Combination: [${n1}, ${n2}]`
      });

      saveDatabase(db);
      const { passwordHash, ...profile } = user;
      res.json({
        success: true,
        ticket: ticketData,
        balance: user.balance,
        user: profile
      });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "2-Sure Lotto ticket staking failed" });
    }
  });

  // 3. Process outstanding/drawn 2-Sure Lotto tickets
  app.post("/api/user/lottery/draw", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      // Generate 5 unique drawn numbers out of 1-90
      const pool = Array.from({ length: 90 }, (_, i) => i + 1);
      const drawnNumbers: number[] = [];
      for (let i = 0; i < 5; i++) {
        const randIndex = Math.floor(Math.random() * pool.length);
        drawnNumbers.push(pool.splice(randIndex, 1)[0]);
      }
      drawnNumbers.sort((a, b) => a - b);

      let totalRewardAwarded = 0;
      let matchedTickets: any[] = [];

      if (serverDb) {
        // Query users' pending tickets
        const ticketsPath = `users/${authHeader}/lottery_tickets`;
        const colRef = collection(serverDb, ticketsPath);
        const q = query(colRef, where("status", "==", "pending"));
        const qSnap = await getDocs(q);

        const userRef = doc(serverDb, 'users', authHeader);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return res.status(404).json({ error: "User session not found" });
        const userSnapshotData = userSnap.data();

        const batch = writeBatch(serverDb);

        qSnap.forEach(docSnap => {
          const ticket = docSnap.data();
          const pNums = ticket.ticketNumbers; // user's 2 selected numbers

          // Calculate matches
          let matchCount = 0;
          if (drawnNumbers.includes(pNums[0])) matchCount++;
          if (drawnNumbers.includes(pNums[1])) matchCount++;

          let multiplier = 0;
          if (matchCount === 2) {
            multiplier = 150; // Match both = 150x return (Huge win!)
          } else if (matchCount === 1) {
            multiplier = 3.5; // Match 1 = 3.5x return (Easy back comfort reward!)
          }

          const ticketStake = ticket.purchasePrice || 200;
          const prize = Math.round(ticketStake * multiplier);

          const status = prize > 0 ? "won" : "lost";
          totalRewardAwarded += prize;

          batch.update(docSnap.ref, {
            status,
            rewardAmount: prize,
            drawNumbers: drawnNumbers
          });

          matchedTickets.push({
            id: ticket.id,
            ticketNumbers: pNums,
            matchCount,
            prize,
            status
          });
        });

        const newBalance = (userSnapshotData.balance || 0) + totalRewardAwarded;
        const newMonthlyGains = (userSnapshotData.monthlyGains || 0) + totalRewardAwarded;

        batch.update(userRef, {
          balance: newBalance,
          monthlyGains: newMonthlyGains
        });

        if (totalRewardAwarded > 0) {
          const txnId = `txn_lot_win_${Date.now()}`;
          const txnRef = doc(serverDb, `users/${authHeader}/transactions/${txnId}`);
          batch.set(txnRef, {
            id: txnId,
            userId: authHeader,
            amount: totalRewardAwarded,
            type: "bonus",
            status: "success",
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: `Lotto Pay-out: Won ₦${totalRewardAwarded.toLocaleString()} inside Brex 2-Sure Gravity Terminal!`
          });
        }

        await batch.commit();

        return res.json({
          success: true,
          drawnNumbers,
          matchedTickets,
          totalRewardAwarded,
          balance: newBalance
        });
      }

      // JSON DB fallback paths
      const db = loadDatabase();
      const idx = db.users.findIndex(u => u.id === authHeader);
      if (idx === -1) return res.status(404).json({ error: "User session not found" });

      const user = db.users[idx];
      const tickets = (user as any).lottery_tickets || [];
      const pendingTickets = tickets.filter((t: any) => t.status === "pending");

      pendingTickets.forEach((ticket: any) => {
        const pNums = ticket.ticketNumbers;
        let matchCount = 0;
        if (drawnNumbers.includes(pNums[0])) matchCount++;
        if (drawnNumbers.includes(pNums[1])) matchCount++;

        let multiplier = 0;
        if (matchCount === 2) {
          multiplier = 150;
        } else if (matchCount === 1) {
          multiplier = 3.5;
        }

        const ticketStake = ticket.purchasePrice || 200;
        const prize = Math.round(ticketStake * multiplier);

        const status = prize > 0 ? "won" : "lost";
        totalRewardAwarded += prize;

        ticket.status = status;
        ticket.rewardAmount = prize;
        ticket.drawNumbers = drawnNumbers;

        matchedTickets.push({
          id: ticket.id,
          ticketNumbers: pNums,
          matchCount,
          prize,
          status
        });
      });

      user.balance += totalRewardAwarded;
      user.monthlyGains += totalRewardAwarded;

      if (totalRewardAwarded > 0) {
        user.transactions.unshift({
          id: `txn_lot_win_${Date.now()}`,
          amount: totalRewardAwarded,
          type: "bonus" as const,
          status: "success" as const,
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `Lotto Pay-out: Won ₦${totalRewardAwarded.toLocaleString()} inside Brex 2-Sure Gravity Terminal!`
        });
      }

      saveDatabase(db);
      const { passwordHash, ...profile } = user;
      res.json({
        success: true,
        drawnNumbers,
        matchedTickets,
        totalRewardAwarded,
        balance: user.balance,
        user: profile
      });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Lotto draw simulation halted" });
    }
  });

  // 4. Retrieve users' lottery tickets
  app.get("/api/user/lottery/tickets", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized access" });

      if (serverDb) {
        const ticketsPath = `users/${authHeader}/lottery_tickets`;
        const colRef = collection(serverDb, ticketsPath);
        const qSnap = await getDocs(colRef);
        const ticketsList: any[] = [];
        qSnap.forEach(docSnap => {
          ticketsList.push(docSnap.data());
        });
        // sort by newest
        ticketsList.sort((a, b) => b.id.localeCompare(a.id));
        return res.json({ success: true, tickets: ticketsList });
      }

      const db = loadDatabase();
      const user = db.users.find(u => u.id === authHeader);
      if (!user) return res.status(404).json({ error: "User profile not found" });

      const ticketsList = (user as any).lottery_tickets || [];
      return res.json({ success: true, tickets: ticketsList });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Retrieving lottery tickets failed" });
    }
  });

  // Securely increment referrer stats on signup
  app.post("/api/referrer/increment", async (req, res) => {
    try {
      const { referrerUid } = req.body;
      if (!referrerUid) return res.status(400).json({ error: "Missing referrer UID" });

      if (serverDb) {
        const refRef = doc(serverDb, 'users', referrerUid);
        await updateDoc(refRef, {
          teamSize: increment(1),
          teamSizeToday: increment(1)
        });
        console.log(`[Server Referrer Increment] Incremented team size for parent ${referrerUid}`);
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Server Referrer Increment] Error:", e);
      res.status(500).json({ error: e.message || "Referrer increment failed" });
    }
  });

  // Securely simulate a downline invite on server
  app.post("/api/referrer/simulate", async (req, res) => {
    try {
      const { parentUid, parentInvitationCode } = req.body;
      if (!parentUid || !parentInvitationCode) return res.status(400).json({ error: "Missing simulation options" });

      const randomNgs = ['703', '813', '906', '802', '915', '701', '805'];
      const randomPrefix = randomNgs[Math.floor(Math.random() * randomNgs.length)];
      const randomNumStr = Math.floor(1000000 + Math.random() * 9000000).toString();
      const cleanPhone = `+234 ${randomPrefix} ${randomNumStr.slice(0, 3)} ${randomNumStr.slice(-4)}`;

      const firstNames = ["Sade", "Kunle", "Temitope", "Nnamdi", "Chidi", "Akin", "Chioma", "Ibrahim", "Tunde", "Ayo"];
      const lastNames = ["Oluaseun", "Jinadu", "Faroq", "Ebere", "Kolawole", "Nwachukwu", "Okoro", "Adeleke"];
      const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
      const fakeMail = `${randomName.toLowerCase().replace(" ", "")}_${Math.floor(100 + Math.random() * 900)}@brex.internal`;

      const possibleRecharges = [3000, 15000, 50000, 150000];
      const amountChosen = possibleRecharges[Math.floor(Math.random() * possibleRecharges.length)];

      const defaultPlans = createInitialInvestments();
      const freshInvestments = defaultPlans.map(p => {
        if (p.cost === amountChosen) {
          return {
            ...p,
            joined: true,
            balance: amountChosen,
            workingDays: Math.floor(1 + Math.random() * 5),
            earnTotal: p.dailyProfit * Math.floor(1 + Math.random() * 5),
            earnYesterday: p.dailyProfit
          };
        }
        return p;
      });

      const simulatedUid = `user_sim_${Date.now()}`;
      const generatedCode = `BREX-${Math.floor(1000 + Math.random() * 9000)}`;

      const simulatedUserProfile = {
        id: simulatedUid,
        name: randomName,
        email: fakeMail,
        phoneNumber: cleanPhone,
        kycLevel: 3,
        balance: 3000,
        monthlyGains: freshInvestments.find(p => p.cost === amountChosen)?.earnTotal || 0,
        streak: 1,
        badges: ["First Brex 💧"],
        memojiState: "Happy",
        selectedIntent: "safe",
        teamSize: 0,
        rechargeMembers: 0,
        effectiveSizeToday: 0,
        teamSizeToday: 0,
        invitationCode: generatedCode,
        referredBy: parentInvitationCode,
        referrerUid: parentUid,
        isAdmin: false,
        investments: freshInvestments
      };

      const directReferralBonus = Math.floor(amountChosen * 0.10);
      const activeReferralBonus = 2500;
      const totalAwardedBonus = directReferralBonus + activeReferralBonus;

      if (serverDb) {
        const batch = writeBatch(serverDb);
        const simUserRef = doc(serverDb, 'users', simulatedUid);
        batch.set(simUserRef, simulatedUserProfile);

        const parentRef = doc(serverDb, 'users', parentUid);
        batch.update(parentRef, {
          balance: increment(totalAwardedBonus),
          rechargeMembers: increment(1),
          teamSize: increment(1),
          teamSizeToday: increment(1)
        });

        const dBonusTxnId = `txn_bonus_dir_${Date.now()}`;
        batch.set(doc(serverDb, `users/${parentUid}/transactions/${dBonusTxnId}`), {
          id: dBonusTxnId,
          userId: parentUid,
          amount: directReferralBonus,
          type: "earning",
          status: "success",
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `Referral Bonus (10% on registration & deposit of ${randomName})`
        });

        const aBonusTxnId = `txn_bonus_act_${Date.now()}`;
        batch.set(doc(serverDb, `users/${parentUid}/transactions/${aBonusTxnId}`), {
          id: aBonusTxnId,
          userId: parentUid,
          amount: activeReferralBonus,
          type: "bonus",
          status: "success",
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `Active Invited Friend Pool Reward: ${randomName}`
        });

        await batch.commit();
        console.log(`[Platform Simulation Server] Successfully registered virtual seed ${simulatedUid} and credited parent ${parentUid}`);
      }
      res.json({ success: true, simulatedName: randomName, amount: amountChosen });
    } catch (e: any) {
      console.error("[Platform Simulation Server] Error:", e);
      res.status(500).json({ error: e.message || "Simulation execution failed" });
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

      const result = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `User is a Gen Z investor in Nigeria interested in traditional asset classes like Naira Treasury Bills, bonds, and dollar-hedged pathways. Their current intent category is ${selectedIntent}. They ask: "${message}". Give concise, friendly investment advice using a modern, objective, and premium financial brand tone. Do not refer to "QuantVerse" or VIP trading levels since those are disabled. Focus purely on realistic Naira yields, inflation preservation, and commercial paper rates in Nigeria.`,
      });
      
      const aiResponse = result.text || "I'm having a bit of a brain freeze. Try asking that again!";
      res.json({ text: aiResponse });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to call Gemini" });
    }
  });

  // Vite middleware for development (dynamically imported to support production environments like Vercel)
  if (process.env.NODE_ENV !== "production") {
    import("vite").then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((vite) => {
        app.use(vite.middlewares);
      }).catch((err) => {
        console.error("Vite server creation failed:", err);
      });
    }).catch((err) => {
      console.error("Vite dynamic import failed:", err);
    });
  } else {
    // Only serve static files if not running in Vercel Serverless environment
    if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // Only listen directly if not in Vercel Serverless environment
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

let appInstance: any = null;

function getAppInstance() {
  if (!appInstance) {
    try {
      console.log("[DEBUG] Initializing Express app...");
      appInstance = startServer();
      console.log("[DEBUG] Express app initialized successfully.");
    } catch (err) {
      console.error("[IMPORTANT: Server Initialization Crash]", err);
      // Return a dummy handler to prevent module-level crash
      return (req: any, res: any) => {
        res.status(500).json({ error: "Server Initialization Failed", details: String(err) });
      };
    }
  }
  return appInstance;
}

export default function handler(req: any, res: any) {
  try {
    getAppInstance()(req, res);
  } catch (err: any) {
    console.error("[Vercel Handler Crash]", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}


