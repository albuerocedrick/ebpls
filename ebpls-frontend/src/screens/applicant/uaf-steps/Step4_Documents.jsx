// src/screens/applicant/uaf-steps/Step4_Documents.jsx

import React from 'react';
import useApplicationStore from '../../../store/applicationStore';
import DocumentUploadPanel from '../../../components/shared/DocumentUploadPanel';
import { FileText, AlertCircle } from 'lucide-react';

// Seeded from requirement_types table (seed.sql)
const REQUIRED_DOCUMENTS = [
  { 
    id: 'DTI_SEC_CDA', 
    name: 'DTI / SEC / CDA Registration', 
    description: 'Proof of legal business registration with DTI (Sole Prop), SEC (Corp/Partnership), or CDA (Coop).' 
  },
  { 
    id: 'BARANGAY_CLEARANCE', 
    name: 'Barangay Business Clearance', 
    description: 'Clearance issued by the Barangay where the business is located.' 
  },
  { 
    id: 'FIRE_SAFETY', 
    name: 'Fire Safety Inspection Certificate', 
    description: 'Issued by the Bureau of Fire Protection (BFP) after premises inspection.' 
  },
  { 
    id: 'SANITARY_PERMIT', 
    name: 'Sanitary Permit', 
    description: 'Issued by the Municipal Health Office after sanitary inspection.' 
  },
  { 
    id: 'ZONING_CLEARANCE', 
    name: 'Zoning Clearance', 
    description: 'Confirms business location complies with local zoning ordinances.' 
  },
  { 
    id: 'LEASE_TCT', 
    name: 'Lease Contract / TCT', 
    description: 'Proof of property ownership (TCT/OCT) or lease agreement if renting.' 
  },
];

const Step4_Documents = () => {
  const data = useApplicationStore((state) => state.formData.step4);
  const setFormField = useApplicationStore((state) => state.setFormField);

  const uploadedDocs = data.documents || [];

  // Find the metadata for a specific document type if it has been uploaded
  const getUploadedFileMeta = (docId) => {
    return uploadedDocs.find(doc => doc.doc_type === docId) || null;
  };

  const handleDocumentUpload = (docId, fileMetadata) => {
    // Check if replacing an existing document or adding a new one
    const existingIndex = uploadedDocs.findIndex(doc => doc.doc_type === docId);
    let newDocs = [...uploadedDocs];

    const payload = {
      doc_type: docId,
      ...fileMetadata
    };

    if (existingIndex >= 0) {
      newDocs[existingIndex] = payload;
    } else {
      newDocs.push(payload);
    }

    setFormField('step4', 'documents', newDocs);
  };

  const handleDocumentRemove = (docId) => {
    const newDocs = uploadedDocs.filter(doc => doc.doc_type !== docId);
    setFormField('step4', 'documents', newDocs);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Information Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Documentary Requirements</h4>
          <p className="text-xs text-blue-800 mt-1">
            Please upload clear, legible copies of the following documents. Allowed formats are PDF, JPG, and PNG. Maximum file size is 5MB per document. These will be reviewed by the BPLO Officer.
          </p>
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {REQUIRED_DOCUMENTS.map((req) => (
          <DocumentUploadPanel
            key={req.id}
            title={req.name}
            description={req.description}
            value={getUploadedFileMeta(req.id)}
            onChange={(meta) => handleDocumentUpload(req.id, meta)}
            onRemove={() => handleDocumentRemove(req.id)}
          />
        ))}
      </div>

    </div>
  );
};

export default Step4_Documents;