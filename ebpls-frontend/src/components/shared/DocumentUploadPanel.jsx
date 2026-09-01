// src/components/shared/DocumentUploadPanel.jsx

import { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle2, Trash2, Loader2, AlertCircle, Plus } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';

const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (isNaN(i)) return '';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const SingleDropzone = ({ value, onChange, onRemove, disabled, onUploadStart, onUploadEnd, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file) => {
    if (!file || disabled) return;

    setIsUploading(true);
    setUploadProgress(10);
    if (onUploadStart) onUploadStart();

    try {
      const urlResponse = await apiClient.post(API_ENDPOINTS.APPLICATIONS_UPLOAD, {
        fileName: file.name,
        mimeType: file.type
      });

      const { uploadUrl, filePath } = urlResponse.data;
      setUploadProgress(40);

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed: ${uploadRes.status}`);
      }
      
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        if (onUploadEnd) onUploadEnd();
        onChange({
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_path: filePath,
          url: URL.createObjectURL(file),
        });
      }, 500);

    } catch (error) {
      console.error('[DocumentUpload] Error:', error);
      setIsUploading(false);
      setUploadProgress(0);
      if (onUploadEnd) onUploadEnd();
      alert('Failed to upload document. Ensure it is a PDF, JPG, or PNG under 5MB.');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onChange, disabled]);

  const handleFileSelect = (e) => {
    if (disabled) return;
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveClick = () => {
    if (disabled) return;
    if (value?.url) {
      URL.revokeObjectURL(value.url);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove();
  };

  const isImage = value?.file_type?.startsWith('image/');

  return (
    <div className="flex h-full flex-col gap-2">
      {label && (
        <span className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
          {label}
        </span>
      )}
      <div className={`flex min-h-[140px] flex-1 flex-col overflow-hidden rounded-md border border-zinc-200 bg-white ${disabled && !isUploading ? 'opacity-70' : ''}`}>
        {value ? (
          <div className="flex h-full flex-col items-center bg-zinc-50 p-4">
            <div className="mb-3 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white">
              {isImage && value.url ? (
                <img src={value.url} alt={value.file_name} className="h-full w-full object-cover" />
              ) : (
                <FileText size={26} className="text-zinc-400" />
              )}
            </div>

            <div className="mb-3 min-w-0 w-full flex-1 text-center">
              <p className="w-full truncate text-sm font-medium text-zinc-900" title={value.file_name}>
                {value.file_name}
              </p>
              <p className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                {formatFileSize(value.file_size)}
                {value.file_size ? ' • ' : ''}
                {isImage ? 'Image' : 'Document'}
              </p>
            </div>

            <button 
              type="button"
              onClick={handleRemoveClick}
              disabled={disabled}
              className={`flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none ${disabled ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400' : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900'}`}
            >
              <Trash2 size={15} /> Remove
            </button>
          </div>
        ) : 

        isUploading ? (
          <div className="m-2 flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-zinc-400 bg-zinc-50 p-4">
            <Loader2 size={22} className="mb-3 animate-spin text-zinc-500" />
            <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-600 uppercase">Uploading</p>

            <div className="mt-3 h-px w-full max-w-[150px] overflow-hidden bg-zinc-200">
              <div 
                className="h-full bg-zinc-900 transition-all duration-300 ease-out motion-reduce:transition-none"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-zinc-500 tabular-nums">{uploadProgress}%</p>
          </div>
        ) : 
        (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => { if (!disabled) fileInputRef.current?.click(); }}
            className={`m-2 flex flex-1 flex-col items-center justify-center rounded-md border border-dashed p-4 transition-colors duration-200 motion-reduce:transition-none
              ${disabled ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60' 
              : isDragging ? 'cursor-pointer border-zinc-900 bg-zinc-100' 
              : 'cursor-pointer border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={disabled}
            />
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white ${disabled ? 'opacity-50' : ''}`}>
              <UploadCloud size={18} className={isDragging ? 'text-zinc-900' : 'text-zinc-500'} />
            </div>
            <p className="text-center text-sm font-medium text-zinc-900">
              Click or drag
            </p>
            <p className="mt-1 text-center font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
              PDF / JPG / PNG · 5 MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * DocumentUploadPanel Component
 * 
 * @param {Object} props
 * @param {string} props.title - Title of the upload panel
 * @param {string} [props.description] - Description of the upload panel
 * @param {Object|Object[]} props.value - Uploaded file metadata. Object if maxFiles=1, Array of Objects if maxFiles>1.
 * @param {Function} props.onChange - Callback when file is uploaded or changed. 
 *                                    If maxFiles=1, signature is `(fileData) => void`. 
 *                                    If maxFiles>1, signature is `(fileDataArray) => void`.
 * @param {Function} props.onRemove - Callback when the main file is removed or panel is cleared
 * @param {boolean} [props.disabled] - Disables upload inputs
 * @param {Function} [props.onUploadStart] - Callback when upload begins
 * @param {Function} [props.onUploadEnd] - Callback when upload ends
 * @param {string} [props.feedback] - Validation feedback message
 * @param {number} [props.maxFiles=1] - Maximum number of files allowed (1, 2, or 3)
 */
const DocumentUploadPanel = ({ title, description, value, onChange, onRemove, disabled, onUploadStart, onUploadEnd, feedback, maxFiles = 1 }) => {
  const [visibleSlots, setVisibleSlots] = useState(1);
  
  // Handlers for maxFiles === 1 (Backward compatible)
  const handleSingleChange = (fileData) => {
    onChange(fileData);
  };
  const handleSingleRemove = () => {
    onRemove();
  };

  // Handlers for maxFiles > 1
  const getArrayValue = () => Array.isArray(value) ? value : [];
  
  const handleArrayItemChange = (index, fileData) => {
    const currentList = getArrayValue();
    const newList = [...currentList];
    newList[index] = fileData;
    // Filter out any nulls just in case, but keep structure
    onChange(newList.filter(Boolean));
    setVisibleSlots(Math.max(1, newList.filter(Boolean).length));
  };

  const handleArrayItemRemove = (index) => {
    const currentList = getArrayValue();
    const newList = currentList.filter((_, i) => i !== index);
    onChange(newList.length > 0 ? newList : []); 
    if (newList.length === 0) {
       onRemove();
    }
    setVisibleSlots(Math.max(1, newList.length));
  };

  const renderSlots = () => {
    if (maxFiles === 2) {
      const arr = getArrayValue();
      return (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SingleDropzone
            label="Front of ID"
            value={arr[0] || null}
            onChange={(data) => handleArrayItemChange(0, data)}
            onRemove={() => handleArrayItemRemove(0)}
            disabled={disabled}
            onUploadStart={onUploadStart}
            onUploadEnd={onUploadEnd}
          />
          <SingleDropzone
            label="Back of ID"
            value={arr[1] || null}
            onChange={(data) => handleArrayItemChange(1, data)}
            onRemove={() => handleArrayItemRemove(1)}
            disabled={disabled}
            onUploadStart={onUploadStart}
            onUploadEnd={onUploadEnd}
          />
        </div>
      );
    }
    
    if (maxFiles === 3) {
      const arr = getArrayValue();
      const currentSlotsCount = Math.max(visibleSlots, arr.length || 1);
      
      const slots = [];
      for (let i = 0; i < currentSlotsCount; i++) {
        slots.push(
          <SingleDropzone
            key={i}
            label={i === 0 ? "File 1" : `File ${i + 1}`}
            value={arr[i] || null}
            onChange={(data) => handleArrayItemChange(i, data)}
            onRemove={() => handleArrayItemRemove(i)}
            disabled={disabled}
            onUploadStart={onUploadStart}
            onUploadEnd={onUploadEnd}
          />
        );
      }

      return (
        <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {slots}
          </div>
          {currentSlotsCount < maxFiles && (
            <button
               type="button"
               disabled={disabled}
               onClick={() => setVisibleSlots(prev => Math.min(maxFiles, prev + 1))}
               className={`flex items-center gap-2 self-start rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none ${disabled ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400' : 'border-zinc-300 bg-white text-zinc-900 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white'}`}
            >
              <Plus size={15} /> Add another file
            </button>
          )}
        </div>
      );
    }

    // Default maxFiles === 1
    return (
      <div className="p-4">
        <SingleDropzone
          value={value}
          onChange={handleSingleChange}
          onRemove={handleSingleRemove}
          disabled={disabled}
          onUploadStart={onUploadStart}
          onUploadEnd={onUploadEnd}
        />
      </div>
    );
  };

  const isCompleted = maxFiles > 1 
    ? (getArrayValue().length > 0)
    : !!value;

  return (
    <div className={`flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition-colors duration-200 motion-reduce:transition-none ${disabled ? 'opacity-70' : 'hover:border-zinc-300'}`}>

      <div className="border-b border-zinc-200 bg-zinc-50 p-3.5">
        <h4 className="flex items-center justify-between text-sm font-medium text-zinc-900">
          {title}
          {isCompleted && <CheckCircle2 size={15} className="text-zinc-900" />}
        </h4>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        )}
        {feedback && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md border border-zinc-300 bg-white p-2">
            <AlertCircle size={13} className="mt-0.5 shrink-0 text-zinc-600" />
            <p className="text-[11px] leading-snug text-zinc-700">
              {feedback}
            </p>
          </div>
        )}
      </div>

      {renderSlots()}
    </div>
  );
};

export default DocumentUploadPanel;