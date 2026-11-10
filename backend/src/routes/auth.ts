import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sendAuthCode } from "../lib/email.js";
import { documentSummary } from "../lib/documents.js";

const password = z.string().min(8).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/);
const google = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const MAX_CODES_PER_HOUR = 5;
const MAX_CODE_GUESSES = 5;
// Compared against when an email has no password, so that a sign-in takes as
// long whether or not the account exists. It is the hash of a discarded value.
const NO_ACCOUNT_HASH = "$2a$12$6jjO2cbPQ4hbJ7MV1/2v5eBkSyR.TW29lfCdag1mvttw/borkw6dK";
const publicUser = (u:any) => ({ id:u.id,name:u.name,email:u.email,phone:u.phone,role:u.role,avatarUrl:u.avatarUrl,emailVerified:Boolean(u.emailVerifiedAt),twoFactorEnabled:u.twoFactorEnabled,provider:u.googleId?"google":"password",mustChangePassword:u.mustChangePassword });
const accountBlocked = (reply:any) => reply.code(403).send({error:{code:"ACCOUNT_BLOCKED",message:"This account has been blocked. Please contact us."}});

const routes:FastifyPluginAsync=async app=>{
  // Attempts to sign in, sign up or get a code are limited per address. A
  // signed-in member's own pages are not: many people here share one mobile
  // network address, and those requests already need a valid session.
  const attemptLimit=app.rateLimit({max:20,timeWindow:"1 minute"});
  app.addHook("onRequest",async(req,reply)=>{if(!/\/auth\/me(\/|$)/.test(req.routeOptions.url??""))return attemptLimit.call(app,req,reply)});
  // Without SMTP a code can only reach its owner by being returned in the
  // response, which is safe on a developer machine only: AUTH_DEV_CODES=true
  // opts in, and it is ignored in production.
  const devCodes=()=>process.env.AUTH_DEV_CODES==="true"&&process.env.NODE_ENV!=="production";
  const canSendCodes=()=>app.mailer.configured||devCodes();
  const noEmail=()=>app.httpErrors.serviceUnavailable("Email verification is temporarily unavailable. Please try again later or contact us.");
  const issue=async(user:any,purpose:"VERIFY_EMAIL"|"LOGIN_2FA"|"RESET_PASSWORD")=>{
    if(!canSendCodes())throw noEmail();
    // Keeps anyone from flooding an inbox or using up the site's email allowance.
    if(await prisma.authCode.count({where:{userId:user.id,purpose,createdAt:{gt:new Date(Date.now()-3_600_000)}}})>=MAX_CODES_PER_HOUR)throw app.httpErrors.tooManyRequests("Too many codes have been requested. Please wait a while and try again.");
    await prisma.authCode.updateMany({where:{userId:user.id,purpose,consumedAt:null},data:{consumedAt:new Date()}});
    const code=String(crypto.randomInt(100000,1000000));
    const challenge=await prisma.authCode.create({data:{userId:user.id,purpose,codeHash:await bcrypt.hash(code,10),expiresAt:new Date(Date.now()+600_000)}});
    let delivered=false;
    try{delivered=await sendAuthCode(app.mailer,user.email,code,purpose)}catch(error){app.log.error(error);throw app.httpErrors.serviceUnavailable("We could not send the email just now. Please try again in a few minutes.")}
    return {challengeId:challenge.id,delivered,...(!delivered&&devCodes()?{developmentCode:code}:{})};
  };
  const consume=async(challengeId:string,code:string,purpose:"VERIFY_EMAIL"|"LOGIN_2FA"|"RESET_PASSWORD")=>{
    // The guess is counted before it is checked, in one step, so that guesses
    // sent at the same moment cannot all slip in under the limit.
    const counted=await prisma.authCode.updateMany({where:{id:challengeId,purpose,consumedAt:null,expiresAt:{gt:new Date()},attempts:{lt:MAX_CODE_GUESSES}},data:{attempts:{increment:1}}});
    if(counted.count!==1)return null;
    const challenge=await prisma.authCode.findUnique({where:{id:challengeId},include:{user:true}});
    if(!challenge||challenge.user.blockedAt||!await bcrypt.compare(code,challenge.codeHash))return null;
    const used=await prisma.authCode.updateMany({where:{id:challengeId,consumedAt:null},data:{consumedAt:new Date()}});
    return used.count===1?challenge.user:null;
  };
  // What is answered when there is no account to send a code to, or it has had
  // enough codes: the same as a real answer, so that the form cannot be used to
  // find out who has an account.
  const noCode=()=>({challengeId:`c${Array.from({length:24},()=>crypto.randomInt(36).toString(36)).join("")}`,delivered:app.mailer.configured});
  const quietly=async(user:any,purpose:"VERIFY_EMAIL"|"RESET_PASSWORD")=>{try{return await issue(user,purpose)}catch(error:any){if(error?.statusCode===429)return noCode();throw error}};
  const session=(user:any)=>({token:app.jwt.sign({sub:user.id,role:user.role,v:user.tokenVersion},{expiresIn:"7d"}),user:publicUser(user)});

  app.post("/register",async(req,reply)=>{if(!canSendCodes())throw noEmail();const p=z.object({name:z.string().trim().min(2).max(100),email:z.string().email(),phone:z.string().trim().min(7).max(30).optional(),password}).safeParse(req.body);if(!p.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Use a valid email and a password with uppercase, lowercase and a number."}});if(await prisma.user.findUnique({where:{email:p.data.email.toLowerCase()}}))return reply.conflict("Email already registered");const user=await prisma.user.create({data:{name:p.data.name,email:p.data.email.toLowerCase(),phone:p.data.phone,passwordHash:await bcrypt.hash(p.data.password,12)}});return reply.code(201).send({data:{...(await issue(user,"VERIFY_EMAIL")),email:user.email}})});
  app.post("/verify-email",async(req,reply)=>{const p=z.object({challengeId:z.string(),code:z.string().length(6)}).safeParse(req.body);if(!p.success)return reply.badRequest("Invalid verification code");const user=await consume(p.data.challengeId,p.data.code,"VERIFY_EMAIL");if(!user)return reply.unauthorized("The code is invalid or expired");const verified=await prisma.user.update({where:{id:user.id},data:{emailVerifiedAt:new Date(),lastLoginAt:new Date()}});return {data:session(verified)}});
  app.post("/resend-verification",async(req,reply)=>{if(!canSendCodes())throw noEmail();const p=z.object({email:z.string().email()}).safeParse(req.body);if(!p.success)return reply.badRequest("Invalid email");const user=await prisma.user.findUnique({where:{email:p.data.email.toLowerCase()}});if(!user||user.emailVerifiedAt||user.blockedAt)return {data:{accepted:true,...noCode()}};return {data:{accepted:true,...await quietly(user,"VERIFY_EMAIL")}}});
  app.post("/login",async(req,reply)=>{const p=z.object({email:z.string().email(),password:z.string()}).safeParse(req.body);if(!p.success)return reply.unauthorized("Invalid credentials");const user=await prisma.user.findUnique({where:{email:p.data.email.toLowerCase()}});const matched=await bcrypt.compare(p.data.password,user?.passwordHash??NO_ACCOUNT_HASH);if(!user||!user.passwordHash||!matched)return reply.unauthorized("Invalid credentials");if(user.blockedAt)return accountBlocked(reply);if(!user.emailVerifiedAt){const c=await issue(user,"VERIFY_EMAIL");return reply.code(403).send({error:{code:"EMAIL_NOT_VERIFIED",message:"Verify your email before signing in.",details:{...c,email:user.email}}})}if(user.twoFactorEnabled)return {data:{requiresTwoFactor:true,...await issue(user,"LOGIN_2FA")}};await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});return {data:session(user)}});
  app.post("/verify-2fa",async(req,reply)=>{const p=z.object({challengeId:z.string(),code:z.string().length(6)}).safeParse(req.body);if(!p.success)return reply.badRequest("Invalid code");const user=await consume(p.data.challengeId,p.data.code,"LOGIN_2FA");if(!user)return reply.unauthorized("The code is invalid or expired");await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});return {data:session(user)}});
  app.post("/forgot-password",async(req,reply)=>{if(!canSendCodes())throw noEmail();const p=z.object({email:z.string().email()}).safeParse(req.body);if(!p.success)return reply.badRequest("Invalid email");const user=await prisma.user.findUnique({where:{email:p.data.email.toLowerCase()}});return {data:{accepted:true,...(user?.passwordHash&&!user.blockedAt?await quietly(user,"RESET_PASSWORD"):noCode())}}});
  app.post("/reset-password",async(req,reply)=>{const p=z.object({challengeId:z.string(),code:z.string().length(6),password}).safeParse(req.body);if(!p.success)return reply.badRequest("Invalid reset details");const user=await consume(p.data.challengeId,p.data.code,"RESET_PASSWORD");if(!user)return reply.unauthorized("The code is invalid or expired");await prisma.user.update({where:{id:user.id},data:{passwordHash:await bcrypt.hash(p.data.password,12),mustChangePassword:false,tokenVersion:{increment:1}}});return {data:{success:true}}});
  app.post("/google",async(req,reply)=>{if(!process.env.GOOGLE_CLIENT_ID)return reply.serviceUnavailable("Google sign-in is not configured");const p=z.object({credential:z.string().min(20)}).safeParse(req.body);if(!p.success)return reply.badRequest("Missing Google credential");let payload:any;try{payload=(await google.verifyIdToken({idToken:p.data.credential,audience:process.env.GOOGLE_CLIENT_ID})).getPayload()}catch{return reply.unauthorized("Google account could not be verified")}if(!payload?.sub||!payload.email||!payload.email_verified)return reply.unauthorized("Google account could not be verified");let user=await prisma.user.findFirst({where:{OR:[{googleId:payload.sub},{email:payload.email.toLowerCase()}]}});if(user?.blockedAt)return accountBlocked(reply);user=user?await prisma.user.update({where:{id:user.id},data:{googleId:payload.sub,avatarUrl:payload.picture||user.avatarUrl,emailVerifiedAt:user.emailVerifiedAt||new Date(),lastLoginAt:new Date(),...(user.emailVerifiedAt&&!user.mustChangePassword?{}:{passwordHash:null,mustChangePassword:false,tokenVersion:{increment:1}})}}):await prisma.user.create({data:{name:payload.name||payload.email.split("@")[0],email:payload.email.toLowerCase(),googleId:payload.sub,avatarUrl:payload.picture,emailVerifiedAt:new Date(),lastLoginAt:new Date()}});return {data:session(user)}});
  app.get("/me",{preHandler:app.authenticate,config:{beforePasswordChange:true}},async(req:any)=>{const user=await prisma.user.findUniqueOrThrow({where:{id:req.user.sub}});return {data:publicUser(user)}});
  app.get("/me/activity",{preHandler:app.authenticate},async(req:any)=>{const [enquiries,applications,payments]=await Promise.all([prisma.enquiry.findMany({where:{userId:req.user.sub},orderBy:{createdAt:"desc"}}),prisma.application.findMany({where:{userId:req.user.sub},orderBy:{createdAt:"desc"},include:{documents:{select:documentSummary}}}),prisma.payment.findMany({where:{userId:req.user.sub},omit:{gatewaySignature:true,gatewayPaymentId:true},include:{receipt:true,refunds:{where:{status:"COMPLETED"},select:{amount:true,createdAt:true}}},orderBy:{createdAt:"desc"}})]);return {data:{enquiries,applications,payments}}});
  app.patch("/me",{preHandler:app.authenticate},async(req:any,reply)=>{const p=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().min(7).max(30).nullable().optional()}).safeParse(req.body);if(!p.success)return reply.badRequest("Invalid profile details");const user=await prisma.user.update({where:{id:req.user.sub},data:p.data});return {data:publicUser(user)}});
  app.post("/change-password",{preHandler:app.authenticate,config:{beforePasswordChange:true}},async(req:any,reply)=>{const p=z.object({currentPassword:z.string(),newPassword:password}).safeParse(req.body);if(!p.success)return reply.badRequest("Use a password of 8 or more characters with uppercase, lowercase and a number.");const user=await prisma.user.findUniqueOrThrow({where:{id:req.user.sub}});if(!user.passwordHash||!await bcrypt.compare(p.data.currentPassword,user.passwordHash))return reply.unauthorized("Current password is incorrect");if(user.mustChangePassword&&p.data.newPassword===p.data.currentPassword)return reply.badRequest("Choose a password different from the temporary one.");const updated=await prisma.user.update({where:{id:user.id},data:{passwordHash:await bcrypt.hash(p.data.newPassword,12),mustChangePassword:false,tokenVersion:{increment:1}}});return {data:{success:true,...session(updated)}}});
  app.post("/2fa",{preHandler:app.authenticate},async(req:any,reply)=>{const p=z.object({enabled:z.boolean(),password:z.string()}).safeParse(req.body);if(!p.success)return reply.badRequest("Invalid request");const user=await prisma.user.findUniqueOrThrow({where:{id:req.user.sub}});if(!user.passwordHash)return reply.badRequest("Email 2FA applies to password accounts only");if(!await bcrypt.compare(p.data.password,user.passwordHash))return reply.unauthorized("Password is incorrect");const updated=await prisma.user.update({where:{id:user.id},data:{twoFactorEnabled:p.data.enabled}});return {data:publicUser(updated)}});
};
export default routes;
