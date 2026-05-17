import React, { useState, useRef } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { apiClient } from '../../utils/apiClient';
import toast from 'react-hot-toast';

const TEMPLATES = [
  { 
    id: 'business-permit', 
    name: 'Business Permit', 
    description: 'Official permit issued upon payment completion.',
    placeholders: [
      '{{BUSINESS_NAME}}', '{{OWNER_NAME}}', '{{BUSINESS_ADDRESS}}',
      '{{MAYOR_NAME}}', '{{BPLO_CHIEF_NAME}}', '{{OR_NUMBER}}',
      '{{AMOUNT_PAID}}', '{{DATE_ISSUED}}', '{{EXPIRY_DATE}}', '{{QR_CODE}}'
    ]
  },
  { 
    id: 'e-resibo', 
    name: 'E-Resibo (Official Receipt)', 
    description: 'Electronic official receipt per OTC transaction.',
    placeholders: [
      '{{OR_NUMBER}}', '{{PAYOR_NAME}}', '{{BUSINESS_NAME}}',
      '{{DATE}}', '{{TOTAL_AMOUNT}}', '{{AMOUNT_IN_WORDS}}',
      '{{CASHIER_NAME}}', '{{FEES_LIST}}'
    ]
  },
  { 
    id: 'top', 
    name: 'Tax Order of Payment (TOP)', 
    description: 'Pre-payment fee breakdown document issued by Treasury.',
    placeholders: [
      '{{APPLICATION_NO}}', '{{BUSINESS_NAME}}', '{{OWNER_NAME}}',
      '{{DATE_ASSESSED}}', '{{TOTAL_FEE}}', '{{FEES_LIST}}', '{{ASSESSOR_NAME}}'
    ]
  },
  { 
    id: 'barangay-clearance', 
    name: 'Barangay Clearance', 
    description: 'Clearance document issued by the Barangay Officer.',
    placeholders: [
      '{{BUSINESS_NAME}}', '{{OWNER_NAME}}', '{{BUSINESS_ADDRESS}}',
      '{{BARANGAY_NAME}}', '{{BARANGAY_CAPTAIN}}', '{{DATE_ISSUED}}',
      '{{OR_NUMBER}}', '{{AMOUNT_PAID}}'
    ]
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

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a valid PDF file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB.');
      return;
    }

    setUploadingId(templateId);
    try {
      const formData = new FormData();
      formData.append('template', file);

      // Using the apiClient with FormData support
      await apiClient.post(`/api/admin/document-templates/${templateId}`, formData);
      
      toast.success(`${TEMPLATES.find(t => t.id === templateId).name} template uploaded successfully!`);
    } catch (error) {
      toast.error(error.message || 'Failed to upload template.');
    } finally {
      setUploadingId(null);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Document Builder</h1>
        <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
          Upload and configure PDF templates. Use the specified placeholders to inject dynamic data.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Pane: Templates List */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e, activeTemplateId)}
          />
          
          {TEMPLATES.map((tmpl) => (
            <Card 
              key={tmpl.id} 
              padding="md" 
              className={`cursor-pointer transition-colors border-2 ${activeTemplateId === tmpl.id ? 'border-accent bg-surface' : 'border-border bg-surface-tint hover:bg-surface'}`}
              onClick={() => setActiveTemplateId(tmpl.id)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${activeTemplateId === tmpl.id ? 'bg-[hsl(var(--color-accent-subtle))]' : 'bg-surface border border-border'}`}>
                    <FileText size={18} className={activeTemplateId === tmpl.id ? 'text-accent' : 'text-[hsl(var(--color-text-muted))]'} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--color-text))]">{tmpl.name}</p>
                    <p className="text-xs text-[hsl(var(--color-text-muted))] mt-0.5">{tmpl.description}</p>
                  </div>
                </div>
              </div>
              
              {activeTemplateId === tmpl.id && (
                <div className="mt-4 pt-4 border-t border-border flex justify-end">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    leftIcon={<Upload size={14} />} 
                    disabled={uploadingId === tmpl.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    {uploadingId === tmpl.id ? 'Uploading...' : 'Upload PDF'}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Right Pane: Mapping Guide */}
        <div className="w-full lg:w-1/2 sticky top-6">
          <Card padding="lg" className="h-full">
            <h3 className="text-lg font-semibold text-[hsl(var(--color-text))] mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-accent" />
              Placeholder Mapping Guide
            </h3>
            
            <p className="text-sm text-[hsl(var(--color-text-muted))] mb-6 leading-relaxed">
              When creating the PDF form in Adobe Acrobat or equivalent, create text fields and name them exactly as the placeholders below. The system will map values to these fields during generation.
            </p>

            <div className="bg-surface-tint border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-surface border-b border-border font-semibold text-sm text-[hsl(var(--color-text))]">
                {activeTemplate?.name} Fields
              </div>
              <div className="p-4 flex flex-col gap-2">
                {activeTemplate?.placeholders.map((ph, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <code className="text-xs font-mono bg-surface border border-border px-2 py-1 rounded text-accent flex-1">
                      {ph.replace(/[{}]/g, '')}
                    </code>
                    <span className="text-xs text-[hsl(var(--color-text-muted))] w-1/2">
                      Dynamic Injection
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 bg-[hsl(var(--color-accent-subtle))] p-4 rounded-lg">
              <AlertCircle size={16} className="text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-[hsl(var(--color-text))]">
                Ensure that your PDF form fields are set to "Visible" and "Read-only" after flattening to prevent unauthorized tampering.
              </p>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default DocumentBuilder;
