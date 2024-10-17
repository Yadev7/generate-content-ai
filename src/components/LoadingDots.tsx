// components/LoadingDots.tsx

import React, { useEffect, useState } from 'react';


const LoadingDots: React.FC = () => {
  const [dotCount, setDotCount] = useState<number>(1); // Initial dot count

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev < 3 ? prev + 1 : 1)); // Cycle through dot counts
    }, 500); // Change dot count every 500ms

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  return (
    <h1>
      {Array.from({ length: dotCount }, (_, index) => (
        <span key={index} className={index === dotCount - 1 ? 'dot' : ''}>.</span>
      ))}
    </h1>
  );
};

export default LoadingDots;
