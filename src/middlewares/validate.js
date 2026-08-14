const ApiError = require("../utils/ApiError");

/**
 * Usage: router.post("/register", validate(registerSchema), controller)
 * The Zod schema should shape { body, query, params } to match what it validates.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.slice(1).join(".") || issue.path.join("."),
      issue: issue.message,
    }));
    return next(ApiError.badRequest("Validation failed", errors));
  }

  // Overwrite with parsed/coerced values (e.g. lowercased email).
  if (result.data.body) req.body = result.data.body;
  if (result.data.query) req.query = result.data.query;
  if (result.data.params) req.params = result.data.params;

  next();
};

module.exports = validate;
