import { useState } from 'react';
import { X, Upload, Loader2, File } from 'lucide-react';
import Button from '../ui/Button';
import { CORRECTABLE_FIELDS, API_ENDPOINTS } from '../../utils/constants';
import apiClient from '../../utils/apiClient';

// Helper to format field names
const formatFieldName = (field) => {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const CorrectionRequestModal = ({ isOpen, onClose, applicationNo, onSuccess }) => {
  const [formData, setFormData] = useState({
    field_name: '',
    new_value: '',
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF, JPG, or PNG file.');
        return;
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be under 5MB.');
        return;
      }
      
      setError(null);
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.field_name || !formData.new_value) {
      setError('Please select a field and enter the new value.');
      return;
    }

    try {
      setIsSubmitting(true);
      let proof_file_path = '';

      // 1. Upload proof if file is selected
      if (file) {
        // Request signed upload URL
        const uploadUrlRes = await apiClient.post(API_ENDPOINTS.CORRECTIONS_UPLOAD, {
          fileName: file.name,
          mimeType: file.type
        });

        if (!uploadUrlRes.success) {
          throw new Error(uploadUrlRes.error || 'Failed to get upload URL');
        }

        const { signedUrl, path } = uploadUrlRes.data;

        // Upload file to Supabase directly
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload proof document');
        }

        proof_file_path = path;
      }

      // 2. Submit correction request payload
      const payload = {
        application_no: applicationNo,
        field_name: formData.field_name,
        new_value: formData.new_value,
        ...(proof_file_path && { proof_file_path })
      };

      const res = await apiClient.post(API_ENDPOINTS.CORRECTIONS_SUBMIT, payload);
      
      if (res.success) {
        onSuccess(res.data);
        onClose();
        // Reset state
        setFormData({ field_name: '', new_value: '' });
        setFile(null);
      } else {
        throw new Error(res.error || 'Failed to submit correction request');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Request Data Correction</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Submit a correction for application {applicationNo}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Field Selection */}
            <div>
              <label htmlFor="field_name" className="block text-sm font-medium text-zinc-700">
                Field to Correct
              </label>
              <select
                id="field_name"
                value={formData.field_name}
                onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              >
                <option value="" disabled>Select a field</option>
                {CORRECTABLE_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {formatFieldName(field)}
                  </option>
                ))}
              </select>
            </div>

            {/* New Value Input */}
            <div>
              <label htmlFor="new_value" className="block text-sm font-medium text-zinc-700">
                New Correct Value
              </label>
              <input
                type="text"
                id="new_value"
                value={formData.new_value}
                onChange={(e) => setFormData({ ...formData, new_value: e.target.value })}
                className="mt-1.5 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 placeholder:text-zinc-400"
                placeholder="Enter the correct information"
                required
              />
            </div>

            {/* Proof Upload */}
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Supporting Document (Optional)
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Upload a valid ID or document verifying the correction (PDF, JPG, PNG). Max 5MB.
              </p>
              
              <div className="mt-3 flex items-center justify-center w-full">
                <label 
                  htmlFor="proof-upload" 
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-colors ${file ? 'border-zinc-400' : 'border-zinc-300'}`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <File className="w-8 h-8 text-zinc-400 mb-2" />
                        <p className="text-sm font-medium text-zinc-700 truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                        <p className="mb-1 text-sm text-zinc-600"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      </>
                    )}
                  </div>
                  <input id="proof-upload" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                </label>
              </div>
              {file && (
                <div className="mt-2 text-right">
                  <button type="button" onClick={() => setFile(null)} className="text-xs text-red-600 hover:text-red-700 font-medium">
                    Remove file
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-zinc-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </span>
              ) : (
                'Submit Correction'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CorrectionRequestModal;
