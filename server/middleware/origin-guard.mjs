export function originGuard(clientOrigin) {
  return (req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.get("origin");
      if (origin && origin !== clientOrigin) return res.status(403).json({ error: "Request origin is not allowed." });
    }
    next();
  };
}
