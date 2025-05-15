import { MapData } from '../types';

// Define initial map data with real Bengaluru stops - in exact requested order
export const initialMapData: MapData = {
  stops: [
    // Main stop - Koramangala
    { 
      id: "Koramangala", 
      name: "Koramangala", 
      position: { 
        x: 100, 
        y: 300,
        lat: 12.9347,
        lng: 77.6230
      }, 
      isMainStop: true 
    },
    
    // Intermediate stops between Koramangala and Indiranagar - in requested order
    { 
      id: "EGL", 
      name: "Embassy Golf Links", 
      position: { 
        x: 200, 
        y: 300,
        lat: 12.9513, 
        lng: 77.6435
      }, 
      isMainStop: false 
    },
    { 
      id: "Domlur", 
      name: "Domlur", 
      position: { 
        x: 250, 
        y: 300,
        lat: 12.9609,
        lng: 77.6387
      }, 
      isMainStop: false 
    },
    { 
      id: "Trinity", 
      name: "Trinity Circle", 
      position: { 
        x: 300, 
        y: 300,
        lat: 12.9733,
        lng: 77.6180
      }, 
      isMainStop: false 
    },
    
    // Main stop - Indiranagar 
    { 
      id: "Indiranagar", 
      name: "Indiranagar", 
      position: { 
        x: 350, 
        y: 300,
        lat: 12.9784,
        lng: 77.6408
      }, 
      isMainStop: true 
    },
    
    // Intermediate stops between Indiranagar and Marathahalli - in requested order
    { 
      id: "Doddanekkundi", 
      name: "Doddanekkundi", 
      position: { 
        x: 425, 
        y: 300,
        lat: 12.9723,
        lng: 77.6667
      }, 
      isMainStop: false 
    },
    { 
      id: "Spice_Garden", 
      name: "Spice Garden", 
      position: { 
        x: 500, 
        y: 300,
        lat: 12.9642,
        lng: 77.6861
      }, 
      isMainStop: false 
    },
    
    // Main stop - Marathahalli
    { 
      id: "Marathahalli", 
      name: "Marathahalli", 
      position: { 
        x: 650, 
        y: 300,
        lat: 12.9580,
        lng: 77.6979
      }, 
      isMainStop: true 
    },
    
    // Intermediate stops between Marathahalli and Bellandur - in requested order
    { 
      id: "Innovative_Multiplex", 
      name: "Innovative Multiplex", 
      position: { 
        x: 725, 
        y: 300,
        lat: 12.9491,
        lng: 77.6996
      }, 
      isMainStop: false 
    },
    { 
      id: "Panathur", 
      name: "Panathur", 
      position: { 
        x: 800, 
        y: 300,
        lat: 12.9419,
        lng: 77.6915
      }, 
      isMainStop: false 
    },
    { 
      id: "Kadubeesanahalli", 
      name: "Kadubeesanahalli", 
      position: { 
        x: 850, 
        y: 300,
        lat: 12.9370,
        lng: 77.6831
      }, 
      isMainStop: false 
    },
    
    // Final main stop - Bellandur
    { 
      id: "Bellandur", 
      name: "Bellandur", 
      position: { 
        x: 900, 
        y: 300,
        lat: 12.9310, 
        lng: 77.6767
      }, 
      isMainStop: true 
    }
  ],
  
  // We'll generate roads dynamically with the routing API
  roads: [], 
  
  buses: [
    {
      id: "Bus1",
      position: { 
        x: 100, 
        y: 300,
        lat: 12.9347,
        lng: 77.6230 
      },
      capacity: 20,
      currentPassengers: 0,
      route: [],  // This will be populated programmatically after initialization
      currentStopIndex: 0
    }
  ]
};

// Initialize bus routes with stops
initialMapData.buses.forEach(bus => {
  // For Bus1, assign all stops in order
  if (bus.id === "Bus1") {
    bus.route = [...initialMapData.stops];
  }
}); 