import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { MapData, Bus, Stop, Position } from '../types';
import { initialMapData } from '../data/mapData';
import { 
  incrementStationVisit, 
  resetStationCounts, 
  setAutomationStatus 
} from '../utils/stationTracker';

// Graph representation for Dijkstra's algorithm
interface Graph {
  [key: string]: {
    [key: string]: number;
  };
}

// Node with distance for priority queue
interface Node {
  id: string;
  distance: number;
}

interface TransitContextProps {
  mapData: MapData;
  addPassenger: (busId: string) => void;
  removePassenger: (busId: string) => void;
  moveBusToNextStop: (busId: string) => void;
  busAnimations: Record<string, BusAnimation>;
  autoMode: boolean;
  toggleAutoMode: () => void;
  visualRoutes: Record<string, RouteInfo>;
  isCalculatingRoute: Record<string, boolean>;
  deploymentTimer: number;
  totalBusesDeployed: number;
}

// Visual route for display
interface RouteInfo {
  id: string;
  coordinates: [number, number][];
  isMainRoad: boolean;
  from: string;
  to: string;
  isActive?: boolean; // Add flag to track currently active routes
}

// New interface to track bus animations
interface BusAnimation {
  isMoving: boolean;
  startPosition: Position;
  endPosition: Position;
  isUsingMainRoad: boolean;
  progress: number;
  routePath?: Position[]; // Array of positions representing the route
  routeIndex?: number;    // Current index in the route path
  totalDistance?: number; // Total distance to travel
  velocity: number;      // Pixels per frame
}

// Interface to track bus direction state
interface BusDirection {
  isMovingForward: boolean; // true if moving from A→D, false if moving from D→A
}

// Add constant for bus velocity (adjust this value to change overall speed)
const BASE_BUS_VELOCITY = 0.8; // Reduced from 2 to 0.8 pixels per frame at 30fps
const MAIN_ROAD_VELOCITY_MULTIPLIER = 1.2; // Reduced from 1.5 to 1.2 for smoother express movement

// Helper function to calculate distance between two points
const calculateDistance = (pos1: Position, pos2: Position): number => {
  const dx = (pos2.x - pos1.x);
  const dy = (pos2.y - pos1.y);
  return Math.sqrt(dx * dx + dy * dy);
};

const TransitContext = createContext<TransitContextProps | undefined>(undefined);

interface TransitProviderProps {
  children: ReactNode;
}

// Helper function to find the next main stop in a route
const findNextMainStop = (route: Stop[], currentIndex: number, isMovingForward: boolean): number => {
  if (isMovingForward) {
    for (let i = currentIndex + 1; i < route.length; i++) {
      if (route[i].isMainStop) {
        return i;
      }
    }
  } else {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (route[i].isMainStop) {
        return i;
      }
    }
  }
  
  // If no main stop is found, return the current index
  return currentIndex;
};

// Create a direct path between two main stops using the main road
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createDirectPath = (bus: Bus, nextMainStopIndex: number): Stop[] => {
  const currentStop = bus.route[bus.currentStopIndex];
  const nextMainStop = bus.route[nextMainStopIndex];
  
  return [
    currentStop,
    nextMainStop
  ];
};

export const TransitProvider: React.FC<TransitProviderProps> = ({ children }) => {
  const [mapData, setMapData] = useState<MapData>(initialMapData);
  // New state for bus animations
  const [busAnimations, setBusAnimations] = useState<Record<string, BusAnimation>>({});
  // Track direction for each bus
  const [busDirections, setBusDirections] = useState<Record<string, BusDirection>>({
    'Bus1': { isMovingForward: true }  // Bus1 starts moving from A→D (forward)
  });
  // Add auto mode toggle state
  const [autoMode, setAutoMode] = useState<boolean>(false);
  // Use useRef instead of state to track the timer to prevent re-renders
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Store all route paths between stops
  const [routePaths, setRoutePaths] = useState<Record<string, Position[]>>({});
  // Use a different approach for route visualization - directly prepare the data
  const [visualRoutes, setVisualRoutes] = useState<Record<string, RouteInfo>>({});
  // Graph representation of the transit network
  const [transitGraph, setTransitGraph] = useState<Graph>({});
  
  // Add a ref to track the last stop where passengers were managed
  const lastPassengerStopRef = useRef<Record<string, string>>({});
  
  // Add a state to track route calculation status
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<Record<string, boolean>>({});
  
  // Add these new states and refs near the top of TransitProvider
  const [deploymentTimer, setDeploymentTimer] = useState<number>(45);
  const [totalBusesDeployed, setTotalBusesDeployed] = useState<number>(1); // Start with 1 bus
  const deploymentIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add this near the top with other refs
  const isDeployingRef = useRef<boolean>(false);
  const deploymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Build transit graph from stops
  const buildTransitGraph = useCallback(async () => {
    console.log("Building transit graph");
    const graph: Graph = {};
    const { stops } = mapData;
    
    // Initialize graph with all stops
    stops.forEach(stop => {
      graph[stop.id] = {};
    });
    
    // Print all stop IDs for debugging
    console.log("All stop IDs:", stops.map(stop => stop.id).join(", "));
    
    // Add edges between consecutive stops with low weight to prioritize the defined route
    for (let i = 0; i < stops.length - 1; i++) {
      const fromStop = stops[i];
      const toStop = stops[i + 1];
      
      // Calculate distance between stops
      const distance = Math.sqrt(
        Math.pow((fromStop.position.lat || 0) - (toStop.position.lat || 0), 2) +
        Math.pow((fromStop.position.lng || 0) - (toStop.position.lng || 0), 2)
      );
      
      // Add bidirectional edge with weight priority for the defined route
      graph[fromStop.id][toStop.id] = distance * 0.8; // Lower weight for defined route
      graph[toStop.id][fromStop.id] = distance * 0.8;
      
      console.log(`Added direct route: ${fromStop.id} <--> ${toStop.id}, weight: ${distance * 0.8}`);
    }
    
    // Connect all main stops to each other directly for express routes
    const mainStops = stops.filter(stop => stop.isMainStop);
    for (let i = 0; i < mainStops.length; i++) {
      for (let j = i + 1; j < mainStops.length; j++) {
        const fromStop = mainStops[i];
        const toStop = mainStops[j];
        
        // Calculate distance for main stop connection (if not already connected)
        if (!graph[fromStop.id][toStop.id]) {
          const distance = Math.sqrt(
            Math.pow((fromStop.position.lat || 0) - (toStop.position.lat || 0), 2) +
            Math.pow((fromStop.position.lng || 0) - (toStop.position.lng || 0), 2)
          );
          
          // Express routes between main stops
          graph[fromStop.id][toStop.id] = distance;
          graph[toStop.id][fromStop.id] = distance;
          
          console.log(`Added express route: ${fromStop.id} <--> ${toStop.id}, weight: ${distance}`);
        }
      }
    }
    
    // Ensure full connectivity by making a complete graph
    // This guarantees that every stop can reach every other stop
    for (let i = 0; i < stops.length; i++) {
      for (let j = 0; j < stops.length; j++) {
        if (i === j) continue; // Skip self-connections
        
        const fromStop = stops[i];
        const toStop = stops[j];
        
        // If connection doesn't exist yet, create one with higher weight
        if (!graph[fromStop.id][toStop.id]) {
          const distance = Math.sqrt(
            Math.pow((fromStop.position.lat || 0) - (toStop.position.lat || 0), 2) +
            Math.pow((fromStop.position.lng || 0) - (toStop.position.lng || 0), 2)
          ) * 1.5; // Higher weight for non-preferred connections
          
          graph[fromStop.id][toStop.id] = distance;
          graph[toStop.id][fromStop.id] = distance;
          
          console.log(`Added fallback route: ${fromStop.id} <--> ${toStop.id}, weight: ${distance}`);
        }
      }
    }
    
    // Add specific connection between Panathur and Bellandur
    const panathur = stops.find(stop => stop.id === "Panathur");
    const bellandur = stops.find(stop => stop.id === "Bellandur");
    
    if (panathur && bellandur) {
      const distance = Math.sqrt(
        Math.pow((panathur.position.lat || 0) - (bellandur.position.lat || 0), 2) +
        Math.pow((panathur.position.lng || 0) - (bellandur.position.lng || 0), 2)
      );
      
      // Add direct connection with lower weight to prioritize this path
      graph["Panathur"]["Bellandur"] = distance * 0.7;
      graph["Bellandur"]["Panathur"] = distance * 0.7;
      
      console.log(`Added specific route: Panathur <--> Bellandur, weight: ${distance * 0.7}`);
    } else {
      console.error("Could not find Panathur or Bellandur stops!");
    }
    
    // Log the complete graph structure for debugging
    console.log("Transit graph built with the following connections:");
    Object.keys(graph).forEach(from => {
      Object.keys(graph[from]).forEach(to => {
        console.log(`${from} --> ${to}: ${graph[from][to]}`);
      });
    });
    
    setTransitGraph(graph);
  }, [mapData.stops]);
  
  // Modified Dijkstra algorithm with better error handling and debugging
  const findShortestPath = useCallback((graph: Graph, startNode: string, endNode: string): string[] => {
    console.log(`Finding shortest path from ${startNode} to ${endNode}`);
    
    // Verify that both nodes exist in the graph
    if (!graph[startNode]) {
      console.error(`Start node "${startNode}" not found in graph!`);
      return [];
    }
    
    if (!graph[endNode]) {
      console.error(`End node "${endNode}" not found in graph!`);
      return [];
    }
    
    // Check direct connection for debugging
    console.log(`Direct connection from ${startNode} to ${endNode} exists: ${graph[startNode][endNode] !== undefined}`);
    if (graph[startNode][endNode] !== undefined) {
      console.log(`Direct distance: ${graph[startNode][endNode]}`);
    }
    
    // Set to keep track of visited nodes
    const visited: Set<string> = new Set();
    
    // Map to store distances from start node
    const distances: Map<string, number> = new Map();
    
    // Map to store the previous node in the optimal path
    const previous: Map<string, string | null> = new Map();
    
    // Priority queue implementation (simple array sorted by distance)
    const queue: Node[] = [];
    
    // Initialize distances with infinity for all nodes except start node
    Object.keys(graph).forEach(node => {
      distances.set(node, node === startNode ? 0 : Infinity);
      previous.set(node, null);
      queue.push({ id: node, distance: distances.get(node) || Infinity });
    });
    
    // Sort queue by distance
    const sortQueue = () => {
      queue.sort((a, b) => a.distance - b.distance);
    };
    
    // Main algorithm loop
    while (queue.length > 0) {
      // Sort queue to get node with minimum distance
      sortQueue();
      
      // Get node with minimum distance
      const current = queue.shift();
      if (!current) break;
      
      // Print current node being processed for debugging
      console.log(`Processing node: ${current.id}, distance: ${current.distance}`);
      
      // If we've reached the end node, we're done
      if (current.id === endNode) {
        console.log(`Reached target node ${endNode}!`);
        break;
      }
      
      // If the node is already visited or has infinite distance, skip
      if (visited.has(current.id) || current.distance === Infinity) {
        console.log(`Skipping node ${current.id} - visited: ${visited.has(current.id)}, distance: ${current.distance}`);
        continue;
      }
      
      // Mark node as visited
      visited.add(current.id);
      
      // Get neighbors of current node
      const neighbors = graph[current.id] || {};
      console.log(`Node ${current.id} has ${Object.keys(neighbors).length} neighbors`);
      
      // Update distances to neighbors
      Object.keys(neighbors).forEach(neighbor => {
        if (visited.has(neighbor)) return;
        
        const distance = distances.get(current.id) || Infinity;
        const newDistance = distance + neighbors[neighbor];
        
        // If new distance is better than current, update
        if (newDistance < (distances.get(neighbor) || Infinity)) {
          console.log(`Updated distance to ${neighbor}: ${distances.get(neighbor)} -> ${newDistance}`);
          distances.set(neighbor, newDistance);
          previous.set(neighbor, current.id);
          
          // Update node in queue
          const queueNode = queue.find(n => n.id === neighbor);
          if (queueNode) {
            queueNode.distance = newDistance;
          }
        }
      });
    }
    
    // Build path from start to end
    const path: string[] = [];
    let current = endNode;
    
    if ((previous.get(endNode) === null && startNode !== endNode) || !graph[startNode][endNode]) {
      // If no path is found through Dijkstra, but we know they should be connected,
      // create a direct path as fallback
      console.log("No optimal path found. Creating direct path.");
      return [startNode, endNode];
    }
    
    while (current) {
      path.unshift(current);
      const prev = previous.get(current);
      if (!prev) break;
      current = prev;
    }
    
    console.log("Shortest path found:", path.join(" → "));
    return path;
  }, []);
  
  // Call buildTransitGraph when component mounts
  useEffect(() => {
    buildTransitGraph();
  }, [buildTransitGraph]);
  
  // Find express route from current stop to next main stop using Dijkstra's algorithm
  const findExpressRouteToNextMainStop = useCallback((bus: Bus): Stop[] => {
    console.log("Finding express route to next main stop");
    const currentStop = bus.route[bus.currentStopIndex];
    
    // Determine direction
    const direction = busDirections[bus.id] || { isMovingForward: true };
    const { isMovingForward } = direction;
    
    // Find next main stop in the direction of travel
    const nextMainStopIndex = findNextMainStop(bus.route, bus.currentStopIndex, isMovingForward);
    const nextMainStop = bus.route[nextMainStopIndex];
    
    console.log(`Current stop: ${currentStop.id}, Next main stop: ${nextMainStop.id}, Direction: ${isMovingForward ? 'forward' : 'backward'}`);
    
    if (transitGraph && Object.keys(transitGraph).length > 0) {
      // Use Dijkstra's algorithm to find shortest path
      const path = findShortestPath(transitGraph, currentStop.id, nextMainStop.id);
      
      // Convert path to stops
      const expressRoute = path.map(stopId => {
        return bus.route.find(stop => stop.id === stopId) as Stop;
      });
      
      console.log("Express route found:", expressRoute.map(stop => stop.name));
      return expressRoute;
    }
    
    // Fallback - direct path
    return [currentStop, nextMainStop];
  }, [busDirections, findNextMainStop, findShortestPath, transitGraph]);
  
  // Function to fetch a route between two stops
  const fetchRouteBetweenStops = useCallback(async (fromStop: Stop, toStop: Stop) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromStop.position.lng || 0},${fromStop.position.lat || 0};${toStop.position.lng || 0},${toStop.position.lat || 0}?overview=full&geometries=geojson&steps=true`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        // Create an array of position points from the route
        const routePositions = data.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => ({
            x: 0, // We'll calculate x,y for visualization if needed
            y: 0,
            lat: coord[1],
            lng: coord[0]
          })
        );
        
        return routePositions;
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
    
    // Fallback: direct line between stops
    return [
      { ...fromStop.position },
      { ...toStop.position }
    ];
  }, []);

  // Use useEffect to fetch routes on component mount
  useEffect(() => {
    async function fetchAllRoutes() {
      const routes: Record<string, Position[]> = {};
      const { stops } = mapData;
      
      // Only fetch routes between consecutive stops (regular routes)
      for (let i = 0; i < stops.length - 1; i++) {
        const fromStop = stops[i];
        const toStop = stops[i + 1];
        const key = `${fromStop.id}-${toStop.id}`;
        
        routes[key] = await fetchRouteBetweenStops(fromStop, toStop);
      }
      
      // We'll calculate express routes dynamically when needed
      
      setRoutePaths(routes);
    }
    
    fetchAllRoutes();
  }, [fetchRouteBetweenStops, mapData.stops]);

  // Visualize routes between stops
  const visualizeRoute = useCallback(async (fromId: string, toId: string, isExpress: boolean = false, isActive: boolean = false) => {
    const fromStop = mapData.stops.find(stop => stop.id === fromId);
    const toStop = mapData.stops.find(stop => stop.id === toId);
    
    if (!fromStop || !toStop) return;
    
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromStop.position.lng || 0},${fromStop.position.lat || 0};${toStop.position.lng || 0},${toStop.position.lat || 0}?overview=full&geometries=geojson&steps=true`
      );
      
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        // Convert to leaflet format coordinates for easy visualization
        const routeCoordinates: [number, number][] = data.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );
        
        const routeKey = isExpress ? `express-${fromId}-${toId}` : `${fromId}-${toId}`;
        
        setVisualRoutes(prev => ({
          ...prev,
          [routeKey]: {
            id: routeKey,
            coordinates: routeCoordinates,
            isMainRoad: isExpress,
            from: fromId,
            to: toId,
            isActive: isActive
          }
        }));
        
        // For regular routes, also add the reversed route
        if (!isExpress) {
          const reverseKey = `${toId}-${fromId}`;
          setVisualRoutes(prev => ({
            ...prev,
            [reverseKey]: {
              id: reverseKey,
              coordinates: [...routeCoordinates].reverse() as [number, number][],
              isMainRoad: false,
              from: toId,
              to: fromId,
              isActive: isActive
            }
          }));
        }
        
        return routeCoordinates;
      }
    } catch (error) {
      console.error('Error visualizing route:', error);
    }
    
    return [];
  }, [mapData.stops]);

  // Load regular routes on component mount for visualization
  useEffect(() => {
    async function loadRegularRoutes() {
      // Only load routes between consecutive stops
      for (let i = 0; i < mapData.stops.length - 1; i++) {
        await visualizeRoute(
          mapData.stops[i].id,
          mapData.stops[i + 1].id,
          false, // not express
          false  // not active
        );
      }
      
      // We don't pre-load express routes anymore
    }
    
    loadRegularRoutes();
  }, [mapData.stops, visualizeRoute]);

  // Calculate and visualize express route when bus is full
  const calculateExpressRoute = useCallback(async (bus: Bus): Promise<{routeKey: string, nextStopIndex: number, routePath: Position[]}> => {
    console.log("Calculating express route for full bus");
    const currentStop = bus.route[bus.currentStopIndex];
    
    // Determine direction
    const direction = busDirections[bus.id] || { isMovingForward: true };
    const { isMovingForward } = direction;
    
    // Find next main stop in the direction of travel
    const nextMainStopIndex = findNextMainStop(bus.route, bus.currentStopIndex, isMovingForward);
    const nextMainStop = bus.route[nextMainStopIndex];
    
    console.log(`Full bus at ${currentStop.name}, calculating express route to ${nextMainStop.name}`);
    
    // Default path (fallback)
    let routePath: Position[] = [
      { ...bus.position },
      { ...nextMainStop.position }
    ];
    
    if (transitGraph && Object.keys(transitGraph).length > 0) {
      // Use Dijkstra's algorithm to find shortest path
      const path = findShortestPath(transitGraph, currentStop.id, nextMainStop.id);
      
      if (path.length >= 2) {
        // Calculate and visualize the express route
        const expressRouteKey = `express-${currentStop.id}-${nextMainStop.id}`;
        
        // Mark any previous express routes as inactive
        setVisualRoutes(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            if (key.startsWith('express-') && updated[key].isActive) {
              updated[key] = { ...updated[key], isActive: false };
            }
          });
          return updated;
        });
        
        // Visualize this express route and mark it as active
        const coordinates = await visualizeRoute(currentStop.id, nextMainStop.id, true, true);
        
        if (path.length > 2) {
          console.log(`Calculated optimal express route through ${path.length - 2} intermediate stops`);
        } else {
          console.log(`Calculated direct express route from ${currentStop.name} to ${nextMainStop.name}`);
        }
        
        // Wait a moment to ensure the route is processed
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Get the full route path for animation
        if (visualRoutes[expressRouteKey]) {
          routePath = visualRoutes[expressRouteKey].coordinates.map(coord => ({
            x: 0,
            y: 0,
            lat: coord[0],
            lng: coord[1]
          }));
          console.log(`Express route path loaded with ${routePath.length} points`);
        }
        
        return {
          routeKey: expressRouteKey,
          nextStopIndex: nextMainStopIndex,
          routePath
        };
      }
    }
    
    // Fallback - direct path if Dijkstra failed
    console.log("Using fallback direct express route");
    const fallbackExpressKey = `express-${currentStop.id}-${nextMainStop.id}`;
    await visualizeRoute(currentStop.id, nextMainStop.id, true, true);
    
    // Wait a moment to ensure the route is processed  
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Try to get the route path again
    if (visualRoutes[fallbackExpressKey]) {
      routePath = visualRoutes[fallbackExpressKey].coordinates.map(coord => ({
        x: 0,
        y: 0,
        lat: coord[0],
        lng: coord[1]
      }));
    }
    
    return {
      routeKey: fallbackExpressKey,
      nextStopIndex: nextMainStopIndex,
      routePath
    };
  }, [busDirections, findNextMainStop, findShortestPath, transitGraph, visualizeRoute, visualRoutes]);

  // Move bus to next stop in its route, with rerouting if the bus is full
  const moveBusToNextStop = useCallback(async (busId: string) => {
    // Find bus
    const bus = mapData.buses.find(b => b.id === busId);
    if (!bus) {
      console.error(`Bus ${busId} not found`);
      return;
    }
    
    // Check if we're currently calculating a route for this bus
    if (isCalculatingRoute[busId]) {
      console.log(`Still calculating route for bus ${busId} - please wait...`);
      return;
    }
    
    // Check if the bus is at Bellandur - if so, don't move it
    const currentStop = bus.route[bus.currentStopIndex];
    if (currentStop.id === "Bellandur") {
      console.log(`Bus ${busId} is at final stop Bellandur - no movement`);
      return; // Don't move the bus if it's at Bellandur
    }

    const isFull = bus.currentPassengers >= bus.capacity;
    console.log(`Bus ${busId} at ${currentStop.name} - passengers: ${bus.currentPassengers}/${bus.capacity}, is full: ${isFull}`);
    
    // Get current direction
    const direction = busDirections[busId] || { isMovingForward: bus.id === 'Bus1' };
    let { isMovingForward } = direction;
    
    // Check if we're at the end of the route or beginning
    const isAtEnd = bus.currentStopIndex === bus.route.length - 1;
    const isAtStart = bus.currentStopIndex === 0;
    
    // Determine if we need to reverse direction
    if (isMovingForward && isAtEnd) {
      // At the end going forward, reverse direction
      isMovingForward = false;
    } else if (!isMovingForward && isAtStart) {
      // At the start going backward, reverse direction
      isMovingForward = true;
    }
    
    // Update direction state 
    setBusDirections(prev => ({
      ...prev,
      [busId]: { isMovingForward }
    }));
    
    // Default value for the next stop (will be properly set based on bus state)
    let nextStopIndex = isMovingForward 
      ? Math.min(bus.currentStopIndex + 1, bus.route.length - 1) 
      : Math.max(bus.currentStopIndex - 1, 0);
      
    let routeKey: string;
    let calculatedPath: Position[] = [];
    let isUsingMainRoad = false;
    
    // If the bus is full, we need to calculate the express route before moving
    if (isFull) {
      // Set calculating flag
      setIsCalculatingRoute(prev => ({ ...prev, [busId]: true }));
      
      console.log(`🚌 BUS ${busId} IS FULL - CALCULATING EXPRESS ROUTE WITH DIJKSTRA (Bus will wait)`);
      
      try {
        // First, calculate the next main stop index
        const nextMainStopIndex = findNextMainStop(bus.route, bus.currentStopIndex, isMovingForward);
        const nextMainStop = bus.route[nextMainStopIndex];
        
        console.log(`Express route target: from ${currentStop.name} to ${nextMainStop.name}`);
        
        // Calculate Dijkstra route
        if (transitGraph && Object.keys(transitGraph).length > 0) {
          // Use Dijkstra's algorithm to find shortest path
          const path = findShortestPath(transitGraph, currentStop.id, nextMainStop.id);
          
          if (path.length >= 2) {
            console.log(`Dijkstra path found with ${path.length} stops: ${path.join(' → ')}`);
            
            // Set next stop as the final destination
            nextStopIndex = nextMainStopIndex;
            isUsingMainRoad = true;
            
            // Create the express route key
            routeKey = `express-${currentStop.id}-${nextMainStop.id}`;
            
            // Clear any previous active express routes
            setVisualRoutes(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(key => {
                if (key.startsWith('express-') && updated[key].isActive) {
                  updated[key] = { ...updated[key], isActive: false };
                }
              });
              return updated;
            });
            
            // Calculate and visualize the express route
            try {
              console.log(`Fetching express route from OSRM API: ${currentStop.name} → ${nextMainStop.name}`);
              
              const fromStop = bus.route.find(s => s.id === currentStop.id);
              const toStop = bus.route.find(s => s.id === nextMainStop.id);
              
              if (fromStop && toStop) {
                // Log coordinates for debugging
                console.log(`From coordinates: ${fromStop.position.lat},${fromStop.position.lng}`);
                console.log(`To coordinates: ${toStop.position.lat},${toStop.position.lng}`);
                
                // Fetch the route data from OSRM API with proper URL encoding
                const apiUrl = `https://router.project-osrm.org/route/v1/driving/${fromStop.position.lng},${fromStop.position.lat};${toStop.position.lng},${toStop.position.lat}?overview=full&geometries=geojson&steps=true`;
                console.log(`API URL: ${apiUrl}`);
                
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                  throw new Error(`OSRM API request failed with status ${response.status}`);
                }
                
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                  console.log(`OSRM route data received with ${data.routes[0].geometry.coordinates.length} points`);
                  
                  // Convert coordinates for visualization
                  const routeCoordinates: [number, number][] = data.routes[0].geometry.coordinates.map(
                    (coord: [number, number]) => [coord[1], coord[0]]
                  );
                  
                  // Convert them for animation
                  calculatedPath = routeCoordinates.map(coord => ({
                    x: 0,
                    y: 0,
                    lat: coord[0],
                    lng: coord[1]
                  }));
                  
                  console.log(`Express route calculated with ${calculatedPath.length} points`);
                  
                  // Save the route for visualization
                  setVisualRoutes(prev => ({
                    ...prev,
                    [routeKey]: {
                      id: routeKey,
                      coordinates: routeCoordinates,
                      isMainRoad: true,
                      from: currentStop.id,
                      to: nextMainStop.id,
                      isActive: true
                    }
                  }));
                  
                  // Allow time for route to be properly saved and rendered
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  console.log(`Express route ${routeKey} is now ready for bus movement`);
                } else {
                  console.error("No route found from OSRM API:", data);
                }
              }
            } catch (error) {
              console.error("Error calculating express route:", error);
            }
          } else {
            console.warn("Dijkstra algorithm failed to find a valid path, using fallback");
          }
        }
        
        // If we still don't have a route path (fallback)
        if (calculatedPath.length === 0) {
          console.log("Using fallback direct path for express route");
          nextStopIndex = findNextMainStop(bus.route, bus.currentStopIndex, isMovingForward);
          const nextStop = bus.route[nextStopIndex];
          routeKey = `express-${currentStop.id}-${nextStop.id}`;
          isUsingMainRoad = true;
          
          // Create a simple straight line path
          calculatedPath = [
            { 
              x: bus.position.x, 
              y: bus.position.y,
              lat: bus.position.lat,
              lng: bus.position.lng
            },
            { 
              x: nextStop.position.x, 
              y: nextStop.position.y,
              lat: nextStop.position.lat,
              lng: nextStop.position.lng
            }
          ];
        }
      } catch (error) {
        console.error(`Error in express route calculation:`, error);
      } finally {
        // Clear calculating flag when done
        setIsCalculatingRoute(prev => ({ ...prev, [busId]: false }));
      }
    } else {
      // Normal movement based on current direction
      nextStopIndex = isMovingForward ? bus.currentStopIndex + 1 : bus.currentStopIndex - 1;
      
      // Safety check for index bounds
      if (nextStopIndex < 0) nextStopIndex = 0;
      if (nextStopIndex >= bus.route.length) nextStopIndex = bus.route.length - 1;
      
      const nextStop = bus.route[nextStopIndex];
      routeKey = `${currentStop.id}-${nextStop.id}`;
      
      // Mark any previous routes as inactive
      setVisualRoutes(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key].isActive) {
            updated[key] = { ...updated[key], isActive: false };
          }
        });
        
        // Mark this route as active if it exists
        if (updated[routeKey]) {
          updated[routeKey] = { ...updated[routeKey], isActive: true };
        }
        
        return updated;
      });
      
      // Get route path for animation
      if (visualRoutes[routeKey]) {
        // Use existing route
        calculatedPath = visualRoutes[routeKey].coordinates.map(coord => ({
          x: 0,
          y: 0,
          lat: coord[0],
          lng: coord[1]
        }));
      } else {
        // Fallback to direct line
        console.warn("Regular route not found, creating fallback:", routeKey);
        
        try {
          // Try to fetch the route
          const fromStop = currentStop;
          const toStop = bus.route[nextStopIndex];
          
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${fromStop.position.lng},${fromStop.position.lat};${toStop.position.lng},${toStop.position.lat}?overview=full&geometries=geojson&steps=true`
          );
          
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const routeCoordinates: [number, number][] = data.routes[0].geometry.coordinates.map(
              (coord: [number, number]) => [coord[1], coord[0]]
            );
            
            calculatedPath = routeCoordinates.map(coord => ({
              x: 0,
              y: 0,
              lat: coord[0],
              lng: coord[1]
            }));
            
            // Save for visualization
            setVisualRoutes(prev => ({
              ...prev,
              [routeKey]: {
                id: routeKey,
                coordinates: routeCoordinates,
                isMainRoad: false,
                from: fromStop.id,
                to: toStop.id,
                isActive: true
              }
            }));
            
            // Also save reverse route
            const reverseKey = `${toStop.id}-${fromStop.id}`;
            setVisualRoutes(prev => ({
              ...prev,
              [reverseKey]: {
                id: reverseKey,
                coordinates: [...routeCoordinates].reverse() as [number, number][],
                isMainRoad: false,
                from: toStop.id,
                to: fromStop.id,
                isActive: false
              }
            }));
          }
        } catch (error) {
          console.error("Error fetching route:", error);
        }
        
        // If still no path, use direct line
        if (calculatedPath.length === 0) {
          const nextStop = bus.route[nextStopIndex];
          calculatedPath = [
            { 
              x: bus.position.x, 
              y: bus.position.y,
              lat: bus.position.lat,
              lng: bus.position.lng
            },
            { 
              x: nextStop.position.x, 
              y: nextStop.position.y,
              lat: nextStop.position.lat,
              lng: nextStop.position.lng
            }
          ];
        }
      }
    }
    
    // Ensure we have at least start and end positions
    if (calculatedPath.length < 2) {
      console.warn("Route path has insufficient points, using fallback direct line");
      const nextStop = bus.route[nextStopIndex];
      calculatedPath = [
        { 
          x: bus.position.x, 
          y: bus.position.y,
          lat: bus.position.lat,
          lng: bus.position.lng
        },
        { 
          x: nextStop.position.x, 
          y: nextStop.position.y,
          lat: nextStop.position.lat,
          lng: nextStop.position.lng
        }
      ];
    }
    
    console.log(`Starting animation with route path of ${calculatedPath.length} points`);
    
    // Start the animation with the calculated route
    setBusAnimations(prev => ({
      ...prev,
      [busId]: {
        isMoving: true,
        startPosition: {
          x: bus.position.x,
          y: bus.position.y,
          lat: bus.position.lat,
          lng: bus.position.lng
        },
        endPosition: {
          x: bus.route[nextStopIndex].position.x,
          y: bus.route[nextStopIndex].position.y,
          lat: bus.route[nextStopIndex].position.lat,
          lng: bus.route[nextStopIndex].position.lng
        },
        isUsingMainRoad: isUsingMainRoad,
        progress: 0,
        routePath: calculatedPath,
        routeIndex: 0,
        totalDistance: calculatedPath.reduce((total, point, i) => {
          if (i === 0) return 0;
          return total + calculateDistance(calculatedPath[i - 1], point);
        }, 0),
        velocity: BASE_BUS_VELOCITY * (isUsingMainRoad ? MAIN_ROAD_VELOCITY_MULTIPLIER : 1)
      }
    }));
    
    // Update bus position
    setMapData(prevData => {
      const updatedBuses = prevData.buses.map(b => {
        if (b.id === busId) {
          return {
            ...b,
            currentStopIndex: nextStopIndex
          };
        }
        return b;
      });

      return {
        ...prevData,
        buses: updatedBuses
      };
    });
    
  }, [mapData.buses, busDirections, findNextMainStop, visualRoutes, findShortestPath, transitGraph, isCalculatingRoute]);
  
  // Memoize handleAutoPassengers to prevent dependency changes
  const handleAutoPassengers = useCallback(() => {
    setMapData(prevData => {
      const updatedBuses = prevData.buses.map(bus => {
        const currentStop = bus.route[bus.currentStopIndex];
        let updatedPassengers = bus.currentPassengers;
        
        console.log(`\n--- Passenger Update for Bus ${bus.id} at ${currentStop.name} ---`);
        console.log(`Current passengers: ${updatedPassengers}/${bus.capacity}`);
        
        // Increment the visit count for the current station
        incrementStationVisit(currentStop.name);
        console.log(`Recorded visit at station: ${currentStop.name}`);
        
        // PASSENGER EXIT RULES
        
        // Special case for Bellandur - make all passengers exit at final stop
        if (currentStop.id === "Bellandur") {
          const exiting = updatedPassengers; // All passengers exit at Bellandur
          console.log(`🚶‍♂️ STOP: ${currentStop.name} - All ${exiting} passengers exit at final stop`);
          updatedPassengers = 0; // All passengers exit at Bellandur
        } 
        // Main stops: 1-10 passengers exit, no entry
        else if (currentStop.isMainStop && updatedPassengers > 0) {
          // Random number of passengers exit (1-10)
          const exitingPassengers = Math.min(
            Math.floor(Math.random() * 10) + 1, // 1-10 passengers exit
            updatedPassengers
          );
          console.log(`🚶‍♂️ STOP: ${currentStop.name} - ${exitingPassengers} passengers exit (1-10 at main stop)`);
          updatedPassengers -= exitingPassengers;
          console.log(`No new passengers boarding at ${currentStop.name} (main stop - exits only)`);
        }
        // Intermediate stops: 0-10 passengers can enter, no exits
        else if (!currentStop.isMainStop && currentStop.id !== "Bellandur") {
          // Random number of passengers enter (0-10)
          const enteringPassengers = Math.min(
            Math.floor(Math.random() * 11), // 0-10 passengers enter
            bus.capacity - updatedPassengers
          );
          
          if (enteringPassengers > 0) {
            console.log(`🧍‍♂️ STOP: ${currentStop.name} - ${enteringPassengers} new passengers board (0-10 at intermediate stop)`);
            updatedPassengers += enteringPassengers;
            
            // Check if bus is now full
            if (updatedPassengers >= bus.capacity) {
              console.log(`⚠️ BUS NOW FULL: ${updatedPassengers}/${bus.capacity} - Will use express route to next main stop`);
            }
          } else {
            console.log(`No new passengers boarding at ${currentStop.name}`);
          }
        }
        
        console.log(`Final passengers after stop: ${updatedPassengers}/${bus.capacity}`);
        
        return {
          ...bus,
          currentPassengers: updatedPassengers
        };
      });
      
      return {
        ...prevData,
        buses: updatedBuses
      };
    });
  }, []);
  
  // Animation interval - updated for velocity-based movement
  useEffect(() => {
    const animationInterval = setInterval(() => {
      // Check if there are any active animations first, to avoid unnecessary state updates
      const hasActiveAnimations = Object.values(busAnimations).some(anim => anim.isMoving);
      if (!hasActiveAnimations) return; // No need to update state if no animations
      
      setBusAnimations(prevAnimations => {
        const updatedAnimations = { ...prevAnimations };
        let animationCompleted = false;
        let completedBusId = '';
        
        Object.keys(updatedAnimations).forEach(busId => {
          const animation = updatedAnimations[busId];
          if (animation.isMoving) {
            // If we have a route path, move along it
            if (animation.routePath && animation.routePath.length > 1 && animation.routeIndex !== undefined) {
              const routeLength = animation.routePath.length;
              
              // Calculate progress based on velocity and total distance
              const progressIncrement = animation.velocity / (animation.totalDistance || 100);
              const newProgress = animation.progress + progressIncrement;
              
              // Calculate the current segment index
              const currentIndex = Math.min(
                Math.floor(newProgress * (routeLength - 1)),
                routeLength - 2
              );
              
              // If we've moved to a new segment
              if (currentIndex !== animation.routeIndex) {
                updatedAnimations[busId] = {
                  ...animation,
                  routeIndex: currentIndex
                };
                
                // Log the progress through the route
                if (currentIndex % 5 === 0 || currentIndex === routeLength - 2) {
                  console.log(`Bus ${busId} route progress: ${currentIndex + 1}/${routeLength} points (${Math.round(newProgress * 100)}%)`);
                }
              }
              
              // If still moving along the route
              if (newProgress < 1) {
                updatedAnimations[busId] = {
                  ...updatedAnimations[busId],
                  progress: newProgress
                };
              } else {
                // Animation complete
                updatedAnimations[busId] = {
                  ...animation,
                  isMoving: false,
                  progress: 0,
                  routeIndex: 0
                };
                
                animationCompleted = true;
                completedBusId = busId;
                console.log(`Animation completed for bus: ${busId} after following route with ${routeLength} points`);
                
                // Update bus position when animation is complete
                setMapData(prevData => {
                  const updatedBuses = prevData.buses.map(bus => {
                    if (bus.id === busId) {
                      return {
                        ...bus,
                        position: animation.endPosition
                      };
                    }
                    return bus;
                  });
                  
                  return {
                    ...prevData,
                    buses: updatedBuses
                  };
                });
              }
            } else {
              // Fallback to velocity-based direct movement
              const distance = calculateDistance(animation.startPosition, animation.endPosition);
              const progressIncrement = animation.velocity / distance;
              const newProgress = animation.progress + progressIncrement;
              
              if (newProgress < 1) {
                updatedAnimations[busId] = {
                  ...animation,
                  progress: newProgress
                };
              } else {
                // Animation complete
                updatedAnimations[busId] = {
                  ...animation,
                  isMoving: false,
                  progress: 0
                };
                
                animationCompleted = true;
                completedBusId = busId;
                console.log(`Animation completed for bus: ${busId} (fallback)`);
                
                // Update bus position
                setMapData(prevData => {
                  const updatedBuses = prevData.buses.map(bus => {
                    if (bus.id === busId) {
                      return {
                        ...bus,
                        position: animation.endPosition
                      };
                    }
                    return bus;
                  });
                  
                  return {
                    ...prevData,
                    buses: updatedBuses
                  };
                });
              }
            }
          }
        });
        
        // Handle auto passenger management when animation is complete
        if (animationCompleted && autoMode) {
          console.log("Animation completed - checking bus status");
          
          const completedBus = mapData.buses.find(bus => bus.id === completedBusId);
          
          if (completedBus) {
            const currentStop = completedBus.route[completedBus.currentStopIndex];
            const currentStopId = currentStop.id;
            const lastStopId = lastPassengerStopRef.current[completedBusId];
            
            if (currentStopId !== lastStopId) {
              console.log(`Bus ${completedBusId} arrived at ${currentStop.name}`);
              lastPassengerStopRef.current[completedBusId] = currentStopId;
              
              setTimeout(() => {
                // Check if all buses have reached Bellandur
                const allBusesAtBellandur = mapData.buses.every(bus => 
                  bus.route[bus.currentStopIndex].id === "Bellandur"
                );
                
                if (allBusesAtBellandur) {
                  console.log("All buses have reached Bellandur - Resetting station counts");
                  resetStationCounts();
                } else if (currentStop.id === "Bellandur") {
                  console.log(`Bus ${completedBusId} reached Bellandur, waiting for other buses`);
                }
                
                handleAutoPassengers();
              }, 100);
            }
          }
        }
        
        return updatedAnimations;
      });
    }, 33); // 33ms interval for smoother animation (approximately 30fps)
    
    return () => clearInterval(animationInterval);
  }, [autoMode, handleAutoPassengers, mapData.buses, busAnimations]);
  
  // Use a separate effect for checking if any bus is moving
  const anyBusMovingRef = useRef(false);
  
  // Effect to update the anyBusMovingRef
  useEffect(() => {
    const isAnyBusMoving = Object.values(busAnimations).some(animation => animation.isMoving);
    anyBusMovingRef.current = isAnyBusMoving;
    
    // For debugging
    if (autoMode) {
      console.log("Bus moving state updated:", isAnyBusMoving);
    }
  }, [busAnimations, autoMode]);
  
  // Auto movement effect - use async version of moveBusToNextStop
  useEffect(() => {
    // Clear any existing timer first to prevent multiple timers
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    
    // Only set up a new timer if auto mode is on
    if (autoMode) {
      console.log("Auto mode activated - setting up movement timer");
      
      // Create a new timer with a simple structure
      const timer = setInterval(async () => {
        // Get current state of buses to determine movement
        const currentBuses = mapData.buses;
        const isAnyBusMoving = anyBusMovingRef.current;
        const isAnyRouteCalculating = Object.values(isCalculatingRoute).some(calculating => calculating);
        
        console.log("Auto mode timer check - buses moving:", isAnyBusMoving, "routes calculating:", isAnyRouteCalculating);
        
        if (!isAnyBusMoving && !isAnyRouteCalculating) {
          console.log("Auto mode - attempting to move buses");
          
          // Use a for loop with await instead of forEach for async operation
          for (const bus of currentBuses) {
            const currentStop = bus.route[bus.currentStopIndex];
            if (currentStop.id !== "Bellandur") {
              console.log(`Auto mode - moving bus ${bus.id} from ${currentStop.name}`);
              await moveBusToNextStop(bus.id);
              // Add a small delay to ensure animations start properly
              await new Promise(resolve => setTimeout(resolve, 200));
            } else {
              console.log(`Bus ${bus.id} is at Bellandur - no movement`);
            }
          }
        }
      }, 2000); // Reduced interval time for more responsive auto mode
      
      // Store the timer reference
      autoTimerRef.current = timer;
      
      // Clean up function
      return () => {
        if (autoTimerRef.current) {
          clearInterval(autoTimerRef.current);
          autoTimerRef.current = null;
        }
      };
    }
  }, [autoMode, mapData.buses, moveBusToNextStop, isCalculatingRoute]); // Include isCalculatingRoute in dependencies
  
  // Toggle auto mode
  const toggleAutoMode = () => {
    const newAutoMode = !autoMode;
    setAutoMode(newAutoMode);
    setAutomationStatus(newAutoMode);
    if (!newAutoMode) {
      resetStationCounts();
    }
  };
  
  // Calculate current position during animation - updated to follow route path
  const getBusPosition = (busId: string) => {
    const bus = mapData.buses.find(b => b.id === busId);
    const animation = busAnimations[busId];
    
    if (!bus) return { x: 0, y: 0, lat: 0, lng: 0 };
    
    if (animation?.isMoving) {
      // If we have a route path, interpolate between route points
      if (animation.routePath && animation.routePath.length > 1 && animation.routeIndex !== undefined) {
        const routeLength = animation.routePath.length;
        const currentIndex = Math.min(
          Math.floor(animation.progress * (routeLength - 1)),
          routeLength - 2
        );
        const nextIndex = currentIndex + 1;
        
        // Safety check to ensure we don't go out of bounds
        if (nextIndex < routeLength) {
          const current = animation.routePath[currentIndex];
          const next = animation.routePath[nextIndex];
          const segmentProgress = (animation.progress * (routeLength - 1)) % 1;
          
          // Ensure coordinates are valid before interpolating
          if (current && next && typeof current.lat === 'number' && typeof next.lat === 'number' &&
              typeof current.lng === 'number' && typeof next.lng === 'number') {
            // Interpolate between current and next point
            const lat = current.lat + (next.lat - current.lat) * segmentProgress;
            const lng = current.lng + (next.lng - current.lng) * segmentProgress;
            
            // For backwards compatibility, also interpolate x and y
            const x = (current.x || 0) + ((next.x || 0) - (current.x || 0)) * segmentProgress;
            const y = (current.y || 0) + ((next.y || 0) - (current.y || 0)) * segmentProgress;
            
            return { x, y, lat, lng };
          }
        }
      }
      
      // Fallback to direct interpolation with velocity-based progress
      const { startPosition, endPosition, progress } = animation;
      
      // Calculate both x,y for legacy UI and lat,lng for map
      const posX = startPosition.x + (endPosition.x - startPosition.x) * progress;
      const posY = startPosition.y + (endPosition.y - startPosition.y) * progress;
      
      // Calculate lat/lng using linear interpolation
      const lat = startPosition.lat !== undefined && endPosition.lat !== undefined
        ? startPosition.lat + (endPosition.lat - startPosition.lat) * progress
        : bus.position.lat;
        
      const lng = startPosition.lng !== undefined && endPosition.lng !== undefined
        ? startPosition.lng + (endPosition.lng - startPosition.lng) * progress
        : bus.position.lng;
      
      return { 
        x: posX, 
        y: posY,
        lat,
        lng
      };
    }
    
    return bus.position;
  };

  // Add a passenger to a bus
  const addPassenger = (busId: string) => {
    setMapData(prevData => {
      const updatedBuses = prevData.buses.map(bus => {
        if (bus.id === busId) {
          // Check if the bus is at Bellandur - if so, don't allow adding passengers
          const currentStop = bus.route[bus.currentStopIndex];
          if (currentStop.id === "Bellandur") {
            console.log("Can't add passengers at final stop (Bellandur)");
            return bus; // Don't add passengers at Bellandur
          }
          
          // Otherwise add passengers if there's capacity
          if (bus.currentPassengers < bus.capacity) {
            return {
              ...bus,
              currentPassengers: bus.currentPassengers + 1
            };
          }
        }
        return bus;
      });

      return {
        ...prevData,
        buses: updatedBuses
      };
    });
  };

  // Remove a passenger from a bus
  const removePassenger = (busId: string) => {
    setMapData(prevData => {
      const updatedBuses = prevData.buses.map(bus => {
        if (bus.id === busId && bus.currentPassengers > 0) {
          return {
            ...bus,
            currentPassengers: bus.currentPassengers - 1
          };
        }
        return bus;
      });

      return {
        ...prevData,
        buses: updatedBuses
      };
    });
  };

  // Update the positions of all buses based on animations
  const busesWithAnimatedPositions = mapData.buses.map(bus => {
    const animatedPosition = getBusPosition(bus.id);
    return {
      ...bus,
      position: animatedPosition
    };
  });

  // Add a safety function to clear stuck deployment flag
  const clearDeploymentFlag = () => {
    isDeployingRef.current = false;
    if (deploymentTimeoutRef.current) {
      clearTimeout(deploymentTimeoutRef.current);
      deploymentTimeoutRef.current = null;
    }
  };

  // Update the deployNewBus function to handle errors
  const deployNewBus = useCallback(() => {
    try {
      if (totalBusesDeployed >= 4) {
        console.log("Cannot deploy new bus: Maximum buses reached");
        return;
      }

      const newBusId = `Bus${totalBusesDeployed + 1}`;
      console.log(`Deploying new bus: ${newBusId}`);

      setMapData(prevData => {
        // Check if bus with this ID already exists
        if (prevData.buses.some(bus => bus.id === newBusId)) {
          console.log(`Bus ${newBusId} already exists, skipping deployment`);
          return prevData;
        }

        const newBus: Bus = {
          id: newBusId,
          position: {
            x: 100,
            y: 300,
            lat: 12.9347,
            lng: 77.6230
          },
          capacity: 20,
          currentPassengers: 0,
          route: [...prevData.stops],
          currentStopIndex: 0
        };

        // Update bus directions for the new bus
        setBusDirections(prev => ({
          ...prev,
          [newBusId]: { isMovingForward: true }
        }));

        setTotalBusesDeployed(prev => prev + 1);
        console.log(`Bus ${newBusId} deployed. Total buses: ${totalBusesDeployed + 1}/4`);

        return {
          ...prevData,
          buses: [...prevData.buses, newBus]
        };
      });
    } catch (error) {
      console.error("Error deploying new bus:", error);
    }
  }, [totalBusesDeployed]);

  // Update the deployment timer effect
  useEffect(() => {
    if (autoMode && totalBusesDeployed < 4) {
      console.log(`Starting deployment timer. Buses deployed: ${totalBusesDeployed}/4`);
      
      // Clear any existing timers
      clearDeploymentFlag();
      if (deploymentIntervalRef.current) {
        clearInterval(deploymentIntervalRef.current);
        deploymentIntervalRef.current = null;
      }
      
      // Start the countdown
      deploymentIntervalRef.current = setInterval(() => {
        setDeploymentTimer(prev => {
          // Ensure timer doesn't go negative
          if (prev <= 0) {
            // Only attempt deployment if not already deploying and under limit
            if (!isDeployingRef.current && totalBusesDeployed < 4) {
              console.log("Timer reached 0, attempting bus deployment");
              // Set deploying flag
              isDeployingRef.current = true;
              
              // Set a safety timeout to clear the deployment flag after 5 seconds
              deploymentTimeoutRef.current = setTimeout(() => {
                console.log("Safety timeout triggered - clearing deployment flag");
                clearDeploymentFlag();
              }, 5000);
              
              // Deploy new bus with a small delay to ensure state is updated
              setTimeout(() => {
                try {
                  deployNewBus();
                } finally {
                  clearDeploymentFlag();
                }
              }, 100);
            } else {
              console.log("Skipping deployment:", 
                isDeployingRef.current ? "Deployment in progress" : "Maximum buses reached");
            }
            return 45; // Reset timer regardless
          }
          return prev - 1;
        });
      }, 1000);
      
      // Cleanup function
      return () => {
        clearDeploymentFlag();
        if (deploymentIntervalRef.current) {
          clearInterval(deploymentIntervalRef.current);
          deploymentIntervalRef.current = null;
        }
      };
    } else if (!autoMode) {
      // Reset timer and flags when auto mode is turned off
      setDeploymentTimer(45);
      clearDeploymentFlag();
      if (deploymentIntervalRef.current) {
        clearInterval(deploymentIntervalRef.current);
        deploymentIntervalRef.current = null;
      }
    }
  }, [autoMode, totalBusesDeployed, deployNewBus]); // Include deployNewBus in dependencies

  // Make the visualRoutes available in the context
  const contextValue = {
    mapData: {
      ...mapData,
      buses: busesWithAnimatedPositions
    },
    addPassenger,
    removePassenger,
    moveBusToNextStop,
    busAnimations,
    autoMode,
    toggleAutoMode,
    visualRoutes,
    isCalculatingRoute,
    deploymentTimer,
    totalBusesDeployed
  };

  return (
    <TransitContext.Provider value={contextValue}>
      {children}
    </TransitContext.Provider>
  );
};

export const useTransit = (): TransitContextProps => {
  const context = useContext(TransitContext);
  if (!context) {
    throw new Error('useTransit must be used within a TransitProvider');
  }
  return context;
}; 