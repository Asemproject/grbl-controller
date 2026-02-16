// GRBL Types

export interface GRBLStatus {
  state: 'Idle' | 'Run' | 'Hold' | 'Jog' | 'Alarm' | 'Door' | 'Check' | 'Home' | 'Sleep' | 'Unknown';
  mpos: { x: number; y: number; z: number; a?: number; b?: number; c?: number };
  wpos: { x: number; y: number; z: number; a?: number; b?: number; c?: number };
  feedRate: number;
  spindleSpeed: number;
  pinState?: string;
  buffer: number;
  lineNumber?: number;
}

export interface GRBLSettings {
  [key: number]: number;
}

export interface ConnectionConfig {
  type: 'wifi' | 'bluetooth' | 'usb';
  address?: string;
  port?: number;
  device?: unknown;
}

export interface GCodeFile {
  id: string;
  name: string;
  content: string[];
  size: number;
  createdAt: number;
}

export interface JogConfig {
  stepSize: number;
  feedRate: number;
}

export type Axis = 'X' | 'Y' | 'Z' | 'A' | 'B' | 'C';

export interface Macro {
  id: string;
  name: string;
  commands: string;
  color?: string;
}

export interface ConsoleMessage {
  id: string;
  type: 'sent' | 'received' | 'error' | 'info' | 'success';
  message: string;
  timestamp: number;
}

export interface ProbeConfig {
  feedRate: number;
  maxTravel: number;
  plateThickness: number;
}

export interface WorkCoordinate {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
}
