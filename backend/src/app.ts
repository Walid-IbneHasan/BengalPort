import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import authPlugin from "./plugins/auth.js";
import publicRoutes from "./routes/public.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";

export async function buildApp() {
  const app=Fastify({logger:true,bodyLimit:Number.MAX_SAFE_INTEGER});
  await app.register(cors,{origin:(process.env.FRONTEND_URL||"http://localhost:5173").split(",")});
  await app.register(sensible);
  await app.register(rateLimit,{global:false});
  await app.register(multipart,{limits:{files:1,fileSize:Number.MAX_SAFE_INTEGER,parts:20}});
  await app.register(authPlugin);
  await app.register(publicRoutes,{prefix:"/api"});
  await app.register(authRoutes,{prefix:"/api/auth"});
  await app.register(adminRoutes,{prefix:"/api/admin"});
  await app.register(paymentRoutes,{prefix:"/api/payments"});
  app.setErrorHandler((e,req,reply)=>{req.log.error(e);const err=e as any;reply.code(err.statusCode||500).send({error:{code:"SERVER_ERROR",message:err.statusCode?err.message:"Unexpected server error"}})});
  return app;
}
