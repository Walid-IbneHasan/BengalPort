import Fastify from "fastify";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import authPlugin from "./plugins/auth.js";
import publicRoutes from "./routes/public.js";
import applicationRoutes from "./routes/applications.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";
import documentRoutes from "./routes/documents.js";
import { createMailer, type Mailer } from "./lib/email.js";
import { createBkashGateway, type Gateway } from "./lib/bkash.js";
import { databaseTokens } from "./lib/bkash-store.js";

declare module "fastify" { interface FastifyInstance { mailer: Mailer; gateway: Gateway } }

export async function buildApp(options:{mailer?:Mailer;gateway?:Gateway}={}) {
  // TRUST_PROXY=true makes rate limits and generated URLs use the real client
  // address and protocol when the API runs behind a reverse proxy.
  const app=Fastify({logger:{level:process.env.LOG_LEVEL||"info"},trustProxy:process.env.TRUST_PROXY==="true"});
  await app.register(cors,{origin:(process.env.FRONTEND_URL||"http://localhost:5173").split(","),maxAge:86400});
  // The API only ever answers with data, images and downloads, so nothing may
  // be loaded by, or frame, one of its responses. The website is on another
  // address and shows the API's images, hence the cross-origin resource policy.
  await app.register(helmet,{
    contentSecurityPolicy:{useDefaults:false,directives:{defaultSrc:["'none'"],frameAncestors:["'none'"]}},
    crossOriginResourcePolicy:{policy:"cross-origin"},
    frameguard:{action:"deny"},
    strictTransportSecurity:{maxAge:31536000,includeSubDomains:false},
    referrerPolicy:{policy:"no-referrer"},
  });
  await app.register(compress);
  await app.register(sensible);
  await app.register(rateLimit,{global:false});
  await app.register(multipart,{limits:{files:1,fileSize:Number.MAX_SAFE_INTEGER,parts:20}});
  app.decorate("mailer",options.mailer??createMailer());
  if(!app.mailer.configured)app.log.warn("SMTP is not configured: sign-up, password reset and notification emails are disabled.");
  app.decorate("gateway",options.gateway??createBkashGateway({tokens:databaseTokens}));
  if(!app.gateway.configured)app.log.warn("bKash is not configured: online payment is switched off.");
  await app.register(authPlugin);
  await app.register(publicRoutes,{prefix:"/api"});
  await app.register(authRoutes,{prefix:"/api/auth"});
  await app.register(adminRoutes,{prefix:"/api/admin"});
  await app.register(paymentRoutes,{prefix:"/api/payments"});
  await app.register(documentRoutes,{prefix:"/api/applications"});
  await app.register(applicationRoutes,{prefix:"/api/applications"});
  app.setErrorHandler((e,req,reply)=>{req.log.error(e);const err=e as any;reply.code(err.statusCode||500).send({error:{code:"SERVER_ERROR",message:err.statusCode?err.message:"Unexpected server error"}})});
  return app;
}
