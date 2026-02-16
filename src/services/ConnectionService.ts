import type { GRBLStatus, ConnectionConfig, ConsoleMessage } from '@/types/grbl';

export abstract class ConnectionService {
  protected connected = false;
  protected config: ConnectionConfig | null = null;
  protected messageCallback: ((message: string) => void) | null = null;
  protected statusCallback: ((status: GRBLStatus) => void) | null = null;
  protected consoleCallback: ((message: ConsoleMessage) => void) | null = null;

  abstract connect(config: ConnectionConfig): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract sendCommand(command: string): Promise<boolean>;
  abstract sendData(data: string): Promise<boolean>;
  abstract isAvailable(): boolean;

  isConnected(): boolean {
    return this.connected;
  }

  setMessageCallback(callback: (message: string) => void): void {
    this.messageCallback = callback;
  }

  setStatusCallback(callback: (status: GRBLStatus) => void): void {
    this.statusCallback = callback;
  }

  setConsoleCallback(callback: (message: ConsoleMessage) => void): void {
    this.consoleCallback = callback;
  }

  protected logToConsole(type: ConsoleMessage['type'], message: string): void {
    if (this.consoleCallback) {
      this.consoleCallback({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        message,
        timestamp: Date.now()
      });
    }
  }

  protected parseStatusReport(line: string): GRBLStatus | null {
    // Parse GRBL status report: <Idle|MPos:0.000,0.000,0.000|WPos:0.000,0.000,0.000|FS:0,0>
    const match = line.match(/<([^|>]+)(?:\|MPos:([^|>]+))?(?:\|WPos:([^|>]+))?(?:\|Bf:([^,>]+),([^>]+))?(?:\|FS:([^,>]+),([^>]+))?(?:\|Pn:([^>]+))?(?:\|Ln:([^>]+))?[^>]*>/);
    if (!match) return null;

    const state = match[1] as GRBLStatus['state'];
    const mposStr = match[2];
    const wposStr = match[3];
    const feedRate = match[6] ? parseInt(match[6]) : 0;
    const spindleSpeed = match[7] ? parseInt(match[7]) : 0;
    const pinState = match[8];
    const lineNumber = match[9] ? parseInt(match[9]) : undefined;

    let mpos = { x: 0, y: 0, z: 0 };
    let wpos = { x: 0, y: 0, z: 0 };

    if (mposStr) {
      const coords = mposStr.split(',').map(v => parseFloat(v) || 0);
      mpos = { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 0 };
    }

    if (wposStr) {
      const coords = wposStr.split(',').map(v => parseFloat(v) || 0);
      wpos = { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 0 };
    }

    return {
      state: state || 'Unknown',
      mpos,
      wpos,
      feedRate,
      spindleSpeed,
      pinState,
      buffer: 0,
      lineNumber
    };
  }
}
