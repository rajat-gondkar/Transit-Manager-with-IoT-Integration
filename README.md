# Real-Time Public Transit Management System

An interactive simulation of a public transit system with dynamic routing and passenger management.

## Features

- Interactive map with main stops and intermediate stops
- Real-time passenger boarding and alighting
- Bus movement simulation
- Full capacity detection and management
- Control panel for system oversight

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

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

- **Map View**: Visual representation of the transit system with buses and stops
- **Bus Controls**: Each bus has controls for:
  - Passengers entering (+ button)
  - Passengers exiting (- button)
  - Moving to the next stop
- **Control Panel**: Centralized management dashboard for all buses

## Implementation Details

This MVP demonstrates the core functionality described in the project prompt:
- Visualization of buses and stops on a map
- Passenger tracking on buses
- Bus movement between stops
- Dynamic capacity management

Future improvements could include:
- Dijkstra's algorithm for rerouting full buses
- Animated transitions for bus movements
- Predictive analytics for demand forecasting
- Real-time passenger wait simulation
