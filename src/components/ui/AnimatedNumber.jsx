import React, { useState, useEffect, useRef } from 'react';

export const AnimatedNumber = ({ value, duration = 400, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  const animationRef = useRef(null);

  useEffect(() => {
    const endValue = Number(value) || 0;
    const startValue = prevValueRef.current;

    if (startValue === endValue && startValue !== 0) return;

    let startTimestamp = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing: easeOutExpo for premium feel
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = easeProgress * (endValue - startValue) + startValue;
      
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(step);
      } else {
        prevValueRef.current = endValue;
      }
    };

    animationRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = displayValue.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className="inline-block transition-all duration-200 tabular-nums">
      {prefix}{formattedValue}{suffix}
    </span>
  );
};
