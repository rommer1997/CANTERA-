/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cantera1IdentityHub from './pages/Cantera1IdentityHub';
import Cantera2PlayerDashboard from './pages/Cantera2PlayerDashboard';
import Cantera3Referee from './pages/Cantera3Referee';
import Cantera4Scout from './pages/Cantera4Scout';
import Cantera3ScoutDashboard from './pages/Cantera3ScoutDashboard';
import Cantera5Settings from './pages/Cantera5Settings';
import { LanguageProvider } from './core/i18n/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Cantera1IdentityHub />} />
          <Route path="/player/:id" element={<Cantera2PlayerDashboard />} />
          <Route path="/c3" element={<Cantera3Referee />} />
          <Route path="/c4" element={<Cantera3ScoutDashboard />} />
          <Route path="/c4-paywall" element={<Cantera4Scout />} />
          <Route path="/settings" element={<Cantera5Settings />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
