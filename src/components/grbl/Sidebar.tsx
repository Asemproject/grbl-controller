import { Button } from '@/components/ui/button';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  LayoutDashboard, 
  Gamepad2, 
  Terminal, 
  FileCode, 
  PlayCircle,
  Settings,
  Cpu
} from 'lucide-react';

type View = 'dashboard' | 'jog' | 'console' | 'gcode' | 'macros' | 'settings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: View;
  onViewChange: (view: View) => void;
}

const menuItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'jog', label: 'Jog Control', icon: Gamepad2 },
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'gcode', label: 'G-Code Sender', icon: FileCode },
  { id: 'macros', label: 'Macros', icon: PlayCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose, currentView, onViewChange }: SidebarProps) {
  const handleViewChange = (view: View) => {
    onViewChange(view);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="left" 
        className="w-[280px] bg-slate-900 border-slate-700 p-0"
      >
        <SheetHeader className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Cpu className="h-4 w-4 text-white" />
              </div>
              GRBL Controller
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav className="p-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 ${
                      isActive 
                        ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300' 
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    }`}
                    onClick={() => handleViewChange(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="text-xs text-slate-500 text-center">
            <p>GRBL Controller v1.0</p>
            <p className="mt-1">Supports FluidNC & GRBLHAL</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { View };
