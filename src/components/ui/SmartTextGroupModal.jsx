import React, { useState } from 'react';
import Modal from './Modal';

const getSourceIcon = (sourceType) => {
  switch (sourceType) {
    case 'Document': return <span className="text-blue-500 text-sm">📄</span>;
    case 'CaseDiary': return <span className="text-green-500 text-sm">📅</span>;
    case 'Opinion': return <span className="text-purple-500 text-sm">⚖️</span>;
    case 'LegalText': return <span className="text-orange-500 text-sm">📖</span>;
    default: return <span className="text-gray-500 text-sm">📄</span>;
  }
};

const SmartTextGroupModal = ({ isOpen, onClose, onGroup, onIndependent, data }) => {
  const [selectedMatch, setSelectedMatch] = useState(null); // stores { sourceType, sourceId, occurrenceIndex }

  if (!isOpen || !data) return null;

  const { query, occurrences, phraseGroup } = data;
  const matchPhrase = phraseGroup?.phrase || data.occurrences?.[0]?.matchedPhrase || query;

  // Group occurrences by sourceId + sourceType for display grouping
  const grouped = (occurrences || []).reduce((acc, curr) => {
    const key = `${curr.sourceType}-${curr.sourceId}`;
    if (!acc[key]) {
      acc[key] = {
        title: curr.title,
        sourceType: curr.sourceType,
        sourceId: curr.sourceId,
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

  const handleGroup = () => {
    if (selectedMatch) {
      onGroup(matchPhrase, selectedMatch);
    }
  };

  const isSelected = (occ) => {
    return selectedMatch &&
      selectedMatch.sourceType === occ.sourceType &&
      selectedMatch.sourceId === occ.sourceId &&
      selectedMatch.occurrenceIndex === occ.occurrenceIndex;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save this new text after the selected existing text?">
      <div className="space-y-4">
        
        <p className="text-sm text-gray-600 font-semibold mt-4">
          Existing matches:
        </p>

        <div className="max-h-64 overflow-y-auto space-y-4 border border-gray-200 rounded p-2">
          {Object.values(grouped).map((group, idx) => {
            const isReferenceOnly = group.sourceType === 'Document';
            
            return (
              <div key={idx} className="bg-white border border-gray-100 rounded-md p-3 shadow-sm">
                <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-gray-50">
                  {getSourceIcon(group.sourceType)}
                  <span className="font-medium text-gray-800 text-sm">{group.title}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.sourceType}</span>
                  {isReferenceOnly && <span className="text-xs text-red-500 font-medium ml-2">Reference only</span>}
                </div>
                
                <div className="space-y-3">
                  {group.items.map((occ, oIdx) => (
                    <div key={oIdx} className="flex items-start space-x-3 text-sm text-gray-600">
                      {!isReferenceOnly && (
                        <input 
                          type="radio" 
                          name="existingMatchOccurrence" 
                          className="mt-1"
                          checked={isSelected(occ)}
                          onChange={() => setSelectedMatch({
                            sourceType: occ.sourceType,
                            sourceId: occ.sourceId,
                            occurrenceIndex: occ.occurrenceIndex
                          })}
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-400 mb-1">Occurrence #{occ.occurrenceIndex}</div>
                        <div className="italic bg-gray-50 p-2 rounded border-l-2 border-blue-200">
                          "...{highlightSnippet(occ.snippet, occ.matchedPhrase)}..."
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleGroup}
            disabled={!selectedMatch}
            className={`w-full py-2.5 font-medium rounded-md transition-colors ${selectedMatch ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            Save with Selected Existing Text
          </button>
          
          <button
            onClick={onIndependent}
            className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md transition-colors"
          >
            Save as New Text
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-transparent hover:bg-gray-100 text-gray-500 font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SmartTextGroupModal;
