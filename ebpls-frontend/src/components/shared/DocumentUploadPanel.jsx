// src/components/shared/DocumentUploadPanel.jsx

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X, CheckCircle2, Image as ImageIcon, Trash2, Loader2, AlertCircle, Plus } from 'lucide-react';
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
    <div className="flex flex-col gap-2 h-full">
      {label && (
        <span className="text-xs font-semibold text-[hsl(var(--color-text-muted,0,0%,40%))] uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className={`flex-1 flex flex-col min-h-[140px] border border-[hsl(var(--color-border,0,0%,90%))] rounded-md overflow-hidden bg-[hsl(var(--color-surface,0,0%,100%))] ${disabled && !isUploading ? 'opacity-70' : ''}`}>
        {value ? (
          <div className="flex flex-col h-full items-center p-4 bg-[hsl(var(--color-surface-raised,0,0%,98%))]">
            <div className="w-16 h-16 shrink-0 rounded bg-white border border-[hsl(var(--color-border,0,0%,90%))] flex items-center justify-center overflow-hidden mb-3">
              {isImage && value.url ? (
                <img src={value.url} alt={value.file_name} className="w-full h-full object-cover" />
              ) : (
                <FileText size={32} className="text-[hsl(var(--color-text-muted,0,0%,40%))]" />
              )}
            </div>
            
            <div className="flex-1 w-full text-center min-w-0 mb-3">
              <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))] truncate w-full" title={value.file_name}>
                {value.file_name}
              </p>
              <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))]">
                {formatFileSize(value.file_size)}
                {value.file_size ? ' • ' : ''}
                {isImage ? 'Image' : 'Document'}
              </p>
            </div>

            <button 
              type="button"
              onClick={handleRemoveClick}
              disabled={disabled}
              className={`w-full py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 text-sm font-medium border ${disabled ? 'text-gray-400 border-gray-200 cursor-not-allowed bg-gray-50' : 'text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'}`}
            >
              <Trash2 size={16} /> Remove
            </button>
          </div>
        ) : 

        isUploading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-accent m-2 rounded-md bg-accent/5">
            <Loader2 size={28} className="text-accent animate-spin mb-3" />
            <p className="text-xs font-medium text-[hsl(var(--color-text,0,0%,10%))]">Uploading...</p>
            
            <div className="w-full max-w-[150px] mt-3 h-1.5 bg-white border border-accent/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1">{uploadProgress}%</p>
          </div>
        ) : 
        (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => { if (!disabled) fileInputRef.current?.click(); }}
            className={`flex-1 flex flex-col items-center justify-center p-4 m-2 border-2 border-dashed rounded-md transition-colors 
              ${disabled ? 'border-[hsl(var(--color-border,0,0%,90%))] bg-[hsl(var(--color-surface-raised,0,0%,96%))] cursor-not-allowed opacity-60' 
              : isDragging ? 'border-accent bg-accent/5 cursor-pointer' 
              : 'border-[hsl(var(--color-border,0,0%,80%))] bg-[hsl(var(--color-surface-raised,0,0%,98%))] hover:bg-[hsl(var(--color-surface-raised,0,0%,96%))] cursor-pointer'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={disabled}
            />
            <div className={`w-10 h-10 rounded-full bg-white border border-[hsl(var(--color-border,0,0%,90%))] flex items-center justify-center mb-3 shadow-sm ${disabled ? 'opacity-50' : ''}`}>
              <UploadCloud size={20} className={isDragging ? 'text-accent' : 'text-[hsl(var(--color-text-muted,0,0%,40%))]'} />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))] text-center">
              Click or drag
            </p>
            <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1 text-center">
              PDF/JPG/PNG (5MB)
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
               className={`self-start px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${disabled ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'text-accent bg-accent/10 hover:bg-accent/20'}`}
            >
              <Plus size={16} /> Add another file
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
    <div className={`flex flex-col border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg overflow-hidden bg-[hsl(var(--color-surface,0,0%,100%))] shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))] transition-shadow duration-200 ${disabled ? 'opacity-70' : 'hover:shadow-[var(--shadow-md,0_4px_6px_-1px_rgba(0,0,0,0.1))]'}`}>
      
      <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] p-3.5 border-b border-[hsl(var(--color-border,0,0%,90%))]">
        <h4 className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,10%))] flex items-center justify-between">
          {title}
          {isCompleted && <CheckCircle2 size={16} className="text-green-600" />}
        </h4>
        {description && (
          <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1">
            {description}
          </p>
        )}
        {feedback && (
          <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-red-50 border border-red-100">
            <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-red-800 leading-tight">
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