interface StationData {
  stations: {
    [key: string]: number;
  };
  isAutomationActive: boolean;
}

const STORAGE_KEY = 'transit_station_visits';

const initialStationData: StationData = {
  stations: {
    // Main Stops
    "Koramangala": 0,
    "Indiranagar": 0,
    "Marathahalli": 0,
    "Bellandur": 0,
    
    // Intermediate Stops
    "Embassy Golf Links": 0,
    "Domlur": 0,
    "Trinity Circle": 0,
    "Doddanekkundi": 0,
    "Spice Garden": 0,
    "Innovative Multiplex": 0,
    "Panathur": 0,
    "Kadubeesanahalli": 0
  },
  isAutomationActive: false
};

// Initialize storage if it doesn't exist
if (!localStorage.getItem(STORAGE_KEY)) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialStationData));
}

/**
 * Read the current station data from localStorage
 */
const readStationData = (): StationData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return initialStationData;
    }
    const parsedData = JSON.parse(data);
    
    // Ensure all stations exist in the data
    const mergedData = {
      ...initialStationData,
      stations: {
        ...initialStationData.stations,
        ...parsedData.stations
      },
      isAutomationActive: parsedData.isAutomationActive
    };
    
    return mergedData;
  } catch (error) {
    console.error('Error reading station data:', error);
    return initialStationData;
  }
};

/**
 * Write station data to localStorage
 */
const writeStationData = (data: StationData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing station data:', error);
  }
};

/**
 * Increment the visit count for a specific station
 */
export const incrementStationVisit = (stationName: string): void => {
  const data = readStationData();
  if (data.stations.hasOwnProperty(stationName)) {
    data.stations[stationName]++;
    console.log(`Station ${stationName} visits: ${data.stations[stationName]}`);
    writeStationData(data);
  } else {
    console.warn(`Station ${stationName} not found in tracking data`);
  }
};

/**
 * Reset all station visit counts to zero
 */
export const resetStationCounts = (): void => {
  const data = readStationData();
  Object.keys(data.stations).forEach(station => {
    data.stations[station] = 0;
  });
  console.log('Reset all station visit counts to zero');
  writeStationData(data);
};

/**
 * Set the automation status
 */
export const setAutomationStatus = (isActive: boolean): void => {
  const data = readStationData();
  data.isAutomationActive = isActive;
  writeStationData(data);
  console.log(`Automation status set to: ${isActive}`);
};

/**
 * Get the current station visit counts
 */
export const getStationCounts = (): { [key: string]: number } => {
  const data = readStationData();
  return data.stations;
};

/**
 * Get automation status
 */
export const getAutomationStatus = (): boolean => {
  const data = readStationData();
  return data.isAutomationActive;
}; 