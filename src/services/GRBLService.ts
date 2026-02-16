import { ConnectionService } from './ConnectionService';
import { wifiService } from './WiFiService';
import { bluetoothService } from './BluetoothService';
import { usbService } from './USBService';
import type { 
  ConnectionConfig, 
  GRBLStatus, 
  JogConfig, 
  Axis,
  ConsoleMessage,
  Macro
} from '@/types/grbl';

class GRBLService {
  private currentService: ConnectionService | null = null;
  private status: GRBLStatus = {
    state: 'Unknown',
    mpos: { x: 0, y: 0, z: 0 },
    wpos: { x: 0, y: 0, z: 0 },
    feedRate: 0,
    spindleSpeed: 0,
    buffer: 0
  };
  private settings: Record<number, number> = {};
  private statusInterval: ReturnType<typeof setInterval> | null = null;
  private messageListeners: ((message: string) => void)[] = [];
  private statusListeners: ((status: GRBLStatus) => void)[] = [];
  private consoleListeners: ((message: ConsoleMessage) => void)[] = [];
  private jogConfig: JogConfig = { stepSize: 1, feedRate: 1000 };
  private macros: Macro[] = [];

  constructor() {
    this.loadMacros();
    this.loadJogConfig();
  }

  // Connection Management
  async connect(config: ConnectionConfig): Promise<boolean> {
    // Disconnect existing connection
    await this.disconnect();

    // Select appropriate service
    switch (config.type) {
      case 'wifi':
        this.currentService = wifiService;
        break;
      case 'bluetooth':
        this.currentService = bluetoothService;
        break;
      case 'usb':
        this.currentService = usbService;
        break;
      default:
        throw new Error('Unknown connection type');
    }

    // Set up callbacks
    this.currentService.setMessageCallback((msg) => this.handleMessage(msg));
    this.currentService.setStatusCallback((status) => this.handleStatus(status));
    this.currentService.setConsoleCallback((msg) => this.handleConsole(msg));

    // Connect
    const success = await this.currentService.connect(config);
    
    if (success) {
      // Start status polling
      this.startStatusPolling();
      
      // Request initial status
      await this.sendCommand('?');
      
      // Load settings
      await this.refreshSettings();
    }

    return success;
  }

  async disconnect(): Promise<void> {
    this.stopStatusPolling();
    
    if (this.currentService) {
      await this.currentService.disconnect();
      this.currentService = null;
    }
  }

  isConnected(): boolean {
    return this.currentService?.isConnected() || false;
  }

  getConnectionType(): 'wifi' | 'bluetooth' | 'usb' | null {
    if (this.currentService === wifiService) return 'wifi';
    if (this.currentService === bluetoothService) return 'bluetooth';
    if (this.currentService === usbService) return 'usb';
    return null;
  }

  // Command Sending
  async sendCommand(command: string): Promise<boolean> {
    if (!this.currentService) return false;
    return this.currentService.sendCommand(command);
  }

  async sendRealtimeCommand(command: string): Promise<boolean> {
    if (!this.currentService) return false;
    return this.currentService.sendData(command);
  }

  // Jog Control
  setJogConfig(config: Partial<JogConfig>): void {
    this.jogConfig = { ...this.jogConfig, ...config };
    this.saveJogConfig();
  }

  getJogConfig(): JogConfig {
    return { ...this.jogConfig };
  }

  async jog(axis: Axis, direction: 1 | -1): Promise<boolean> {
    const distance = this.jogConfig.stepSize * direction;
    const feedRate = this.jogConfig.feedRate;
    const command = `$J=G91 G21 ${axis}${distance.toFixed(3)} F${feedRate}`;
    return this.sendCommand(command);
  }

  async jogMultiple(axes: Partial<Record<Axis, number>>): Promise<boolean> {
    const parts = Object.entries(axes).map(([axis, value]) => `${axis}${value?.toFixed(3)}`);
    const command = `$J=G91 G21 ${parts.join(' ')} F${this.jogConfig.feedRate}`;
    return this.sendCommand(command);
  }

  async jogCancel(): Promise<boolean> {
    return this.sendRealtimeCommand('\x85'); // 0x85 = Jog Cancel
  }

  // Homing
  async home(axis?: Axis): Promise<boolean> {
    if (axis) {
      return this.sendCommand(`$H${axis}`);
    }
    return this.sendCommand('$H');
  }

  // Feed Hold and Cycle Start
  async feedHold(): Promise<boolean> {
    return this.sendRealtimeCommand('!');
  }

  async cycleStart(): Promise<boolean> {
    return this.sendRealtimeCommand('~');
  }

  async softReset(): Promise<boolean> {
    return this.sendRealtimeCommand('\x18'); // 0x18 = Ctrl+X
  }

  async unlock(): Promise<boolean> {
    return this.sendCommand('$X');
  }

  // Spindle Control
  async spindleOn(speed?: number): Promise<boolean> {
    if (speed !== undefined) {
      return this.sendCommand(`M3 S${speed}`);
    }
    return this.sendCommand('M3');
  }

  async spindleOff(): Promise<boolean> {
    return this.sendCommand('M5');
  }

  // Work Coordinates
  async setWorkCoordinate(coord: number, axis?: Axis): Promise<boolean> {
    if (axis) {
      return this.sendCommand(`G10 L20 P${coord} ${axis}0`);
    }
    return this.sendCommand(`G10 L20 P${coord} X0 Y0 Z0`);
  }

  async zeroWorkCoordinate(axis?: Axis): Promise<boolean> {
    return this.setWorkCoordinate(0, axis);
  }

  async selectWorkCoordinate(coord: number): Promise<boolean> {
    return this.sendCommand(`G${54 + coord}`);
  }

  // Probe
  async probeZ(feedRate?: number, maxTravel?: number): Promise<boolean> {
    const fr = feedRate || 100;
    const mt = maxTravel || 30;
    return this.sendCommand(`G38.2 G91 Z-${mt} F${fr}`);
  }

  // Settings
  async refreshSettings(): Promise<void> {
    await this.sendCommand('$$');
  }

  getSettings(): Record<number, number> {
    return { ...this.settings };
  }

  async updateSetting(id: number, value: number): Promise<boolean> {
    return this.sendCommand(`$${id}=${value}`);
  }

  // Status
  getStatus(): GRBLStatus {
    return { ...this.status };
  }

  // Macros
  getMacros(): Macro[] {
    return [...this.macros];
  }

  addMacro(macro: Omit<Macro, 'id'>): void {
    const newMacro: Macro = {
      ...macro,
      id: Date.now().toString()
    };
    this.macros.push(newMacro);
    this.saveMacros();
  }

  updateMacro(id: string, updates: Partial<Macro>): void {
    const index = this.macros.findIndex(m => m.id === id);
    if (index !== -1) {
      this.macros[index] = { ...this.macros[index], ...updates };
      this.saveMacros();
    }
  }

  deleteMacro(id: string): void {
    this.macros = this.macros.filter(m => m.id !== id);
    this.saveMacros();
  }

  async runMacro(id: string): Promise<boolean> {
    const macro = this.macros.find(m => m.id === id);
    if (!macro) return false;
    
    const commands = macro.commands.split('\n');
    for (const cmd of commands) {
      const trimmed = cmd.trim();
      if (trimmed && !trimmed.startsWith('(') && !trimmed.startsWith(';')) {
        const success = await this.sendCommand(trimmed);
        if (!success) return false;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    return true;
  }

  // Event Listeners
  addMessageListener(callback: (message: string) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
    };
  }

  addStatusListener(callback: (status: GRBLStatus) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  addConsoleListener(callback: (message: ConsoleMessage) => void): () => void {
    this.consoleListeners.push(callback);
    return () => {
      this.consoleListeners = this.consoleListeners.filter(cb => cb !== callback);
    };
  }

  // Private Methods
  private handleMessage(message: string): void {
    // Parse settings response
    if (message.startsWith('$') && message.includes('=')) {
      const match = message.match(/\$(\d+)=(.+)/);
      if (match) {
        const id = parseInt(match[1]);
        const value = parseFloat(match[2]);
        this.settings[id] = value;
      }
    }

    this.messageListeners.forEach(cb => cb(message));
  }

  private handleStatus(status: GRBLStatus): void {
    this.status = status;
    this.statusListeners.forEach(cb => cb(status));
  }

  private handleConsole(message: ConsoleMessage): void {
    this.consoleListeners.forEach(cb => cb(message));
  }

  private startStatusPolling(): void {
    this.statusInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendRealtimeCommand('?');
      }
    }, 200); // Poll every 200ms
  }

  private stopStatusPolling(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  // Persistence
  private loadMacros(): void {
    try {
      const saved = localStorage.getItem('grbl_macros');
      if (saved) {
        this.macros = JSON.parse(saved);
      }
    } catch {
      this.macros = [];
    }
  }

  private saveMacros(): void {
    try {
      localStorage.setItem('grbl_macros', JSON.stringify(this.macros));
    } catch {
      // Ignore storage errors
    }
  }

  private loadJogConfig(): void {
    try {
      const saved = localStorage.getItem('grbl_jog_config');
      if (saved) {
        this.jogConfig = JSON.parse(saved);
      }
    } catch {
      this.jogConfig = { stepSize: 1, feedRate: 1000 };
    }
  }

  private saveJogConfig(): void {
    try {
      localStorage.setItem('grbl_jog_config', JSON.stringify(this.jogConfig));
    } catch {
      // Ignore storage errors
    }
  }
}

export const grblService = new GRBLService();
