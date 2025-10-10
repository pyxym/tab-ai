/**
 * Options Page Entry Point
 * WXT 프레임워크용 최적화된 구조
 */
import React from 'react';
import '../styles/options.css';
import Dashboard from '../tabs/dashboard';

// WXT는 래퍼 컴포넌트를 자동으로 마운트
function OptionsPage() {
  return <Dashboard />;
}

export default OptionsPage;
