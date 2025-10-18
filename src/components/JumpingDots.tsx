import React from 'react';

interface JumpingDotsProps {
  className?: string;
}

const JumpingDots: React.FC<JumpingDotsProps> = ({ className = "" }) => {
  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '160ms', animationDuration: '1.4s' }}></div>
      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '320ms', animationDuration: '1.4s' }}></div>
    </div>
  );
};

export default JumpingDots;
