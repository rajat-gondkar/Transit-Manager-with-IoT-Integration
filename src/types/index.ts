export interface Position {
  x: number;
  y: number;
}

export interface Stop {
  id: string;
  name: string;
  position: Position;
  isMainStop: boolean;
}

export interface Bus {
  id: string;
  position: Position;
  capacity: number;
  currentPassengers: number;
  route: Stop[];
  currentStopIndex: number;
}

export interface Road {
  from: string;
  to: string;
  isMainRoad: boolean;
}

export interface MapData {
  stops: Stop[];
  roads: Road[];
  buses: Bus[];
} 