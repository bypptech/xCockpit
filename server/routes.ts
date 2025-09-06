import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { X402Service } from "./services/x402";
import { PaymentService } from "./services/payment";
import { WebSocketService } from "./services/websocket";
import { gachaWebSocketClient } from "./services/gacha-websocket-client";
import { insertUserSchema, insertPaymentSchema } from "@shared/schema";
import frameRoutes from "./routes/frame";

let wsService: WebSocketService;

// Helper function to get device fee
async function getDeviceFee(deviceId: string): Promise<string> {
  try {
    const device = await storage.getDevice(deviceId);
    if (!device) {
      throw new Error("Device not found");
    }
    // Default to 0.01 if no price is set or customFee is false
    const fee = device.metadata?.customFee ? parseFloat(device.metadata.price) : 0.01;
    return fee.toFixed(3); // Return as string with 3 decimal places
  } catch (error) {
    console.error(`Failed to get fee for device ${deviceId}:`, error);
    return "0.01"; // Fallback to default fee
  }
}

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

  // Execute device command (x402 standard flow)
  app.post("/api/devices/:id/commands/:command", async (req, res) => {
    try {
      const { id: deviceId, command } = req.params;
      const paymentHeader = req.headers['x-payment'] as string;
      const requirementsHeader = req.headers['x-payment-requirements'] as string;
      const signatureHeader = req.headers['x-payment-signature'] as string;

      // Get device info
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // If no payment header, return 402 Payment Required (initial request)
      if (!paymentHeader) {
        console.log(`💰 402 Payment Required for ${deviceId} - ${command}`);
        // Create 402 Payment Required response
        const response = await X402Service.create402Response(deviceId, command, 5);
        return res.status(402)
          .set(response.headers)
          .json(response.body);
      }

      // Parse and verify payment (re-request with X-Payment header)
      const payment = X402Service.parsePaymentHeader(paymentHeader);
      if (!payment) {
        return res.status(400).json({
          error: {
            code: "INVALID_PAYMENT_HEADER",
            message: "Invalid X-Payment header format"
          }
        });
      }

      // Enhanced verification with signature validation
      const verificationResult = await X402Service.verifyPayment(
        payment,
        requirementsHeader,
        signatureHeader
      );

      if (!verificationResult.verified) {
        return res.status(400).json({
          error: {
            code: verificationResult.error?.includes('confirmations')
              ? 'INSUFFICIENT_CONFIRMATIONS'
              : verificationResult.error?.includes('signature')
              ? 'INVALID_SIGNATURE'
              : verificationResult.error?.includes('order')
              ? 'ORDER_VALIDATION_FAILED'
              : 'PAYMENT_VERIFICATION_FAILED',
            message: verificationResult.error || 'Payment verification failed',
            details: {
              confirmations: verificationResult.confirmations,
              blockchainResult: verificationResult.blockchainResult
            }
          }
        });
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
        // This is expected when device is connected to Gacha WebSocket instead of local
        console.log(`Device ${deviceId} not on local WebSocket, using Gacha WebSocket`);
      }

      // Send payment notification to ESP32 via Gacha WebSocket
      if (gachaWebSocketClient.isConnected()) {
        const paymentAmount = payment.amount || (await getDeviceFee(deviceId));
        await gachaWebSocketClient.sendPaymentCommand(
          deviceId,
          walletAddress,
          paymentAmount,
          command
        );
        console.log(`💰 Payment command sent to ${deviceId} via Gacha WebSocket`);
      }

      // Generate payment state header (x402 standard)
      const paymentStateHeader = X402Service.generatePaymentStateHeader(
        payment.metadata?.txHash || '',
        verificationResult.confirmations || 0,
        process.env.NETWORK
      );

      // Set x402 standard response headers
      res.set('X-Payment-State', paymentStateHeader);

      // Success response (device command executed)
      res.status(200).json({
        result: command,
        deviceId,
        paymentId: result.payment.id,
        txHash: payment.metadata?.txHash,
        confirmations: verificationResult.confirmations,
        amount: payment.amount,
        currency: payment.currency,
        timestamp: new Date().toISOString(),
        expiresIn: 30 // Device control session expires in 30 seconds
      });

    } catch (error) {
      console.error("Device command error:", error);
      res.status(500).json({
        error: {
          code: "DEVICE_COMMAND_FAILED",
          message: "Failed to execute device command",
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
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

  // Update device custom fee
  app.post("/api/devices/:deviceId/fee", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { fee, walletAddress } = req.body;

      // Block fee changes for ESP32_002 (fixed fee device)
      if (deviceId === 'ESP32_002') {
        return res.status(403).json({
          message: "Fee cannot be changed for this device - fixed at 0.123 USDC"
        });
      }

      // Validate fee range
      if (typeof fee !== 'number' || fee <= 0 || fee > 999) {
        return res.status(400).json({
          message: "Fee must be greater than 0 and less than or equal to 999 USDC"
        });
      }

      // Get device
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // For now, allow any wallet to set custom fees
      // In production, you might want to restrict this to device owners

      // Update device metadata with custom fee
      const updatedDevice = {
        ...device,
        metadata: {
          ...device.metadata,
          price: fee.toFixed(3),
          customFee: true,
          updatedBy: walletAddress,
          updatedAt: new Date().toISOString()
        }
      };

      await storage.updateDevice(deviceId, updatedDevice);

      res.json({
        success: true,
        deviceId,
        newFee: fee,
        message: `Fee updated to ${fee} USDC for ${device.name}`
      });

    } catch (error) {
      console.error('Fee update error:', error);
      res.status(500).json({ message: "Failed to update device fee" });
    }
  });

  // Get device custom fee
  app.get("/api/devices/:deviceId/fee", async (req, res) => {
    try {
      const { deviceId } = req.params;

      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      const currentFee = parseFloat(device.metadata?.price || "0.01");

      res.json({
        deviceId,
        deviceName: device.name,
        currentFee,
        isCustom: device.metadata?.customFee || false,
        updatedBy: device.metadata?.updatedBy,
        updatedAt: device.metadata?.updatedAt,
        minFee: 0.001,
        maxFee: 999
      });

    } catch (error) {
      console.error('Fee fetch error:', error);
      res.status(500).json({ message: "Failed to fetch device fee" });
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

  // Enhanced署名システム管理API
  app.get("/api/admin/signature/info", (req, res) => {
    try {
      const info = X402Service.getSignatureSystemInfo();
      res.json(info);
    } catch (error) {
      res.status(500).json({
        error: {
          code: "SIGNATURE_INFO_FAILED",
          message: "Failed to get signature system info",
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  });

  // システム健全性チェック
  app.get("/api/admin/health", (req, res) => {
    try {
      const health = X402Service.healthCheck();
      const isHealthy = health.signature.valid && health.blockchain.connected;

      res.status(isHealthy ? 200 : 503).json(health);
    } catch (error) {
      res.status(500).json({
        error: {
          code: "HEALTH_CHECK_FAILED",
          message: "Health check failed",
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  });

  // 鍵ローテーション（管理者機能 - 要認証）
  app.post("/api/admin/signature/rotate", (req, res) => {
    try {
      // 簡易的な管理者認証（実際の本番では JWT など適切な認証を使用）
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.X402_ADMIN_KEY) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid admin key"
          }
        });
      }

      const { keyId, secret, algorithm } = req.body;
      if (!keyId) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "keyId is required"
          }
        });
      }

      const result = X402Service.rotateSigningKey(keyId, secret, algorithm);

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: "KEY_ROTATION_FAILED",
            message: result.error
          }
        });
      }

      res.json({
        message: "Key rotated successfully",
        keyId,
        algorithm: algorithm || 'auto',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "KEY_ROTATION_ERROR",
          message: "Failed to rotate key",
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  });

  // JWKS (JSON Web Key Set) エンドポイント
  app.get("/.well-known/jwks.json", (_req, res) => {
    try {
      const jwks = X402Service.getJWKS();

      // キャッシュヘッダーを設定
      res.set({
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1時間キャッシュ
        'Content-Type': 'application/json'
      });

      res.json(jwks);
    } catch (error) {
      res.status(500).json({
        error: {
          code: "JWKS_ERROR",
          message: "Failed to generate JWKS",
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  });

  // JWKSのミラーエンドポイント (開発用)
  app.get("/api/admin/jwks", (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.X402_ADMIN_KEY) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid admin key"
          }
        });
      }

      const jwks = X402Service.getJWKS();
      res.json(jwks);
    } catch (error) {
      res.status(500).json({
        error: {
          code: "JWKS_ERROR",
          message: "Failed to generate JWKS",
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  });

  // Farcaster Frame API for Mini App integration
  app.post("/api/frame", async (req, res) => {
    try {
      // Handle Farcaster Frame interactions
      const { untrustedData, trustedData } = req.body;

      console.log('Frame interaction received:', { untrustedData, trustedData });

      // Return frame response to launch the Mini App
      res.json({
        type: "frame",
        version: "vNext",
        image: "/frame-image.png",
        buttons: [
          {
            text: "🚀 Launch xCockpit",
            action: "link",
            target: process.env.NODE_ENV === 'production'
              ? "https://xcockpit.replit.app"
              : "http://localhost:5000"
          }
        ],
        postUrl: "/api/frame"
      });
    } catch (error) {
      console.error('Frame API error:', error);
      res.status(500).json({ error: "Frame processing failed" });
    }
  });

  // Mini App manifest endpoint
  app.get("/.well-known/farcaster.json", async (req, res) => {
    const manifest = {
      name: "xCockpit",
      description: "Web3 IoT Control Dashboard",
      icon: "🚀",
      version: "1.0.0",
      url: process.env.NODE_ENV === 'production'
        ? "https://xcockpit.replit.app"
        : "http://localhost:5000",
      frame: {
        version: "vNext",
        image: "/frame-image.png",
        buttons: [
          {
            text: "🚀 Launch xCockpit",
            action: "link"
          }
        ]
      }
    };

    res.json(manifest);
  });

  return httpServer;
}