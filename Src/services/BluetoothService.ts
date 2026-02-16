import { ConnectionService } from './ConnectionService';
import type { ConnectionConfig } from '@/types/grbl';

// Web Bluetooth API types
declare global {
  interface Navigator {
    bluetooth: {
      requestDevice(options: {
        acceptAllDevices?: boolean;
        optionalServices?: string[];
      }): Promise<BluetoothDevice>;
    };
  }

  interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    value?: DataView;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    writeValue(value: BufferSource): Promise<void>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }
}

export class BluetoothService extends ConnectionService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private receiveBuffer = '';

  // Standard UUIDs for BLE UART (Nordic UART Service)
  private readonly UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  private readonly TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  private readonly RX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  async connect(_config: ConnectionConfig): Promise<boolean> {
    if (!this.isAvailable()) {
      this.logToConsole('error', 'Web Bluetooth API not supported');
      return false;
    }

    try {
      // Request device
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [this.UART_SERVICE_UUID, '0000ffe0-0000-1000-8000-00805f9b34fb']
      });

      this.logToConsole('info', `Connecting to ${this.device.name || 'Unknown Device'}...`);

      // Connect to GATT server
      this.server = await this.device.gatt?.connect() || null;
      if (!this.server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Try to get UART service
      try {
        this.service = await this.server.getPrimaryService(this.UART_SERVICE_UUID);
      } catch {
        // Try alternative UUID
        this.service = await this.server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
      }

      // Get characteristics
      this.txCharacteristic = await this.service.getCharacteristic(this.TX_CHARACTERISTIC_UUID);
      this.rxCharacteristic = await this.service.getCharacteristic(this.RX_CHARACTERISTIC_UUID);

      // Start notifications
      await this.rxCharacteristic.startNotifications();
      this.rxCharacteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        this.handleCharacteristicValueChanged(event);
      });

      this.connected = true;
      this.logToConsole('success', 'Bluetooth connected successfully');

      // Handle disconnection
      this.device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect();
      });

      return true;

    } catch (error) {
      this.logToConsole('error', `Bluetooth connection failed: ${error}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.handleDisconnect();
  }

  async sendCommand(command: string): Promise<boolean> {
    return this.sendData(command + '\n');
  }

  async sendData(data: string): Promise<boolean> {
    if (!this.txCharacteristic || !this.connected) {
      this.logToConsole('error', 'Not connected');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      
      // BLE has a limit of ~20 bytes per packet, so we need to chunk
      const chunkSize = 20;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        await this.txCharacteristic.writeValue(chunk);
      }

      this.logToConsole('sent', data.trim());
      return true;
    } catch (error) {
      this.logToConsole('error', `Failed to send: ${error}`);
      return false;
    }
  }

  private handleCharacteristicValueChanged(event: Event): void {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value) return;

    const decoder = new TextDecoder();
    const data = decoder.decode(value);
    
    // Accumulate data until we get a complete line
    this.receiveBuffer += data;
    
    const lines = this.receiveBuffer.split('\n');
    this.receiveBuffer = lines.pop() || ''; // Keep incomplete line in buffer

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
        this.logToConsole('received', trimmed);
        if (this.messageCallback) {
          this.messageCallback(trimmed);
        }
      }
    }
  }

  private handleDisconnect(): void {
    this.connected = false;
    this.server = null;
    this.service = null;
    this.txCharacteristic = null;
    this.rxCharacteristic = null;
    this.logToConsole('info', 'Bluetooth disconnected');
  }
}

export const bluetoothService = new BluetoothService();
