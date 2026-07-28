import React from 'react';

export default function Chip({ type, label }) {
  // type can be 'c-tape', 'c-brass', 'c-baize', 'c-grey', 'c-ink'
  return (
    <span className={`chip ${type}`}>
      {label}
    </span>
  );
}
