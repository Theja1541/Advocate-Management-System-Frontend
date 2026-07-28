import React from 'react';

export default function ApprovalLadder({ ladder = [], currentLevel = 0 }) {
  return (
    <div className="ladder">
      {ladder.map((L, li) => {
        const done = li < currentLevel;
        const now = li === currentLevel;
        return (
          <div key={li} className={`rung ${done ? 'ok' : now ? 'now' : ''}`}>
            <div className="n">{done ? '✓' : li + 1}</div>
            <div className="rb">
              <div className="rt">{L[0]}</div>
              <div className="rs">
                {done 
                  ? `Approved · ${L[1]} · ${['09 Jul 2026', '11 Jul 2026', '13 Jul 2026', '—'][li]}` 
                  : now 
                    ? `Awaiting ${L[1]}` 
                    : 'Not yet reached'
                }
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
