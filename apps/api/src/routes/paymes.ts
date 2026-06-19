import type { FastifyInstance } from "fastify";
import axios from "axios";

export async function paymesRoutes(app: FastifyInstance) {
  app.post("/payment/paymes-initiate", async (request, reply) => {
    const { amount, description, customerEmail } = request.body as {
      amount: number;
      description: string;
      customerEmail: string;
    };

    const apiKey = process.env.PAYMES_API_KEY!;
    const merchant = process.env.PAYMES_MERCHANT!;
    const url = "https://api.paymes.com/v1/payment/init";

    try {
      const res = await axios.post(url, {
        amount: amount * 100, // qəpiklə göndər
        currency: "AZN",
        description,
        customer_email: customerEmail,
        merchant,
      }, {
        headers: { "X-API-KEY": apiKey }
      });

      if (res.data.status !== "success") {
        return reply.code(400).send({ message: "Ödəniş linki alınmadı." });
      }

      return reply.send({ paymentUrl: res.data.data.payment_link });
    } catch (err) {
      return reply.code(500).send({ message: "Paymes bağlantı xətası." });
    }
  });
}
