const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

// We never store the raw refresh token in the DB — only its hash.
// This way, even if the DB leaks, the tokens themselves can't be reused.
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Converts "7d" / "15m" style strings to a Date in the future.
function expiryToDate(expiryString) {
  const match = /^(\d+)([smhd])$/.exec(expiryString);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback 7d
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return new Date(Date.now() + value * unitMs);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  expiryToDate,
  REFRESH_EXPIRY,
};
