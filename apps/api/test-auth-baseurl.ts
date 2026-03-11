import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./src/db/index.js";
import * as schema from "./src/db/schema.js";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  basePath: "/auth",
  baseURL: "http://localhost:9999", // EXACT MATCH TO TEST PORT
  secret: "test",
});

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.all("/auth/*", toNodeHandler(auth));
app.use((_req, res) => res.status(404).json({ err: "fallthrough" }));

app.listen(9999, async () => {
  const r = await fetch("http://localhost:9999/auth/get-session");
  const t = await r.text();
  console.log("get-session with matching baseURL:", r.status, t);
  process.exit(0);
});
