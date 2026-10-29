const port = Number(process.env.API_PORT || 4000);

export const config = {
  port,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${port}/api/auth/google/callback`,
  googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  production: process.env.NODE_ENV === "production",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
};

if (!config.sessionSecret || config.sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must be set in .env to a random value of at least 32 characters.");
}
