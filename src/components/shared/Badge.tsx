import React from 'react';
import './Badge.css';

interface BadgeProps {
  variant: 'alert' | 'connected' | 'metric';
  text: string;
  count?: number;
}

export const Badge: React.FC<BadgeProps> = ({ variant, text, count }) => {
  return (
    <div className={`badge badge-${variant}`}>
      {variant === 'alert' && <span className="badge-dot"></span>}
      <span className="badge-text">
        {text}
        {count !== undefined && ` ${count}`}
      </span>
    </div>
  );
};
