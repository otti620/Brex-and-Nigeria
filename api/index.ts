export default async function handler(req: any, res: any) {
  try {
    // Dynamic import to catch any module load/boot crashes on Vercel Serverless Functions
    const serverModule = await import("../server");
    return serverModule.default(req, res);
  } catch (err: any) {
    console.error("[Vercel Serverless Function Crash]", err);
    res.status(500).json({
      error: "Vercel Serverless Function Crash",
      message: err.message || String(err),
      stack: err.stack || null,
      hint: "This usually happens due to missing or misconfigured Vercel environment variables, Firebase initialization failures, or unavailable dependencies. Please verify your Vercel Project Settings."
    });
  }
}

