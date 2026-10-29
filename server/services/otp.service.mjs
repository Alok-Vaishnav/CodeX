import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { config } from "../config.mjs";
import { sendVerificationCode } from "./email.service.mjs";

function digest(code) {
  return createHmac("sha256", config.sessionSecret).update(code).digest("hex");
}

export function digestMatches(expected, actual) {
  const expectedBytes = Buffer.from(expected || "", "hex");
  const actualBytes = Buffer.from(actual || "", "hex");
  return expectedBytes.length === actualBytes.length && expectedBytes.length > 0 && timingSafeEqual(expectedBytes, actualBytes);
}

export async function issueOtp(user, purpose) {
  const now = Date.now();
  if (user.otpSentAt && now - user.otpSentAt.getTime() < 60_000) {
    throw Object.assign(new Error("Please wait a minute before requesting another code."), { status: 429 });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  user.otpHash = digest(code);
  user.otpPurpose = purpose;
  user.otpExpiresAt = new Date(now + 10 * 60 * 1000);
  user.otpSentAt = new Date(now);
  user.otpAttempts = 0;
  await user.save();

  try {
    await sendVerificationCode(user.email, code, purpose);
  } catch (error) {
    user.otpHash = null;
    user.otpPurpose = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();
    throw error;
  }
}

export function hashOtp(code) {
  return digest(code);
}
