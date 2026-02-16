import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from '@/components/grbl/Header';
import { Sidebar, type View } from '@/components/grbl/Sidebar';
import { ConnectionPanel } from '@/components/grbl/ConnectionPanel';
import { DRO } from '@/components/grbl/DRO';
import { JogControl } from '@/components/grbl/JogControl';
import { Console } from '@/components/grbl/Console';
import { GCodeSender } from '@/components/grbl/GCodeSender';
import { Macros } from '@/components/grbl/Macros';
import { Settings } from '@/components/grbl/Settings';
import { grblService } from '@/services/GRBLService';
import type { GRBLStatus } from '@/types/grbl';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<GRBLStatus | null>(null);

  useEffect(() => {
    // Subscribe to status updates
    const unsubscribe = grblService.addStatusListener((newStatus) => {
      setStatus(newStatus);
      
      // Show toast for alarm state
      if (newStatus.state === 'Alarm') {
        toast.error('ALARM: Check machine state!', { duration: 5000 });
      }
    });

    // Check connection status
    const checkConnection = () => {
      setIsConnected(grblService.isConnected());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 500);

    // Check for PWA install
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration failed:', err);
      });
    }

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConnectionPanel />
            <DRO />
            <JogControl />
            <Console />
          </div>
        );
      case 'jog':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <DRO />
            <JogControl />
          </div>
        );
      case 'console':
        return (
          <div className="max-w-4xl mx-auto">
            <Console />
          </div>
        );
      case 'gcode':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <GCodeSender />
            <Console />
          </div>
        );
      case 'macros':
        return (
          <div className="max-w-2xl mx-auto">
            <Macros />
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-2xl mx-auto">
            <Settings />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
          },
        }}
      />
      
      <Header onMenuClick={() => setSidebarOpen(true)} />
      
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <main className="flex-1 p-4 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Connection Warning */}
          {!isConnected && currentView !== 'dashboard' && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg">
              <p className="text-amber-400 text-sm text-center">
                Not connected to GRBL. Please connect first.
              </p>
            </div>
          )}

          {/* Status Bar */}
          {isConnected && status && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">State:</span>
                  <span className={`text-sm font-medium ${
                    status.state === 'Idle' ? 'text-emerald-400' :
                    status.state === 'Run' ? 'text-blue-400' :
                    status.state === 'Alarm' ? 'text-red-400' :
                    'text-slate-300'
                  }`}>
                    {status.state}
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-700 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-4 text-sm font-mono">
                  <span className="text-slate-400">
                    X: <span className="text-slate-200">{status.wpos.x.toFixed(3)}</span>
                  </span>
                  <span className="text-slate-400">
                    Y: <span className="text-slate-200">{status.wpos.y.toFixed(3)}</span>
                  </span>
                  <span className="text-slate-400">
                    Z: <span className="text-slate-200">{status.wpos.z.toFixed(3)}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {status.feedRate > 0 && (
                  <span>F: {status.feedRate}</span>
                )}
                {status.spindleSpeed > 0 && (
                  <span>S: {status.spindleSpeed}</span>
                )}
              </div>
            </div>
          )}

          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
