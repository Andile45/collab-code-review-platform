import express from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db";
import { signJwt } from "../utils/jwt";
import { body, validationResult } from "express-validator";

const router = express.Router();

router.post(
  "/register",
  body("name").isLength({ min: 2 }),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password, role } = req.body;
      const existing = await query("SELECT id FROM users WHERE email=$1", [email]);
      if (existing.rowCount > 0) return res.status(409).json({ message: "Email already exists" });

      const hashed = await bcrypt.hash(password, 10);
      const insert = await query(
        `INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role`,
        [name, email, hashed, role || "Submitter"]
      );
      const user = insert.rows[0];
      const token = signJwt({ id: user.id, email: user.email, role: user.role });
      res.status(201).json({ user, token });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  body("email").isEmail(),
  body("password").exists(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const r = await query("SELECT id, name, email, password, role FROM users WHERE email=$1", [email]);
      if (r.rowCount === 0) return res.status(401).json({ message: "Invalid credentials" });

      const user = r.rows[0];
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ message: "Invalid credentials" });

      const token = signJwt({ id: user.id, email: user.email, role: user.role });
      delete user.password;
      res.json({ user, token });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
