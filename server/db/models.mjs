import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 80, default: "" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true },
  emailVerified: { type: Boolean, default: false },
  otpHash: { type: String, select: false },
  otpPurpose: { type: String, enum: ["signup", "login", null], default: null },
  otpExpiresAt: { type: Date, select: false },
  otpSentAt: { type: Date, select: false },
  otpAttempts: { type: Number, default: 0, select: false },
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  repository: { type: String, default: "" },
  sourceFiles: [{ type: String }],
  question: { type: String, required: true, maxlength: 2000 },
  answer: { type: String, required: true },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);
