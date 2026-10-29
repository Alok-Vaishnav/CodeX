import "dotenv/config";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import cors from "cors";
import passport from "./auth/passport.mjs";
import { connectDatabase, createSessionStore } from "./db/connection.mjs";
import { errorHandler } from "./middleware/error-handler.mjs";
import { originGuard } from "./middleware/origin-guard.mjs";
import { authLimiter } from "./middleware/rate-limiters.mjs";
import authRoutes from "./routes/auth.routes.mjs";
import questionRoutes from "./routes/question.routes.mjs";
import { config } from "./config.mjs";

const app = express();
const sessionMaxAge = 7 * 24 * 60 * 60 * 1000;

app.disable("x-powered-by");
if (config.production) app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "32kb" }));
app.use(originGuard(config.clientOrigin));
app.use(session({
  name: "folio.sid",
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: createSessionStore(config.mongoUri, sessionMaxAge / 1000),
  cookie: {
    httpOnly: true,
    secure: config.production,
    sameSite: "lax",
    maxAge: sessionMaxAge,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/config", (_req, res) => res.json({ googleEnabled: config.googleEnabled }));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/questions", questionRoutes);
app.use(errorHandler);

await connectDatabase(config.mongoUri);
app.listen(config.port, () => console.log(`Folio API listening on http://localhost:${config.port}`));
