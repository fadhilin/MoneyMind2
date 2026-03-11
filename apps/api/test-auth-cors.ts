import { auth } from "./src/lib/auth.js";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

const app = express();
const corsOptions = {
  origin: ["https://moneymind-alpha.vercel.app", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Mock environment for `process.env.GOOGLE_CLIENT_ID` inside auth.js
// Wait, auth.js is imported, so it's already evaluated using the current process.env!
// So if GOOGLE_CLIENT_ID is not set here, socialProviders will be {}.

app.all("/auth/*", toNodeHandler(auth));

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found router drop-through" });
});

app.listen(9999, async () => {
  console.log("Test server listening on 9999");
  
  try {
    const resOPTIONS = await fetch("http://localhost:9999/auth/sign-in/social", {
      method: "OPTIONS",
      headers: {
        "Origin": "https://moneymind-alpha.vercel.app",
        "Access-Control-Request-Method": "POST"
      }
    });
    console.log("OPTIONS status:", resOPTIONS.status);
    console.log("OPTIONS headers:", Object.fromEntries(resOPTIONS.headers.entries()));
    
    const resGET = await fetch("http://localhost:9999/auth/get-session", {
      method: "GET",
      headers: {
        "Origin": "https://moneymind-alpha.vercel.app"
      }
    });
    console.log("GET get-session status:", resGET.status);
    console.log("GET get-session headers:", Object.fromEntries(resGET.headers.entries()));

    const resSOCIAL = await fetch("http://localhost:9999/auth/sign-in/social", {
      method: "POST",
      headers: {
        "Origin": "https://moneymind-alpha.vercel.app"
      }
    });
    console.log("POST social status:", resSOCIAL.status);
    console.log("POST social headers:", Object.fromEntries(resSOCIAL.headers.entries()));
  } catch(e) {
    console.error(e);
  }
  
  process.exit(0);
});
