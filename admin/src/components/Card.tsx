import React from 'react';
import './Card.css';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export const Card: React.FC<CardProps> = ({ 
  title, 
  children, 
  className = '',
  glowColor = '#00ffff'
}) => {
  return (
    <div 
      className={`card ${className}`}
      style={{
        '--glow-color': glowColor
      } as React.CSSProperties}
    >
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};