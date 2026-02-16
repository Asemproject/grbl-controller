import { useState, useEffect } from 'react';
import { grblService } from '@/services/GRBLService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

// Common GRBL settings with descriptions
const SETTING_DESCRIPTIONS: Record<number, { name: string; description: string; unit?: string }> = {
  0: { name: 'Step pulse time', description: 'Step pulse time in microseconds', unit: 'μs' },
  1: { name: 'Step idle delay', description: 'Delay before disabling steppers', unit: 'ms' },
  2: { name: 'Step port invert', description: 'Invert step pulse direction' },
  3: { name: 'Direction port invert', description: 'Invert direction pin' },
  4: { name: 'Step enable invert', description: 'Invert stepper enable pin' },
  5: { name: 'Limit pins invert', description: 'Invert limit pins' },
  6: { name: 'Probe pin invert', description: 'Invert probe pin' },
  10: { name: 'Status report', description: 'Status report options' },
  11: { name: 'Junction deviation', description: 'Cornering deviation', unit: 'mm' },
  12: { name: 'Arc tolerance', description: 'Arc tolerance', unit: 'mm' },
  13: { name: 'Report inches', description: 'Report in inches' },
  20: { name: 'Soft limits', description: 'Enable soft limits' },
  21: { name: 'Hard limits', description: 'Enable hard limits' },
  22: { name: 'Homing cycle', description: 'Enable homing cycle' },
  23: { name: 'Homing dir invert', description: 'Invert homing direction' },
  24: { name: 'Homing feed', description: 'Homing feed rate', unit: 'mm/min' },
  25: { name: 'Homing seek', description: 'Homing seek rate', unit: 'mm/min' },
  26: { name: 'Homing debounce', description: 'Homing switch debounce', unit: 'ms' },
  27: { name: 'Homing pull-off', description: 'Homing pull-off distance', unit: 'mm' },
  30: { name: 'Max spindle speed', description: 'Maximum spindle speed', unit: 'RPM' },
  31: { name: 'Min spindle speed', description: 'Minimum spindle speed', unit: 'RPM' },
  32: { name: 'Laser mode', description: 'Enable laser mode' },
  100: { name: 'X steps/mm', description: 'X axis steps per mm', unit: 'steps/mm' },
  101: { name: 'Y steps/mm', description: 'Y axis steps per mm', unit: 'steps/mm' },
  102: { name: 'Z steps/mm', description: 'Z axis steps per mm', unit: 'steps/mm' },
  110: { name: 'X max rate', description: 'X axis maximum rate', unit: 'mm/min' },
  111: { name: 'Y max rate', description: 'Y axis maximum rate', unit: 'mm/min' },
  112: { name: 'Z max rate', description: 'Z axis maximum rate', unit: 'mm/min' },
  120: { name: 'X acceleration', description: 'X axis acceleration', unit: 'mm/s²' },
  121: { name: 'Y acceleration', description: 'Y axis acceleration', unit: 'mm/s²' },
  122: { name: 'Z acceleration', description: 'Z axis acceleration', unit: 'mm/s²' },
  130: { name: 'X max travel', description: 'X axis maximum travel', unit: 'mm' },
  131: { name: 'Y max travel', description: 'Y axis maximum travel', unit: 'mm' },
  132: { name: 'Z max travel', description: 'Z axis maximum travel', unit: 'mm' },
};

export function Settings() {
  const [settings, setSettings] = useState<Record<number, number>>({});
  const [editedSettings, setEditedSettings] = useState<Record<number, number>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(grblService.isConnected());
      setSettings(grblService.getSettings());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await grblService.refreshSettings();
    setTimeout(() => {
      setSettings(grblService.getSettings());
      setIsRefreshing(false);
      toast.success('Settings refreshed');
    }, 500);
  };

  const handleEdit = (id: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditedSettings(prev => ({ ...prev, [id]: numValue }));
    }
  };

  const handleSave = async (id: number) => {
    if (editedSettings[id] === undefined) return;

    const success = await grblService.updateSetting(id, editedSettings[id]);
    if (success) {
      toast.success(`Setting $${id} updated`);
      setEditedSettings(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      // Refresh settings after a short delay
      setTimeout(() => {
        grblService.refreshSettings();
      }, 100);
    } else {
      toast.error(`Failed to update $${id}`);
    }
  };

  const sortedSettings = Object.entries(settings)
    .map(([id, value]) => ({ id: parseInt(id), value }))
    .sort((a, b) => a.id - b.id);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-100">GRBL Settings</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-600"
          onClick={handleRefresh}
          disabled={!isConnected || isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <Settings2 className="h-8 w-8 mx-auto text-slate-600 mb-2" />
          <p className="text-slate-500 text-sm">Connect to view settings</p>
        </div>
      ) : sortedSettings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No settings loaded</p>
          <p className="text-slate-600 text-xs mt-1">
            Click refresh to load settings from GRBL
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {sortedSettings.map(({ id, value }) => {
              const desc = SETTING_DESCRIPTIONS[id];
              const isEdited = editedSettings[id] !== undefined;
              const displayValue = isEdited ? editedSettings[id] : value;

              return (
                <div
                  key={id}
                  className="flex items-center gap-3 p-3 bg-slate-800 rounded border border-slate-700"
                >
                  <div className="w-12 text-xs font-mono text-slate-500">
                    ${id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">
                      {desc?.name || `Setting ${id}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {desc?.description || 'Unknown setting'}
                      {desc?.unit && ` (${desc.unit})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={displayValue}
                      onChange={(e) => handleEdit(id, e.target.value)}
                      className={`w-24 bg-slate-900 border-slate-600 text-slate-100 font-mono text-sm ${
                        isEdited ? 'border-yellow-500' : ''
                      }`}
                      step="any"
                    />
                    {isEdited && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                        onClick={() => handleSave(id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
