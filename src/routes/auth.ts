import express from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db";
import { signJwt } from "../utils/jwt";
import { body, validationResult } from "express-validator";
import { SafeUser } from "../types/models";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter";

const router = express.Router();

/**
 * POST /api/auth/register
 * Creates a new user account.
 * Role is always defaulted to "Submitter" — users cannot self-assign "Reviewer".
 */
router.post(
  "/register",
  registerLimiter,
  body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if a user with this email already exists
      const existing = await query("SELECT id FROM users WHERE email=$1", [email]);
      if (existing.rowCount && existing.rowCount > 0) {
        return res.status(409).json({ message: "Email already exists" });
      }

      // Hash password and create the user (role is always "Submitter" by default)
      const hashed = await bcrypt.hash(password, 10);
      const insert = await query(
        `INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4)
         RETURNING id, name, email, role, profile_picture, created_at`,
        [name, email, hashed, "Submitter"]
      );

      const user: SafeUser = insert.rows[0];
      const token = signJwt({ id: user.id, email: user.email, role: user.role });

      res.status(201).json({ user, token });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT token.
 */
router.post(
  "/login",
  loginLimiter,
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").exists().withMessage("Password is required"),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const r = await query(
        "SELECT id, name, email, password, role FROM users WHERE email=$1",
        [email]
      );
      if (r.rowCount === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = r.rows[0];
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = signJwt({ id: user.id, email: user.email, role: user.role });

      // Return user data without the password hash
      const { password: _pw, ...safeUser } = user;
      res.json({ user: safeUser, token });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
