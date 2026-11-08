import fp from 'fastify-plugin'; import jwt from '@fastify/jwt'; import {prisma} from '../lib/prisma.js';

const EXAMPLE_SECRET = 'replace-with-at-least-32-random-characters';

// Why this signing secret cannot be used, or null when it can. Anyone who can
// guess it can forge a session for any account, so production is strict.
export function secretProblem(secret: string | undefined, production: boolean): string | null {
  if (!secret) return 'JWT_SECRET is not set. Add it to backend/.env before starting the API.';
  if (!production) return null;
  if (secret === EXAMPLE_SECRET) return 'JWT_SECRET is still the example value. Replace it with at least 32 random characters.';
  if (secret.length < 32) return 'JWT_SECRET must be at least 32 characters in production.';
  return null;
}

// A session is valid while its account exists and its password has not changed since it was issued.
// The role is read from the account, so a change of role applies to open sessions at once.
// A key made for one job (downloading a backup, uploading documents, paying) is never a session.
export default fp(async app=>{const secret=process.env.JWT_SECRET;const problem=secretProblem(secret,process.env.NODE_ENV==='production');if(problem)throw new Error(problem);await app.register(jwt,{secret:secret!});app.decorate('authenticate',async function(req:any){await req.jwtVerify();if(req.user.purpose)throw app.httpErrors.unauthorized('Your session has ended. Please sign in again.');const account=await prisma.user.findUnique({where:{id:req.user.sub},select:{role:true,tokenVersion:true}});if(!account||(req.user.v??0)!==account.tokenVersion)throw app.httpErrors.unauthorized('Your session has ended. Please sign in again.');req.user.role=account.role});});
declare module 'fastify' { interface FastifyInstance { authenticate:(request:any,reply:any)=>Promise<void> } }
