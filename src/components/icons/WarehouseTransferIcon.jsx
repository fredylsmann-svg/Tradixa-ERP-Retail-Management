import React from 'react';

const WarehouseTransferIcon = React.forwardRef(({ color = "currentColor", size = 24, strokeWidth = 2, className, ...rest }, ref) => {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d="M3 8.5V8L12 2l9 6.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1" />
      <path d="M12 14H2" />
      <path d="M5 11l-3 3 3 3" />
    </svg>
  );
});

WarehouseTransferIcon.displayName = 'WarehouseTransferIcon';

export default WarehouseTransferIcon;
