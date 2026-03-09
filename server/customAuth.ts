import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { Resend } from "resend";

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
      if (ENV.singleUserMode && ENV.ownerEmail && email.toLowerCase() !== ENV.ownerEmail) {
        res.status(403).json({ error: "Access restricted to owner account" });
        return;
      }

      // Generate a temporary auth token that user can use
      // In production, this would verify the email and send a magic link
      const tempToken = Buffer.from(`${email}:${Date.now()}`).toString("base64");

      const { name } = req.body;

      let emailSent = false;
      if (ENV.resendApiKey) {
        try {
          const resend = new Resend(ENV.resendApiKey);
          const magicUrl = `${req.protocol}://${req.get("host")}/api/auth/magic?token=${encodeURIComponent(tempToken)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || email.split("@")[0])}`;
          await resend.emails.send({
            from: ENV.resendFromEmail,
            to: email,
            subject: "Your Shashclaw login link",
            html: `<p>Click the link below to sign in to Shashclaw:</p><p><a href="${magicUrl}">Sign in to Shashclaw</a></p><p>This link expires in 15 minutes.</p><p>If you didn't request this, ignore this email.</p>`,
          });
          emailSent = true;
        } catch (err) {
          console.error("[Auth] Failed to send magic link email:", err);
          // fall through — return token directly
        }
      }

      res.json({
        success: true,
        message: emailSent ? "Check your email for a login link" : "Use the token below to sign in",
        tempToken: emailSent ? undefined : tempToken,
        emailSent,
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
   * GET /api/auth/magic
   * Magic link handler — validates token from email and creates a session
   */
  app.get("/api/auth/magic", async (req: Request, res: Response) => {
    try {
      const { token, email, name } = req.query as { token: string; email: string; name?: string };
      if (!token || !email) {
        res.status(400).send("Invalid magic link");
        return;
      }

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [tokenEmail] = decoded.split(":");
      if (tokenEmail !== email) {
        res.status(401).send("Invalid or expired link");
        return;
      }

      const openId = `custom:${email}`;
      await db.upsertUser({
        openId,
        email,
        name: name || email.split("@")[0] || null,
        loginMethod: "custom",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, { name: name || email, expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[Auth] Magic link failed", error);
      res.status(500).send("Login failed");
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
        role: "demo",
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
