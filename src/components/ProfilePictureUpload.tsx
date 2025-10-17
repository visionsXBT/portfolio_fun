"use client";

import { useState, useRef } from 'react';

interface ProfilePictureUploadProps {
  currentImage?: string | null;
  onImageChange: (imageUrl: string | null) => void;
  userId: string;
  usernameInitial: string;
}

export default function ProfilePictureUpload({ currentImage, onImageChange, userId, usernameInitial }: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;

        console.log('Uploading profile picture for user:', userId);

        const response = await fetch('/api/upload-profile-picture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, imageData: base64data }),
        });

        if (response.ok) {
          const data = await response.json();
          setPreviewUrl(data.profilePictureUrl);
          onImageChange(data.profilePictureUrl);
        } else {
          const errorData = await response.json();
          console.error('Upload failed:', errorData);
          alert(`Failed to upload profile picture: ${errorData.error}`);
          setPreviewUrl(currentImage || null);
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert('Failed to read file.');
        setIsUploading(false);
      };
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('An unexpected error occurred during upload.');
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative w-16 h-16 rounded-full overflow-hidden group cursor-pointer" onClick={handleClick}>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Profile"
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] flex items-center justify-center text-white font-bold text-xl">
          {usernameInitial}
        </div>
      )}

      {/* Overlay for upload button */}
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {isUploading ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <span className="text-white text-3xl font-light">+</span>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
}