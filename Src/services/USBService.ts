import { ConnectionService } from './ConnectionService';
import type { ConnectionConfig } from '@/types/grbl';

// WebUSB API types
declare global {
  interface Navigator {
    usb: {
      requestDevice(options: { filters?: USBDeviceFilter[] }): Promise<USBDevice>;
    };
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
  }

  interface USBDevice {
    deviceClass: number;
    deviceSubclass: number;
    deviceProtocol: number;
    productId: number;
    vendorId: number;
    productName: string;
    manufacturerName: string;
    serialNumber: string;
    configuration: USBConfiguration | null;
    opened: boolean;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  }

  interface USBConfiguration {
    configurationValue: number;
    interfaces: USBInterface[];
  }

  interface USBInterface {
    interfaceNumber: number;
    alternate: USBAlternateInterface;
    alternates: USBAlternateInterface[];
    claimed: boolean;
  }

  interface USBAlternateInterface {
    interfaceNumber: number;
    alternateSetting: number;
    interfaceClass: number;
    interfaceSubclass: number;
    interfaceProtocol: number;
    endpoints: USBEndpoint[];
  }

  interface USBEndpoint {
    endpointNumber: number;
    direction: 'in' | 'out';
    type: 'control' | 'interrupt' | 'isochronous' | 'bulk';
    packetSize: number;
  }

  interface USBControlTransferParameters {
    requestType: 'standard' | 'class' | 'vendor';
    recipient: 'device' | 'interface' | 'endpoint' | 'other';
    request: number;
    value: number;
    index: number;
  }

  interface USBInTransferResult {
    data?: DataView;
    status: 'ok' | 'stall' | 'babble';
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall' | 'babble';
  }
}

export class USBService extends ConnectionService {
  private device: USBDevice | null = null;
  private interfaceNumber = 0;
  private endpointIn = 0;
  private endpointOut = 0;
  private readLoopRunning = false;
  private receiveBuffer = '';

  // Common GRBL USB VID/PID pairs
  private readonly GRBL_DEVICES = [
    { vid: 0x1A86, pid: 0x7523, name: 'CH340' },
    { vid: 0x1A86, pid: 0x5523, name: 'CH341' },
    { vid: 0x0403, pid: 0x6001, name: 'FT232R' },
    { vid: 0x0403, pid: 0x6010, name: 'FT2232' },
    { vid: 0x0403, pid: 0x6011, name: 'FT4232' },
    { vid: 0x10C4, pid: 0xEA60, name: 'CP210x' },
    { vid: 0x2341, pid: 0x0043, name: 'Arduino Uno' },
    { vid: 0x2341, pid: 0x0001, name: 'Arduino Uno' },
    { vid: 0x2A03, pid: 0x0043, name: 'Arduino Uno' },
    { vid: 0x16C0, pid: 0x0483, name: 'Teensyduino' },
    { vid: 0x0483, pid: 0x5740, name: 'STM32 Virtual COM' },
  ];

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  async connect(_config: ConnectionConfig): Promise<boolean> {
    if (!this.isAvailable()) {
      this.logToConsole('error', 'WebUSB API not supported');
      return false;
    }

    try {
      // Request device
      const filters = this.GRBL_DEVICES.map(d => ({ vendorId: d.vid, productId: d.pid }));
      
      this.device = await navigator.usb.requestDevice({
        filters: filters.length > 0 ? filters : undefined
      });

      this.logToConsole('info', `Connecting to ${this.device.productName || 'USB Device'}...`);

      // Open device
      await this.device.open();

      // Select configuration
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Find interface with bulk endpoints
      const configuration = this.device.configuration;
      if (!configuration) {
        throw new Error('No configuration found');
      }

      // Find the appropriate interface
      for (const iface of configuration.interfaces) {
        for (const alternate of iface.alternates) {
          const inEndpoint = alternate.endpoints.find(e => e.direction === 'in');
          const outEndpoint = alternate.endpoints.find(e => e.direction === 'out');
          
          if (inEndpoint && outEndpoint) {
            this.interfaceNumber = iface.interfaceNumber;
            this.endpointIn = inEndpoint.endpointNumber;
            this.endpointOut = outEndpoint.endpointNumber;
            break;
          }
        }
      }

      // Claim interface
      await this.device.claimInterface(this.interfaceNumber);

      // Set up baud rate if supported (control transfer)
      try {
        await this.device.controlTransferOut({
          requestType: 'class',
          recipient: 'interface',
          request: 0x20, // SET_LINE_CODING
          value: 0x0000,
          index: this.interfaceNumber,
        }, new Uint8Array([
          0x00, 0xC2, 0x01, 0x00, // 115200 baud
          0x00, // 1 stop bit
          0x00, // no parity
          0x08  // 8 data bits
        ]));
      } catch {
        // Some devices don't support this, continue anyway
      }

      this.connected = true;
      this.logToConsole('success', 'USB connected successfully');

      // Start read loop
      this.readLoopRunning = true;
      this.readLoop();

      return true;

    } catch (error) {
      this.logToConsole('error', `USB connection failed: ${error}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.readLoopRunning = false;
    
    if (this.device) {
      try {
        await this.device.releaseInterface(this.interfaceNumber);
        await this.device.close();
      } catch (error) {
        // Ignore errors during disconnect
      }
      this.device = null;
    }
    
    this.connected = false;
    this.logToConsole('info', 'USB disconnected');
  }

  async sendCommand(command: string): Promise<boolean> {
    return this.sendData(command + '\n');
  }

  async sendData(data: string): Promise<boolean> {
    if (!this.device || !this.connected) {
      this.logToConsole('error', 'Not connected');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      
      await this.device.transferOut(this.endpointOut, bytes);
      
      this.logToConsole('sent', data.trim());
      return true;
    } catch (error) {
      this.logToConsole('error', `Failed to send: ${error}`);
      return false;
    }
  }

  private async readLoop(): Promise<void> {
    while (this.readLoopRunning && this.device && this.connected) {
      try {
        const result = await this.device.transferIn(this.endpointIn, 64);
        
        if (result.data) {
          const decoder = new TextDecoder();
          const data = decoder.decode(result.data);
          
          // Accumulate data
          this.receiveBuffer += data;
          
          // Process complete lines
          const lines = this.receiveBuffer.split('\n');
          this.receiveBuffer = lines.pop() || ''; // Keep incomplete line

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
      } catch (error) {
        if (this.readLoopRunning) {
          this.logToConsole('error', `Read error: ${error}`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }

  getConnectedDevice(): USBDevice | null {
    return this.device;
  }
}

export const usbService = new USBService();
