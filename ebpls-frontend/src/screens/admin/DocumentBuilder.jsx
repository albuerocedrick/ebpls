import React, { useState, useRef } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { apiClient } from '../../utils/apiClient';
import toast from 'react-hot-toast';

const TEMPLATES = [
  { 
    id: 'business-permit', 
    name: 'Business Permit', 
    description: 'Official permit issued upon payment completion.',
    placeholders: ['BUSINESS_NAME', 'OWNER_NAME', 'BUSINESS_ADDRESS', 'MAYOR_NAME', 'BPLO_CHIEF_NAME', 'OR_NUMBER', 'AMOUNT_PAID', 'DATE_ISSUED', 'EXPIRY_DATE', 'QR_CODE']
  },
  { 
    id: 'e-resibo', 
    name: 'E-Resibo (Official Receipt)', 
    description: 'Electronic official receipt per OTC transaction.',
    placeholders: ['OR_NUMBER', 'PAYOR_NAME', 'BUSINESS_NAME', 'DATE', 'TOTAL_AMOUNT', 'AMOUNT_IN_WORDS', 'CASHIER_NAME', 'FEES_LIST']
  },
  { 
    id: 'top', 
    name: 'Tax Order of Payment (TOP)', 
    description: 'Pre-payment fee breakdown document issued by Treasury.',
    placeholders: ['APPLICATION_NO', 'BUSINESS_NAME', 'OWNER_NAME', 'DATE_ASSESSED', 'TOTAL_FEE', 'FEES_LIST', 'ASSESSOR_NAME']
  },
  { 
    id: 'barangay-clearance', 
    name: 'Barangay Clearance', 
    description: 'Clearance document issued by the Barangay Officer.',
    placeholders: ['BUSINESS_NAME', 'OWNER_NAME', 'BUSINESS_ADDRESS', 'BARANGAY_NAME', 'BARANGAY_CAPTAIN', 'DATE_ISSUED', 'OR_NUMBER', 'AMOUNT_PAID']
  },
];

const DocumentBuilder = () => {
  const [activeTemplateId, setActiveTemplateId] = useState(TEMPLATES[0].id);
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = useRef(null);

  const activeTemplate = TEMPLATES.find(t => t.id === activeTemplateId);

  const handleFileUpload = async (event, templateId) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please upload a valid PDF file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must be less than 5MB.'); return; }

    setUploadingId(templateId);
    try {
      const formData = new FormData();
      formData.append('template', file);
      await apiClient.post(`/api/admin/document-templates/${templateId}`, formData);
      toast.success(`${TEMPLATES.find(t => t.id === templateId).name} template uploaded!`);
    } catch (error) {
      toast.error(error.message || 'Failed to upload template.');
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Document Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload and configure PDF templates. Use the specified placeholders to inject dynamic data.
        </p>
      </div>

      <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e, activeTemplateId)} />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Template Cards */}
        <div className="w-full lg:w-1/2 space-y-3">
          {TEMPLATES.map((tmpl) => {
            const isActive = activeTemplateId === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => setActiveTemplateId(tmpl.id)}
                className={[
                  'group p-5 rounded-3xl border-2 cursor-pointer transition-all duration-200',
                  isActive
                    ? 'border-gray-900 bg-white shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{tmpl.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tmpl.description}</p>
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Upload size={14} />}
                      disabled={uploadingId === tmpl.id}
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      {uploadingId === tmpl.id ? 'Uploading...' : 'Upload PDF'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Placeholder Guide */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-8">
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Placeholder Mapping</h3>
                <p className="text-xs text-gray-400">{activeTemplate?.name}</p>
              </div>
            </div>

            {/* Description */}
            <div className="px-6 py-4 border-b border-gray-50">
              <p className="text-xs text-gray-500 leading-relaxed">
                Name your PDF form fields exactly as shown below. The system will inject dynamic values during generation.
              </p>
            </div>

            {/* Placeholder List */}
            <div className="px-6 py-4 space-y-2">
              {activeTemplate?.placeholders.map((ph, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                  <code className="text-xs font-mono font-semibold text-gray-900">{ph}</code>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Auto-filled</span>
                </div>
              ))}
            </div>

            {/* Footer Note */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Set PDF form fields to "Visible" and "Read-only" after flattening to prevent tampering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentBuilder;
