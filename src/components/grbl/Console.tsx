import { useState, useEffect, useRef } from 'react';
import { grblService } from '@/services/GRBLService';
import type { ConsoleMessage } from '@/types/grbl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Trash2, Terminal } from 'lucide-react';

export function Console() {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = grblService.addConsoleListener((message) => {
      setMessages(prev => [...prev.slice(-200), message]); // Keep last 200 messages
    });

    const checkConnection = () => {
      setIsConnected(grblService.isConnected());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !isConnected) return;

    const success = await grblService.sendCommand(input.trim());
    if (success) {
      setInput('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const clearConsole = () => {
    setMessages([]);
  };

  const getMessageColor = (type: ConsoleMessage['type']): string => {
    switch (type) {
      case 'sent': return 'text-blue-400';
      case 'received': return 'text-slate-300';
      case 'error': return 'text-red-400';
      case 'info': return 'text-yellow-400';
      case 'success': return 'text-emerald-400';
      default: return 'text-slate-400';
    }
  };

  const getMessagePrefix = (type: ConsoleMessage['type']): string => {
    switch (type) {
      case 'sent': return '→';
      case 'received': return '←';
      case 'error': return '✗';
      case 'info': return 'ℹ';
      case 'success': return '✓';
      default: return '•';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-100">Console</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-red-400"
          onClick={clearConsole}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-slate-950 rounded border border-slate-800 mb-3">
        <div ref={scrollRef} className="p-3 space-y-1 font-mono text-sm">
          {messages.length === 0 ? (
            <p className="text-slate-600 text-center py-8">
              Console is empty. Connect to GRBL to see messages.
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="break-all">
                <span className="text-slate-600 text-xs mr-2">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                <span className={`${getMessageColor(msg.type)}`}>
                  {getMessagePrefix(msg.type)} {msg.message}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? "Enter G-code command..." : "Connect to send commands..."}
          disabled={!isConnected}
          className="flex-1 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
        />
        <Button
          onClick={handleSend}
          disabled={!isConnected || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick commands */}
      <div className="flex gap-2 mt-2 flex-wrap">
        {['?', '$$', '$X', '$H', 'G0 X0 Y0 Z0', 'M3', 'M5'].map((cmd) => (
          <Button
            key={cmd}
            variant="outline"
            size="sm"
            className="text-xs border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            onClick={() => grblService.sendCommand(cmd)}
            disabled={!isConnected}
          >
            {cmd}
          </Button>
        ))}
      </div>
    </div>
  );
}
