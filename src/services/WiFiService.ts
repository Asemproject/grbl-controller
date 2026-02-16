import { ConnectionService } from './ConnectionService';
import type { ConnectionConfig } from '@/types/grbl';

export class WiFiService extends ConnectionService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  isAvailable(): boolean {
    return typeof WebSocket !== 'undefined';
  }

  async connect(config: ConnectionConfig): Promise<boolean> {
    if (!this.isAvailable()) {
      this.logToConsole('error', 'WebSocket not supported in this browser');
      return false;
    }

    this.config = config;
    const wsUrl = `ws://${config.address}:${config.port || 81}`;

    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.logToConsole('success', `Connected to ${wsUrl}`);
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          const data = event.data;
          if (typeof data === 'string') {
            this.handleMessage(data);
          }
        };

        this.socket.onclose = () => {
          this.connected = false;
          this.logToConsole('info', 'Connection closed');
          this.attemptReconnect();
        };

        this.socket.onerror = () => {
          this.logToConsole('error', 'WebSocket error occurred');
          resolve(false);
        };

        // Timeout for connection
        setTimeout(() => {
          if (!this.connected) {
            this.socket?.close();
            resolve(false);
          }
        }, 10000);

      } catch (error) {
        this.logToConsole('error', `Failed to connect: ${error}`);
        resolve(false);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    this.logToConsole('info', 'Disconnected');
  }

  async sendCommand(command: string): Promise<boolean> {
    return this.sendData(command + '\n');
  }

  async sendData(data: string): Promise<boolean> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.logToConsole('error', 'Not connected');
      return false;
    }

    try {
      this.socket.send(data);
      this.logToConsole('sent', data.trim());
      return true;
    } catch (error) {
      this.logToConsole('error', `Failed to send: ${error}`);
      return false;
    }
  }

  private handleMessage(data: string): void {
    const lines = data.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for status report
      if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
        const status = this.parseStatusReport(trimmed);
        if (status && this.statusCallback) {
          this.statusCallback(status);
        }
      } else {
        // Regular message
        this.logToConsole('received', trimmed);
        if (this.messageCallback) {
          this.messageCallback(trimmed);
        }
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logToConsole('info', `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      this.reconnectTimeout = setTimeout(() => {
        if (this.config) {
          this.connect(this.config);
        }
      }, 3000);
    }
  }
}

export const wifiService = new WiFiService();
