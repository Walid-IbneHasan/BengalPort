import type { FastifyPluginAsync } from 'fastify';import {z} from 'zod';import {prisma} from '../lib/prisma.js';import {randomCode} from '../lib/reference.js';
const paymentSchema=z.object({applicationId:z.string().optional(),userId:z.string().optional(),service:z.string().trim().min(1).max(200),amount:z.coerce.number().positive(),totalDue:z.coerce.number().positive(),method:z.string().trim().min(1).max(60),transactionId:z.string().trim().min(1).max(100).optional()}).refine(v=>v.amount<=v.totalDue);
const routes:FastifyPluginAsync=async app=>{
 app.addHook('preHandler',app.authenticate);
 const adminOnly=async(req:any,reply:any)=>{if(req.user.role!=='ADMIN')return reply.forbidden('Admin access required')};
 // Payments are recorded by an administrator after money is received; there is no online payment provider yet.
 app.post('/',{preHandler:adminOnly},async(req,reply)=>{
  const p=paymentSchema.safeParse(req.body);
  if(!p.success)return reply.code(400).send({error:{code:'VALIDATION_ERROR',message:'Check the payment details. The amount paid cannot be more than the total due.'}});
  const {applicationId,transactionId,...fields}=p.data;
  // A payment against an application belongs to the member who applied, so it shows on their dashboard.
  let userId=fields.userId;
  if(applicationId){const application=await prisma.application.findUnique({where:{id:applicationId},select:{userId:true}});if(!application)return reply.notFound('Application not found');userId??=application.userId??undefined}
  const remaining=fields.totalDue-fields.amount;
  try{
   const payment=await prisma.payment.create({data:{...fields,userId,applicationId,status:remaining===0?'PAID':'PARTIALLY_PAID',provider:'manual',transactionId:transactionId??`BP-PAY-${randomCode(10)}`,paidAt:new Date(),receipt:{create:{receiptNumber:`BPR-${new Date().getFullYear()}-${randomCode(7)}`,previousDue:fields.totalDue,remainingDue:remaining}}},include:{receipt:true}});
   return reply.code(201).send({data:payment});
  }catch(error){
   if((error as {code?:string}).code==='P2002')return reply.code(409).send({error:{code:'DUPLICATE_PAYMENT',message:'A payment with this transaction reference is already recorded.'}});
   throw error;
  }
 });
 // Receipts are visible to admins and to the customer the payment belongs to.
 app.get('/receipt/:number',async(req:any,reply)=>{const receipt=await prisma.receipt.findUnique({where:{receiptNumber:req.params.number},include:{payment:{include:{user:{select:{name:true}},application:{select:{reference:true,fullName:true}}}}}});if(!receipt||(req.user.role!=='ADMIN'&&receipt.payment.userId!==req.user.sub))return reply.notFound('Receipt not found');return {data:receipt}});
};export default routes;
