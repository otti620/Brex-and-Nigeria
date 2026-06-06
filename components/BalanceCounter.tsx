import React, { useEffect, useState, useRef } from 'react';

interface BalanceCounterProps {
  value: number;
}

export const BalanceCounter: React.FC<BalanceCounterProps> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    
    if (startValue === endValue) {
      return;
    }

    const duration = 1200; // Duration of animation in ms
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressPercentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progressPercentage * (2 - progressPercentage);
      const currentVal = Math.round(startValue + (endValue - startValue) * easeProgress);
      
      setDisplayValue(currentVal);

      if (progressPercentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    requestAnimationFrame(animate);

    return () => {
      // In case we unmount, make sure we keep reference up to date
      prevValueRef.current = endValue;
    };
  }, [value]);

  return (
    <span>₦{displayValue.toLocaleString()}</span>
  );
};
