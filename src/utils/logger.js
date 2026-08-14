const fs = require("fs");
const path = require("path");

// Lightweight logger. Swapped for full winston config only if the
// `winston` package is installed — keeps Day-1 setup dependency-light
// while still writing structured logs to src/logs/error.log.
let winstonLogger = null;
try {
  const winston = require("winston");
  const logsDir = path.join(__dirname, "..", "logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  winstonLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(
        ({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`
      )
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: path.join(logsDir, "error.log"), level: "error" }),
    ],
  });
} catch {
  // winston not installed yet — fall back to console so nothing breaks.
}

const logger = {
  info: (msg) => (winstonLogger ? winstonLogger.info(msg) : console.log(`[INFO] ${msg}`)),
  error: (msg) => (winstonLogger ? winstonLogger.error(msg) : console.error(`[ERROR] ${msg}`)),
  warn: (msg) => (winstonLogger ? winstonLogger.warn(msg) : console.warn(`[WARN] ${msg}`)),
};

module.exports = logger;
