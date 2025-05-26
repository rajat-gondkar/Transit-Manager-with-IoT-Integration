# Real-Time Public Transit Management System

An intelligent simulation of a public transit system with dynamic routing, automated passenger management, and IoT integration.

## Features

### Transit Management
- Interactive map visualization using Leaflet
- Real-time passenger boarding and alighting simulation
- Dynamic bus movement with automated routing
- Full capacity detection and intelligent bus deployment
- Multiple buses (up to 4) with staggered deployment intervals

### Intelligent Routing
- Dijkstra's algorithm implementation for optimal route calculation
- Express routes for full buses to next main stations
- Automated deployment of new buses at main stations when existing buses reach capacity
- Smart passenger distribution with reduced boarding rates at previously visited stops

### IoT Integration
- ESP32-based wireless control system
- Physical buttons for each bus:
  - Boarding button (passengers entering)
  - Alighting button (passengers exiting)
  - Movement button (proceed to next stop)
- Real-time data transmission between hardware and web application
- Seamless integration of automated routing with manual control

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- ESP32 microcontrollers (for IoT functionality)

### Installation

1. Clone the repository
2. Change into the project directory
3. Install dependencies:
```
npm install
```

### Running the Application

Start the development server:
```
npm start
```

This will launch the application in your default web browser at [http://localhost:3000](http://localhost:3000).


## Usage

- **Automated Mode**: Toggle to enable fully automated simulation
- **Map View**: Visual representation of the transit system with buses, routes, and stops
- **Bus Controls**: Each bus has manual controls for:
  - Passengers entering
  - Passengers exiting
  - Moving to the next stop
- **Control Panel**: Centralized management dashboard for all buses
- **Deployment Timer**: Shows countdown to next bus deployment

## Implementation Details

The application demonstrates advanced transit management capabilities:
- Route optimization with Dijkstra's algorithm
- Realistic passenger behavior modeling at different stops
- Automatic bus deployment when existing buses reach capacity
- Express routing for full buses between main stations
- WebSocket communication for IoT device integration

## System Architecture
1. **Web Application**: React frontend with TypeScript for type safety
2. **Route Optimization Engine**: JavaScript implementation of Dijkstra's algorithm
3. **IoT Control System**: ESP32-based hardware interface

## Future Roadmap
- Integration with real-time traffic APIs
- Machine learning for predictive passenger load estimation
- Mobile app for on-the-go monitoring
- Multi-city support with different transit networks

## License
This project is licensed under the MIT License - see the LICENSE file for details.

# Transit Manager with ESP32 IoT Integration

This project connects an ESP32 with physical buttons to a React-based transit management dashboard using a Node.js WebSocket relay server. Button presses on the ESP32 are instantly reflected in the web UI.

---

## **1. Prerequisites**
- Node.js and npm installed
- Arduino IDE (for ESP32)
- ESP32 board
- All project files (React app, ESP32 code, Node.js relay server)

---

## **2. Install Dependencies**

### **React App**
Install the WebSocket client:
```sh
npm install reconnecting-websocket
```

### **Node.js Relay Server**
Navigate to the relay server directory and install dependencies:
```sh
cd ws-relay-server
npm install express ws cors
```

### **ESP32**
Install the [arduinoWebSockets](https://github.com/Links2004/arduinoWebSockets) library in Arduino IDE (Library Manager or ZIP import).

---

## **3. Find Your IPv4 Address**
On the machine running the Node.js relay server, open a terminal/command prompt and run:
```sh
ipconfig
```
Look for the `IPv4 Address` under your WiFi adapter (e.g., `192.168.66.4`).

---

## **4. Update IP Addresses in the Code**

### **ESP32 Code**
In `ESP32_Button_WebSocket/Current code.txt`, set these lines to your WiFi and relay server IP:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* relay_host = "192.168.66.4"; // Node.js relay server IP
const int relay_port = 8080;
```

### **React App**
In `src/components/ControlPanel.tsx`, set this line to your relay server IP:
```js
const RELAY_WS_URL = 'ws://192.168.66.4:8080/browser';
```

---

## **5. Run the Node.js Relay Server**
In the `ws-relay-server` directory:
```sh
node server.js
```
You should see:
```
Relay server running on port 8080
```

---

## **6. Upload the ESP32 Code**
- Open the ESP32 code in Arduino IDE.
- Make sure the WiFi and relay IP are set correctly.
- Select the correct board and port.
- Upload the code.
- Open Serial Monitor to confirm:
  - `WiFi connected.`
  - `Connected to relay server`

---

## **7. Run the React App**
In your React project directory:
```sh
npm start
```
- Open your browser to `http://localhost:3000` (or the port shown in your terminal).

---

## **8. Test the System**
- Press a button on the ESP32.
- You should see the event reflected in the React UI.
- The Node.js server terminal should show `ESP32 connected` and `Browser client connected`.

---

## **9. Troubleshooting**
- **Relay not reachable?** Check firewall, IP addresses, and that the server is running.
- **ESP32 not connecting?** Double-check WiFi credentials and relay IP.
- **React not connecting?** Make sure the WebSocket URL is correct and the relay is running.
- **Multiple clients?** The relay server is designed to handle multiple browser clients, but only one ESP32 at a time.
- **If using HTTPS for React:** Browsers may block `ws://` connections. Use HTTP for local testing or set up SSL for the relay.

---

## **10. Full Workflow Summary**
1. **Start the Node.js relay server:**
   ```sh
   cd ws-relay-server
   npm install express ws cors
   node server.js
   ```
2. **Upload the ESP32 code** (with correct WiFi and relay IP).
3. **Start the React app:**
   ```sh
   npm install reconnecting-websocket
   npm start
   ```
4. **Test:** Button presses on the ESP32 should appear in the React UI in real time.

---

**For any issues, check the logs in the Node.js server, React console, and ESP32 Serial Monitor.**
