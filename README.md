# Shared Schema Server

A real-time data synchronization server that enables seamless communication between multiple clients through WebSocket connections. Perfect for interactive applications, digital installations, and multi-device experiences.

## 🔗 Works with PandaSuite

This server is the **local version** of the PandaSuite **App-to-App component**. While PandaSuite provides a hosted remote server by default, this local server offers additional capabilities:

- **✅ Offline usage** - No internet connection required
- **✅ Serial port support** - Connect Arduino, Raspberry Pi, and other hardware
- **✅ TUIO integration** - Support for multitouch and tangible interfaces
- **✅ Custom SSL certificates** - Enhanced security and configuration options

**📚 Learn more:** [PandaSuite App-to-App Documentation](https://docs.pandasuite.com/essentials/components/app-to-app/)

> **Quick tip:** Use this server when you need offline functionality, hardware integration, or TUIO support. For simple multi-device apps, the default PandaSuite remote server works perfectly!

## 🚀 Features

- **Real-time synchronization**: Share JSON data between multiple clients in real-time
- **Serial port integration**: Connect hardware devices via serial communication
- **Raw UDP input**: Receive messages sent by devices on the local network
- **TUIO support**: Handle touch and tangible interface data
- **HTTPS/WSS support**: Secure connections with SSL certificates
- **Cross-platform**: Available as standalone executables for Windows, macOS, and Linux
- **Room-based**: Organize clients into separate data spaces

## 📋 Table of Contents

- [Works with PandaSuite](#-works-with-pandasuite)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Command Line Options](#command-line-options)
- [HTTPS Setup](#https-setup)
- [Serial Port Integration](#serial-port-integration)
- [UDP Integration](#udp-integration)
- [TUIO Integration](#tuio-integration)
- [API Documentation](#api-documentation)
- [Development](#development)

## ⚡ Quick Start

### Using Executables (Recommended)

1. **Download** the latest executable from [GitHub Releases](https://github.com/pandasuite/shared-schema/releases)
2. **Run** the executable:

   ```bash
   # macOS/Linux
   ./shared-schema-macos

   # Windows
   shared-schema-win.exe
   ```

3. **Connect** clients to:
   - `ws://localhost:3000` (HTTP)
   - `wss://localhost:3443` (HTTPS)
   - `wss://shared-schema.panda.st:3443` (HTTPS with domain - requires [HTTPS setup](#https-setup))

### Using Node.js

1. **Clone and install**:

   ```bash
   git clone https://github.com/pandasuite/shared-schema.git
   cd shared-schema
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

## 📦 Installation

### Prerequisites

- **For executables**: No additional requirements
- **For Node.js**: Node.js 16+ required
- **For M1 Mac users**: Rosetta must be installed:
  ```bash
  softwareupdate --install-rosetta
  ```

### From Source

```bash
git clone https://github.com/pandasuite/shared-schema.git
cd shared-schema
npm install
npm start
```

## 🎯 Usage

### Basic Server

```bash
# Node.js version
npm start

# Or executable version
./shared-schema-macos
```

### With Serial Port Monitoring

```bash
# Node.js version
node index.js --serial-inspect /dev/ttyUSB0,/dev/ttyACM0

# Executable version
./shared-schema-macos --serial-inspect /dev/ttyUSB0,/dev/ttyACM0

# Custom delimiter
./shared-schema-macos --serial-inspect /dev/ttyUSB0 --delimiter ","
```

### With TUIO Support

```bash
# Enable TUIO on default port 3333
./shared-schema-macos --tuio

# Custom TUIO port with throttling
./shared-schema-macos --tuio 4444 --tuio-throttle 30
```

### Update SSL Certificates

```bash
# Download latest SSL certificates from GitHub releases
./shared-schema-macos --update-certs

# Then start the server normally
./shared-schema-macos
```

## 🛠 Command Line Options

| Option                     | Description                      | Default               |
| -------------------------- | -------------------------------- | --------------------- |
| `--key <file>`             | Path to SSL private key          | `certs/privkey.pem`   |
| `--cert <file>`            | Path to SSL certificate          | `certs/fullchain.pem` |
| `--update-certs`           | Download latest SSL certificates | -                     |
| `--serial-inspect [ports]` | Enable serial port monitoring    | disabled              |
| `--delimiter <delim>`      | Serial data delimiter            | `\n`                  |
| `--udp-inspect <ports>`    | Enable raw UDP input on ports    | disabled              |
| `--tuio [port]`            | Enable TUIO UDP server           | disabled              |
| `--tuio-throttle <ms>`     | TUIO emission throttle           | 16ms                  |

### Environment Variables

- `PORT`: HTTP server port (default: 3000)
- `PORT_HTTPS`: HTTPS server port (default: 3443)

## 🔒 HTTPS Setup

### Quick HTTPS Setup

**Works with both executables and Node.js version**

1. **Download SSL certificates**:

   ```bash
   # For Node.js version
   npm run certs

   # For executables
   ./shared-schema-macos --update-certs
   ```

2. **Configure local DNS** (add to `/etc/hosts`):

   ```
   192.168.1.100    shared-schema.panda.st
   ```

3. **Start server**:

   ```bash
   # Node.js
   npm start

   # Or executable
   ./shared-schema-macos
   ```

4. **Access securely**:
   ```
   https://shared-schema.panda.st:3443
   ```

### Finding Your Local IP

**macOS/Linux**:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows**:

```cmd
ipconfig | findstr "IPv4"
```

### Custom SSL Certificates

```bash
shared-schema --key /path/to/private.key --cert /path/to/certificate.pem
```

## 🔌 Serial Port Integration

Connect and monitor hardware devices like Arduino, Raspberry Pi, sensors, and other serial devices.

### Enable Serial Port Monitoring

```bash
# Single port
shared-schema --serial-inspect /dev/ttyUSB0

# Multiple ports
shared-schema --serial-inspect /dev/ttyUSB0,/dev/ttyACM0,COM3

# Custom delimiter (default is newline)
shared-schema --serial-inspect /dev/ttyUSB0 --delimiter ","
```

### Using Serial Data with PandaSuite

1. **Connect your hardware** (Arduino, Raspberry Pi, etc.) via USB/serial
2. **Start the server** with serial inspection:
   ```bash
   ./shared-schema-macos --serial-inspect /dev/ttyUSB0
   ```
3. **In PandaSuite Studio**:
   - Add the **App-to-App component**
   - Configure it to connect to your local server
   - Set a room name for your project

4. **Access serial data** in PandaSuite through the component data at `serialData[portName]`

**Data Format**: Serial data is automatically added to the shared schema under `serialData[portName]`.

**Example**: If your Arduino sends `{"temperature": 25.6}` on `/dev/ttyUSB0`, it becomes available in PandaSuite at `serialData["/dev/ttyUSB0"]`.

## 📡 UDP Integration

Receive raw UDP messages sent by devices on the local network: RFID readers, sensors, show controllers, or any hardware that sends a short text to a fixed IP and port.

### Enable UDP Input

```bash
# Single port
shared-schema --udp-inspect 8001

# Multiple ports, as one comma-separated list
shared-schema --udp-inspect 8001,8002
```

The server listens on every network interface, so point the device at the IP of the machine running the server. Entries that are not a port number between 1 and 65535 are ignored with a log line. Port 3333 is taken by the TUIO listener, which is always on.

### Using UDP Data with PandaSuite

1. **Start the server** with the port(s) your device sends to:
   ```bash
   ./shared-schema-macos --udp-inspect 8001
   ```
2. **In PandaSuite Studio**, add the **App-to-App component**, connect it to your local server and set a room name.
3. **Access UDP data** in PandaSuite through the component data at `udpData[port]`.

**Data Format**: Each message received on a port is stored under `udpData[port]`:

```json
{
  "message": "1,ON",
  "from": "192.168.1.100",
  "seq": 12
}
```

- `message` is the text the device sent, read as UTF-8 (trailing line breaks are removed).
- `from` is the IP address of the sender.
- `seq` counts the messages received on that port since the server started, so the same message sent twice still changes the data.

The last message stays in the shared data: a client that connects later receives it right away, like serial data.

**Reacting to every message**: PandaSuite refreshes a binding when the value it points to changes. When a device sends the same text twice in a row, only `seq` changes, so bind the whole `udpData["8001"]` object (or `seq`) rather than `message` alone to react to every message, repeats included; a condition on that binding is evaluated again on each message.

**Example**: An RFID reader sends `1,ON` when tag 1 is placed and `1,OFF` when it is removed. Bind `udpData["8001"]`, read the tag number and the state from its `message` with the `split` function, then use a condition to open the matching section.

## 👆 TUIO Integration

TUIO (Tangible User Interface Objects) support for touch and tangible interface data. Perfect for multitouch tables, interactive surfaces, and physical object tracking.

### Enable TUIO Server

```bash
# Enable TUIO on default port 3333
shared-schema --tuio

# Custom port
shared-schema --tuio 4444

# Adjust emission rate (lower = more frequent updates)
shared-schema --tuio --tuio-throttle 30
```

### Using TUIO with PandaSuite

1. **Start the server** with TUIO enabled:

   ```bash
   ./shared-schema-macos --tuio
   ```

2. **Configure HTTPS** (recommended for web apps):
   - Follow the [HTTPS setup](#https-setup) to use `shared-schema.panda.st`

3. **In PandaSuite Studio**:
   - Add the **App-to-App component**
   - Set server URL to `wss://shared-schema.panda.st:3443`
   - Configure a room name

4. **Send TUIO data** from your TUIO source (touch table, simulator, etc.) to port 3333

5. **Access TUIO data** in PandaSuite through the App-to-App component data

**Supported TUIO Types**: 2D cursor, 2D object, 2D blob, 2.5D cursor, 2.5D object, 2.5D blob, 3D cursor, 3D object, 3D blob

**Testing**: Use [TUIO Simulator](http://tuio.org/?software) or similar tools to generate test data.

## 📡 API Documentation

### Using with PandaSuite App-to-App Component

To use this local server with PandaSuite:

1. **In PandaSuite Studio**, add the **App-to-App component** to your project
2. **Configure the component** with your local server URL:
   - For HTTP: `ws://localhost:3000`
   - For HTTPS: `wss://shared-schema.panda.st:3443` (requires [HTTPS setup](#https-setup))
3. **Set a room name** to isolate your project's data
4. **Use PandaSuite actions** to modify and read data through the component

The App-to-App component automatically handles the WebSocket connection and data synchronization.

### Direct WebSocket Connection

For non-PandaSuite applications, connect directly using Socket.IO:

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000', {
  query: { room: 'myRoom' }, // Optional: join specific room
});

// Listen for schema updates
socket.on('schema', (data) => {
  console.log('Received schema:', data);
});

// Send schema updates
const myData = { temperature: 25, humidity: 60 };
socket.emit('schema', myData);
```

### Room-based Communication

Clients can join specific rooms to isolate their data:

```javascript
// Room 'room1'
const socket1 = io('ws://localhost:3000?room=room1');

// Room 'room2'
const socket2 = io('ws://localhost:3000?room=room2');
```

### Schema Updates

The server uses JSON patches for efficient data synchronization:

```javascript
// Initial schema
{ "temperature": 20 }

// Update (patch)
socket.emit('schema', [{ "op": "replace", "path": "/temperature", "value": 25 }]);

// Resulting schema
{ "temperature": 25 }
```

## 🔧 Development

### Building Executables

```bash
# Build for all platforms
npm run build

# Creates executables in dist/:
# - shared-schema-linux
# - shared-schema-macos
# - shared-schema-win.exe
```

### Running Tests

```bash
npm test
```

### Creating Releases

```bash
npm run release
```

### Virtual Serial Ports (Development)

Create virtual serial ports for testing:

```bash
npm run serial-port
# Creates /dev/ttyV0 and /dev/ttyV1
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/pandasuite/shared-schema/issues)
- **Documentation**: This README and inline code comments
- **Community**: Open source project by PandaSuite
