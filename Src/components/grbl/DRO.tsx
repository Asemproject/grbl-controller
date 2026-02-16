import { useState, useEffect } from 'react';
import { grblService } from '@/services/GRBLService';
import type { GRBLStatus, Axis } from '@/types/grbl';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Crosshair } from 'lucide-react';

export function DRO() {
  const [status, setStatus] = useState<GRBLStatus>({
    state: 'Unknown',
    mpos: { x: 0, y: 0, z: 0 },
    wpos: { x: 0, y: 0, z: 0 },
    feedRate: 0,
    spindleSpeed: 0,
    buffer: 0
  });
  const [showMachineCoords, setShowMachineCoords] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = grblService.addStatusListener((newStatus) => {
      setStatus(newStatus);
    });

    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(grblService.isConnected());
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleZeroAxis = async (axis: Axis) => {
    await grblService.zeroWorkCoordinate(axis);
  };

  const handleZeroAll = async () => {
    await grblService.zeroWorkCoordinate();
  };

  const formatCoord = (value: number): string => {
    return value.toFixed(3).padStart(8, ' ');
  };

  const getStateColor = (state: string): string => {
    switch (state) {
      case 'Idle': return 'text-emerald-400';
      case 'Run': return 'text-blue-400';
      case 'Hold': return 'text-yellow-400';
      case 'Jog': return 'text-cyan-400';
      case 'Home': return 'text-purple-400';
      case 'Alarm': return 'text-red-500';
      case 'Door': return 'text-orange-400';
      case 'Check': return 'text-pink-400';
      case 'Sleep': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  const coords = showMachineCoords ? status.mpos : status.wpos;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">DRO</h2>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono ${getStateColor(status.state)}`}>
            {status.state}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-100"
            onClick={() => setShowMachineCoords(!showMachineCoords)}
            title={showMachineCoords ? 'Show Work Coordinates' : 'Show Machine Coordinates'}
          >
            {showMachineCoords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-xs text-slate-400">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {status.feedRate > 0 && (
          <span className="text-xs text-slate-400 ml-auto">
            F: {status.feedRate} mm/min
          </span>
        )}
        {status.spindleSpeed > 0 && (
          <span className="text-xs text-slate-400">
            S: {status.spindleSpeed} RPM
          </span>
        )}
      </div>

      {/* Axis displays */}
      <div className="space-y-3">
        {(['X', 'Y', 'Z'] as Axis[]).map((axis) => (
          <div key={axis} className="flex items-center gap-3">
            <span className={`text-xl font-bold w-6 ${
              axis === 'X' ? 'text-red-400' : 
              axis === 'Y' ? 'text-green-400' : 
              'text-blue-400'
            }`}>
              {axis}
            </span>
            <div className="flex-1 bg-slate-800 rounded px-3 py-2 font-mono text-xl text-slate-100 tabular-nums">
              {formatCoord(coords[axis.toLowerCase() as keyof typeof coords] || 0)}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-slate-600 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              onClick={() => handleZeroAxis(axis)}
              disabled={!isConnected}
              title={`Zero ${axis}`}
            >
              <Crosshair className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Zero All button */}
      <Button
        variant="outline"
        className="w-full mt-4 border-slate-600 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
        onClick={handleZeroAll}
        disabled={!isConnected}
      >
        <Crosshair className="h-4 w-4 mr-2" />
        Zero All (X, Y, Z)
      </Button>

      {/* Coordinate type indicator */}
      <div className="mt-3 text-center">
        <span className="text-xs text-slate-500">
          {showMachineCoords ? 'Machine Coordinates (MPos)' : 'Work Coordinates (WPos)'}
        </span>
      </div>
    </div>
  );
}
