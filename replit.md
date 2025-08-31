# IoT Payment Gateway

## Overview

This is a full-stack IoT payment gateway application that enables cryptocurrency-based payments for device commands using the HTTP 402 Payment Required protocol. The system allows users to connect their Coinbase wallets, pay in USDC on Base Sepolia testnet, and execute commands on smart IoT devices like locks and lights. Built with React frontend, Express.js backend, PostgreSQL database via Drizzle ORM, and real-time WebSocket communication.

**NEW**: Integrated with Web3 AI Vibe Coding methodology for enhanced development workflow using multiple AI tools (Claude, Gemini, Kiro, GitHub Copilot) with specific configurations for optimal Web3 development.

## User Preferences

Preferred communication style: Simple, everyday language.

## AI Development Workflow

Following Web3 AI Vibe Coding methodology:
- **Requirements & Design**: Gemini + Kiro for analysis and planning
- **Implementation**: Claude for TypeScript/React development
- **Code Completion**: GitHub Copilot for productivity
- **Review & Optimization**: Multi-tool approach for quality assurance

## Recent Updates (2025-01-31)

- ✅ Fixed TypeScript type errors across the codebase
- ✅ Added AI tool configuration files (.claude, .gemini, .kiro, .vscode)
- ✅ Integrated Web3 AI Vibe Coding development methodology
- ✅ Enhanced project documentation with AI-driven workflow guides
- ✅ Improved type safety for device metadata and payment processing

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Vite** as the build tool and development server
- **shadcn/ui** components built on Radix UI primitives for consistent UI
- **TailwindCSS** with CSS variables for theming and responsive design
- **React Router (wouter)** for lightweight client-side routing
- **TanStack React Query** for server state management and API caching
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **Express.js** server with TypeScript for API endpoints
- **HTTP 402 Payment Required** protocol implementation for device access control
- **RESTful API design** with structured error handling middleware
- **WebSocket server** for real-time device communication and status updates
- **Session-based access control** with 15-minute device access windows after payment
- **Modular service architecture** separating payment processing, WebSocket handling, and x402 protocol logic

### Database Design
- **PostgreSQL** database with **Drizzle ORM** for type-safe queries
- **Four main entities**: Users (wallet addresses), Devices (IoT hardware), Payments (USDC transactions), Sessions (time-limited access)
- **Foreign key relationships** ensuring data integrity between payments, users, and devices
- **In-memory storage fallback** for development with sample device data
- **Database migrations** managed through Drizzle Kit

### Authentication & Payments
- **Coinbase Wallet SDK** integration for Web3 wallet connection
- **Base Sepolia testnet** for USDC payments (testnet environment)
- **No traditional authentication** - wallet address serves as user identifier
- **Payment verification** through transaction hash validation
- **Session management** with automatic expiration and cleanup

### Real-time Communication
- **WebSocket connection** for bidirectional device communication
- **Device registration** and status monitoring
- **Automatic reconnection** with exponential backoff strategy
- **Real-time payment status** and device state updates

## External Dependencies

- **Coinbase Wallet SDK** - Web3 wallet integration and USDC payments
- **Neon Database** - PostgreSQL hosting service
- **Base Sepolia Testnet** - Ethereum L2 network for test transactions
- **USDC Token Contract** - ERC-20 stablecoin for device payments
- **WebSocket Protocol** - Real-time communication with IoT devices
- **Drizzle ORM** - Type-safe database operations
- **Radix UI** - Headless component primitives
- **TanStack Query** - Server state management
- **Zod** - Runtime type validation and schema definitions