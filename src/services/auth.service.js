const bcrypt = require("bcrypt");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  expiryToDate,
  REFRESH_EXPIRY,
} = require("../utils/token");

const SALT_ROUNDS = 10;

function toPublicUser(user) {
  const { password, ...publicUser } = user;
  return publicUser;
}

async function register({ name, email, password, phone, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, phone, role },
  });

  // Doctors get an (unverified) profile shell immediately so they can
  // fill it in later; admin must verify before it's publicly visible.
  if (role === "DOCTOR") {
    await prisma.doctorProfile.create({
      data: { userId: user.id, specialty: "Not set" },
    });
  }

  return toPublicUser(user);
}

async function issueTokenPair(user) {
  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: expiryToDate(REFRESH_EXPIRY),
    },
  });

  return { accessToken, refreshToken };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isDeleted) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

async function refresh(refreshTokenFromCookie) {
  if (!refreshTokenFromCookie) {
    throw ApiError.unauthorized("Refresh token missing");
  }

  // Throws JsonWebTokenError/TokenExpiredError -> mapped to 401 by errorHandler
  const payload = verifyRefreshToken(refreshTokenFromCookie);

  const tokenHash = hashToken(refreshTokenFromCookie);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.id, tokenHash, revoked: false },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.isDeleted) {
    throw ApiError.unauthorized("User no longer exists");
  }

  // Rotate: revoke the old refresh token, issue a brand new pair.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

async function logout(refreshTokenFromCookie) {
  if (!refreshTokenFromCookie) return;
  const tokenHash = hashToken(refreshTokenFromCookie);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
}

module.exports = { register, login, refresh, logout };
