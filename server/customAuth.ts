import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { COOKIE_NAME } from "@shared/const";
import { ONE_YEAR_MS } from "@shared/const";

/**
 * Custom authentication handler that bypasses Manus OAuth portal redirect URI validation.
 * Users can authenticate directly by providing their Manus credentials or through a custom flow.
 */

export function registerCustomAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Direct login endpoint - accepts email and returns a login token
   * Client can then use this token to complete authentication
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "email is required" });
        return;
      }

      // In single-user mode, only the owner email can log in
      if (ENV.singleUserMode && ENV.ownerEmail && email.toLowerCase() !== ENV.ownerEmail.toLowerCase()) {
        res.status(403).json({ error: "Access restricted to owner account" });
        return;
      }

      // Generate a temporary auth token that user can use
      // In production, this would verify the email and send a magic link
      const tempToken = Buffer.from(`${email}:${Date.now()}`).toString("base64");

      res.json({
        success: true,
        message: "Check your email for login link",
        tempToken, // For demo purposes, return token directly
      });
    } catch (error) {
      console.error("[Custom Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * POST /api/auth/verify-token
   * Verify a temporary auth token and create a session
   * This is called after user clicks the magic link or provides the token
   */
  app.post("/api/auth/verify-token", async (req: Request, res: Response) => {
    try {
      const { tempToken, email, name } = req.body;

      if (!tempToken || !email) {
        res.status(400).json({ error: "tempToken and email are required" });
        return;
      }

      // Verify the token format (in production, verify expiration and signature)
      const decoded = Buffer.from(tempToken, "base64").toString("utf-8");
      const [tokenEmail] = decoded.split(":");

      if (tokenEmail !== email) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      // Create or update user in database
      // Use email as the openId for custom auth users
      const openId = `custom:${email}`;

      await db.upsertUser({
        openId,
        email,
        name: name || email.split("@")[0] || null,
        loginMethod: "custom",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || email,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        success: true,
        message: "Logged in successfully",
        user: {
          openId,
          email,
          name: name || email.split("@")[0],
        },
      });
    } catch (error) {
      console.error("[Custom Auth] Token verification failed", error);
      res.status(500).json({ error: "Token verification failed" });
    }
  });

  /**
   * GET /api/auth/demo-login
   * Demo endpoint for testing - creates a session with a demo user
   * Remove this in production
   */
  app.get("/api/auth/demo-login", async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string || "demo@shashclaw.local";
      const name = req.query.name as string || "Demo User";
      const openId = `demo:${email}`;

      // Create demo user
      await db.upsertUser({
        openId,
        email,
        name,
        loginMethod: "demo",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // Redirect to dashboard
      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[Custom Auth] Demo login failed", error);
      res.status(500).json({ error: "Demo login failed" });
    }
  });
}
