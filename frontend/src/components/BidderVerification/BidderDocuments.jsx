import React, { useState, useEffect } from 'react';
import { getDocumentBlob } from '../../api/bidders';

export default function BidderDocuments({ bidder }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docUrl, setDocUrl] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState(null);

  if (!bidder || !bidder.documents) return null;
  const docs = bidder.documents;
  
  useEffect(() => {
    if (selectedDoc) {
      setLoadingDoc(true);
      setDocError(null);
      
      // Cleanup previous url
      if (docUrl) {
        URL.revokeObjectURL(docUrl);
        setDocUrl(null);
      }

      getDocumentBlob(selectedDoc._id)
        .then(blob => {
          const url = URL.createObjectURL(blob);
          setDocUrl(url);
        })
        .catch(err => {
          console.error("Failed to fetch document blob", err);
          setDocError("Failed to load document securely.");
        })
        .finally(() => {
          setLoadingDoc(false);
        });
    }

    return () => {
      if (docUrl) URL.revokeObjectURL(docUrl);
    };
  }, [selectedDoc]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleOpenNewTab = () => {
    if (docUrl) {
      window.open(docUrl, '_blank');
    }
  };

  const renderCanonicalFields = (fields) => {
    if (!fields || typeof fields !== 'object') return <span className="text-[12px] text-secondary">No structured fields extracted.</span>;
    if (Object.keys(fields).length === 0) return <span className="text-[12px] text-secondary">No structured fields extracted.</span>;

    const renderValue = (val) => {
      if (val === null || val === undefined) return <span className="text-secondary italic">null</span>;
      if (Array.isArray(val)) {
        return (
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            {val.map((item, idx) => <li key={idx}>{renderValue(item)}</li>)}
          </ul>
        );
      }
      if (typeof val === 'object') {
        return (
          <div className="flex flex-col gap-1 mt-1 bg-surface-container-low p-2 rounded">
            {Object.entries(val).map(([k, v]) => (
              <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="text-[11px] font-semibold text-secondary uppercase w-32 shrink-0">{k}:</span>
                <span className="text-[12px] text-primary break-all">{renderValue(v)}</span>
              </div>
            ))}
          </div>
        );
      }
      return <span>{String(val)}</span>;
    };

    return (
      <div className="flex flex-col gap-1.5">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-2 border-b border-outline-variant/50 pb-1.5 last:border-0 last:pb-0">
            <span className="text-[11px] font-semibold text-secondary uppercase w-40 shrink-0">{key}</span>
            <span className="text-[12px] text-primary">{renderValue(value)}</span>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-120px)] min-h-[600px]">
      {/* LEFT PANE */}
      <aside className="w-full md:w-[35%] flex flex-col bg-surface-container-lowest border border-outline-variant rounded overflow-hidden min-w-0">
        <div className="p-3 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-primary text-[18px]">folder_managed</span>
            <h2 className="text-[14px] text-primary font-semibold">Submitted Documents ({docs.length})</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {docs.map((doc, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedDoc(doc)}
              className={`p-3 border-b border-outline-variant cursor-pointer transition-colors ${
                selectedDoc?._id === doc._id ? 'bg-primary-container text-surface-container-lowest' : 'hover:bg-surface-container-low text-primary'
              }`}
            >
              <div className="flex justify-between items-start mb-0.5">
                 <div className="font-semibold text-[13px] truncate pr-2">{doc.documentType}</div>
                 <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                    doc.verificationStatus === 'PASS' ? 'bg-[#EBFDF2] text-[#247A45] border-[#A6F4C5]' :
                    doc.verificationStatus === 'REVIEW' ? 'bg-[#FEF8EC] text-[#B7791F] border-[#FCD34D]' :
                    'bg-[#FEF2F2] text-[#B42318] border-[#FCA5A5]'
                 }`}>
                   {doc.verificationStatus || "PENDING"}
                 </div>
              </div>
              <div className={`text-[11px] truncate ${selectedDoc?._id === doc._id ? 'text-surface-container-highest' : 'text-secondary'}`}>
                {doc.originalFilename}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT PANE */}
      <section className="w-full md:w-[65%] flex flex-col bg-surface-container-lowest border border-outline-variant rounded overflow-hidden min-w-0">
         {selectedDoc ? (
           <>
             <div className="p-3 border-b border-outline-variant bg-surface-container-low flex justify-between items-center gap-3">
               <div className="min-w-0">
                 <h2 className="text-[14px] text-primary font-semibold truncate">{selectedDoc.documentType}</h2>
                 <p className="text-secondary text-[11px] truncate">{selectedDoc.originalFilename}</p>
               </div>
               <button 
                 onClick={handleOpenNewTab}
                 disabled={!docUrl}
                 className="px-2.5 py-1 border border-outline-variant rounded bg-surface text-primary text-[12px] font-medium hover:bg-surface-container-high transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
               >
                 <span className="material-symbols-outlined text-[14px]">open_in_new</span> Open
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
               <div className="w-full h-[400px] border border-outline-variant bg-surface-dim rounded flex items-center justify-center relative overflow-hidden">
                  {loadingDoc && <div className="absolute inset-0 bg-surface/50 flex items-center justify-center text-[13px] text-secondary">Loading secure document...</div>}
                  {docError && <div className="absolute inset-0 bg-surface flex items-center justify-center text-[13px] text-error font-medium">{docError}</div>}
                  {docUrl && !docError && (
                    <iframe 
                      src={docUrl}
                      className="w-full h-full rounded border-0"
                      title={selectedDoc.documentType}
                    />
                  )}
               </div>

               <details className="border border-outline-variant rounded group" open>
                 <summary className="p-3 bg-surface-container-low text-[13px] text-primary font-semibold cursor-pointer list-none flex items-center justify-between">
                   <span>Extracted Canonical Fields</span>
                   <span className="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform">expand_more</span>
                 </summary>
                 <div className="p-4 border-t border-outline-variant text-[12px]">
                   {renderCanonicalFields(selectedDoc.extractedFields)}
                 </div>
               </details>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-secondary gap-2 p-4 text-center">
             <span className="material-symbols-outlined text-[36px] opacity-50">description</span>
             <p className="text-[13px]">Select a document to view details and evidence.</p>
           </div>
         )}
      </section>
    </div>
  );
}
