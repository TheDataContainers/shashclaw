import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ENV } from "./env";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Kill switch middleware - pauses all operations when enabled
const killSwitchCheck = t.middleware(async opts => {
  if (ENV.killSwitchEnabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform is currently paused. Please try again later.",
    });
  }
  return opts.next();
});

// Single-user mode middleware - restricts access to owner only
const singleUserCheck = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (ENV.singleUserMode) {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    // Allow if user ID matches owner ID or if user is the owner via openId
    const isOwner = ENV.ownerId ? ctx.user.id.toString() === ENV.ownerId : ctx.user.openId === ENV.ownerOpenId;
    if (!isOwner) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This instance is in single-user mode. Only the owner can access it.",
      });
    }
  }

  return next();
});

export const protectedProcedure = t.procedure
  .use(killSwitchCheck)
  .use(singleUserCheck)
  .use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
