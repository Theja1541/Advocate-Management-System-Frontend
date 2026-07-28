import React from 'react';

export default function PageHeader({ title, description, actions }) {
  return (
    <div className="ph">
      <div>
        <h2 className="ser">{title}</h2>
        <div className="d">{description}</div>
      </div>
      {actions && <div className="acts">{actions}</div>}
    </div>
  );
}
