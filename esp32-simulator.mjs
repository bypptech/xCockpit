#!/usr/bin/env node

import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Get WebSocket URL from environment
const DEVICE_WEBSOCKET_URL = process.env.DEVICE_WEBSOCKET_URL;
if (!DEVICE_WEBSOCKET_URL) {
  console.error('❌ Error: DEVICE_WEBSOCKET_URL is not set in .env file');
  console.error('Please set DEVICE_WEBSOCKET_URL to one of:');
  console.error('  - Production: wss://gacha-websocket.kwhppscv.dev/');
  console.error('  - Local: ws://localhost:5001');
  process.exit(1);
}

// Device configuration
const DEVICE_ID = process.argv[2] || 'ESP32_001';
const DEVICE_NAME = DEVICE_ID === 'ESP32_001' ? 'Smart Gacha #001' : 'Smart Gacha #002';

console.log('🎮 ESP32 Gacha Machine Simulator');
console.log(`📟 Device ID: ${DEVICE_ID}`);
console.log(`📛 Device Name: ${DEVICE_NAME}`);
console.log(`🌐 Connecting to: ${DEVICE_WEBSOCKET_URL}`);
console.log('─'.repeat(50));

let ws;
let reconnectInterval = null;
let isReconnecting = false;

function connect() {
  if (isReconnecting) return;
  
  try {
    ws = new WebSocket(DEVICE_WEBSOCKET_URL);
    
    ws.on('open', () => {
      console.log(`✅ Connected to WebSocket server at ${DEVICE_WEBSOCKET_URL}`);
      isReconnecting = false;
      
      // Clear any existing reconnect interval
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
      
      // Register device
      const registerMessage = {
        type: 'device_register',
        command: 'register',
        deviceId: DEVICE_ID,
        name: DEVICE_NAME,
        capabilities: ['play_gacha', 'get_status', 'reset'],
        status: 'online'
      };
      
      console.log('📤 Sending registration:', JSON.stringify(registerMessage, null, 2));
      ws.send(JSON.stringify(registerMessage));
      
      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const heartbeat = {
            type: 'heartbeat',
            command: 'heartbeat',
            deviceId: DEVICE_ID,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(heartbeat));
          console.log('💓 Heartbeat sent');
        }
      }, 30000); // Every 30 seconds
      
      // Store interval for cleanup
      ws.heartbeatInterval = heartbeatInterval;
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 Received message:', JSON.stringify(message, null, 2));
        
        // Handle different message types
        switch (message.type) {
          case 'command':
            handleCommand(message);
            break;
            
          case 'play_gacha':
            handlePlayGacha(message);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              deviceId: DEVICE_ID,
              timestamp: new Date().toISOString()
            }));
            break;
            
          default:
            console.log(`⚠️ Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        console.log('Raw message:', data.toString());
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
    
    ws.on('close', () => {
      console.log('🔌 Disconnected from WebSocket server');
      
      // Clear heartbeat interval if exists
      if (ws && ws.heartbeatInterval) {
        clearInterval(ws.heartbeatInterval);
      }
      
      ws = null;
      
      // Start reconnection attempts
      if (!reconnectInterval && !isReconnecting) {
        console.log('🔄 Will attempt to reconnect in 5 seconds...');
        reconnectInterval = setInterval(() => {
          if (!ws || ws.readyState === WebSocket.CLOSED) {
            console.log('🔄 Attempting to reconnect...');
            isReconnecting = true;
            connect();
          }
        }, 5000);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    isReconnecting = false;
    
    // Retry connection after 5 seconds
    if (!reconnectInterval) {
      reconnectInterval = setInterval(() => {
        if (!ws || ws.readyState === WebSocket.CLOSED) {
          console.log('🔄 Retrying connection...');
          connect();
        }
      }, 5000);
    }
  }
}

function handleCommand(message) {
  console.log(`⚙️ Processing command: ${message.command}`);
  
  let response = {
    type: 'command_response',
    deviceId: DEVICE_ID,
    command: message.command,
    success: true,
    timestamp: new Date().toISOString()
  };
  
  switch (message.command) {
    case 'play_gacha':
      // Simulate gacha play
      const prize = Math.random() > 0.5 ? 'Rare Card' : 'Common Card';
      response.data = {
        result: 'success',
        prize: prize,
        message: `🎰 Gacha played! You got: ${prize}`
      };
      console.log(`🎯 Gacha result: ${prize}`);
      break;
      
    case 'get_status':
      response.data = {
        status: 'online',
        inventory: Math.floor(Math.random() * 100),
        temperature: 25 + Math.random() * 5,
        uptime: process.uptime()
      };
      break;
      
    case 'reset':
      response.data = {
        message: 'Device reset successfully'
      };
      console.log('🔄 Device reset');
      break;
      
    default:
      response.success = false;
      response.error = `Unknown command: ${message.command}`;
  }
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(response));
    console.log('📤 Sent response:', JSON.stringify(response, null, 2));
  }
}

function handlePlayGacha(message) {
  console.log('🎰 Handling play_gacha request');
  console.log('💰 Payment info:', {
    wallet: message.walletAddress,
    amount: message.tokenAmount
  });
  
  // Simulate gacha play
  const prizes = ['⭐ SSR Card', '💎 SR Card', '🎯 R Card', '📦 N Card'];
  const prize = prizes[Math.floor(Math.random() * prizes.length)];
  
  const response = {
    type: 'gacha_result',
    deviceId: DEVICE_ID,
    success: true,
    prize: prize,
    walletAddress: message.walletAddress,
    tokenAmount: message.tokenAmount,
    timestamp: new Date().toISOString()
  };
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(response));
    console.log(`🎊 Gacha complete! Prize: ${prize}`);
    console.log('📤 Sent result:', JSON.stringify(response, null, 2));
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down ESP32 simulator...');
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
  }
  if (ws) {
    ws.close();
  }
  process.exit(0);
});

// Start the connection
connect();