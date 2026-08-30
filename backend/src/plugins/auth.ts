import fp from 'fastify-plugin'; import jwt from '@fastify/jwt';
export default fp(async app=>{await app.register(jwt,{secret:process.env.JWT_SECRET||'development-only-secret-change-me'});app.decorate('authenticate',async function(req:any){await req.jwtVerify()});});
declare module 'fastify' { interface FastifyInstance { authenticate:(request:any,reply:any)=>Promise<void> } }
