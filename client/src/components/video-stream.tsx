import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';

interface VideoStreamProps {
  wsUrl?: string;
  className?: string;
}

export default function VideoStream({ 
  wsUrl = 'wss://video.kwhppscv.dev/stream',
  className = ''
}: VideoStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let animationId: number | null = null;

    const connectWebSocket = () => {
      try {
        console.log('Connecting to video stream:', wsUrl);
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // Try different binary types
        ws.binaryType = 'blob';

        ws.onopen = () => {
          console.log('Connected to video stream WebSocket');
          setIsConnected(true);
          setError(null);
        };

        ws.onmessage = async (event) => {
          try {
            if (event.data instanceof Blob) {
              // Handle Blob data (image frames)
              const imageUrl = URL.createObjectURL(event.data);
              const img = new Image();
              
              img.onload = () => {
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    // Set canvas size to match image
                    if (canvas.width !== img.width || canvas.height !== img.height) {
                      canvas.width = img.width;
                      canvas.height = img.height;
                    }
                    // Draw image to canvas
                    ctx.drawImage(img, 0, 0);
                    setFrameCount(prev => prev + 1);
                  }
                }
                URL.revokeObjectURL(imageUrl);
              };
              
              img.onerror = () => {
                console.error('Failed to load image frame');
                URL.revokeObjectURL(imageUrl);
              };
              
              img.src = imageUrl;
              
            } else if (event.data instanceof ArrayBuffer) {
              // Handle ArrayBuffer data
              const blob = new Blob([event.data], { type: 'image/jpeg' });
              const imageUrl = URL.createObjectURL(blob);
              const img = new Image();
              
              img.onload = () => {
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    if (canvas.width !== img.width || canvas.height !== img.height) {
                      canvas.width = img.width;
                      canvas.height = img.height;
                    }
                    ctx.drawImage(img, 0, 0);
                    setFrameCount(prev => prev + 1);
                  }
                }
                URL.revokeObjectURL(imageUrl);
              };
              
              img.src = imageUrl;
              
            } else if (typeof event.data === 'string') {
              // Handle text/JSON data
              try {
                const data = JSON.parse(event.data);
                console.log('Received JSON data:', data);
                
                // Check if it's base64 encoded image
                if (data.image || data.frame) {
                  const base64Data = data.image || data.frame;
                  const img = new Image();
                  img.onload = () => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        setFrameCount(prev => prev + 1);
                      }
                    }
                  };
                  img.src = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
                }
              } catch (e) {
                console.log('Received text data:', event.data);
              }
            }
          } catch (err) {
            console.error('Error processing frame:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error');
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
          setIsConnected(false);
          
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
              console.log('Attempting to reconnect...');
              connectWebSocket();
            }
          }, 5000);
        };

      } catch (err) {
        console.error('WebSocket connection failed:', err);
        setError('Failed to connect to video stream');
      }
    };

    // Initialize on mount
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [wsUrl]);

  // Calculate video height based on window height
  const videoHeight = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600;
  const aspectRatio = 16 / 9; // Assume 16:9 aspect ratio
  const videoWidth = videoHeight * aspectRatio;

  return (
    <Card className={`overflow-hidden bg-black ${className}`}>
      <div className="relative" style={{ height: `${videoHeight}px` }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ 
            maxHeight: `${videoHeight}px`,
            maxWidth: '100%',
            margin: '0 auto',
            display: 'block'
          }}
        />
        
        {/* Status overlay */}
        <div className="absolute top-2 left-2 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
            {isConnected ? 'LIVE' : 'Connecting...'}
          </span>
        </div>

        {/* Error message */}
        {error && !isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <p className="text-sm mb-2">{error}</p>
              <p className="text-xs opacity-70">Attempting to reconnect...</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {!isConnected && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">Connecting to stream...</p>
            </div>
          </div>
        )}

        {/* Debug info */}
        {isConnected && frameCount === 0 && (
          <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
            Waiting for frames...
          </div>
        )}
      </div>
    </Card>
  );
}