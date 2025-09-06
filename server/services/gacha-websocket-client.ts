import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';
import { getBasename, formatAddress } from '../utils/basename-resolver';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

interface GachaMessage {
  type: string;
  deviceId?: string;
  walletAddress?: string;
  tokenAmount?: string;
  command?: string;
  [key: string]: any;
}

class GachaWebSocketClient {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private connectedDevices: Set<string> = new Set();

  constructor() {
    this.wsUrl = process.env.DEVICE_WEBSOCKET_URL || '';
    if (!this.wsUrl) {
      console.error('DEVICE_WEBSOCKET_URL is not configured in .env file');
      console.log('Please set DEVICE_WEBSOCKET_URL in your .env file');
    } else {
      console.log(`📡 Gacha WebSocket URL configured: ${this.wsUrl}`);
    }
  }

  connect(): void {
    if (!this.wsUrl || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log(`🔌 Connecting to Gacha WebSocket: ${this.wsUrl}`);

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        console.log('✅ Connected to Gacha WebSocket server');
        this.isConnecting = false;
        
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }

        // Backend registration removed per new specification
        // Only payment_command messages are sent
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as GachaMessage;
          console.log('📥 Gacha WS message:', message);
          
          // Handle device status updates
          if (message.type === 'device_status' || message.type === 'device_register') {
            console.log(`📟 Device ${message.deviceId} status: ${message.status || 'registered'}`);
            if (message.deviceId) {
              this.connectedDevices.add(message.deviceId);
            }
          }
        } catch (error) {
          console.error('Error parsing Gacha WS message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ Gacha WebSocket error:', error.message);
        this.isConnecting = false;
      });

      this.ws.on('close', () => {
        console.log('🔌 Disconnected from Gacha WebSocket');
        this.ws = null;
        this.isConnecting = false;
        // Clear connected devices when disconnected
        this.connectedDevices.clear();
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Failed to connect to Gacha WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.reconnectInterval && this.wsUrl) {
      this.reconnectInterval = setInterval(() => {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          console.log('🔄 Attempting to reconnect to Gacha WebSocket...');
          this.connect();
        }
      }, 5000);
    }
  }

  private send(message: GachaMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async sendPaymentCommand(
    deviceId: string,
    walletAddress: string,
    tokenAmount: string,
    command: string = 'play_gacha'
  ): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Gacha WebSocket is not connected');
      return false;
    }

    // Get Basename and format address using the same logic as client-side
    const basename = await getBasename(walletAddress);
    const displayName = formatAddress(walletAddress, basename);
    
    if (basename) {
      console.log(`🎯 Using Basename for display: ${basename}`);
    } else {
      console.log(`📝 No Basename found, using formatted address: ${displayName}`);
    }

    // Parse amount to ensure it's a number
    const amount = parseFloat(tokenAmount);
    const amountStr = isNaN(amount) ? '0' : amount.toFixed(3);

    // Send payment notification with required headers equivalent
    // Following the curl command format:
    // curl -H "x-auth-token: your-secret-token"
    //      -H "bypp-username: bakemonio" 
    //      -H "bypp-token-amount: 100$"
    const message: GachaMessage = {
      type: 'payment_command',
      command: 'play_gacha',
      deviceId,
      headers: {
        'x-auth-token': 'payment-verified-' + Date.now(),
        'bypp-username': displayName,  // Basename or shortened wallet address
        'bypp-token-amount': `$${amountStr} USDC`  // 決済金額 (100$ format)
      },
      payload: {
        walletAddress,
        amount: amountStr,
        currency: 'USDC',
        command,
        verified: true
      },
      timestamp: new Date().toISOString()
    };

    console.log(`💰 Sending payment command to device ${deviceId}:`);
    console.log(`  - bypp-username: ${displayName}`);
    console.log(`  - bypp-token-amount: ${amountStr}$`);
    this.send(message);
    return true;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId);
  }

  getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices);
  }

  disconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance
export const gachaWebSocketClient = new GachaWebSocketClient();

// Auto-connect if URL is configured
if (process.env.DEVICE_WEBSOCKET_URL) {
  gachaWebSocketClient.connect();
}