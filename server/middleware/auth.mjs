export function requireAuth(req, res, next) {
  if (req.isAuthenticated?.()) return next();
  return res.status(401).json({ error: "Sign in to continue." });
}

export function publicUser(user) {
  return { id: String(user.id), name: user.name, email: user.email };
}

export function loginUser(req, user) {
  return new Promise((resolve, reject) => {
    req.logIn(user, (error) => error ? reject(error) : resolve());
  });
}
