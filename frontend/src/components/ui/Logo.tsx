import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <img
      src="/logo.png"
      alt="Go3net HR Management System"
      className={className}
    />
  );
};

export default Logo;
