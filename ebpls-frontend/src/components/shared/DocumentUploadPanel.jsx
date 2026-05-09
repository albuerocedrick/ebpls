// src/components/shared/DocumentUploadPanel.jsx

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X, CheckCircle2, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DocumentUploadPanel = ({ title, description, value, onChange, onRemove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10); 

    try {
      // 1. Ask Backend for Pre-Signed URL
      const urlResponse = await apiClient.post(API_ENDPOINTS.APPLICATIONS_UPLOAD, {
        fileName: file.name,
        mimeType: file.type 
      });

      const { uploadUrl, filePath } = urlResponse.data;
      setUploadProgress(40); 

      // 2. Upload file directly to Supabase Storage using native fetch
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

      // 3. Save internal Supabase path to form state
      setTimeout(() => {
        setIsUploading(false);
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
      alert('Failed to upload document. Ensure it is a PDF, JPG, or PNG under 5MB.');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onChange]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveClick = () => {
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
    <div className="flex flex-col border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg overflow-hidden bg-[hsl(var(--color-surface,0,0%,100%))] shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))] hover:shadow-[var(--shadow-md,0_4px_6px_-1px_rgba(0,0,0,0.1))] transition-shadow duration-200">
      
      <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] p-3.5 border-b border-[hsl(var(--color-border,0,0%,90%))]">
        <h4 className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,10%))] flex items-center justify-between">
          {title}
          {value && <CheckCircle2 size={16} className="text-green-600" />}
        </h4>
        {description && (
          <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="p-4">
        {value ? (
          <div className="flex items-center gap-3 p-3 border border-[hsl(var(--color-border,0,0%,90%))] rounded-md bg-[hsl(var(--color-surface-raised,0,0%,98%))]">
            <div className="w-12 h-12 shrink-0 rounded bg-white border border-[hsl(var(--color-border,0,0%,90%))] flex items-center justify-center overflow-hidden">
              {isImage && value.url ? (
                <img src={value.url} alt={value.file_name} className="w-full h-full object-cover" />
              ) : (
                <FileText size={24} className="text-[hsl(var(--color-text-muted,0,0%,40%))]" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))] truncate">
                {value.file_name}
              </p>
              <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))]">
                {formatFileSize(value.file_size)} • {isImage ? 'Image' : 'Document'}
              </p>
            </div>

            <button 
              type="button"
              onClick={handleRemoveClick}
              className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : 

        isUploading ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[hsl(var(--color-border,0,0%,90%))] rounded-md bg-[hsl(var(--color-surface-raised,0,0%,98%))]">
            <Loader2 size={32} className="text-accent animate-spin mb-3" />
            <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))]">Uploading document...</p>
            
            <div className="w-full max-w-xs mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1">{uploadProgress}%</p>
          </div>
        ) : 
        (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${isDragging ? 'border-accent bg-accent/5' : 'border-[hsl(var(--color-border,0,0%,80%))] bg-[hsl(var(--color-surface-raised,0,0%,98%))] hover:bg-[hsl(var(--color-surface-raised,0,0%,96%))]'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
            />
            <div className="w-10 h-10 rounded-full bg-white border border-[hsl(var(--color-border,0,0%,90%))] flex items-center justify-center mb-3 shadow-sm">
              <UploadCloud size={20} className={isDragging ? 'text-accent' : 'text-[hsl(var(--color-text-muted,0,0%,40%))]'} />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))] text-center">
              Click to upload <span className="font-normal text-[hsl(var(--color-text-muted,0,0%,40%))]">or drag and drop</span>
            </p>
            <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1 text-center">
              PDF, JPG, or PNG (Max. 5MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadPanel;