import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styled from 'styled-components';
import { useTransit } from '../context/TransitContext';
import { Stop } from '../types';

// Fix for Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Create custom icons for different stop types
const mainStopIcon = new L.Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  className: 'main-stop-icon',
});

const intermediateStopIcon = new L.Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  className: 'intermediate-stop-icon',
});

// Larger, more visible bus icon
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // New bus icon
  iconSize: [45, 45], // Larger size
  iconAnchor: [22, 22],
  popupAnchor: [0, -20],
  className: 'bus-icon',
});

// Define Bengaluru center coordinates - updating to be centered on our route
const BENGALURU_CENTER = [12.9514, 77.6600]; // Latitude, Longitude
const DEFAULT_ZOOM = 13; // Closer zoom to better see the route

// Styled components
const MapContainerStyled = styled.div`
  width: 100%;
  height: 650px; // Taller map
  margin: 20px auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
`;

// Better styling for the map components
const MapInfoBox = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  z-index: 1000;
  max-width: 250px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  font-size: 14px;
`;

// BoundsUpdater component to ensure map shows all markers
interface BoundsUpdaterProps {
  stops: Stop[];
}

function BoundsUpdater({ stops }: BoundsUpdaterProps) {
  const map = useMap();
  
  useEffect(() => {
    if (stops && stops.length > 0) {
      const bounds = new L.LatLngBounds(
        stops.map(stop => [stop.position.lat || 0, stop.position.lng || 0] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stops, map]);
  
  return null;
}

// Route tracker for debugging purposes
function RouteTracker() {
  const { mapData, busAnimations } = useTransit();
  
  useEffect(() => {
    // Add a marker to track the bus's path for debugging
    const bus = mapData.buses[0]; // Assume we're tracking the first bus
    if (bus) {
      const animation = busAnimations[bus.id];
      if (animation?.routePath && animation.routeIndex !== undefined) {
        // This lets us see the route points in dev tools if needed
        console.log("Bus following route path with", animation.routePath.length, "points");
        console.log("Current index:", animation.routeIndex);
      }
    }
  }, [mapData.buses, busAnimations]);
  
  return null;
}

// Create a custom div icon for passenger counter
const createBusCounterIcon = (count: number, capacity: number, isAtFinalStop: boolean, isCalculatingRoute: boolean = false) => {
  const isFull = count >= capacity;
  
  let backgroundColor = '#3498db'; // Default blue
  if (isAtFinalStop) backgroundColor = '#27ae60'; // Green for final stop
  else if (isCalculatingRoute) backgroundColor = '#ff9800'; // Orange when calculating
  else if (isFull) backgroundColor = '#e74c3c'; // Red when full
  
  let statusText = `${count}/${capacity}`;
  if (isAtFinalStop) statusText += ' (Final Stop)';
  else if (isCalculatingRoute) statusText += ' (Calculating...)';
  
  return L.divIcon({
    className: 'bus-passenger-counter',
    html: `<div style="
      background-color: ${backgroundColor};
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">${statusText}</div>`,
    iconSize: [isCalculatingRoute ? 130 : (isAtFinalStop ? 90 : 40), 20],
    iconAnchor: [isCalculatingRoute ? 65 : (isAtFinalStop ? 45 : 20), 45] // Position it above the bus icon
  });
};

// Interface for route info
interface RouteInfo {
  id: string;
  coordinates: [number, number][];
  isMainRoad: boolean;
  from: string;
  to: string;
  isActive?: boolean; // Add flag to track active routes
}

const MapComponent: React.FC = () => {
  const { mapData, busAnimations, visualRoutes, isCalculatingRoute } = useTransit();
  const mapRef = useRef<L.Map | null>(null);
  
  // Get all routes for visualization
  const allRoutes: RouteInfo[] = Object.values(visualRoutes);
  
  // Get current bus path for highlighting
  const currentBusPath = (): RouteInfo | null => {
    if (mapData.buses.length === 0) return null;
    
    const bus = mapData.buses[0];
    const animation = busAnimations[bus.id];
    
    if (!animation?.isMoving) return null;
    
    // Determine which route is currently active
    let routeKey;
    
    if (animation.isUsingMainRoad) {
      // Express route between main stops
      const currentStop = bus.route[bus.currentStopIndex - 1]; // From
      const nextStop = bus.route[bus.currentStopIndex]; // To
      routeKey = `express-${currentStop.id}-${nextStop.id}`;
    } else {
      // Regular route between consecutive stops
      const currentStop = bus.route[bus.currentStopIndex - 1]; // From
      const nextStop = bus.route[bus.currentStopIndex]; // To
      routeKey = `${currentStop.id}-${nextStop.id}`;
    }
    
    return visualRoutes[routeKey] || null;
  };
  
  const activeRoute = currentBusPath();
  
  return (
    <MapContainerStyled>
      <MapContainer
        center={BENGALURU_CENTER as L.LatLngExpression}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Draw all routes */}
        {allRoutes.filter(route => !route.isMainRoad || route.isActive).map((route, index) => {
          // Determine route styling based on type and active status
          const isActive = route.isActive || route.id === activeRoute?.id;
          const routeColor = route.isMainRoad ? '#e74c3c' : '#3498db';
          const routeWeight = isActive ? (route.isMainRoad ? 7 : 5) : (route.isMainRoad ? 6 : 4);
          const routeOpacity = isActive ? 1.0 : (route.isMainRoad ? 0.8 : 0.6);
          
          // Force Trinity to Indiranagar route to be dotted, regardless of other properties
          const isTrinityToIndiranagar = 
            (route.from === "Trinity" && route.to === "Indiranagar") || 
            (route.from === "Indiranagar" && route.to === "Trinity");
          
          const dashArray = route.isMainRoad && !isTrinityToIndiranagar ? undefined : "5, 10";
          
          return (
            <Polyline
              key={`route-${route.id}-${index}`}
              positions={route.coordinates}
              color={routeColor}
              weight={routeWeight}
              opacity={routeOpacity}
              dashArray={dashArray}
            >
              <Tooltip sticky>
                {route.isMainRoad && !isTrinityToIndiranagar
                  ? `Express Route (Dijkstra): ${route.from} → ${route.to}` 
                  : `Regular Route: ${route.from} → ${route.to}`}
                {isActive && " (Active)"}
              </Tooltip>
            </Polyline>
          );
        })}
        
        {/* Highlight active express routes with pulsing effect */}
        {allRoutes.filter(route => route.isMainRoad && route.isActive).map((route, index) => (
          <Polyline
            key={`highlight-${route.id}-${index}`}
            positions={route.coordinates}
            color="#ff9800" // Orange highlight color
            weight={9}
            opacity={0.4}
            dashArray="10, 15"
          />
        ))}
        
        {/* Render stops */}
        {mapData.stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.position.lat || 0, stop.position.lng || 0] as L.LatLngExpression} 
            icon={stop.isMainStop ? mainStopIcon : intermediateStopIcon}
          >
            <Popup>
              <div style={{ padding: '5px', textAlign: 'center' }}>
                <strong style={{ fontSize: '16px' }}>{stop.name}</strong>
                <div>{stop.isMainStop ? 'Main Transit Hub' : 'Bus Stop'}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Render buses with custom styling */}
        {mapData.buses.map((bus) => {
          // Check if bus is at Bellandur or if route is calculating
          const isAtFinalStop = bus.route[bus.currentStopIndex].id === "Bellandur";
          const isRoutePlanning = isCalculatingRoute && isCalculatingRoute[bus.id];
          
          return (
            <React.Fragment key={bus.id}>
              {/* Passenger counter above the bus */}
              <Marker
                position={[bus.position.lat || 0, bus.position.lng || 0] as L.LatLngExpression}
                icon={createBusCounterIcon(bus.currentPassengers, bus.capacity, isAtFinalStop, isRoutePlanning)}
                zIndexOffset={1001} // Ensure counter appears above the bus
              />
              
              {/* Calculating route indicator */}
              {isRoutePlanning && (
                <Circle
                  center={[bus.position.lat || 0, bus.position.lng || 0]}
                  radius={100}
                  pathOptions={{
                    color: '#ff9800',
                    fillColor: '#ff9800',
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                >
                  <Tooltip permanent>Calculating optimal route...</Tooltip>
                </Circle>
              )}
              
              {/* Actual bus marker */}
              <Marker
                position={[bus.position.lat || 0, bus.position.lng || 0] as L.LatLngExpression}
                icon={busIcon}
                zIndexOffset={1000} // Ensure bus appears above stops
              >
                <Popup>
                  <div style={{ padding: '5px', textAlign: 'center' }}>
                    <strong style={{ fontSize: '16px', display: 'block', marginBottom: '5px' }}>{bus.id}</strong>
                    <div style={{ fontWeight: 'bold' }}>Passengers: {bus.currentPassengers}/{bus.capacity}</div>
                    <div>Current Stop: {bus.route[bus.currentStopIndex].name}</div>
                    <div style={{ marginTop: '5px', color: isAtFinalStop ? '#27ae60' : (isRoutePlanning ? '#ff9800' : (bus.currentPassengers >= bus.capacity ? '#e74c3c' : '#3498db')) }}>
                      Status: {isAtFinalStop 
                        ? 'Terminated - Final Stop' 
                        : (isRoutePlanning 
                          ? 'Calculating Optimal Route' 
                          : (bus.currentPassengers >= bus.capacity ? 'Full - Using Express Route' : 'Available'))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
        
        {/* Map overlay with info */}
        <MapInfoBox>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '16px' }}>Bengaluru Bus Route</div>
          <div style={{ marginBottom: '5px' }}>
            <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>━━━</span> Express Route (Dijkstra - On Demand)
          </div>
          <div>
            <span style={{ color: '#3498db', fontWeight: 'bold' }}>┈┈┈</span> Regular Route
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px' }}>
            When bus is full, it calculates an express route on-demand using Dijkstra's algorithm.<br/>
            The bus will wait for route calculation to complete before moving.<br/>
            All passengers exit at Bellandur (final stop), and bus stops there permanently.
          </div>
        </MapInfoBox>
        
        {/* Helper components */}
        <BoundsUpdater stops={mapData.stops} />
        <RouteTracker />
      </MapContainer>
    </MapContainerStyled>
  );
};

export default MapComponent; 