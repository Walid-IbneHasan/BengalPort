import Fastify from "fastify";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import authPlugin from "./plugins/auth.js";
import publicRoutes from "./routes/public.js";
import { createSpamCheck, type SpamCheck } from "./lib/spam-check.js";
import { hasNul, publicError, requestForLog } from "./lib/errors.js";
import applicationRoutes from "./routes/applications.js";
import reviewRoutes from "./routes/reviews.js";
import backupRoutes from "./routes/backup.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";
import documentRoutes from "./routes/documents.js";
import { createMailer, type Mailer } from "./lib/email.js";
import { createBkashGateway } from "./lib/bkash.js";
import { databaseTokens } from "./lib/bkash-store.js";
import { createNagadGateway } from "./lib/nagad.js";
import { providerKeys, providers, type Gateway, type Provider } from "./lib/gateway.js";

// `gateways` holds every online payment provider; `gateway` is bKash, kept
// for the parts of the API that only know one provider.
declare module "fastify" { interface FastifyInstance { mailer: Mailer; gateway: Gateway; gateways: Record<Provider, Gateway>; spamCheck: SpamCheck } interface FastifyContextConfig { publicCache?: boolean } }

export async function buildApp(options:{mailer?:Mailer;gateway?:Gateway;gateways?:Partial<Record<Provider, Gateway>>;spamCheck?:SpamCheck}={}) {
  // TRUST_PROXY=true makes rate limits and generated URLs use the real client
  // address and protocol when the API runs behind a reverse proxy.
  // Only a proxy on this machine may say who the visitor is. Taking the header
  // from anyone else would let a visitor invent a new address for every request
  // and walk straight past the rate limits. (Under cPanel's Passenger the real
  // address reaches the app directly.)
  const app=Fastify({logger:{level:process.env.LOG_LEVEL||"info",serializers:{req:requestForLog as any}},trustProxy:process.env.TRUST_PROXY==="true"?"127.0.0.1,::1":false});
  // Registered before the routes: a route keeps the error handler that was in
  // place when its plugin was registered.
  app.setErrorHandler((e,req,reply)=>{const failure=publicError(e);if(failure.status>=500)req.log.error(e);return reply.code(failure.status).send({error:{code:failure.code,message:failure.message}})});
  app.setNotFoundHandler((_req,reply)=>reply.code(404).send({error:{code:"NOT_FOUND",message:"Not found"}}));
  const refuseNul=(reply:any)=>reply.code(400).send({error:{code:"BAD_REQUEST",message:"This request contains a character that is not allowed"}});
  app.addHook("onRequest",async(req,reply)=>{if(/%00/i.test(req.url))return refuseNul(reply)});
  app.addHook("preValidation",async(req,reply)=>{if(hasNul(req.body))return refuseNul(reply)});
  // Nothing is stored by browsers unless a route says it may be. Public pages'
  // content can be a minute old; everything personal is always fetched afresh.
  app.addHook("onSend",async(req,reply)=>{if(reply.getHeader("cache-control")||reply.statusCode===304)return;reply.header("cache-control",reply.statusCode===200&&req.routeOptions.config?.publicCache?"public, max-age=60, stale-while-revalidate=600":"no-store")});
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
  const gateways:Record<Provider,Gateway>={bkash:options.gateways?.bkash??options.gateway??createBkashGateway({tokens:databaseTokens}),nagad:options.gateways?.nagad??createNagadGateway()};
  app.decorate("gateways",gateways);
  app.decorate("gateway",gateways.bkash);
  for(const provider of providerKeys)if(!gateways[provider].configured)app.log.warn(`${providers[provider].name} is not configured: paying with ${providers[provider].name} is switched off.`);
  app.decorate("spamCheck",options.spamCheck??createSpamCheck({warn:(message)=>app.log.warn(message)}));
  await app.register(authPlugin);
  await app.register(publicRoutes,{prefix:"/api"});
  await app.register(authRoutes,{prefix:"/api/auth"});
  await app.register(adminRoutes,{prefix:"/api/admin"});
  await app.register(paymentRoutes,{prefix:"/api/payments"});
  await app.register(documentRoutes,{prefix:"/api/applications"});
  await app.register(applicationRoutes,{prefix:"/api/applications"});
  await app.register(reviewRoutes,{prefix:"/api/reviews"});
  await app.register(backupRoutes,{prefix:"/api/backup"});
  return app;
}
