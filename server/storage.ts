import { type User, type InsertUser, type Device, type InsertDevice, type Payment, type InsertPayment, type Session, type InsertSession } from "@shared/schema";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Devices
  getDevice(id: string): Promise<Device | undefined>;
  getAllDevices(): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDeviceStatus(id: string, status: string, isOnline: boolean): Promise<void>;

  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByUser(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: string, status: string, txHash?: string): Promise<void>;

  // Sessions
  getActiveSession(userId: string, deviceId: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  deactivateSession(id: string): Promise<void>;
  getActiveSessions(userId: string): Promise<Session[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private devices: Map<string, Device>;
  private payments: Map<string, Payment>;
  private sessions: Map<string, Session>;
  private readonly persistenceFile = join(process.cwd(), 'device-fees.json');

  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.payments = new Map();
    this.sessions = new Map();

    // Initialize with sample devices
    this.initializeDevices();
    // Load persisted fee data
    this.loadPersistedFees();
  }

  private initializeDevices() {
    // Only initialize devices if they don't exist yet (preserve existing data)
    if (!this.devices.has("ESP32_001")) {
      const sampleDevices: Device[] = [
        {
          id: "ESP32_001",
          name: "Smart Gacha #001",
          type: "gacha",
          location: "MIDORI.so SHIBUYA / CryptoBase",
          status: "ready",
          isOnline: true,
          lastActivity: new Date(),
          metadata: { price: "0.01" }
        },
        {
          id: "ESP32_002", 
          name: "Smart Gacha #002",
          type: "gacha",
          location: "MIDORI.so SHIBUYA / CryptoBase",
          status: "ready",
          isOnline: true,
          lastActivity: new Date(),
          metadata: { price: "0.005" }
        }
      ];

      sampleDevices.forEach(device => this.devices.set(device.id, device));
    }
  }

  private loadPersistedFees() {
    try {
      if (existsSync(this.persistenceFile)) {
        const data = JSON.parse(readFileSync(this.persistenceFile, 'utf-8'));
        console.log('📁 Loading persisted fees:', data);
        
        for (const [deviceId, feeData] of Object.entries(data)) {
          const device = this.devices.get(deviceId);
          if (device && feeData && typeof feeData === 'object') {
            device.metadata = { ...device.metadata, ...(feeData as any) };
            this.devices.set(deviceId, device);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted fees:', error);
    }
  }

  private persistFees() {
    try {
      const feeData: Record<string, any> = {};
      for (const [deviceId, device] of this.devices.entries()) {
        if (device.metadata?.customFee) {
          feeData[deviceId] = device.metadata;
        }
      }
      writeFileSync(this.persistenceFile, JSON.stringify(feeData, null, 2));
      console.log('💾 Persisted fees:', feeData);
    } catch (error) {
      console.warn('Failed to persist fees:', error);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(address: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.walletAddress === address);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Devices
  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const device: Device = { 
      ...insertDevice,
      location: insertDevice.location || null,
      status: insertDevice.status || 'offline',
      isOnline: insertDevice.isOnline || false,
      metadata: insertDevice.metadata as { price?: string; [key: string]: any } | null,
      lastActivity: new Date()
    };
    this.devices.set(device.id, device);
    return device;
  }

  async updateDeviceStatus(id: string, status: string, isOnline: boolean): Promise<void> {
    const device = this.devices.get(id);
    if (device) {
      device.status = status;
      device.isOnline = isOnline;
      device.lastActivity = new Date();
      this.devices.set(id, device);
    }
  }

  async updateDevice(id: string, updatedDevice: Device): Promise<Device> {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Device ${id} not found`);
    }
    
    const updated = {
      ...device,
      ...updatedDevice,
      lastActivity: new Date()
    };
    
    this.devices.set(id, updated);
    
    // Persist fees if this is a fee update
    if (updated.metadata?.customFee) {
      this.persistFees();
    }
    
    return updated;
  }

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = {
      ...insertPayment,
      id,
      status: insertPayment.status || 'pending',
      currency: insertPayment.currency || 'USDC',
      txHash: insertPayment.txHash || null,
      createdAt: new Date(),
      completedAt: null
    };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePaymentStatus(id: string, status: string, txHash?: string): Promise<void> {
    const payment = this.payments.get(id);
    if (payment) {
      payment.status = status;
      if (txHash) payment.txHash = txHash;
      if (status === "completed") payment.completedAt = new Date();
      this.payments.set(id, payment);
    }
  }

  // Sessions
  async getActiveSession(userId: string, deviceId: string): Promise<Session | undefined> {
    return Array.from(this.sessions.values()).find(
      session => session.userId === userId && 
                 session.deviceId === deviceId && 
                 session.isActive && 
                 session.expiresAt > new Date()
    );
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      ...insertSession,
      id,
      isActive: insertSession.isActive !== undefined ? insertSession.isActive : true,
      createdAt: new Date()
    };
    this.sessions.set(id, session);
    return session;
  }

  async deactivateSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.isActive = false;
      this.sessions.set(id, session);
    }
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId && 
                 session.isActive && 
                 session.expiresAt > new Date()
    );
  }
}

export const storage = new MemStorage();
