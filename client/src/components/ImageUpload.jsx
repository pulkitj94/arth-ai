import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export default function ImageUpload({ onImageSelect }) {
    const [preview, setPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            setPreview(reader.result);
            onImageSelect(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const clearImage = () => {
        setPreview(null);
        onImageSelect(null);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-200">
                Media (optional)
            </label>

            {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-navy-light group">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-64 object-cover"
                    />
                    <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                        Ready for analysis
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => document.getElementById('imageInput').click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`
                        h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all
                        ${isDragging ? 'border-brand bg-brand/10' : 'border-navy-light hover:border-brand/50 hover:bg-navy-light/30'}
                    `}
                >
                    <div className="w-12 h-12 rounded-full bg-navy-light flex items-center justify-center mb-3">
                        <Upload className="text-brand" size={24} />
                    </div>
                    <p className="text-sm font-medium text-white">Click to upload or drag & drop</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG (Max 10MB)</p>
                    <input
                        id="imageInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleChange}
                    />
                </div>
            )}
        </div>
    );
}
