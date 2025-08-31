import { storage } from "../storage";
import { type InsertPayment, type InsertSession } from "@shared/schema";

export class PaymentService {
  static async processDevicePayment(
    userId: string,
    deviceId: string,
    command: string,
    amount: string,
    txHash?: string
  ) {
    // Create payment record
    const payment = await storage.createPayment({
      userId,
      deviceId,
      amount,
      currency: "USDC",
      command,
      status: "pending",
      txHash: txHash || null
    });

    // If txHash is provided, mark as completed and create session
    if (txHash) {
      await storage.updatePaymentStatus(payment.id, "completed", txHash);
      
      // Create 15-minute session
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      
      const session = await storage.createSession({
        userId,
        deviceId,
        paymentId: payment.id,
        expiresAt,
        isActive: true
      });

      return { payment, session };
    }

    return { payment, session: null };
  }

  static async getUserPaymentHistory(userId: string) {
    return await storage.getPaymentsByUser(userId);
  }

  static async checkDeviceAccess(userId: string, deviceId: string): Promise<boolean> {
    const session = await storage.getActiveSession(userId, deviceId);
    return !!session;
  }
}
