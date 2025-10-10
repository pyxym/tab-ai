import React from 'react';
import '../styles/options.css';
import Dashboard from '../tabs/dashboard';

function OptionsPage() {
  return <Dashboard />;
}

export default OptionsPage;

// Mount the app
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OptionsPage />);
}
