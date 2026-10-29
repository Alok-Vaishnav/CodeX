# Folio Code Explainer

Next.js + TypeScript frontend in `Client/` with a separate Node.js/Express API in `server/`.

Backend modules are grouped by role:

- `server/db/` contains the MongoDB connection and Mongoose models.
- `server/routes/` defines the auth and code-question API routes.
- `server/middleware/` contains auth checks, upload validation, rate limits, origin checks, and error handling.
- `server/services/` contains OTP email, GitHub source loading, and code-answer generation.
- `server/auth/` configures the Google OpenID Connect strategy.
- `server/index.mjs` wires middleware and routes together, connects the database, and starts Express.

## Local setup

1. Install packages with `npm install`.
2. Add your services to the root `.env` file. The file already exists locally; use `.env.example` as the key reference.
3. Start both apps with `npm run dev:all`.
4. Open `http://localhost:3000`.

The API runs at `http://localhost:4000`. It needs a reachable MongoDB database to start. Put your MongoDB Atlas connection string in the root `.env` under `MONGODB_URI`.

## Required environment values

- `MONGODB_URI`: MongoDB connection URL. The starter `.env` defaults to a local MongoDB instance.
- `SESSION_SECRET`: a random secret of at least 32 characters. A unique local value is already generated in `.env`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: SMTP credentials for sending verification and sign-in codes. No OTP is returned by the API.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth credentials for Google sign-in. Set the Google OAuth redirect URI to `http://localhost:4000/api/auth/google/callback`.
- `OPENAI_API_KEY`: server-side key used to explain selected code. `OPENAI_MODEL` can override the default model.

Email/password signup and login both require a six-digit email code. Email/password login uses the password and then sends a fresh one-time code. Google sign-in uses the server-side OpenID Connect flow.

The question endpoint accepts public GitHub repositories and supported source files (up to 12 files, 1 MB each). It sends selected source to the configured model only after the user checks the consent box. Questions, answers, repository names, and source filenames are saved to the signed-in user’s MongoDB account; uploaded source contents are processed in memory and are not saved by this app.

Private GitHub repositories, ZIP extraction, password reset, and production deployment configuration are not included yet.
