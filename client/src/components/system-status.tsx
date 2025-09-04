interface SystemStatusProps {
  wsConnected: boolean;
  connectedDevices: number;
  totalDevices: number;
  walletAddress: string | null;
}

export default function SystemStatus({ wsConnected, connectedDevices, totalDevices, walletAddress }: SystemStatusProps) {
  return null;
}