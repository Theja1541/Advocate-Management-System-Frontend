import React from 'react';

const getSourceIcon = (sourceType) => {
  switch (sourceType) {
    case 'Document': return <span className="text-blue-500 text-sm">📄</span>;
    case 'CaseDiary': return <span className="text-green-500 text-sm">📅</span>;
    case 'Opinion': return <span className="text-purple-500 text-sm">⚖️</span>;
    case 'LegalText': return <span className="text-orange-500 text-sm">📖</span>;
    default: return <span className="text-gray-500 text-sm">📄</span>;
  }
};

const SmartTextContextPanel = ({ occurrences, searchQuery }) => {
  if (!occurrences || occurrences.length === 0) return null;

  // Group occurrences by sourceId + sourceType so we can display them nicely under their Document Title
  const grouped = occurrences.reduce((acc, curr) => {
    const key = `${curr.sourceType}-${curr.sourceId}`;
    if (!acc[key]) {
      acc[key] = {
        title: curr.title,
        sourceType: curr.sourceType,
        items: []
      };
    }
    acc[key].items.push(curr);
    return acc;
  }, {});

  const highlightSnippet = (snippet, matchPhrase) => {
    if (!matchPhrase) return snippet;
    const regex = new RegExp(`(${matchPhrase})`, 'gi');
    const parts = snippet.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} style={{ backgroundColor: 'yellow', padding: '0 2px' }}>{part}</mark> : part
    );
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">
          Existing matches for: <span className="text-blue-600">"{searchQuery}"</span>
        </h4>
      </div>

      <div className="space-y-4">
        {Object.values(grouped).map((group, idx) => (
          <div key={idx} className="bg-white border border-gray-100 rounded-md p-3 shadow-sm">
            <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-gray-50">
              {getSourceIcon(group.sourceType)}
              <span className="font-medium text-gray-800 text-sm">{group.title}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.sourceType}</span>
            </div>
            
            <div className="space-y-3">
              {group.items.map((occ, oIdx) => (
                <div key={oIdx} className="text-sm text-gray-600">
                  <div className="text-xs font-medium text-gray-400 mb-1">Occurrence #{occ.occurrenceIndex}</div>
                  <div className="italic bg-gray-50 p-2 rounded border-l-2 border-blue-200">
                    "{highlightSnippet(occ.snippet, occ.matchedPhrase)}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartTextContextPanel;
