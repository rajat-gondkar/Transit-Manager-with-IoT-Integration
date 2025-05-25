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
