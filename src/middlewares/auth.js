const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/token");

// Reads "Authorization: Bearer <token>", verifies it, attaches req.user.
function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized("Access token missing"));
  }

  try {
    const payload = verifyAccessToken(token); // throws if invalid/expired
    req.user = payload; // { id, role, email }
    next();
  } catch (err) {
    next(err); // errorHandler maps JsonWebTokenError/TokenExpiredError -> 401
  }
}

// Usage: router.patch("/:id/verify", protect, allowRoles("ADMIN"), controller)
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}

module.exports = { protect, allowRoles };
