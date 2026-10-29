import passport from "passport";
import GoogleStrategy from "passport-google-oidc";
import { config } from "../config.mjs";
import { User } from "../db/models.mjs";

passport.serializeUser((user, done) => done(null, String(user.id)));
passport.deserializeUser((id, done) => User.findById(id).then((user) => done(null, user || false)).catch(done));

if (config.googleEnabled) {
  passport.use("google", new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: config.googleCallbackUrl,
    scope: ["profile", "email"],
  }, async (_issuer, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      if (!email || profile._json?.email_verified !== true) return done(null, false);

      let user = await User.findOne({ googleId: profile.id });
      if (!user) user = await User.findOne({ email });
      if (!user) user = new User({ email, name: profile.displayName || email.split("@")[0] });
      if (user.googleId && user.googleId !== profile.id) return done(null, false);

      user.googleId = profile.id;
      user.emailVerified = true;
      if (!user.name) user.name = profile.displayName || email.split("@")[0];
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

export default passport;
