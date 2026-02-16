import { useState, useEffect, useRef } from 'react';
import { grblService } from '@/services/GRBLService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Play, 
  Pause, 
  Square, 
  FileCode, 
  Trash2,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface GCodeFile {
  id: string;
  name: string;
  content: string[];
  size: number;
}

export function GCodeSender() {
  const [files, setFiles] = useState<GCodeFile[]>([]);
  const [currentFile, setCurrentFile] = useState<GCodeFile | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentLine, setCurrentLine] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load saved files from localStorage
    const savedFiles = localStorage.getItem('grbl_gcode_files');
    if (savedFiles) {
      try {
        setFiles(JSON.parse(savedFiles));
      } catch {
        // Ignore parse errors
      }
    }

    const checkConnection = () => {
      setIsConnected(grblService.isConnected());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 500);

    return () => clearInterval(interval);
  }, []);

  const saveFiles = (newFiles: GCodeFile[]) => {
    setFiles(newFiles);
    try {
      localStorage.setItem('grbl_gcode_files', JSON.stringify(newFiles));
    } catch {
      // Ignore storage errors
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const lines = content.split('\n').filter(line => line.trim());
      
      const newFile: GCodeFile = {
        id: Date.now().toString(),
        name: file.name,
        content: lines,
        size: file.size
      };

      const updatedFiles = [...files, newFile];
      saveFiles(updatedFiles);
      toast.success(`Loaded ${file.name} (${lines.length} lines)`);
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleDeleteFile = (id: string) => {
    const updatedFiles = files.filter(f => f.id !== id);
    saveFiles(updatedFiles);
    if (currentFile?.id === id) {
      setCurrentFile(null);
    }
  };

  const handleSelectFile = (file: GCodeFile) => {
    setCurrentFile(file);
    setProgress(0);
    setCurrentLine(0);
  };

  const handleSend = async () => {
    if (!currentFile || !isConnected) return;

    setIsSending(true);
    setIsPaused(false);
    abortControllerRef.current = new AbortController();

    try {
      for (let i = 0; i < currentFile.content.length; i++) {
        if (abortControllerRef.current.signal.aborted) {
          break;
        }

        // Check for pause
        while (isPaused && !abortControllerRef.current.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const line = currentFile.content[i].trim();
        if (!line || line.startsWith('(') || line.startsWith(';')) {
          continue; // Skip empty lines and comments
        }

        // Wait for GRBL to be ready
        let retries = 0;
        let sent = false;
        while (!sent && retries < 10) {
          sent = await grblService.sendCommand(line);
          if (!sent) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
          }
        }

        if (!sent) {
          toast.error(`Failed to send line ${i + 1}`);
          break;
        }

        setCurrentLine(i + 1);
        setProgress(((i + 1) / currentFile.content.length) * 100);

        // Small delay to prevent overwhelming GRBL
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (!abortControllerRef.current.signal.aborted) {
        toast.success('G-code sent successfully');
      }
    } catch (error) {
      toast.error(`Error sending G-code: ${error}`);
    } finally {
      setIsSending(false);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    if (isPaused) {
      setIsPaused(false);
      grblService.cycleStart();
    } else {
      setIsPaused(true);
      grblService.feedHold();
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsSending(false);
    setIsPaused(false);
    grblService.softReset();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">G-Code Sender</h2>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".gcode,.nc,.tap,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" className="border-slate-600" asChild>
            <span>
              <Upload className="h-4 w-4 mr-1" />
              Load
            </span>
          </Button>
        </label>
      </div>

      {/* File List */}
      <ScrollArea className="h-[150px] bg-slate-800 rounded border border-slate-700 mb-4">
        <div className="p-2 space-y-1">
          {files.length === 0 ? (
            <p className="text-slate-500 text-center py-4 text-sm">
              No G-code files loaded
            </p>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                  currentFile?.id === file.id 
                    ? 'bg-blue-600/20 border border-blue-500/50' 
                    : 'hover:bg-slate-700'
                }`}
                onClick={() => handleSelectFile(file)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300 truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-500">
                    {file.content.length} lines
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-500 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Selected File Info */}
      {currentFile && (
        <div className="mb-4 p-3 bg-slate-800 rounded border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-300">{currentFile.name}</span>
            </div>
            <span className="text-xs text-slate-500">
              {formatFileSize(currentFile.size)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {currentFile.content.length} lines
          </div>
        </div>
      )}

      {/* Progress */}
      {isSending && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{currentLine} / {currentFile?.content.length || 0} lines</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={handleSend}
          disabled={!currentFile || isSending || !isConnected}
        >
          <Play className="h-4 w-4 mr-1" />
          Send
        </Button>
        <Button
          variant="outline"
          className="border-slate-600"
          onClick={handlePause}
          disabled={!isSending}
        >
          <Pause className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          onClick={handleStop}
          disabled={!isSending}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
