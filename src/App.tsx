import React from 'react';
import styled from 'styled-components';
import { TransitProvider } from './context/TransitContext';
import MapComponent from './components/MapComponent';
import ControlPanel from './components/ControlPanel';

const AppContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #121212;
  min-height: 100vh;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 30px;
  padding: 20px 0;
  background: linear-gradient(135deg, rgba(40, 40, 40, 0.9), rgba(30, 30, 30, 0.95));
  border-radius: 10px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.4);
`;

const Title = styled.h1`
  color: #e0e0e0;
  margin-bottom: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-size: 2.5rem;
  
  span {
    color: #3498db;
  }
`;

const Subtitle = styled.p`
  color: #bbb;
  font-size: 1.2rem;
  max-width: 800px;
  margin: 0 auto;
`;

function App() {
  return (
    <TransitProvider>
      <AppContainer>
        <Header>
          <Title>Bengaluru <span>Transit System</span></Title>
          <Subtitle>
            Real-time bus tracking along Koramangala-Indiranagar-Marathahalli-Bellandur route
          </Subtitle>
        </Header>
        
        <MapComponent />
        <ControlPanel />
      </AppContainer>
    </TransitProvider>
  );
}

export default App;
