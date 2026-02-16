import { useState, useEffect } from 'react';
import { grblService } from '@/services/GRBLService';
import type { GRBLStatus } from '@/types/grbl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Menu, 
  MoreVertical, 
  Wifi, 
  Bluetooth, 
  Usb, 
  Power,
  Settings,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [status, setStatus] = useState<GRBLStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'wifi' | 'bluetooth' | 'usb' | null>(null);

  useEffect(() => {
    const unsubscribe = grblService.addStatusListener((newStatus) => {
      setStatus(newStatus);
    });

    const checkConnection = () => {
      const connected = grblService.isConnected();
      setIsConnected(connected);
      if (connected) {
        setConnectionType(grblService.getConnectionType());
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleDisconnect = async () => {
    await grblService.disconnect();
    toast.info('Disconnected');
  };

  const getConnectionIcon = () => {
    switch (connectionType) {
      case 'wifi': return <Wifi className="h-4 w-4" />;
      case 'bluetooth': return <Bluetooth className="h-4 w-4" />;
      case 'usb': return <Usb className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStateColor = (state: string): string => {
    switch (state) {
      case 'Idle': return 'bg-emerald-500';
      case 'Run': return 'bg-blue-500';
      case 'Hold': return 'bg-yellow-500';
      case 'Jog': return 'bg-cyan-500';
      case 'Home': return 'bg-purple-500';
      case 'Alarm': return 'bg-red-500';
      case 'Door': return 'bg-orange-500';
      case 'Check': return 'bg-pink-500';
      case 'Sleep': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left - Menu & Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-100"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">GC</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 leading-tight">GRBL Controller</h1>
              <p className="text-xs text-slate-500">FluidNC & GRBLHAL</p>
            </div>
          </div>
        </div>

        {/* Center - Status */}
        <div className="hidden sm:flex items-center gap-4">
          {isConnected && status && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStateColor(status.state)} animate-pulse`} />
                <span className="text-sm text-slate-300">{status.state}</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>X: {(status.wpos.x || 0).toFixed(2)}</span>
                <span>Y: {(status.wpos.y || 0).toFixed(2)}</span>
                <span>Z: {(status.wpos.z || 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right - Connection & Menu */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full">
              {getConnectionIcon()}
              <span className="text-xs text-slate-400 capitalize hidden sm:inline">{connectionType}</span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-100">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
              {isConnected && (
                <DropdownMenuItem 
                  className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
                  onClick={handleDisconnect}
                >
                  <Power className="h-4 w-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-slate-300 focus:text-slate-100 focus:bg-slate-800">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-slate-300 focus:text-slate-100 focus:bg-slate-800">
                <Info className="h-4 w-4 mr-2" />
                About
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
