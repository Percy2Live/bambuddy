import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gauge,
  Loader2,
  RefreshCw,
  Printer,
  Plus,
  X,
  AlertCircle,
  WifiOff,
  Trash2,
  Search,
} from 'lucide-react';
import { api } from '../api/client';
import type { KProfile, KProfileCreate, KProfileDelete } from '../api/client';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { useToast } from '../contexts/ToastContext';

interface KProfileCardProps {
  profile: KProfile;
  onEdit: () => void;
}

// Truncate to 3 decimal places (like Bambu Studio) instead of rounding
const truncateK = (value: string) => {
  const num = parseFloat(value);
  return (Math.trunc(num * 1000) / 1000).toFixed(3);
};

// Get flow type label from nozzle_id (e.g., "HH00-0.4" -> "HF", "HS00-0.4" -> "S")
const getFlowTypeLabel = (nozzleId: string) => {
  if (nozzleId.startsWith('HH')) return 'HF';  // High Flow
  return 'S';  // Standard Flow (default)
};

// Extract nozzle type prefix from nozzle_id (e.g., "HH00-0.4" -> "HH00")
const getNozzleTypePrefix = (nozzleId: string) => {
  const match = nozzleId.match(/^([A-Z]{2}\d{2})/);
  return match ? match[1] : 'HH00';
};

// Extract filament name from profile name (e.g., "High Flow_Devil Design PLA Basic" -> "Devil Design PLA Basic")
const extractFilamentName = (profileName: string) => {
  // Profile names are formatted as "{Flow Type}_{Filament Name}" or "{Flow Type} {Filament Name}"
  // Remove common prefixes - check both underscore and space separators
  const prefixes = [
    'High Flow_', 'High Flow ',  // underscore or space
    'Standard_', 'Standard ',
    'HF_', 'HF ',
    'S_', 'S ',
  ];
  for (const prefix of prefixes) {
    if (profileName.startsWith(prefix)) {
      return profileName.slice(prefix.length);
    }
  }
  // If no prefix found, check for underscore separator
  const underscoreIdx = profileName.indexOf('_');
  if (underscoreIdx > 0) {
    return profileName.slice(underscoreIdx + 1);
  }
  return profileName;
};

function KProfileCard({ profile, onEdit }: KProfileCardProps) {
  const flowType = getFlowTypeLabel(profile.nozzle_id);
  const diameter = profile.nozzle_diameter;
  const profileName = profile.name || 'Unnamed';
  // Extract filament name from profile name (e.g., "High Flow_eSUN ABS+" -> "eSUN ABS+")
  const filamentName = extractFilamentName(profile.name || '');

  return (
    <button
      onClick={onEdit}
      className="w-full text-left px-3 py-2 bg-bambu-dark rounded hover:bg-bambu-dark-tertiary transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-bambu-green font-mono text-sm font-bold whitespace-nowrap">
          {truncateK(profile.k_value)}
        </span>
        <span className="text-white text-sm truncate flex-1" title={profileName}>
          {profileName}
        </span>
        <span className="text-xs text-bambu-gray whitespace-nowrap">
          {flowType} {diameter}
        </span>
      </div>
      <div className="text-xs text-bambu-gray mt-0.5 truncate" title={`Filament: ${filamentName}`}>
        Filament: {filamentName || profile.filament_id}
      </div>
    </button>
  );
}

interface KProfileModalProps {
  profile?: KProfile;
  printerId: number;
  nozzleDiameter: string;
  existingProfiles?: KProfile[];  // Existing profiles for filament selection
  isDualNozzle?: boolean;  // Whether this is a dual-nozzle printer
  onClose: () => void;
  onSave: () => void;
}

function KProfileModal({
  profile,
  printerId,
  nozzleDiameter,
  existingProfiles = [],
  isDualNozzle = false,
  onClose,
  onSave,
}: KProfileModalProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(profile?.name || '');
  const [kValue, setKValue] = useState(
    profile?.k_value ? truncateK(profile.k_value) : '0.020'
  );
  const [filamentId, setFilamentId] = useState(profile?.filament_id || '');
  // Split nozzle into type and diameter
  const [nozzleType, setNozzleType] = useState(
    profile?.nozzle_id ? getNozzleTypePrefix(profile.nozzle_id) : 'HH00'
  );
  const [modalDiameter, setModalDiameter] = useState(
    profile?.nozzle_diameter || nozzleDiameter
  );
  const [extruderId, setExtruderId] = useState(profile?.extruder_id || 0);

  // Extract unique filaments from existing K-profiles on the printer
  // These have valid filament_ids that the printer recognizes
  const knownFilaments = React.useMemo(() => {
    const filamentMap = new Map<string, { id: string; name: string }>();
    for (const p of existingProfiles) {
      if (p.filament_id && !filamentMap.has(p.filament_id)) {
        const filamentName = extractFilamentName(p.name || '');
        filamentMap.set(p.filament_id, {
          id: p.filament_id,
          name: filamentName || p.filament_id,
        });
      }
    }
    return Array.from(filamentMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [existingProfiles]);

  const saveMutation = useMutation({
    mutationFn: (data: KProfileCreate) => {
      console.log('[KProfile] Calling API...');
      return api.setKProfile(printerId, data);
    },
    onSuccess: (result) => {
      console.log('[KProfile] Save success:', result);
      showToast('K-profile saved');
      queryClient.invalidateQueries({ queryKey: ['kprofiles', printerId] });
      onSave();
    },
    onError: (error: Error) => {
      console.error('[KProfile] Save error:', error);
      showToast(error.message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (data: KProfileDelete) => {
      console.log('[KProfile] Deleting profile...');
      return api.deleteKProfile(printerId, data);
    },
    onSuccess: (result) => {
      console.log('[KProfile] Delete success:', result);
      showToast('K-profile deleted');
      queryClient.invalidateQueries({ queryKey: ['kprofiles', printerId] });
      onClose();
    },
    onError: (error: Error) => {
      console.error('[KProfile] Delete error:', error);
      showToast(error.message, 'error');
    },
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (!profile) return;
    deleteMutation.mutate({
      slot_id: profile.slot_id,
      extruder_id: profile.extruder_id,
      nozzle_id: profile.nozzle_id,
      nozzle_diameter: profile.nozzle_diameter,
      filament_id: profile.filament_id,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Format k_value to 6 decimal places for Bambu protocol
    const formattedKValue = parseFloat(kValue).toFixed(6);
    // Combine nozzle type and diameter into nozzle_id (e.g., "HH00-0.4")
    const nozzleId = `${nozzleType}-${modalDiameter}`;

    // Use the name from the form - it's auto-populated when filament is selected
    // but can be edited by the user
    const payload = {
      name: name,
      k_value: formattedKValue,
      filament_id: filamentId,
      nozzle_id: nozzleId,
      nozzle_diameter: modalDiameter,
      extruder_id: extruderId,
      setting_id: profile?.setting_id,
      slot_id: profile?.slot_id ?? 0,
    };
    console.log('[KProfile] Saving profile:', payload);
    saveMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-bambu-dark-tertiary">
            <h2 className="text-xl font-semibold text-white">
              {profile ? 'Edit K-Profile' : 'Add K-Profile'}
            </h2>
            <button
              onClick={onClose}
              className="text-bambu-gray hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Profile Name - read-only when editing */}
            <div>
              <label className="block text-sm text-bambu-gray mb-1">Profile Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!profile}
                className={`w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none ${profile ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder="My PLA Profile"
                required
              />
            </div>

            {/* K-Value - always editable */}
            <div>
              <label className="block text-sm text-bambu-gray mb-1">K-Value</label>
              <input
                type="text"
                inputMode="decimal"
                value={kValue}
                onChange={(e) => {
                  // Allow typing any decimal value
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setKValue(val);
                  }
                }}
                onBlur={(e) => {
                  // Format to 3 decimal places on blur
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num)) {
                    setKValue((Math.trunc(num * 1000) / 1000).toFixed(3));
                  }
                }}
                className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none font-mono"
                placeholder="0.020"
                required
              />
              <p className="text-xs text-bambu-gray mt-1">
                Typical range: 0.01 - 0.06 for PLA, 0.02 - 0.10 for PETG
              </p>
            </div>

            {/* Filament - read-only when editing */}
            <div>
              <label className="block text-sm text-bambu-gray mb-1">Filament</label>
              <select
                value={filamentId}
                onChange={(e) => {
                  const newFilamentId = e.target.value;
                  setFilamentId(newFilamentId);
                  // Auto-generate profile name when filament is selected (for new profiles)
                  // Only auto-generate if name is empty - don't overwrite user input
                  if (!profile && newFilamentId && !name) {
                    const selectedFilament = knownFilaments.find(f => f.id === newFilamentId);
                    if (selectedFilament) {
                      const flowLabel = nozzleType === 'HH00' ? 'HF' : 'S';
                      setName(`${flowLabel} ${selectedFilament.name}`);
                    }
                  }
                }}
                disabled={!!profile}
                className={`w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none ${profile ? 'opacity-60 cursor-not-allowed' : ''}`}
                required
              >
                <option value="">Select filament...</option>
                {/* Show current filament when editing */}
                {profile?.filament_id && (
                  <option key={profile.filament_id} value={profile.filament_id}>
                    {extractFilamentName(profile.name || profile.filament_id)}
                  </option>
                )}
                {/* Show known filaments from existing K-profiles (for new profiles) */}
                {!profile && knownFilaments.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              {!profile && knownFilaments.length === 0 && (
                <p className="text-xs text-bambu-gray mt-1">
                  No filaments found. Create a K-profile in Bambu Studio first.
                </p>
              )}
            </div>

            {/* Flow Type and Nozzle Size - read-only when editing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-bambu-gray mb-1">Flow Type</label>
                <select
                  value={nozzleType}
                  onChange={(e) => {
                    const newNozzleType = e.target.value;
                    setNozzleType(newNozzleType);
                    // Update profile name when flow type changes (for new profiles)
                    // Only auto-generate if name is empty - don't overwrite user input
                    if (!profile && filamentId && !name) {
                      const selectedFilament = knownFilaments.find(f => f.id === filamentId);
                      if (selectedFilament) {
                        const flowLabel = newNozzleType === 'HH00' ? 'HF' : 'S';
                        setName(`${flowLabel} ${selectedFilament.name}`);
                      }
                    }
                  }}
                  disabled={!!profile}
                  className={`w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none ${profile ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="HH00">High Flow</option>
                  <option value="HS00">Standard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-bambu-gray mb-1">Nozzle Size</label>
                <select
                  value={modalDiameter}
                  onChange={(e) => setModalDiameter(e.target.value)}
                  disabled={!!profile}
                  className={`w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none ${profile ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="0.2">0.2mm</option>
                  <option value="0.4">0.4mm</option>
                  <option value="0.6">0.6mm</option>
                  <option value="0.8">0.8mm</option>
                </select>
              </div>
            </div>

            {/* Extruder - only show for dual-nozzle printers, read-only when editing */}
            {isDualNozzle && (
              <div>
                <label className="block text-sm text-bambu-gray mb-1">Extruder</label>
                <select
                  value={extruderId}
                  onChange={(e) => setExtruderId(parseInt(e.target.value))}
                  disabled={!!profile}
                  className={`w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none ${profile ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value={1}>Left</option>
                  <option value={0}>Right</option>
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {profile && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                  className="text-red-500 hover:bg-red-500/10"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Gauge className="w-4 h-4" />
                )}
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Delete Profile</h3>
                  <p className="text-sm text-bambu-gray">This cannot be undone</p>
                </div>
              </div>
              <p className="text-bambu-gray mb-6">
                Are you sure you want to delete <span className="text-white font-medium">"{profile?.name}"</span> from the printer?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDelete();
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

type ExtruderFilter = 'all' | 'left' | 'right';
type FlowTypeFilter = 'all' | 'hf' | 's';

export function KProfilesView() {
  const [selectedPrinter, setSelectedPrinter] = useState<number | null>(null);
  const [nozzleDiameter, setNozzleDiameter] = useState('0.4');
  const [editingProfile, setEditingProfile] = useState<KProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [extruderFilter, setExtruderFilter] = useState<ExtruderFilter>('all');
  const [flowTypeFilter, setFlowTypeFilter] = useState<FlowTypeFilter>('all');

  // Get available printers
  const { data: printers, isLoading: printersLoading } = useQuery({
    queryKey: ['printers'],
    queryFn: api.getPrinters,
  });

  // Get K-profiles for selected printer
  const {
    data: kprofiles,
    isLoading: kprofilesLoading,
    error: kprofilesError,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ['kprofiles', selectedPrinter, nozzleDiameter],
    queryFn: () => api.getKProfiles(selectedPrinter!, nozzleDiameter),
    enabled: !!selectedPrinter,
    retry: false,
  });

  // Check if error is due to printer not being connected
  const isOfflineError = kprofilesError?.message?.includes('not connected');

  // Filter profiles based on search query, extruder filter, and flow type
  const filteredProfiles = React.useMemo(() => {
    if (!kprofiles?.profiles) return [];

    return kprofiles.profiles.filter((p) => {
      // Search filter - match name or filament_id (case-insensitive)
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.filament_id.toLowerCase().includes(query);

      // Extruder filter
      const matchesExtruder =
        extruderFilter === 'all' ||
        (extruderFilter === 'left' && p.extruder_id === 1) ||
        (extruderFilter === 'right' && p.extruder_id === 0);

      // Flow type filter (HH = High Flow, HS = Standard)
      const matchesFlowType =
        flowTypeFilter === 'all' ||
        (flowTypeFilter === 'hf' && p.nozzle_id.startsWith('HH')) ||
        (flowTypeFilter === 's' && p.nozzle_id.startsWith('HS'));

      return matchesSearch && matchesExtruder && matchesFlowType;
    });
  }, [kprofiles?.profiles, searchQuery, extruderFilter, flowTypeFilter]);

  // Auto-select first connected printer
  const connectedPrinters = printers?.filter((p) => p.is_active) || [];
  if (!selectedPrinter && connectedPrinters.length > 0) {
    setSelectedPrinter(connectedPrinters[0].id);
  }

  // Check if selected printer is dual-nozzle (auto-detected from MQTT temperature data)
  const selectedPrinterData = printers?.find((p) => p.id === selectedPrinter);
  const isDualNozzle = selectedPrinterData?.nozzle_count === 2;

  if (printersLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-bambu-green animate-spin" />
      </div>
    );
  }

  if (!printers || printers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-bambu-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Printers Configured</h3>
          <p className="text-bambu-gray">
            Add a printer in Settings to manage K-profiles
          </p>
        </CardContent>
      </Card>
    );
  }

  if (connectedPrinters.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Printer className="w-12 h-12 text-bambu-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Active Printers</h3>
          <p className="text-bambu-gray">
            Enable a printer connection to view its K-profiles
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Printer & Nozzle Selector */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-48">
          <label className="block text-sm text-bambu-gray mb-1">Printer</label>
          <select
            value={selectedPrinter || ''}
            onChange={(e) => setSelectedPrinter(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
          >
            {connectedPrinters.map((printer) => (
              <option key={printer.id} value={printer.id}>
                {printer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-32">
          <label className="block text-sm text-bambu-gray mb-1">Nozzle</label>
          <select
            value={nozzleDiameter}
            onChange={(e) => setNozzleDiameter(e.target.value)}
            className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
          >
            <option value="0.2">0.2mm</option>
            <option value="0.4">0.4mm</option>
            <option value="0.6">0.6mm</option>
            <option value="0.8">0.8mm</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            variant="secondary"
            onClick={() => refetchProfiles()}
            disabled={kprofilesLoading}
          >
            <RefreshCw className={`w-4 h-4 ${kprofilesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Profile
          </Button>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bambu-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or filament..."
            className="w-full pl-10 pr-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white placeholder-bambu-gray focus:border-bambu-green focus:outline-none"
          />
        </div>
        {isDualNozzle && (
          <div className="w-36">
            <select
              value={extruderFilter}
              onChange={(e) => setExtruderFilter(e.target.value as ExtruderFilter)}
              className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
            >
              <option value="all">All Extruders</option>
              <option value="left">Left Only</option>
              <option value="right">Right Only</option>
            </select>
          </div>
        )}
        <div className="w-32">
          <select
            value={flowTypeFilter}
            onChange={(e) => setFlowTypeFilter(e.target.value as FlowTypeFilter)}
            className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
          >
            <option value="all">All Flow</option>
            <option value="hf">HF Only</option>
            <option value="s">S Only</option>
          </select>
        </div>
      </div>

      {/* K-Profiles Grid */}
      {kprofilesLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-bambu-green animate-spin" />
        </div>
      ) : isOfflineError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <WifiOff className="w-12 h-12 text-bambu-gray mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Printer Offline</h3>
            <p className="text-bambu-gray mb-4">
              The selected printer is not connected. Power it on to view K-profiles.
            </p>
            <Button variant="secondary" onClick={() => refetchProfiles()}>
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredProfiles.length > 0 ? (
        isDualNozzle ? (
          // Dual-nozzle: show Left/Right columns
          <div className="grid grid-cols-2 gap-4">
            {/* Left Extruder (extruder_id 1 on Bambu) */}
            <div>
              <h3 className="text-sm font-medium text-bambu-gray mb-2 px-1">Left Extruder</h3>
              <div className="space-y-1">
                {filteredProfiles
                  .filter((p) => p.extruder_id === 1)
                  .map((profile) => (
                    <KProfileCard
                      key={profile.slot_id}
                      profile={profile}
                      onEdit={() => setEditingProfile(profile)}
                    />
                  ))}
              </div>
            </div>
            {/* Right Extruder (extruder_id 0 on Bambu) */}
            <div>
              <h3 className="text-sm font-medium text-bambu-gray mb-2 px-1">Right Extruder</h3>
              <div className="space-y-1">
                {filteredProfiles
                  .filter((p) => p.extruder_id === 0)
                  .map((profile) => (
                    <KProfileCard
                      key={profile.slot_id}
                      profile={profile}
                      onEdit={() => setEditingProfile(profile)}
                    />
                  ))}
              </div>
            </div>
          </div>
        ) : (
          // Single-nozzle: show all profiles in one list
          <div className="space-y-1">
            {filteredProfiles.map((profile) => (
              <KProfileCard
                key={profile.slot_id}
                profile={profile}
                onEdit={() => setEditingProfile(profile)}
              />
            ))}
          </div>
        )
      ) : searchQuery || extruderFilter !== 'all' || flowTypeFilter !== 'all' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 text-bambu-gray mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Matching Profiles</h3>
            <p className="text-bambu-gray">
              No profiles match your search criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Gauge className="w-12 h-12 text-bambu-gray mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No K-Profiles</h3>
            <p className="text-bambu-gray mb-4">
              No pressure advance profiles found for {nozzleDiameter}mm nozzle
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" />
              Create First Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      {editingProfile && selectedPrinter && (
        <KProfileModal
          profile={editingProfile}
          printerId={selectedPrinter}
          nozzleDiameter={nozzleDiameter}
          existingProfiles={kprofiles?.profiles}
          isDualNozzle={isDualNozzle}
          onClose={() => setEditingProfile(null)}
          onSave={() => setEditingProfile(null)}
        />
      )}

      {/* Add Modal */}
      {showAddModal && selectedPrinter && (
        <KProfileModal
          printerId={selectedPrinter}
          nozzleDiameter={nozzleDiameter}
          existingProfiles={kprofiles?.profiles}
          isDualNozzle={isDualNozzle}
          onClose={() => setShowAddModal(false)}
          onSave={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}
