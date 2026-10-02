import fp from 'fastify-plugin'; import jwt from '@fastify/jwt';
export default fp(async app=>{const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET is not set. Add it to backend/.env before starting the API.');await app.register(jwt,{secret});app.decorate('authenticate',async function(req:any){await req.jwtVerify()});});
declare module 'fastify' { interface FastifyInstance { authenticate:(request:any,reply:any)=>Promise<void> } }
