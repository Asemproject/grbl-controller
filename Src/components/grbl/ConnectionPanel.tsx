import { useState, useEffect } from 'react';
import { grblService } from '@/services/GRBLService';
import { bluetoothService } from '@/services/BluetoothService';
import { usbService } from '@/services/USBService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wifi, 
  Bluetooth, 
  Usb, 
  Link2, 
  Link2Off,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export function ConnectionPanel() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'wifi' | 'bluetooth' | 'usb' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // WiFi state
  const [wifiAddress, setWifiAddress] = useState('192.168.4.1');
  const [wifiPort, setWifiPort] = useState('81');
  
  // Availability
  const [wifiAvailable, setWifiAvailable] = useState(true);
  const [btAvailable, setBtAvailable] = useState(false);
  const [usbAvailable, setUsbAvailable] = useState(false);

  useEffect(() => {
    // Check API availability
    setWifiAvailable(typeof WebSocket !== 'undefined');
    setBtAvailable(bluetoothService.isAvailable());
    setUsbAvailable(usbService.isAvailable());

    // Check initial connection state
    const checkConnection = () => {
      const connected = grblService.isConnected();
      setIsConnected(connected);
      if (connected) {
        setConnectionType(grblService.getConnectionType());
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleWiFiConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await grblService.connect({
        type: 'wifi',
        address: wifiAddress,
        port: parseInt(wifiPort) || 81
      });

      if (success) {
        toast.success('Connected via WiFi');
        setIsConnected(true);
        setConnectionType('wifi');
      } else {
        toast.error('Failed to connect via WiFi');
      }
    } catch (error) {
      toast.error(`Connection error: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBluetoothConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await grblService.connect({
        type: 'bluetooth'
      });

      if (success) {
        toast.success('Connected via Bluetooth');
        setIsConnected(true);
        setConnectionType('bluetooth');
      } else {
        toast.error('Failed to connect via Bluetooth');
      }
    } catch (error) {
      toast.error(`Connection error: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUSBConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await grblService.connect({
        type: 'usb'
      });

      if (success) {
        toast.success('Connected via USB');
        setIsConnected(true);
        setConnectionType('usb');
      } else {
        toast.error('Failed to connect via USB');
      }
    } catch (error) {
      toast.error(`Connection error: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await grblService.disconnect();
    setIsConnected(false);
    setConnectionType(null);
    toast.info('Disconnected');
  };

  const getConnectionIcon = () => {
    switch (connectionType) {
      case 'wifi': return <Wifi className="h-5 w-5" />;
      case 'bluetooth': return <Bluetooth className="h-5 w-5" />;
      case 'usb': return <Usb className="h-5 w-5" />;
      default: return null;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Connection</h2>
        {isConnected && (
          <div className="flex items-center gap-2 text-emerald-400">
            {getConnectionIcon()}
            <span className="text-sm capitalize">{connectionType}</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-6 bg-slate-800 rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                {getConnectionIcon()}
              </div>
              <p className="text-slate-300">Connected via {connectionType}</p>
              <p className="text-sm text-slate-500 mt-1">GRBL Controller Ready</p>
            </div>
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDisconnect}
          >
            <Link2Off className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="wifi" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="wifi" className="data-[state=active]:bg-slate-700">
              <Wifi className="h-4 w-4 mr-1" />
              WiFi
            </TabsTrigger>
            <TabsTrigger value="bluetooth" className="data-[state=active]:bg-slate-700">
              <Bluetooth className="h-4 w-4 mr-1" />
              BT
            </TabsTrigger>
            <TabsTrigger value="usb" className="data-[state=active]:bg-slate-700">
              <Usb className="h-4 w-4 mr-1" />
              USB
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wifi" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">IP Address</Label>
                <Input
                  value={wifiAddress}
                  onChange={(e) => setWifiAddress(e.target.value)}
                  placeholder="192.168.4.1"
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <Label className="text-slate-400">Port</Label>
                <Input
                  value={wifiPort}
                  onChange={(e) => setWifiPort(e.target.value)}
                  placeholder="81"
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleWiFiConnect}
                disabled={isConnecting || !wifiAvailable}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Connect WiFi
              </Button>
              {!wifiAvailable && (
                <p className="text-xs text-red-400 text-center">
                  WebSocket not supported
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bluetooth" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <Bluetooth className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                <p className="text-sm text-slate-400">
                  Click connect to scan for Bluetooth devices
                </p>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleBluetoothConnect}
                disabled={isConnecting || !btAvailable}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Connect Bluetooth
              </Button>
              {!btAvailable && (
                <p className="text-xs text-red-400 text-center">
                  Web Bluetooth not supported in this browser
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="usb" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <Usb className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                <p className="text-sm text-slate-400">
                  Connect your GRBL controller via USB and click connect
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports: CH340, FT232, CP210x, Arduino
                </p>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleUSBConnect}
                disabled={isConnecting || !usbAvailable}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Connect USB
              </Button>
              {!usbAvailable && (
                <p className="text-xs text-red-400 text-center">
                  WebUSB not supported in this browser
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
