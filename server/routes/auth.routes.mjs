import { Router } from "express";
import bcrypt from "bcryptjs";
import passport from "../auth/passport.mjs";
import { config } from "../config.mjs";
import { User } from "../db/models.mjs";
import { loginUser, publicUser, requireAuth } from "../middleware/auth.mjs";
import { loginLimiter, otpLimiter, signupLimiter } from "../middleware/rate-limiters.mjs";
import { digestMatches, hashOtp, issueOtp } from "../services/otp.service.mjs";

const router = Router();

router.post("/signup", signupLimiter, async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim().slice(0, 80) : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 10 || password.length > 128) return res.status(400).json({ error: "Use a password between 10 and 128 characters." });

    let user = await User.findOne({ email }).select("+passwordHash +otpSentAt");
    if (user?.emailVerified) return res.status(409).json({ error: "An account already exists for this email. Sign in instead." });
    const passwordHash = await bcrypt.hash(password, 12);
    if (!user) user = new User({ name, email, passwordHash, emailVerified: false });
    else { user.name = name; user.passwordHash = passwordHash; }
    await issueOtp(user, "signup");
    return res.status(202).json({ message: "We sent a verification code to your email.", purpose: "signup", email });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = await User.findOne({ email }).select("+passwordHash +otpSentAt");
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    if (!user.emailVerified) {
      await issueOtp(user, "signup");
      return res.status(202).json({ message: "Verify your email to finish setting up your account.", purpose: "signup", email });
    }
    await issueOtp(user, "login");
    return res.status(202).json({ message: "We sent a sign-in code to your email.", purpose: "login", email });
  } catch (error) {
    return next(error);
  }
});

router.post("/otp/resend", otpLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const purpose = req.body.purpose === "signup" ? "signup" : "login";
    const user = await User.findOne({ email }).select("+otpSentAt");
    if (user && (purpose === "login" ? user.emailVerified : !user.emailVerified)) await issueOtp(user, purpose);
    return res.status(202).json({ message: "If the account is eligible, a new code has been sent." });
  } catch (error) {
    return next(error);
  }
});

router.post("/otp/verify", otpLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
    const purpose = req.body.purpose === "signup" ? "signup" : "login";
    const user = await User.findOne({ email }).select("+otpHash +otpExpiresAt +otpAttempts");
    if (!user || !/^\d{6}$/.test(code) || !user.otpHash || user.otpPurpose !== purpose || !user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "That code is invalid or expired. Request a new one." });
    }
    if (user.otpAttempts >= 5) return res.status(429).json({ error: "Too many attempts. Request a new code." });
    if (!digestMatches(user.otpHash, hashOtp(code))) {
      user.otpAttempts += 1;
      if (user.otpAttempts >= 5) { user.otpHash = null; user.otpPurpose = null; user.otpExpiresAt = null; }
      await user.save();
      return res.status(400).json({ error: "That code is incorrect." });
    }
    if (purpose === "signup") user.emailVerified = true;
    user.otpHash = null;
    user.otpPurpose = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();
    await loginUser(req, user);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", (req, res) => {
  if (!req.isAuthenticated?.()) return res.json({ user: null });
  return res.json({ user: publicUser(req.user) });
});

router.post("/logout", requireAuth, (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("folio.sid", { httpOnly: true, secure: config.production, sameSite: "lax" });
      return res.json({ ok: true });
    });
  });
});

router.get("/google", (req, res, next) => {
  if (!config.googleEnabled) return res.status(503).send("Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.");
  return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  if (!config.googleEnabled) return res.redirect(`${config.clientOrigin}/?auth=google-not-configured`);
  return passport.authenticate("google", { failureRedirect: `${config.clientOrigin}/?auth=google-failed` })(req, res, () => res.redirect(`${config.clientOrigin}/?auth=google-success`));
});

export default router;
