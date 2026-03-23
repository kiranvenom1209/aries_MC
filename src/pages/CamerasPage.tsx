import React from 'react';
import CameraGrid from '../components/media/CameraGrid';

const CamerasPage: React.FC = () => {
  return (
    <div className="h-full overflow-hidden">
      <CameraGrid title="Mission Camera Matrix" />
    </div>
  );
};

export default CamerasPage;