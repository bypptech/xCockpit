import { Button } from '@/components/ui/button';
import { type Device, type Session } from '@shared/schema';

interface DeviceCardProps {
  device: Device;
  onCommand: (device: Device, command: string) => void;
  isWalletConnected: boolean;
  userSessions: Session[];
}

export default function DeviceCard({ device, onCommand, isWalletConnected, userSessions }: DeviceCardProps) {
  const activeSession = userSessions.find(s => s.deviceId === device.id);
  const hasAccess = !!activeSession;

  const getDeviceIcon = () => {
    switch (device.type) {
      case 'lock':
        return 'fas fa-lock';
      case 'light':
        return 'fas fa-lightbulb';
      case 'gacha':
        return 'fas fa-gift';
      default:
        return 'fas fa-microchip';
    }
  };

  const getDeviceCommand = () => {
    switch (device.type) {
      case 'lock':
        return device.status === 'locked' ? 'unlock' : 'lock';
      case 'light':
        return device.status === 'off' ? 'on' : 'off';
      case 'gacha':
        return 'play';
      default:
        return 'toggle';
    }
  };

  const getCommandLabel = () => {
    switch (device.type) {
      case 'lock':
        return device.status === 'locked' ? 'Unlock Device' : 'Lock Device';
      case 'light':
        return device.status === 'off' ? 'Turn On' : 'Turn Off';
      case 'gacha':
        return 'Play Gacha';
      default:
        return 'Toggle Device';
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const remaining = Math.max(0, expiresAt.getTime() - now.getTime());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSessionProgress = () => {
    if (!activeSession) return 0;
    const now = new Date();
    const created = new Date(activeSession.createdAt);
    const expires = new Date(activeSession.expiresAt);
    const total = expires.getTime() - created.getTime();
    const remaining = Math.max(0, expires.getTime() - now.getTime());
    return Math.max(0, (remaining / total) * 100);
  };

  const getStatusDisplay = () => {
    if (!device.isOnline) return { text: 'Offline', color: 'bg-red-500' };
    
    switch (device.type) {
      case 'gacha':
        switch (device.status) {
          case 'ready':
            return { text: 'Ready to Play', color: 'bg-green-500' };
          case 'playing':
            return { text: 'Playing...', color: 'bg-yellow-500' };
          case 'dispensing':
            return { text: 'Dispensing Prize', color: 'bg-blue-500' };
          case 'maintenance':
            return { text: 'Maintenance', color: 'bg-orange-500' };
          default:
            return { text: device.status, color: 'bg-gray-500' };
        }
      case 'lock':
        return { 
          text: device.status === 'locked' ? 'Locked' : 'Unlocked', 
          color: device.status === 'locked' ? 'bg-red-500' : 'bg-green-500' 
        };
      case 'light':
        return { 
          text: device.status === 'off' ? 'Off' : 'On', 
          color: device.status === 'off' ? 'bg-gray-500' : 'bg-yellow-500' 
        };
      default:
        return { text: device.status, color: 'bg-gray-500' };
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <i className={`${getDeviceIcon()} text-xl text-primary`}></i>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-card-foreground" data-testid={`text-device-name-${device.id}`}>
              {device.name}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-device-location-${device.id}`}>
              {device.location}
            </p>
          </div>
        </div>
        
        {/* Device Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusDisplay().color}`}></div>
          <span className="text-sm font-medium text-muted-foreground" data-testid={`text-device-status-${device.id}`}>
            {getStatusDisplay().text}
          </span>
        </div>
      </div>

      {/* Device Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm text-muted-foreground">Device ID</p>
          <p className="font-mono text-sm font-medium" data-testid={`text-device-id-${device.id}`}>
            {device.id}
          </p>
        </div>
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm text-muted-foreground">Last Activity</p>
          <p className="text-sm font-medium" data-testid={`text-device-activity-${device.id}`}>
            {device.lastActivity ? new Date(device.lastActivity).toLocaleString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-3">
        <Button 
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => onCommand(device, getDeviceCommand())}
          disabled={!isWalletConnected || !device.isOnline || (device.type === 'gacha' && device.status !== 'ready')}
          data-testid={`button-device-command-${device.id}`}
        >
          <i className={`${getDeviceIcon()} mr-2`}></i>
          {getCommandLabel()}
          <span className="ml-2 text-sm opacity-90">
            ${parseFloat((device.metadata as { price?: string } | null)?.price || '0.01').toFixed(3)} USDC
          </span>
        </Button>
        <Button 
          variant="secondary"
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
          data-testid={`button-device-history-${device.id}`}
        >
          <i className="fas fa-history"></i>
        </Button>
      </div>

      {/* Session Timer (shown when active) */}
      {hasAccess && activeSession && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg" data-testid={`session-timer-${device.id}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fas fa-clock text-green-600"></i>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Session Active</span>
            </div>
            <span className="text-sm font-mono text-green-700 dark:text-green-300" data-testid={`text-session-time-${device.id}`}>
              {formatTimeRemaining(new Date(activeSession.expiresAt))}
            </span>
          </div>
          <div className="mt-2 w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-1000" 
              style={{ width: `${getSessionProgress()}%` }}
              data-testid={`progress-session-${device.id}`}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
