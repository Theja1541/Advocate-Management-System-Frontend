import { useState, useEffect, useCallback } from 'react';
import { searchSmartText, groupSmartText, appendSmartText } from '../services/smartTextService';

export const useSmartText = (sourceType, content, isEditMode = false) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);

  // Debounced Search
  useEffect(() => {
    if (isEditMode) {
      setSearchResults(null);
      return;
    }

    const extractTypingPhrase = (text) => {
      if (!text) return '';
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      // Find the first word that has at least 2 characters
      const firstMeaningfulWord = words.find(w => w.replace(/[^a-zA-Z0-9]/g, '').length >= 2);
      return firstMeaningfulWord ? firstMeaningfulWord.replace(/[^a-zA-Z0-9]/g, '') : '';
    };

    const phraseToSearch = extractTypingPhrase(content);

    if (phraseToSearch.length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await searchSmartText(phraseToSearch);
          if (res.data && res.data.occurrences && res.data.occurrences.length > 0) {
            setSearchQuery(res.data.query);
            setSearchResults(res.data);
          } else {
            setSearchResults(null);
          }
        } catch (error) {
          console.error("Smart text search error", error);
        } finally {
          setIsSearching(false);
        }
      }, 400); // 400ms debounce

      return () => clearTimeout(timer);
    } else {
      setSearchResults(null);
    }
  }, [content]);

  // Intercept Save
  const handleSaveIntercept = useCallback((saveCallback) => {
    if (searchResults && searchResults.occurrences.length > 0) {
      setPendingSaveData({ callback: saveCallback });
      setIsGroupModalOpen(true);
    } else {
      // No active matches, just save normally
      saveCallback(null);
    }
  }, [searchResults]);

  // Executed when modal "Save with existing" is clicked
  const onGroupChoice = async (matchPhrase, selectedMatchObj) => {
    setIsGroupModalOpen(false);
    if (pendingSaveData) {
      // selectedMatchObj is { sourceType, sourceId, occurrenceIndex }
      await pendingSaveData.callback({ phrase: matchPhrase, sourceType, selectedExisting: selectedMatchObj, isAppended: true });
    }
    setPendingSaveData(null);
    setSearchResults(null);
  };

  // Executed when modal "Save as independent" is clicked
  const onIndependentChoice = async () => {
    setIsGroupModalOpen(false);
    if (pendingSaveData) {
      await pendingSaveData.callback(null); // null means independent
    }
    setPendingSaveData(null);
    setSearchResults(null);
  };

  const onCancelModal = () => {
    setIsGroupModalOpen(false);
    setPendingSaveData(null);
  };

  // Expose function to trigger post-save grouping
  const performGrouping = async (sourceId, groupingInfo) => {
    if (groupingInfo && groupingInfo.phrase) {
      try {
        await groupSmartText(groupingInfo.phrase, groupingInfo.sourceType, sourceId, groupingInfo.selectedExisting);
      } catch (err) {
        console.error("Failed to group smart text", err);
      }
    }
  };

  // Expose function to trigger append
  const performAppend = async (newText, groupingInfo) => {
    if (groupingInfo && groupingInfo.isAppended) {
      await appendSmartText({
        sourceType: groupingInfo.selectedExisting.sourceType,
        sourceId: groupingInfo.selectedExisting.sourceId,
        occurrenceIndex: groupingInfo.selectedExisting.occurrenceIndex,
        matchedPhrase: groupingInfo.phrase,
        newText
      });
    }
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    isGroupModalOpen,
    handleSaveIntercept,
    onGroupChoice,
    onIndependentChoice,
    onCancelModal,
    performGrouping,
    performAppend
  };
};
