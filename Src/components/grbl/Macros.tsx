import { useState, useEffect } from 'react';
import { grblService } from '@/services/GRBLService';
import type { Macro } from '@/types/grbl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Play, 
  Edit2, 
  Trash2, 
  Settings,
  Home,
  Target,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const PRESET_MACROS = [
  { name: 'Home All', commands: '$H', icon: Home, color: 'text-blue-400' },
  { name: 'Probe Z', commands: 'G38.2 Z-30 F100\nG10 L20 P1 Z0', icon: Target, color: 'text-green-400' },
  { name: 'Spindle On', commands: 'M3 S1000', icon: Zap, color: 'text-yellow-400' },
  { name: 'Spindle Off', commands: 'M5', icon: Zap, color: 'text-slate-400' },
];

export function Macros() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMacro, setNewMacro] = useState({ name: '', commands: '' });

  useEffect(() => {
    setMacros(grblService.getMacros());

    const checkConnection = () => {
      setIsConnected(grblService.isConnected());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 500);

    return () => clearInterval(interval);
  }, []);

  const handleAddMacro = () => {
    if (!newMacro.name.trim() || !newMacro.commands.trim()) {
      toast.error('Name and commands are required');
      return;
    }

    grblService.addMacro({
      name: newMacro.name,
      commands: newMacro.commands
    });

    setMacros(grblService.getMacros());
    setNewMacro({ name: '', commands: '' });
    setIsDialogOpen(false);
    toast.success('Macro added');
  };

  const handleUpdateMacro = () => {
    if (!editingMacro) return;

    grblService.updateMacro(editingMacro.id, {
      name: editingMacro.name,
      commands: editingMacro.commands
    });

    setMacros(grblService.getMacros());
    setEditingMacro(null);
    toast.success('Macro updated');
  };

  const handleDeleteMacro = (id: string) => {
    grblService.deleteMacro(id);
    setMacros(grblService.getMacros());
    toast.success('Macro deleted');
  };

  const handleRunMacro = async (macro: Macro) => {
    if (!isConnected) {
      toast.error('Not connected');
      return;
    }

    const success = await grblService.runMacro(macro.id);
    if (success) {
      toast.success(`Executed: ${macro.name}`);
    } else {
      toast.error(`Failed to run: ${macro.name}`);
    }
  };

  const handleAddPreset = (preset: typeof PRESET_MACROS[0]) => {
    grblService.addMacro({
      name: preset.name,
      commands: preset.commands
    });
    setMacros(grblService.getMacros());
    toast.success(`Added preset: ${preset.name}`);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Macros</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="border-slate-600">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Add New Macro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Name</Label>
                <Input
                  value={newMacro.name}
                  onChange={(e) => setNewMacro({ ...newMacro, name: e.target.value })}
                  placeholder="e.g., Home & Probe"
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <Label className="text-slate-400">G-Code Commands</Label>
                <Textarea
                  value={newMacro.commands}
                  onChange={(e) => setNewMacro({ ...newMacro, commands: e.target.value })}
                  placeholder="G28\nG10 L20 P1 Z0"
                  className="bg-slate-800 border-slate-600 text-slate-100 font-mono min-h-[100px]"
                />
              </div>
              <div>
                <Label className="text-slate-400 mb-2 block">Quick Presets</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_MACROS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-400"
                      onClick={() => handleAddPreset(preset)}
                    >
                      <preset.icon className={`h-3 w-3 mr-1 ${preset.color}`} />
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleAddMacro}
              >
                Add Macro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Macros List */}
      <ScrollArea className="h-[250px]">
        <div className="space-y-2">
          {macros.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">No macros defined</p>
              <p className="text-slate-600 text-xs mt-1">
                Add macros to automate common tasks
              </p>
            </div>
          ) : (
            macros.map((macro) => (
              <div
                key={macro.id}
                className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">
                    {macro.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate font-mono">
                    {macro.commands.split('\n')[0]}
                    {macro.commands.split('\n').length > 1 && '...'}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                    onClick={() => handleRunMacro(macro)}
                    disabled={!isConnected}
                    title="Run"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-200"
                        onClick={() => setEditingMacro(macro)}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-slate-100">Edit Macro</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-400">Name</Label>
                          <Input
                            value={editingMacro?.name || ''}
                            onChange={(e) => setEditingMacro(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="bg-slate-800 border-slate-600 text-slate-100"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-400">G-Code Commands</Label>
                          <Textarea
                            value={editingMacro?.commands || ''}
                            onChange={(e) => setEditingMacro(prev => prev ? { ...prev, commands: e.target.value } : null)}
                            className="bg-slate-800 border-slate-600 text-slate-100 font-mono min-h-[100px]"
                          />
                        </div>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={handleUpdateMacro}
                        >
                          Update Macro
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    onClick={() => handleDeleteMacro(macro.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
