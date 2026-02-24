
import React from 'react';

export const RubleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 11h8a4 4 0 0 0 0-8H6v8" />
    <path d="M6 11h10" />
    <path d="M6 21V3" />
  </svg>
);
