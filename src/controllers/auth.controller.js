const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");
const { REFRESH_COOKIE_NAME } = require("../constants");

// httpOnly + secure(in prod) cookie — JS on the frontend can never read
// this, which is what protects it from XSS-based token theft.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, keep in sync with JWT_REFRESH_EXPIRY
  path: "/api/auth", // only sent to auth routes (refresh/logout)
};

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user },
  });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: { user, accessToken },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const tokenFromCookie = req.cookies[REFRESH_COOKIE_NAME];
  const { user, accessToken, refreshToken } = await authService.refresh(tokenFromCookie);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: "Token refreshed",
    data: { user, accessToken },
  });
});

const logout = asyncHandler(async (req, res) => {
  const tokenFromCookie = req.cookies[REFRESH_COOKIE_NAME];
  await authService.logout(tokenFromCookie);

  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

module.exports = { register, login, refresh, logout };
