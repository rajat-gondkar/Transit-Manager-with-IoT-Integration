import { MapData } from '../types';

// Define initial map data with main stops (A, B, C, D) and intermediate stops in a linear layout
export const initialMapData: MapData = {
  stops: [
    // Main stops - now in a linear layout with more spacing
    { id: "A", name: "Main Stop A", position: { x: 100, y: 300 }, isMainStop: true },
    { id: "B", name: "Main Stop B", position: { x: 350, y: 300 }, isMainStop: true },
    { id: "C", name: "Main Stop C", position: { x: 650, y: 300 }, isMainStop: true },
    { id: "D", name: "Main Stop D", position: { x: 900, y: 300 }, isMainStop: true },
    
    // Intermediate stops between A and B - more spaced out
    { id: "AB1", name: "Stop AB1", position: { x: 175, y: 300 }, isMainStop: false },
    { id: "AB2", name: "Stop AB2", position: { x: 250, y: 300 }, isMainStop: false },
    { id: "AB3", name: "Stop AB3", position: { x: 300, y: 300 }, isMainStop: false },
    
    // Intermediate stops between B and C - more spaced out
    { id: "BC1", name: "Stop BC1", position: { x: 425, y: 300 }, isMainStop: false },
    { id: "BC2", name: "Stop BC2", position: { x: 500, y: 300 }, isMainStop: false },
    { id: "BC3", name: "Stop BC3", position: { x: 575, y: 300 }, isMainStop: false },
    
    // Intermediate stops between C and D - more spaced out
    { id: "CD1", name: "Stop CD1", position: { x: 725, y: 300 }, isMainStop: false },
    { id: "CD2", name: "Stop CD2", position: { x: 775, y: 300 }, isMainStop: false },
    { id: "CD3", name: "Stop CD3", position: { x: 825, y: 300 }, isMainStop: false },
  ],
  
  roads: [
    // Regular roads connecting intermediate stops - now linear with more space
    // A to B route
    { from: "A", to: "AB1", isMainRoad: false },
    { from: "AB1", to: "AB2", isMainRoad: false },
    { from: "AB2", to: "AB3", isMainRoad: false },
    { from: "AB3", to: "B", isMainRoad: false },
    
    // B to C route
    { from: "B", to: "BC1", isMainRoad: false },
    { from: "BC1", to: "BC2", isMainRoad: false },
    { from: "BC2", to: "BC3", isMainRoad: false },
    { from: "BC3", to: "C", isMainRoad: false },
    
    // C to D route
    { from: "C", to: "CD1", isMainRoad: false },
    { from: "CD1", to: "CD2", isMainRoad: false },
    { from: "CD2", to: "CD3", isMainRoad: false },
    { from: "CD3", to: "D", isMainRoad: false },
    
    // Main roads connecting main stops directly - still linear but parallel above the regular route
    { from: "A", to: "B", isMainRoad: true },
    { from: "B", to: "C", isMainRoad: true },
    { from: "C", to: "D", isMainRoad: true },
  ],
  
  buses: [
    {
      id: "Bus1",
      position: { x: 100, y: 300 },
      capacity: 20,
      currentPassengers: 0,
      route: [
        // Full route from A to D with adjusted positions
        { id: "A", name: "Main Stop A", position: { x: 100, y: 300 }, isMainStop: true },
        { id: "AB1", name: "Stop AB1", position: { x: 175, y: 300 }, isMainStop: false },
        { id: "AB2", name: "Stop AB2", position: { x: 250, y: 300 }, isMainStop: false },
        { id: "AB3", name: "Stop AB3", position: { x: 300, y: 300 }, isMainStop: false },
        { id: "B", name: "Main Stop B", position: { x: 350, y: 300 }, isMainStop: true },
        { id: "BC1", name: "Stop BC1", position: { x: 425, y: 300 }, isMainStop: false },
        { id: "BC2", name: "Stop BC2", position: { x: 500, y: 300 }, isMainStop: false },
        { id: "BC3", name: "Stop BC3", position: { x: 575, y: 300 }, isMainStop: false },
        { id: "C", name: "Main Stop C", position: { x: 650, y: 300 }, isMainStop: true },
        { id: "CD1", name: "Stop CD1", position: { x: 725, y: 300 }, isMainStop: false },
        { id: "CD2", name: "Stop CD2", position: { x: 775, y: 300 }, isMainStop: false },
        { id: "CD3", name: "Stop CD3", position: { x: 825, y: 300 }, isMainStop: false },
        { id: "D", name: "Main Stop D", position: { x: 900, y: 300 }, isMainStop: true },
      ],
      currentStopIndex: 0
    }
  ]
}; 