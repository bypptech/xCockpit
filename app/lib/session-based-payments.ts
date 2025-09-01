import { walletService } from './coinbase-wallet';

export interface SessionPayment {
  sessionId: string;
  userAddress: string;
  maxAmount: string;
  remainingAmount: string;
  validUntil: number;
  deviceWhitelist: string[];
  signature: string;
  nonce: number;
}

export interface SessionPaymentResult {
  success: boolean;
  method: 'session_payment' | 'direct_payment';
  sessionId?: string;
  txHash?: string;
  remainingBalance?: string;
  error?: string;
  executionTime: number;
}

/**
 * セッションベース支払いシステム - approveを使わない安全な代替手法
 * ユーザーが事前に署名した支払い意図を使用し、Backend側でtransferFromではなく
 * 直接的なtransferを実行する方式
 */
export class SessionBasedPaymentService {
  private static STORAGE_KEY = 'xCockpit_payment_sessions';

  /**
   * 支払いセッションを作成（approveを使用しない）
   */
  static async createPaymentSession(
    userAddress: string,
    maxAmount: string,
    validHours: number = 24,
    deviceIds: string[] = []
  ): Promise<{
    success: boolean;
    session?: SessionPayment;
    error?: string;
  }> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const validUntil = Date.now() + (validHours * 60 * 60 * 1000);
      const nonce = Date.now();

      // Create session authorization message (NOT a transfer approval)
      const sessionMessage = {
        action: 'create_payment_session',
        sessionId,
        userAddress,
        maxAmount,
        validUntil,
        deviceWhitelist: deviceIds,
        nonce,
        terms: 'I authorize creating a payment session for IoT device interactions within the specified limits'
      };

      console.log('🔐 Creating payment session (NO approve required):', sessionMessage);

      // User signs the session creation (not a transfer approval)
      const signature = await walletService['provider'].request({
        method: 'personal_sign',
        params: [JSON.stringify(sessionMessage), userAddress]
      });

      const session: SessionPayment = {
        sessionId,
        userAddress,
        maxAmount,
        remainingAmount: maxAmount,
        validUntil,
        deviceWhitelist: deviceIds,
        signature,
        nonce
      };

      // Save session locally and register with backend
      this.saveLocalSession(session);
      await this.registerSessionWithBackend(session, sessionMessage);

      console.log('✅ Payment session created successfully (no fraud warnings)');

      return { success: true, session };

    } catch (error) {
      console.error('Failed to create payment session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * セッションを使用した高速支払い（各支払い時はmicro-signature）
   */
  static async executeSessionPayment(
    sessionId: string,
    recipient: string,
    amount: string,
    deviceId: string,
    command: string
  ): Promise<SessionPaymentResult> {
    const startTime = Date.now();

    try {
      const session = this.getLocalSession(sessionId);
      
      if (!session) {
        throw new Error('Payment session not found');
      }

      if (!this.isSessionValid(session)) {
        throw new Error('Payment session expired or invalid');
      }

      if (parseFloat(amount) > parseFloat(session.remainingAmount)) {
        throw new Error('Insufficient session balance');
      }

      if (session.deviceWhitelist.length > 0 && !session.deviceWhitelist.includes(deviceId)) {
        throw new Error('Device not whitelisted for this session');
      }

      // Create micro-signature for this specific payment (very fast)
      const paymentMessage = `Pay ${amount} USDC to ${recipient} for ${command} on ${deviceId} (session: ${sessionId})`;
      
      const microSignature = await walletService['provider'].request({
        method: 'personal_sign',
        params: [paymentMessage, session.userAddress]
      });

      // Submit to backend for execution
      const response = await fetch('/api/payments/session-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          recipient,
          amount,
          deviceId,
          command,
          microSignature,
          paymentMessage
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Session payment failed');
      }

      // Update local session balance
      const updatedSession = {
        ...session,
        remainingAmount: (parseFloat(session.remainingAmount) - parseFloat(amount)).toFixed(2)
      };
      this.saveLocalSession(updatedSession);

      const executionTime = Date.now() - startTime;

      console.log(`⚡ Session payment completed in ${executionTime}ms`);

      return {
        success: true,
        method: 'session_payment',
        sessionId,
        txHash: result.txHash,
        remainingBalance: updatedSession.remainingAmount,
        executionTime
      };

    } catch (error) {
      console.error('Session payment failed:', error);
      return {
        success: false,
        method: 'session_payment',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 既存の有効なセッションをチェック
   */
  static getValidSessions(userAddress: string): SessionPayment[] {
    const sessions = this.getLocalSessions();
    return Object.values(sessions)
      .filter(session => 
        session.userAddress === userAddress && 
        this.isSessionValid(session) &&
        parseFloat(session.remainingAmount) > 0
      );
  }

  /**
   * 支払い方法選択（セッション優先、フォールバック対応）
   */
  static async selectOptimalPaymentMethod(
    userAddress: string,
    amount: string,
    deviceId: string
  ): Promise<{
    recommendedMethod: 'session_payment' | 'direct_payment';
    availableSession?: SessionPayment;
    reason: string;
  }> {
    const validSessions = this.getValidSessions(userAddress);
    
    // Check if any session can handle this payment
    const suitableSession = validSessions.find(session => {
      const hasBalance = parseFloat(session.remainingAmount) >= parseFloat(amount);
      const isWhitelisted = session.deviceWhitelist.length === 0 || session.deviceWhitelist.includes(deviceId);
      return hasBalance && isWhitelisted;
    });

    if (suitableSession) {
      return {
        recommendedMethod: 'session_payment',
        availableSession: suitableSession,
        reason: `Using session ${suitableSession.sessionId.slice(-6)} (${suitableSession.remainingAmount} USDC remaining)`
      };
    }

    return {
      recommendedMethod: 'direct_payment',
      reason: 'No suitable payment session available - will use direct payment'
    };
  }

  /**
   * セッション推奨設定の計算
   */
  static getRecommendedSessionConfig(recentPayments: Array<{ amount: string; timestamp: string; deviceId: string }>): {
    recommendedAmount: string;
    recommendedHours: number;
    whitelistedDevices: string[];
    reasoning: string;
  } {
    if (recentPayments.length === 0) {
      return {
        recommendedAmount: '10.00',
        recommendedHours: 24,
        whitelistedDevices: [],
        reasoning: 'No payment history - conservative session recommended'
      };
    }

    const amounts = recentPayments.map(p => parseFloat(p.amount));
    const totalSpent = amounts.reduce((sum, amt) => sum + amt, 0);
    const avgPayment = totalSpent / amounts.length;
    
    // Unique devices used
    const uniqueDevices = [...new Set(recentPayments.map(p => p.deviceId))];
    
    // Recommended amount: 1.5x recent total spending
    const recommendedAmount = Math.max(totalSpent * 1.5, avgPayment * 10).toFixed(2);
    
    return {
      recommendedAmount,
      recommendedHours: 24,
      whitelistedDevices: uniqueDevices.slice(0, 5), // Top 5 used devices
      reasoning: `Based on ${recentPayments.length} payments (avg: $${avgPayment.toFixed(2)}) across ${uniqueDevices.length} devices`
    };
  }

  // Private helper methods
  private static saveLocalSession(session: SessionPayment): void {
    try {
      const sessions = this.getLocalSessions();
      sessions[session.sessionId] = session;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to save session locally:', error);
    }
  }

  private static getLocalSession(sessionId: string): SessionPayment | null {
    try {
      const sessions = this.getLocalSessions();
      return sessions[sessionId] || null;
    } catch {
      return null;
    }
  }

  private static getLocalSessions(): Record<string, SessionPayment> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private static isSessionValid(session: SessionPayment): boolean {
    return Date.now() < session.validUntil && parseFloat(session.remainingAmount) > 0;
  }

  private static async registerSessionWithBackend(session: SessionPayment, originalMessage: any): Promise<void> {
    try {
      await fetch('/api/payments/register-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session,
          originalMessage
        }),
        credentials: 'include'
      });
    } catch (error) {
      console.warn('Failed to register session with backend:', error);
      // Continue without backend registration
    }
  }
}