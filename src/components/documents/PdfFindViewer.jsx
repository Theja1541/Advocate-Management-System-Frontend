import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const getItemViewportBox = (item, viewport) => {
  const tx = pdfjs.Util.transform(viewport.transform, item.transform);
  const fontHeight = Math.hypot(tx[2], tx[3]) || 12;
  const width = (item.width || 0) * viewport.scale;
  const x = tx[4];
  const y = tx[5] - fontHeight;
  return {
    left: x,
    top: y,
    width: Math.max(width, 4),
    height: Math.max(fontHeight * 1.2, 8),
    text: String(item.str || ''),
  };
};

const collectMatches = (boxes, query) => {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return [];

  const matches = [];
  boxes.forEach((box) => {
    const lower = box.text.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      const ratio = box.text.length ? box.width / box.text.length : box.width;
      matches.push({
        left: box.left + idx * ratio,
        top: box.top,
        width: Math.max(needle.length * ratio, 8),
        height: box.height,
      });
      from = idx + Math.max(needle.length, 1);
    }
  });
  return matches;
};

export default function PdfFindViewer({
  fileUrl,
  searchQuery = '',
  activeMatchIndex = 0,
  onMatchesChange,
}) {
  const scrollerRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pagesWithMatches = useMemo(
    () =>
      pages.map((page) => ({
        ...page,
        matches: collectMatches(page.boxes, searchQuery),
      })),
    [pages, searchQuery]
  );

  const allMatches = useMemo(() => {
    const list = [];
    pagesWithMatches.forEach((page, pageIndex) => {
      page.matches.forEach((match, matchIndex) => {
        list.push({ pageIndex, matchIndex });
      });
    });
    return list;
  }, [pagesWithMatches]);

  useEffect(() => {
    onMatchesChange?.(allMatches.length);
  }, [allMatches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderPdf = useCallback(async () => {
    if (!fileUrl) return;
    setLoading(true);
    setError('');
    setPages([]);

    try {
      const pdf = await pdfjs.getDocument(fileUrl).promise;
      const scale = 1.35;
      const nextPages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;

        const textContent = await page.getTextContent();
        const boxes = (textContent.items || [])
          .filter((item) => 'str' in item && item.str)
          .map((item) => getItemViewportBox(item, viewport));

        nextPages.push({
          pageNumber,
          dataUrl: canvas.toDataURL('image/png'),
          width: viewport.width,
          height: viewport.height,
          boxes,
        });
      }

      setPages(nextPages);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to open PDF');
      setLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    renderPdf();
  }, [renderPdf]);

  useEffect(() => {
    if (!scrollerRef.current || !allMatches.length) return;
    const active = allMatches[activeMatchIndex];
    if (!active) return;
    const el = scrollerRef.current.querySelector(
      `[data-pdf-match="${active.pageIndex}-${active.matchIndex}"]`
    );
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeMatchIndex, allMatches, searchQuery]);

  if (loading) return <div className="doc-viewer-empty">Loading document…</div>;
  if (error) return <div className="doc-viewer-empty is-error">{error}</div>;

  return (
    <div className="pdf-find-viewer" ref={scrollerRef}>
      {pagesWithMatches.map((page, pageIndex) => (
        <div className="pdf-find-page" key={page.pageNumber}>
          <div className="pdf-find-page-shell" style={{ width: page.width, maxWidth: '100%' }}>
            <img
              src={page.dataUrl}
              alt={`Page ${page.pageNumber}`}
              className="pdf-find-page-img"
            />
            <div className="pdf-find-highlights">
              {page.matches.map((match, matchIndex) => {
                const globalIndex = allMatches.findIndex(
                  (m) => m.pageIndex === pageIndex && m.matchIndex === matchIndex
                );
                const isActive = globalIndex === activeMatchIndex;
                return (
                  <span
                    key={`${page.pageNumber}-${matchIndex}`}
                    data-pdf-match={`${pageIndex}-${matchIndex}`}
                    className={`pdf-find-box${isActive ? ' is-active' : ''}`}
                    style={{
                      left: `${(match.left / page.width) * 100}%`,
                      top: `${(match.top / page.height) * 100}%`,
                      width: `${(match.width / page.width) * 100}%`,
                      height: `${(match.height / page.height) * 100}%`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
