import React, { useState, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Camera, Plus, Check } from 'lucide-react';
import { submitToModeration } from '../../lib/firebaseService';
import { compressImage } from '../../lib/imageCompressor';

interface PhotoUploadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function PhotoUploadForm({ isOpen, onClose, onSuccess }: PhotoUploadFormProps) {
  const [uploadForm, setUploadForm] = useState({
    title: '',
    submittedBy: '',
    role: 'Student'
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const clearSelectedPhotos = () => {
    localPreviews.forEach(url => URL.revokeObjectURL(url));
    setLocalPreviews([]);
    setSelectedFiles([]);
  };

  const handlePhotoUploadChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 5) {
      setUploadError("You can only upload up to 5 images at a time.");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 5 * 1024 * 1024) {
        setUploadError(`Each image must be smaller than 5MB ("${files[i].name}" is too large).`);
        return;
      }
    }

    setUploadError("");
    
    // Revoke previous URLs to avoid memory leaks
    localPreviews.forEach(url => URL.revokeObjectURL(url));

    const selectedList = Array.from(files);
    const previewUrls = selectedList.map(file => URL.createObjectURL(file as Blob));

    setSelectedFiles(selectedList);
    setLocalPreviews(previewUrls);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setUploadError("Please select a photo first.");
      return;
    }
    if (!uploadForm.title || !uploadForm.submittedBy) {
      setUploadError("Please fill in all fields.");
      return;
    }

    setIsUploading(true);
    setUploadingCount(selectedFiles.length);
    setUploadError("");
    try {
      const urls: string[] = [];

      const uploadSingleFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const rawBase64 = reader.result as string;
            try {
              const base64data = await compressImage(rawBase64);
              const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: base64data, filename: file.name }),
              });

              const data = await response.json();
              if (response.ok && data.success) {
                resolve(data.url);
              } else {
                reject(new Error(data.error || "Upload failed."));
              }
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("Failed to read file."));
          reader.readAsDataURL(file);
        });
      };

      for (let i = 0; i < selectedFiles.length; i++) {
        const url = await uploadSingleFile(selectedFiles[i]);
        urls.push(url);
      }

      const submissionData = {
        title: uploadForm.title,
        submittedBy: uploadForm.submittedBy,
        role: uploadForm.role,
        urls: urls,
        url: urls[0],
        uploadedAt: new Date().toISOString()
      };

      const result = await submitToModeration('photo', submissionData);

      if (result.success) {
        onSuccess("Yes, congratulations, your upload has been successful. It will reflect soon.");
        onClose();
        // Reset form
        setUploadForm({ title: '', submittedBy: '', role: 'Student' });
        clearSelectedPhotos();
      } else {
        setUploadError("Failed to submit photo for moderation.");
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An error occurred during submission.");
    } finally {
      setIsUploading(false);
      setUploadingCount(0);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-10 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 z-10 text-slate-800 text-left"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#D4A017]/10 flex items-center justify-center border border-[#D4A017]/20">
                <Camera className="text-[#D4A017] w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-[#0F2557]">Share a Photo Memory</h3>
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Submissions undergo gatekeeper review</p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-mono">
                  ⚠️ {uploadError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold pl-1">Caption / Memo Title</label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Cultural Day Dance rehearsal"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#D4A017] focus:bg-white rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold pl-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.submittedBy}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, submittedBy: e.target.value }))}
                    placeholder="e.g. Amina Bello"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#D4A017] focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold pl-1">Your Role</label>
                  <select
                    value={uploadForm.role}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#D4A017] focus:bg-white rounded-xl text-xs outline-none transition-all cursor-pointer"
                  >
                    <option value="Student">Graduating Student</option>
                    <option value="Teacher">Teacher / Staff</option>
                    <option value="Parent">Parent / Guardian</option>
                    <option value="Alumni">Academy Alumnus</option>
                    <option value="Well-wisher">Well-wisher</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold pl-1">Choose Images (Max 5)</label>
                <div className="p-4 border-2 border-dashed border-slate-200 hover:border-[#D4A017]/50 rounded-2xl bg-slate-50/50 transition-all flex flex-col items-center justify-center gap-1.5 relative group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUploadChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-[#D4A017] transition-colors" />
                  <span className="text-xs text-slate-500 font-semibold">Select files or drag here</span>
                  <span className="text-[9px] text-slate-400">JPG, PNG up to 5MB each</span>
                </div>
              </div>

              {localPreviews.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[9px] font-mono uppercase text-slate-400">Selected Photos Preview ({localPreviews.length})</span>
                    <button
                      type="button"
                      onClick={clearSelectedPhotos}
                      className="text-[9px] font-mono uppercase text-rose-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    {localPreviews.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Local Preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-3 bg-[#0F2557] hover:bg-[#1a3d82] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Compressing & Uploading ({uploadingCount})...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit for Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
