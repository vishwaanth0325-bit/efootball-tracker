import React, { useState } from 'react';
import type { Player } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Upload, Link2, Sparkles, Image as ImageIcon, X } from 'lucide-react';

interface PlayerFormProps {
  player?: Player;
  onSubmit: (data: Omit<Player, 'id' | 'created_at'>) => void;
  onClose: () => void;
}

// Curated modern avatar presets for eFootball players
const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
];

export const PlayerForm: React.FC<PlayerFormProps> = ({ player, onSubmit, onClose }) => {
  const [name, setName] = useState(player?.name || '');
  const [team, setTeam] = useState(player?.team || '');
  const [platform, setPlatform] = useState(player?.platform || 'Mobile');
  const [profileImage, setProfileImage] = useState(player?.profile_image || '');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to compressed base64 DataURL
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfileImage(dataUrl);
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setProfileImage(customUrlInput.trim());
      setCustomUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      team: team.trim() || undefined,
      platform,
      profile_image: profileImage || undefined,
      status: player?.status || 'active',
      efootball_username: player?.efootball_username || name.trim(),
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={player ? 'Edit Player' : 'Add Player'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Profile Picture Section */}
        <div className="p-4 rounded-xl bg-surface/70 border border-border-light space-y-3">
          <label className="text-xs font-semibold text-text uppercase tracking-wider block">
            Profile Picture
          </label>

          <div className="flex items-center gap-4">
            {/* Current Avatar Preview */}
            <div className="relative group shrink-0">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Avatar Preview"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-accent shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-surface-hover border-2 border-dashed border-border-light flex items-center justify-center text-text-muted">
                  <ImageIcon size={24} />
                </div>
              )}

              {profileImage && (
                <button
                  type="button"
                  onClick={() => setProfileImage('')}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                  title="Remove picture"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Avatar Selection Actions */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Upload button */}
                <label className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5 hover:border-accent">
                  <Upload size={13} />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Custom URL button */}
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-accent"
                >
                  <Link2 size={13} />
                  <span>Image URL</span>
                </button>
              </div>

              {/* URL input field */}
              {showUrlInput && (
                <div className="flex gap-2 pt-1 animate-fadeIn">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="Paste image link (https://...)"
                    className="form-input text-xs flex-1 py-1"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="btn btn-primary text-xs py-1 px-3"
                    disabled={!customUrlInput.trim()}
                  >
                    Set
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Preset Avatars */}
          <div className="space-y-1.5 pt-2 border-t border-border-light/60">
            <span className="text-[11px] text-text-muted flex items-center gap-1">
              <Sparkles size={11} className="text-accent" />
              Or pick an avatar preset:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {AVATAR_PRESETS.map((presetUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setProfileImage(presetUrl)}
                  className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-transform hover:scale-105 ${
                    profileImage === presetUrl
                      ? 'border-accent ring-2 ring-accent/30 scale-105'
                      : 'border-border-light hover:border-accent/60'
                  }`}
                >
                  <img src={presetUrl} alt={`Avatar preset ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <Input
          id="playerName"
          label="Player / Manager Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Lionel Messi, Alex Rivera, Cristiano Ronaldo"
        />

        <Input
          id="playerTeam"
          label="Assigned Club / National Team"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          placeholder="e.g. Real Madrid, Argentina, Arsenal, Inter Miami"
        />

        <Select
          id="playerPlatform"
          label="Gaming Platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          options={[
            { value: 'Mobile', label: 'Mobile (iOS / Android)' },
            { value: 'PS5', label: 'PlayStation 5' },
            { value: 'PS4', label: 'PlayStation 4' },
            { value: 'Xbox', label: 'Xbox Series / One' },
            { value: 'PC', label: 'PC / Steam' },
          ]}
        />

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-light">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            {player ? 'Save Changes' : 'Add Player'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
