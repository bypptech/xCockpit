interface SystemStatusProps {
  wsConnected: boolean;
  connectedDevices: number;
  totalDevices: number;
  walletAddress: string | null;
}

export default function SystemStatus({ wsConnected, connectedDevices, totalDevices, walletAddress }: SystemStatusProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg text-card-foreground mb-4" data-testid="text-system-status-title">
        System Status
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fas fa-network-wired text-muted-foreground"></i>
            <span className="text-sm font-medium">Network</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600 font-medium" data-testid="text-network-status">
              Base Sepolia
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fas fa-plug text-muted-foreground"></i>
            <span className="text-sm font-medium">WebSocket</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-sm font-medium ${wsConnected ? 'text-green-600' : 'text-red-600'}`} data-testid="text-websocket-status">
              {wsConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fas fa-microchip text-muted-foreground"></i>
            <span className="text-sm font-medium">Devices</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-card-foreground" data-testid="text-device-count">
              {connectedDevices}/{totalDevices}
            </span>
            <span className="text-xs text-muted-foreground">online</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fas fa-wallet text-muted-foreground"></i>
            <span className="text-sm font-medium">Wallet</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${walletAddress ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className={`text-sm font-medium ${walletAddress ? 'text-green-600' : 'text-gray-600'}`} data-testid="text-wallet-status">
              {walletAddress ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
