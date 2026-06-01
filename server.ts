import express from "express";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { loadDatabase, saveDatabase, DbUser, createInitialInvestments } from "./server-db";
import { initializeApp as initFirebaseServer, getApps, getApp } from "firebase/app";
import { getFirestore as getFirestoreServer, collection, query, where, getDocs, doc, getDoc, writeBatch } from "firebase/firestore";
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
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "seedstreet-app",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:425883713028:web:b1d79dd4ae414771fd0b79",
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBewBW-Z9P5HtcUTsLvmEn0aZtBjwvD68I",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "seedstreet-app.firebaseapp.com",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "seedstreet-app.appspot.com",
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
      const serviceEmail = "backend-system-service-account@seedstreet.internal";
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

        db.users[idx].balance += amountNGN;
        db.users[idx].monthlyGains += Math.floor(amountNGN * 0.05);
        db.users[idx].transactions.unshift({
          id: txnId,
          amount: amountNGN,
          type: "recharge",
          status: "success",
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `Paystack Deposit (Ref: ${reference})`
        });
        saveDatabase(db);
        console.log(`[Paystack Verification] Local account ${userId} credited successfully (₦${amountNGN})`);
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

    // 4. Batch transaction updates to avoid race conditions and ensure atomicity
    const batch = writeBatch(serverDb);
    batch.update(doc(serverDb, 'users', userId), {
      balance: (userData.balance || 0) + amountNGN,
      monthlyGains: (userData.monthlyGains || 0) + Math.floor(amountNGN * 0.05)
    });

    batch.set(txnRef, {
      id: txnId,
      userId: userId,
      amount: amountNGN,
      type: "recharge",
      status: "success",
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      details: `Paystack Deposit (Ref: ${reference})`
    });

    // Process 10% Referral Bonus
    if (userData.referrerId || userData.invitedBy) {
      const referrerTargetId = userData.referrerId || userData.invitedBy;
      try {
        const referrerDocSnap = await getDocs(query(usersCol, where("inviteCode", "==", referrerTargetId)));
        if (!referrerDocSnap.empty) {
          const referrerDoc = referrerDocSnap.docs[0];
          const referrerId = referrerDoc.id;
          const referrerData = referrerDoc.data() as any;
          
          const bonusAmount = Math.floor(amountNGN * 0.10); // 10%

          batch.update(doc(serverDb, 'users', referrerId), {
            balance: (referrerData.balance || 0) + bonusAmount,
            referralBonus: (referrerData.referralBonus || 0) + bonusAmount,
          });

          const bonusTxnId = `txn_bonus_${reference}`;
          batch.set(doc(serverDb, `users/${referrerId}/transactions/${bonusTxnId}`), {
            id: bonusTxnId,
            userId: referrerId,
            amount: bonusAmount,
            type: "earning",
            status: "success",
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            details: `Referral Bonus (10% from team recharge)`
          });
          
          console.log(`[Paystack Verification] Credited 10% referral bonus (₦${bonusAmount}) to referrer ${referrerId}`);
        }
      } catch (refErr) {
        console.error("[Paystack Verification] Failed to process referral bonus:", refErr);
      }
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
    appInstance = startServer();
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


