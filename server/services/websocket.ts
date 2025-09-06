import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { storage } from "../storage";
import { gachaWebSocketClient } from "./gacha-websocket-client";

export class WebSocketService {
  private wss: WebSocketServer;
  private deviceConnections: Map<string, WebSocket> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws'
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('WebSocket connection established');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        // Remove device connection
        const entries = Array.from(this.deviceConnections.entries());
        for (const [deviceId, connection] of entries) {
          if (connection === ws) {
            this.deviceConnections.delete(deviceId);
            this.updateDeviceStatus(deviceId, 'offline', false);
            break;
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'device_register':
        await this.registerDevice(ws, message.deviceId);
        break;
      case 'device_status':
        await this.updateDeviceStatus(message.deviceId, message.status, true);
        break;
      case 'command_ack':
        console.log(`Device ${message.deviceId} acknowledged command:`, message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async registerDevice(ws: WebSocket, deviceId: string) {
    this.deviceConnections.set(deviceId, ws);
    await this.updateDeviceStatus(deviceId, 'online', true);
    
    ws.send(JSON.stringify({
      type: 'registration_ack',
      deviceId,
      timestamp: new Date().toISOString()
    }));

    console.log(`Device ${deviceId} registered`);
  }

  private async updateDeviceStatus(deviceId: string, status: string, isOnline: boolean) {
    await storage.updateDeviceStatus(deviceId, status, isOnline);
  }

  async sendCommandToDevice(deviceId: string, command: string, metadata?: any): Promise<boolean> {
    // First check if device is connected via Gacha WebSocket
    if (gachaWebSocketClient.isDeviceConnected(deviceId)) {
      console.log(`Device ${deviceId} is connected via Gacha WebSocket`);
      return true; // Return true since device is reachable via Gacha WebSocket
    }
    
    // Then check local WebSocket
    const deviceWs = this.deviceConnections.get(deviceId);
    
    if (!deviceWs || deviceWs.readyState !== WebSocket.OPEN) {
      // Device not connected to any WebSocket
      console.error(`Device ${deviceId} is not connected to any WebSocket`);
      return false;
    }

    try {
      deviceWs.send(JSON.stringify({
        type: 'command',
        command,
        deviceId,
        metadata,
        timestamp: new Date().toISOString()
      }));

      return true;
    } catch (error) {
      console.error(`Error sending command to device ${deviceId}:`, error);
      return false;
    }
  }

  broadcastToClients(message: any) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  getConnectedDevices(): string[] {
    return Array.from(this.deviceConnections.keys());
  }
}
