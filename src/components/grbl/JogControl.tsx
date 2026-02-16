import { useState, useEffect } from 'react';
import { grblService } from '@/services/GRBLService';
import type { JogConfig, Axis } from '@/types/grbl';
import { Button } from '@/components/ui/button';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUpCircle,
  ArrowDownCircle,
  Home,
  Pause,
  Play,
  RotateCcw,
  Unlock,
  Power
} from 'lucide-react';

const STEP_SIZES = [0.01, 0.1, 1, 10, 100];
const FEED_RATES = [100, 500, 1000, 2000, 5000];

export function JogControl() {
  const [jogConfig, setJogConfig] = useState<JogConfig>({ stepSize: 1, feedRate: 1000 });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setJogConfig(grblService.getJogConfig());
    
    const interval = setInterval(() => {
      setIsConnected(grblService.isConnected());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleJog = async (axis: Axis, direction: 1 | -1) => {
    if (!isConnected) return;
    await grblService.jog(axis, direction);
  };

  const handleStepSizeChange = (value: number) => {
    const newConfig = { ...jogConfig, stepSize: value };
    setJogConfig(newConfig);
    grblService.setJogConfig({ stepSize: value });
  };

  const handleFeedRateChange = (value: number) => {
    const newConfig = { ...jogConfig, feedRate: value };
    setJogConfig(newConfig);
    grblService.setJogConfig({ feedRate: value });
  };

  const handleHome = async () => {
    await grblService.home();
  };

  const handleFeedHold = async () => {
    await grblService.feedHold();
  };

  const handleCycleStart = async () => {
    await grblService.cycleStart();
  };

  const handleReset = async () => {
    await grblService.softReset();
  };

  const handleUnlock = async () => {
    await grblService.unlock();
  };

  const handleJogCancel = async () => {
    await grblService.jogCancel();
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Jog Control</h2>

      {/* Step Size Selection */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block">Step Size (mm)</label>
        <div className="flex gap-1">
          {STEP_SIZES.map((size) => (
            <Button
              key={size}
              variant={jogConfig.stepSize === size ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${
                jogConfig.stepSize === size 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'border-slate-600 text-slate-400 hover:text-slate-100'
              }`}
              onClick={() => handleStepSizeChange(size)}
            >
              {size < 1 ? size.toFixed(2) : size}
            </Button>
          ))}
        </div>
      </div>

      {/* Feed Rate Selection */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block">Feed Rate (mm/min)</label>
        <div className="flex gap-1">
          {FEED_RATES.map((rate) => (
            <Button
              key={rate}
              variant={jogConfig.feedRate === rate ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${
                jogConfig.feedRate === rate 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'border-slate-600 text-slate-400 hover:text-slate-100'
              }`}
              onClick={() => handleFeedRateChange(rate)}
            >
              {rate}
            </Button>
          ))}
        </div>
      </div>

      {/* XY Jog Pad */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block">XY Axis</label>
        <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
          <div />
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 border-slate-600 hover:bg-slate-800 hover:border-slate-500"
            onClick={() => handleJog('Y', 1)}
            disabled={!isConnected}
          >
            <ArrowUp className="h-6 w-6 text-green-400" />
          </Button>
          <div />
          
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 border-slate-600 hover:bg-slate-800 hover:border-slate-500"
            onClick={() => handleJog('X', -1)}
            disabled={!isConnected}
          >
            <ArrowLeft className="h-6 w-6 text-red-400" />
          </Button>
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-slate-600" />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 border-slate-600 hover:bg-slate-800 hover:border-slate-500"
            onClick={() => handleJog('X', 1)}
            disabled={!isConnected}
          >
            <ArrowRight className="h-6 w-6 text-red-400" />
          </Button>
          
          <div />
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 border-slate-600 hover:bg-slate-800 hover:border-slate-500"
            onClick={() => handleJog('Y', -1)}
            disabled={!isConnected}
          >
            <ArrowDown className="h-6 w-6 text-green-400" />
          </Button>
          <div />
        </div>
      </div>

      {/* Z Axis Jog */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block">Z Axis</label>
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 border-slate-600 hover:bg-slate-800 hover:border-slate-500"
            onClick={() => handleJog('Z', 1)}
            disabled={!isConnected}
          >
            <ArrowUpCircle className="h-6 w-6 text-blue-400" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 border-slate-600 hover:bg-slate-800 hover:border-slate-500"
            onClick={() => handleJog('Z', -1)}
            disabled={!isConnected}
          >
            <ArrowDownCircle className="h-6 w-6 text-blue-400" />
          </Button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <Button
          variant="outline"
          size="icon"
          className="border-slate-600 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          onClick={handleHome}
          disabled={!isConnected}
          title="Home"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-slate-600 text-yellow-400 hover:text-yellow-300 hover:bg-slate-800"
          onClick={handleFeedHold}
          disabled={!isConnected}
          title="Feed Hold"
        >
          <Pause className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-slate-600 text-green-400 hover:text-green-300 hover:bg-slate-800"
          onClick={handleCycleStart}
          disabled={!isConnected}
          title="Cycle Start"
        >
          <Play className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-slate-600 text-red-400 hover:text-red-300 hover:bg-slate-800"
          onClick={handleReset}
          disabled={!isConnected}
          title="Soft Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <Button
          variant="outline"
          className="border-slate-600 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          onClick={handleUnlock}
          disabled={!isConnected}
        >
          <Unlock className="h-4 w-4 mr-2" />
          Unlock
        </Button>
        <Button
          variant="outline"
          className="border-slate-600 text-orange-400 hover:text-orange-300 hover:bg-slate-800"
          onClick={handleJogCancel}
          disabled={!isConnected}
        >
          <Power className="h-4 w-4 mr-2" />
          Jog Cancel
        </Button>
      </div>
    </div>
  );
}
