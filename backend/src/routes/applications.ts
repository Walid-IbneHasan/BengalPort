import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { findApplication } from "../lib/application-lookup.js";

const routes: FastifyPluginAsync = async (app) => {
  // A member adds an application they made before they had an account (or
  // while signed out) to their dashboard. Applications are never linked by
  // email alone: the answers can hold passport and medical details, and an
  // address typed with a mistake would hand them to a stranger.
  app.post(
    "/claim",
    { preHandler: app.authenticate, config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } },
    async (req, reply) => {
      const userId = (req.user as { sub: string }).sub;
      const application = await findApplication(req.body);
      if (!application) return reply.notFound("We could not find an application with that reference and contact detail.");
      if (application.userId && application.userId !== userId)
        return reply.code(409).send({
          error: { code: "ALREADY_LINKED", message: "This application is already linked to another account. Contact us if that is not you." },
        });
      // Payments made on it as a guest move to the account too.
      const [linked] = await prisma.$transaction([
        prisma.application.update({ where: { id: application.id }, data: { userId } }),
        prisma.payment.updateMany({ where: { applicationId: application.id, userId: null }, data: { userId } }),
      ]);
      return { data: { id: linked.id, reference: linked.reference, type: linked.type, status: linked.status } };
    },
  );
};

export default routes;
