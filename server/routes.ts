import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { X402Service } from "./services/x402";
import { PaymentService } from "./services/payment";
import { WebSocketService } from "./services/websocket";
import { insertUserSchema, insertPaymentSchema } from "@shared/schema";

let wsService: WebSocketService;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket service
  wsService = new WebSocketService(httpServer);

  // Get all devices
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getAllDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  // Get device by ID
  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  // Execute device command (x402 flow)
  app.post("/api/devices/:id/commands/:command", async (req, res) => {
    try {
      const { id: deviceId, command } = req.params;
      const paymentHeader = req.headers['x-payment'] as string;

      // Get device info
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // If no payment header, return 402 Payment Required
      if (!paymentHeader) {
        const deviceMetadata = device.metadata as { price?: string } | null;
        const paymentRequest = {
          amount: deviceMetadata?.price || "10.00",
          currency: "USDC",
          network: "eip155:84532",
          recipient: process.env.PAYMENT_RECIPIENT || "0x742d35Cc6634C0532925a3b8D2d3A1b8f0e4C0d5",
          metadata: {
            deviceId,
            command,
            description: `${command} ${device.name}`
          }
        };

        const response = X402Service.create402Response(paymentRequest);
        return res.status(402)
          .set(response.headers)
          .json(response.body);
      }

      // Parse and verify payment
      const payment = X402Service.parsePaymentHeader(paymentHeader);
      if (!payment) {
        return res.status(400).json({ message: "Invalid payment header" });
      }

      const isValid = await X402Service.verifyPayment(payment);
      if (!isValid) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      // Get or create user
      const walletAddress = req.body.walletAddress || payment.metadata?.walletAddress;
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address required" });
      }

      let user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        user = await storage.createUser({ walletAddress });
      }

      // Process payment and create session
      const result = await PaymentService.processDevicePayment(
        user.id,
        deviceId,
        command,
        payment.amount,
        payment.metadata?.txHash
      );

      // Send command to device via WebSocket
      const commandSent = await wsService.sendCommandToDevice(deviceId, command, {
        userId: user.id,
        paymentId: result.payment.id
      });

      if (!commandSent) {
        console.warn(`Failed to send command to device ${deviceId}`);
      }

      // Create payment response header
      const paymentResponse = X402Service.createPaymentResponse(payment, result.payment.id);
      
      res.set('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify(paymentResponse)).toString('base64'));
      res.json({
        success: true,
        message: `${command} command executed successfully`,
        payment: result.payment,
        session: result.session
      });

    } catch (error) {
      console.error("Device command error:", error);
      res.status(500).json({ message: "Failed to execute device command" });
    }
  });

  // Get user info and active sessions
  app.get("/api/users/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWalletAddress(req.params.walletAddress);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const activeSessions = await storage.getActiveSessions(user.id);
      const paymentHistory = await storage.getPaymentsByUser(user.id);

      res.json({
        user,
        activeSessions,
        paymentHistory: paymentHistory.slice(0, 10) // Latest 10 transactions
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Get payment history
  app.get("/api/payments/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWalletAddress(req.params.walletAddress);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const payments = await storage.getPaymentsByUser(user.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // WebSocket status endpoint
  app.get("/api/websocket/status", (req, res) => {
    const connectedDevices = wsService.getConnectedDevices();
    res.json({
      connected: true,
      connectedDevices: connectedDevices.length,
      devices: connectedDevices
    });
  });

  return httpServer;
}
