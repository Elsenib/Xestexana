import axios from "axios";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const initiatePaymentSchema = z.object({
  amount: z.number().positive(),
  description: z.string().trim().min(2).max(200),
  customerEmail: z.string().email()
});

export async function paymesRoutes(app: FastifyInstance) {
  app.post(
    "/payment/paymes-initiate",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN", "SUPER_ADMIN", "CALL_CENTER", "CASHIER", "ACCOUNTANT"])]
    },
    async (request, reply) => {
      const body = initiatePaymentSchema.parse(request.body);

      const apiKey = process.env.PAYMES_API_KEY;
      const merchant = process.env.PAYMES_MERCHANT;
      const url = "https://api.paymes.com/v1/payment/init";

      if (!apiKey || !merchant) {
        return reply.code(500).send({ message: "Paymes konfigurasiya tapılmadı." });
      }

      try {
        const res = await axios.post(
          url,
          {
            amount: body.amount * 100,
            currency: "AZN",
            description: body.description,
            customer_email: body.customerEmail,
            merchant
          },
          {
            headers: { "X-API-KEY": apiKey }
          }
        );

        if (res.data.status !== "success" || !res.data?.data?.payment_link) {
          return reply.code(400).send({ message: "Ödəniş linki alınmadı." });
        }

        return reply.send({ paymentUrl: res.data.data.payment_link });
      } catch {
        return reply.code(500).send({ message: "Paymes bağlantı xətası." });
      }
    }
  );
}
