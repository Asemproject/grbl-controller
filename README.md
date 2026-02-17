# GRBL Controller

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PWA](https://img.shields.io/badge/PWA-Ready-blue.svg)](https://web.dev/progressive-web-apps/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

A modern, minimalist PWA (Progressive Web App) for controlling GRBL-based CNC machines. Supports FluidNC and GRBLHAL firmware with WiFi, Bluetooth, and USB connections.

![CNC Controller] (https://asemproject.github.io/grbl-controller/)

## ✨ Features

### 🔌 Multi-Protocol Connection
- **WiFi** - Connect to FluidNC via WebSocket
- **Bluetooth** - Connect to BLE UART modules (HC-05, HM-10, etc.)
- **USB** - Direct USB connection via WebUSB API (CH340, FT232, CP210x, Arduino)

### 🎮 CNC Control
- **DRO (Digital Readout)** - Real-time X, Y, Z coordinate display
- **Jog Control** - Manual axis control with configurable step sizes and feed rates
- **Homing** - Auto-homing for all axes
- **Feed Hold / Cycle Start** - Pause and resume operations
- **Soft Reset & Unlock** - Reset controller and unlock alarm state

### 📝 G-Code Management
- **G-Code Sender** - Send G-code files to your CNC machine
- **File Manager** - Store and manage G-code files locally
- **Progress Tracking** - Monitor file sending progress
- **Line-by-line Sending** - Reliable streaming with flow control

### ⚙️ Additional Tools
- **Console** - Interactive terminal for manual commands
- **Macros** - Save and execute custom G-code macros
- **Settings** - View and edit GRBL parameters ($$)
- **Work Coordinates** - Set and manage work coordinate systems (G54-G59)

## 📱 Installation

### As PWA (Recommended)

#### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the menu (⋮) → "Add to Home screen"
3. The app will be installed and accessible from your home screen

#### iOS (Safari)
1. Open the app URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. The app will be installed on your device

#### Desktop (Chrome/Edge)
1. Open the app URL
2. Click the install icon in the address bar
3. Or go to Menu → "Install GRBL Controller"

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/grbl-controller.git
cd grbl-controller

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔧 Usage Guide

### Connecting to Your CNC

#### WiFi (FluidNC)
1. Select the "WiFi" tab
2. Enter your FluidNC IP address (default: `192.168.4.1`)
3. Enter the WebSocket port (default: `81`)
4. Click "Connect WiFi"

#### Bluetooth
1. Select the "Bluetooth" tab
2. Click "Connect Bluetooth"
3. Select your BLE device from the list
4. The app will automatically connect using Nordic UART Service

#### USB
1. Select the "USB" tab
2. Connect your CNC controller via USB cable
3. Click "Connect USB"
4. Select your device from the browser prompt

**Supported USB Chips:**
- CH340/CH341
- FT232R/FT2232/FT4232
- CP210x
- Arduino (Uno, Mega, etc.)
- STM32 Virtual COM
- Teensy

### Jogging

1. Select your desired step size (0.01mm - 100mm)
2. Select feed rate (100 - 5000 mm/min)
3. Use the directional buttons to move each axis
4. The center dot indicates the origin position

### Sending G-Code

1. Go to "G-Code Sender" from the menu
2. Click "Load" to upload a G-code file (.gcode, .nc, .tap, .txt)
3. Select the file from the list
4. Click "Send" to start sending
5. Use Pause/Stop buttons to control the operation

### Creating Macros

1. Go to "Macros" from the menu
2. Click "Add" to create a new macro
3. Enter a name and G-code commands (one per line)
4. Click the play button to execute

## 🛠️ Development

### Tech Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** React Hooks + Context
- **PWA:** Service Worker + Web App Manifest

### Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   └── grbl/         # GRBL-specific components
│       ├── ConnectionPanel.tsx
│       ├── DRO.tsx
│       ├── JogControl.tsx
│       ├── Console.tsx
│       ├── GCodeSender.tsx
│       ├── Macros.tsx
│       ├── Settings.tsx
│       ├── Header.tsx
│       └── Sidebar.tsx
├── services/
│   ├── ConnectionService.ts    # Base connection class
│   ├── WiFiService.ts          # WebSocket implementation
│   ├── BluetoothService.ts     # Web Bluetooth API
│   ├── USBService.ts           # WebUSB API
│   └── GRBLService.ts          # Main GRBL controller
├── types/
│   └── grbl.ts                 # TypeScript interfaces
├── App.tsx
├── main.tsx
└── index.css
```

### Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| WiFi (WebSocket) | ✅ | ✅ | ✅ | ✅ |
| Bluetooth (Web Bluetooth) | ✅ | ✅ | ❌ | ❌ |
| USB (WebUSB) | ✅ | ✅ | ❌ | ❌ |

*Note: For Bluetooth and USB, Chrome or Edge on Android/Windows is recommended.*

## 🌐 Browser APIs Used

- **WebSocket** - For WiFi connections
- **Web Bluetooth API** - For BLE connections
- **WebUSB API** - For USB serial connections
- **Service Worker** - For offline support
- **LocalStorage** - For settings and file storage

## 🔒 Security Notes

- Web Bluetooth and WebUSB require secure context (HTTPS or localhost)
- User permission is required for each device connection
- No data is sent to external servers - all processing is local

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [GRBL](https://github.com/gnea/grbl) - The popular open-source CNC controller
- [FluidNC](https://github.com/bdring/FluidNC) - Advanced GRBL firmware for ESP32
- [GRBLHAL](https://github.com/grblHAL) - 32-bit GRBL port
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/grbl-controller/issues) page
2. Create a new issue with detailed information
3. Include your browser version and CNC controller details

---

**Made with ❤️ for the CNC community**
