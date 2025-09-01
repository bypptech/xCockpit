import * as crypto from 'crypto';

export interface Order {
  orderId: string;
  nonce: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface OrderValidation {
  valid: boolean;
  error?: string;
  order?: Order;
}

export class OrderManager {
  private orders: Map<string, Order>;
  private txHashToOrderId: Map<string, string>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.orders = new Map();
    this.txHashToOrderId = new Map();
    this.startCleanupInterval();
  }
  
  generateOrder(
    ttlMinutes: number = 5,
    metadata?: Record<string, any>
  ): { orderId: string; nonce: string; nonceExp: string } {
    const orderId = `ord_${crypto.randomBytes(16).toString('hex')}`;
    const nonce = `nx_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    
    const order: Order = {
      orderId,
      nonce,
      expiresAt,
      used: false,
      createdAt: new Date(),
      metadata
    };
    
    this.orders.set(orderId, order);
    
    return {
      orderId,
      nonce,
      nonceExp: expiresAt.toISOString()
    };
  }
  
  validateOrder(orderId: string, nonce: string): OrderValidation {
    const order = this.orders.get(orderId);
    
    if (!order) {
      return { valid: false, error: 'Order not found' };
    }
    
    if (order.used) {
      return { valid: false, error: 'Order already used' };
    }
    
    if (order.nonce !== nonce) {
      return { valid: false, error: 'Invalid nonce' };
    }
    
    if (order.expiresAt < new Date()) {
      return { valid: false, error: 'Order expired' };
    }
    
    return { valid: true, order };
  }
  
  consumeOrder(orderId: string, nonce: string, txHash?: string): boolean {
    const validation = this.validateOrder(orderId, nonce);
    
    if (!validation.valid || !validation.order) {
      return false;
    }
    
    validation.order.used = true;
    
    if (txHash) {
      this.txHashToOrderId.set(txHash, orderId);
    }
    
    return true;
  }
  
  getOrderByTxHash(txHash: string): Order | undefined {
    const orderId = this.txHashToOrderId.get(txHash);
    if (!orderId) return undefined;
    return this.orders.get(orderId);
  }
  
  isOrderUsed(orderId: string): boolean {
    const order = this.orders.get(orderId);
    return order ? order.used : false;
  }
  
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }
  
  cleanupExpiredOrders(): number {
    const now = new Date();
    let cleaned = 0;
    
    for (const [orderId, order] of this.orders.entries()) {
      const oneHourAfterExpiry = new Date(order.expiresAt.getTime() + 60 * 60 * 1000);
      
      if (now > oneHourAfterExpiry) {
        this.orders.delete(orderId);
        
        for (const [txHash, oid] of this.txHashToOrderId.entries()) {
          if (oid === orderId) {
            this.txHashToOrderId.delete(txHash);
          }
        }
        
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanupExpiredOrders();
      if (cleaned > 0) {
        console.log(`[OrderManager] Cleaned up ${cleaned} expired orders`);
      }
    }, 5 * 60 * 1000);
  }
  
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  getStats(): {
    totalOrders: number;
    activeOrders: number;
    usedOrders: number;
    expiredOrders: number;
  } {
    const now = new Date();
    let activeOrders = 0;
    let usedOrders = 0;
    let expiredOrders = 0;
    
    for (const order of this.orders.values()) {
      if (order.used) {
        usedOrders++;
      } else if (order.expiresAt < now) {
        expiredOrders++;
      } else {
        activeOrders++;
      }
    }
    
    return {
      totalOrders: this.orders.size,
      activeOrders,
      usedOrders,
      expiredOrders
    };
  }
  
  reset(): void {
    this.orders.clear();
    this.txHashToOrderId.clear();
  }
}

export const orderManager = new OrderManager();