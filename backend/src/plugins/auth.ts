import fp from 'fastify-plugin'; import jwt from '@fastify/jwt'; import {prisma} from '../lib/prisma.js';
// A session is valid while its account exists and its password has not changed since it was issued.
// The role is read from the account, so a change of role applies to open sessions at once.
export default fp(async app=>{const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET is not set. Add it to backend/.env before starting the API.');await app.register(jwt,{secret});app.decorate('authenticate',async function(req:any){await req.jwtVerify();const account=await prisma.user.findUnique({where:{id:req.user.sub},select:{role:true,tokenVersion:true}});if(!account||(req.user.v??0)!==account.tokenVersion)throw app.httpErrors.unauthorized('Your session has ended. Please sign in again.');req.user.role=account.role});});
declare module 'fastify' { interface FastifyInstance { authenticate:(request:any,reply:any)=>Promise<void> } }
