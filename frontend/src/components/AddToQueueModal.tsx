import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, X, AlertCircle, Power, Hand, Check, AlertTriangle, Circle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';
import type { PrintQueueItemCreate } from '../api/client';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { useToast } from '../contexts/ToastContext';

// Bambu Lab filament hex color to name mapping (from bambu-color-names.csv)
const BAMBU_HEX_COLORS: Record<string, string> = {
  '000000': 'Black', '001489': 'Blue', '002e96': 'Blue', '0047bb': 'Blue', '00482b': 'Pine Green',
  '004ea8': 'Blue', '0056b8': 'Cobalt Blue', '0069b1': 'Lake Blue', '0072ce': 'Blue', '0078bf': 'Marine Blue',
  '0085ad': 'Light Blue', '0086d6': 'Cyan', '008bda': 'Blue', '009639': 'Green', '009bd8': 'Cyan',
  '009fa1': 'Teal', '00a6a0': 'Green', '00ae42': 'Bambu Green', '00b1b7': 'Turquoise', '00bb31': 'Green',
  '018814': 'Candy Green', '042f56': 'Dark Blue', '0a2989': 'Blue', '0a2ca5': 'Blue', '0c2340': 'Navy Blue',
  '0c3b95': 'Blue', '101820': 'Black', '147bd1': 'Blue', '164b35': 'Green', '16b08e': 'Malachite Green',
  '1d7c6a': 'Oxide Green Metallic', '1f79e5': 'Lake Blue', '2140b4': 'Blue', '25282a': 'Black', '2842ad': 'Royal Blue',
  '2d2b28': 'Onyx Black Sparkle', '324585': 'Indigo Blue', '353533': 'Gray', '39541a': 'Forest Green',
  '39699e': 'Cobalt Blue Metallic', '3b665e': 'Green', '3f5443': 'Alpine Green Sparkle', '3f8e43': 'Mistletoe Green',
  '424379': 'Nebulae', '43403d': 'Iron Gray Metallic', '482960': 'Indigo Purple', '483d8b': 'Royal Purple Sparkle',
  '489fdf': 'Azure', '4c241c': 'Rosewood', '4ce4a0': 'Green', '4d3324': 'Dark Chocolate', '4d5054': 'Lava Gray',
  '4dafda': 'Cyan', '4f3f24': 'Black Walnut', '515151': 'Dark Gray', '515a6c': 'Gray', '545454': 'Dark Gray',
  '565656': 'Titan Gray', '56b7e6': 'Sky Blue', '583061': 'Violet Purple', '5898dd': 'Blue', '594177': 'Purple',
  '5b492f': 'Brown', '5b6579': 'Blue Gray', '5c9748': 'Matcha Green', '5e43b7': 'Purple', '5e4b3c': 'Copper',
  '5f6367': 'Titan Gray', '61b0ff': 'Translucent Light Blue', '61bf36': 'Green', '61c680': 'Grass Green',
  '6667ab': 'Lavender Blue', '684a43': 'Brown', '686865': 'Black', '68724d': 'Dark Green', '688197': 'Blue Gray',
  '69398e': 'Iris Purple', '6e88bc': 'Jeans Blue', '6ee53c': 'Lime Green', '6f5034': 'Cocoa Brown', '7248bd': 'Lavender',
  '748c45': 'Translucent Olive', '757575': 'Nardo Gray', '75aed8': 'Blue', '77edd7': 'Translucent Teal', '789d4a': 'Olive',
  '792b36': 'Crimson Red Sparkle', '7ac0e9': 'Glow Blue', '7ae1bf': 'Mint', '7cd82b': 'Lime Green', '7d6556': 'Dark Brown',
  '8344b0': 'Purple', '847d48': 'Bronze', '854ce4': 'Purple', '8671cb': 'Purple', '875718': 'Peanut Brown',
  '87909a': 'Silver', '898d8d': 'Gray', '8a949e': 'Gray', '8e8e8e': 'Translucent Gray', '8e9089': 'Gray',
  '90ff1a': 'Neon Green', '918669': 'Classic Birch', '939393': 'Gray', '950051': 'Plum', '951e23': 'Burgundy Red',
  '959698': 'Silver', '96d8af': 'Light Jade', '96dcb9': 'Mint', '995f11': 'Clay Brown', '999d9d': 'Gray',
  '9b9ea0': 'Ash Gray', '9d2235': 'Maroon Red', '9d432c': 'Brown', '9e007e': 'Purple', '9ea2a2': 'Gray',
  '9f332a': 'Brick Red', 'a1ffac': 'Glow Green', 'a3d8e1': 'Ice Blue', 'a6a9aa': 'Silver', 'a8a8aa': 'Gray',
  'a8c6ee': 'Baby Blue', 'aa6443': 'Copper Brown Metallic', 'ad4e38': 'Red Granite', 'adb1b2': 'Gray',
  'ae835b': 'Caramel', 'ae96d4': 'Lilac Purple', 'af1685': 'Purple', 'afb1ae': 'Gray', 'b15533': 'Terracotta',
  'b28b33': 'Gold', 'b39b84': 'Iridium Gold Metallic', 'b50011': 'Red', 'b8acd6': 'Lavender', 'b8cde9': 'Ice Blue',
  'ba9594': 'Rose Gold', 'bb3d43': 'Dark Red', 'bc0900': 'Red', 'becf00': 'Bright Green', 'c0df16': 'Green',
  'c12e1f': 'Red', 'c2e189': 'Apple Green', 'c3e2d6': 'Light Cyan', 'c5ed48': 'Lime', 'c6001a': 'Red',
  'c6c6c6': 'Gray', 'c8102e': 'Red', 'c8c8c8': 'Silver', 'c98935': 'Ochre Yellow', 'c9a381': 'Translucent Brown',
  'cbc6b8': 'Bone White', 'cdceca': 'Gray', 'cea629': 'Classic Gold Sparkle', 'd02727': 'Candy Red',
  'd1d3d5': 'Light Gray', 'd32941': 'Red', 'd3b7a7': 'Latte Brown', 'd6001c': 'Red', 'd6abff': 'Translucent Purple',
  'd6cca3': 'White Oak', 'dc3a27': 'Orange', 'dd3c22': 'Vermilion Red', 'de4343': 'Scarlet Red', 'dfd1a7': 'Beige',
  'e02928': 'Red', 'e4bd68': 'Gold', 'e5b03d': 'Gold', 'e83100': 'Red', 'e8afcf': 'Sakura Pink', 'e8dbb7': 'Desert Tan',
  'eaeae4': 'White', 'eaeceb': 'Silver', 'ec008c': 'Magenta', 'ed0000': 'Red', 'eeb1c1': 'Pink', 'efe255': 'Yellow',
  'f0f1a8': 'Clear', 'f17b8f': 'Glow Pink', 'f3cfb2': 'Champagne', 'f3e600': 'Yellow', 'f48438': 'Orange',
  'f4a925': 'Gold', 'f4d53f': 'Yellow', 'f4ee2a': 'Yellow', 'f5547c': 'Hot Pink', 'f55a74': 'Pink',
  'f5b6cd': 'Cherry Pink', 'f5dbab': 'Mellow Yellow', 'f5f1dd': 'White', 'f68b1b': 'Neon Orange', 'f74e02': 'Orange',
  'f75403': 'Orange', 'f7ada6': 'Pink', 'f7d959': 'Lemon Yellow', 'f7e6de': 'Beige', 'f7f3f0': 'White Marble',
  'f8ff80': 'Glow Yellow', 'f99963': 'Mandarin Orange', 'f9c1bd': 'Translucent Pink', 'f9dfb9': 'Cream',
  'f9ef41': 'Yellow', 'f9f7f2': 'Nature', 'f9f7f4': 'White', 'fce300': 'Yellow', 'fce900': 'Yellow',
  'fec600': 'Sunflower Yellow', 'fedb00': 'Yellow', 'ff4800': 'Orange', 'ff671f': 'Orange', 'ff6a13': 'Orange',
  'ff7f41': 'Orange', 'ff9016': 'Pumpkin Orange', 'ff911a': 'Translucent Orange', 'ff9d5b': 'Glow Orange',
  'ffb549': 'Sunflower Yellow', 'ffc72c': 'Tangerine Yellow', 'ffce00': 'Yellow', 'ffd00b': 'Yellow',
  'ffe133': 'Yellow', 'fffaf2': 'White', 'ffffff': 'White',
};

// Get color name from hex color (lookup Bambu database, then fallback to HSL-based name)
function getColorName(hexColor: string): string {
  // Normalize hex: lowercase, strip # and alpha channel
  const hex = hexColor.replace('#', '').toLowerCase().substring(0, 6);
  // Try Bambu color lookup
  if (BAMBU_HEX_COLORS[hex]) {
    return BAMBU_HEX_COLORS[hex];
  }
  // Fall back to HSL-based name
  return hexToColorName(hexColor);
}

// Convert hex color to basic color name using HSL
function hexToColorName(hex: string | null | undefined): string {
  if (!hex || hex.length < 6) return 'Unknown';
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    if (max === rNorm) h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
    else if (max === gNorm) h = ((bNorm - rNorm) / d + 2) / 6;
    else h = ((rNorm - gNorm) / d + 4) / 6;
  }
  h = h * 360;

  if (l < 0.15) return 'Black';
  if (l > 0.85) return 'White';
  if (s < 0.15) {
    if (l < 0.4) return 'Dark Gray';
    if (l > 0.6) return 'Light Gray';
    return 'Gray';
  }
  if (h < 15 || h >= 345) return 'Red';
  if (h < 45) return 'Orange';
  if (h < 70) return 'Yellow';
  if (h < 150) return 'Green';
  if (h < 200) return 'Cyan';
  if (h < 260) return 'Blue';
  if (h < 290) return 'Purple';
  if (h < 345) return 'Pink';
  return 'Unknown';
}

interface AddToQueueModalProps {
  archiveId: number;
  archiveName: string;
  onClose: () => void;
}

export function AddToQueueModal({ archiveId, archiveName, onClose }: AddToQueueModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [printerId, setPrinterId] = useState<number | null>(null);
  const [scheduleType, setScheduleType] = useState<'asap' | 'scheduled' | 'manual'>('asap');
  const [scheduledTime, setScheduledTime] = useState('');
  const [requirePreviousSuccess, setRequirePreviousSuccess] = useState(false);
  const [autoOffAfter, setAutoOffAfter] = useState(false);
  const [showFilamentMapping, setShowFilamentMapping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Manual slot overrides: slot_id (1-indexed) -> globalTrayId
  const [manualMappings, setManualMappings] = useState<Record<number, number>>({});

  const { data: printers } = useQuery({
    queryKey: ['printers'],
    queryFn: () => api.getPrinters(),
  });

  // Fetch filament requirements from the archived 3MF
  const { data: filamentReqs } = useQuery({
    queryKey: ['archive-filaments', archiveId],
    queryFn: () => api.getArchiveFilamentRequirements(archiveId),
  });

  // Fetch printer status when a printer is selected
  const { data: printerStatus } = useQuery({
    queryKey: ['printer-status', printerId],
    queryFn: () => api.getPrinterStatus(printerId!),
    enabled: !!printerId,
  });

  // Set default printer if only one available
  useEffect(() => {
    if (printers?.length === 1 && !printerId) {
      setPrinterId(printers[0].id);
    }
  }, [printers, printerId]);

  // Clear manual mappings when printer changes
  useEffect(() => {
    setManualMappings({});
  }, [printerId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Helper to normalize color format (API returns "RRGGBBAA", 3MF uses "#RRGGBB")
  const normalizeColor = (color: string | null | undefined): string => {
    if (!color) return '#808080';
    const hex = color.replace('#', '').substring(0, 6);
    return `#${hex}`;
  };

  // Helper to format slot label for display
  const formatSlotLabel = (amsId: number, trayId: number, isHt: boolean, isExternal: boolean): string => {
    if (isExternal) return 'External';
    const letter = String.fromCharCode(65 + (amsId >= 128 ? amsId - 128 : amsId));
    if (isHt) return `HT-${letter}`;
    return `AMS-${letter} Slot ${trayId + 1}`;
  };

  // Calculate global tray ID for MQTT command
  const getGlobalTrayId = (amsId: number, trayId: number, isExternal: boolean): number => {
    if (isExternal) return 254;
    return amsId * 4 + trayId;
  };

  // Build a list of all loaded filaments from printer's AMS/HT/External
  const loadedFilaments = useMemo(() => {
    const filaments: Array<{
      type: string;
      color: string;
      colorName: string;
      amsId: number;
      trayId: number;
      isHt: boolean;
      isExternal: boolean;
      label: string;
      globalTrayId: number;
    }> = [];

    printerStatus?.ams?.forEach((amsUnit) => {
      const isHt = amsUnit.tray.length === 1;
      amsUnit.tray.forEach((tray) => {
        if (tray.tray_type) {
          const color = normalizeColor(tray.tray_color);
          filaments.push({
            type: tray.tray_type,
            color,
            colorName: getColorName(color),
            amsId: amsUnit.id,
            trayId: tray.id,
            isHt,
            isExternal: false,
            label: formatSlotLabel(amsUnit.id, tray.id, isHt, false),
            globalTrayId: getGlobalTrayId(amsUnit.id, tray.id, false),
          });
        }
      });
    });

    if (printerStatus?.vt_tray?.tray_type) {
      const color = normalizeColor(printerStatus.vt_tray.tray_color);
      filaments.push({
        type: printerStatus.vt_tray.tray_type,
        color,
        colorName: getColorName(color),
        amsId: -1,
        trayId: 0,
        isHt: false,
        isExternal: true,
        label: 'External',
        globalTrayId: 254,
      });
    }

    return filaments;
  }, [printerStatus]);

  // Compare required filaments with loaded filaments
  const filamentComparison = useMemo(() => {
    if (!filamentReqs?.filaments || filamentReqs.filaments.length === 0) return [];

    const normalizeColorForCompare = (color: string | undefined): string => {
      if (!color) return '';
      return color.replace('#', '').toLowerCase().substring(0, 6);
    };

    const colorsAreSimilar = (color1: string | undefined, color2: string | undefined, threshold = 40): boolean => {
      const hex1 = normalizeColorForCompare(color1);
      const hex2 = normalizeColorForCompare(color2);
      if (!hex1 || !hex2 || hex1.length < 6 || hex2.length < 6) return false;

      const r1 = parseInt(hex1.substring(0, 2), 16);
      const g1 = parseInt(hex1.substring(2, 4), 16);
      const b1 = parseInt(hex1.substring(4, 6), 16);
      const r2 = parseInt(hex2.substring(0, 2), 16);
      const g2 = parseInt(hex2.substring(2, 4), 16);
      const b2 = parseInt(hex2.substring(4, 6), 16);

      return Math.abs(r1 - r2) <= threshold &&
             Math.abs(g1 - g2) <= threshold &&
             Math.abs(b1 - b2) <= threshold;
    };

    const usedTrayIds = new Set<number>(Object.values(manualMappings));

    return filamentReqs.filaments.map((req) => {
      const slotId = req.slot_id || 0;

      // Check if there's a manual override for this slot
      if (slotId > 0 && manualMappings[slotId] !== undefined) {
        const manualTrayId = manualMappings[slotId];
        const manualLoaded = loadedFilaments.find((f) => f.globalTrayId === manualTrayId);

        if (manualLoaded) {
          const typeMatch = manualLoaded.type?.toUpperCase() === req.type?.toUpperCase();
          const colorMatch = normalizeColorForCompare(manualLoaded.color) === normalizeColorForCompare(req.color) ||
                            colorsAreSimilar(manualLoaded.color, req.color);

          let status: 'match' | 'type_only' | 'mismatch' | 'empty';
          if (typeMatch && colorMatch) {
            status = 'match';
          } else if (typeMatch) {
            status = 'type_only';
          } else {
            status = 'mismatch';
          }

          return {
            ...req,
            loaded: manualLoaded,
            hasFilament: true,
            typeMatch,
            colorMatch,
            status,
            isManual: true,
          };
        }
      }

      // Auto-match
      const exactMatch = loadedFilaments.find(
        (f) => !usedTrayIds.has(f.globalTrayId) &&
               f.type?.toUpperCase() === req.type?.toUpperCase() &&
               normalizeColorForCompare(f.color) === normalizeColorForCompare(req.color)
      );
      const similarMatch = !exactMatch && loadedFilaments.find(
        (f) => !usedTrayIds.has(f.globalTrayId) &&
               f.type?.toUpperCase() === req.type?.toUpperCase() &&
               colorsAreSimilar(f.color, req.color)
      );
      const typeOnlyMatch = !exactMatch && !similarMatch && loadedFilaments.find(
        (f) => !usedTrayIds.has(f.globalTrayId) &&
               f.type?.toUpperCase() === req.type?.toUpperCase()
      );
      const loaded = exactMatch || similarMatch || typeOnlyMatch || undefined;

      if (loaded) {
        usedTrayIds.add(loaded.globalTrayId);
      }

      const hasFilament = !!loaded;
      const typeMatch = hasFilament;
      const colorMatch = !!exactMatch || !!similarMatch;

      let status: 'match' | 'type_only' | 'mismatch' | 'empty';
      if (exactMatch || similarMatch) {
        status = 'match';
      } else if (typeOnlyMatch) {
        status = 'type_only';
      } else {
        status = 'mismatch';
      }

      return {
        ...req,
        loaded,
        hasFilament,
        typeMatch,
        colorMatch,
        status,
        isManual: false,
      };
    });
  }, [filamentReqs, loadedFilaments, manualMappings]);

  // Build AMS mapping array
  const amsMapping = useMemo(() => {
    if (filamentComparison.length === 0) return undefined;

    const maxSlotId = Math.max(...filamentComparison.map((f) => f.slot_id || 0));
    if (maxSlotId <= 0) return undefined;

    const mapping = new Array(maxSlotId).fill(-1);

    filamentComparison.forEach((f) => {
      if (f.slot_id && f.slot_id > 0) {
        mapping[f.slot_id - 1] = f.loaded?.globalTrayId ?? -1;
      }
    });

    return mapping;
  }, [filamentComparison]);

  const hasFilamentReqs = filamentReqs?.filaments && filamentReqs.filaments.length > 0;

  const addMutation = useMutation({
    mutationFn: (data: PrintQueueItemCreate) => api.addToQueue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      showToast('Added to print queue');
      onClose();
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to add to queue', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerId) {
      showToast('Please select a printer', 'error');
      return;
    }

    const data: PrintQueueItemCreate = {
      printer_id: printerId,
      archive_id: archiveId,
      require_previous_success: requirePreviousSuccess,
      auto_off_after: autoOffAfter,
      manual_start: scheduleType === 'manual',
      ams_mapping: amsMapping,
    };

    if (scheduleType === 'scheduled' && scheduledTime) {
      data.scheduled_time = new Date(scheduledTime).toISOString();
    }

    addMutation.mutate(data);
  };

  // Get minimum datetime (now + 1 minute)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-bambu-dark-tertiary">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-bambu-green" />
              <h2 className="text-xl font-semibold text-white">Schedule Print</h2>
            </div>
            <button
              onClick={onClose}
              className="text-bambu-gray hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Archive name */}
            <div>
              <label className="block text-sm text-bambu-gray mb-1">Print Job</label>
              <p className="text-white font-medium truncate">{archiveName}</p>
            </div>

            {/* Printer selection */}
            <div>
              <label className="block text-sm text-bambu-gray mb-1">Printer</label>
              {printers?.length === 0 ? (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  No printers configured
                </div>
              ) : (
                <select
                  className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
                  value={printerId || ''}
                  onChange={(e) => setPrinterId(e.target.value ? Number(e.target.value) : null)}
                  required
                >
                  <option value="">Select printer...</option>
                  {printers?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Filament Mapping Section */}
            {printerId && hasFilamentReqs && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowFilamentMapping(!showFilamentMapping)}
                  className="flex items-center gap-2 text-sm text-bambu-gray hover:text-white transition-colors w-full"
                >
                  <Circle className="w-4 h-4" fill={filamentComparison.some(f => f.status === 'mismatch') ? '#f97316' : filamentComparison.some(f => f.status === 'type_only') ? '#facc15' : '#00ae42'} stroke="none" />
                  <span>Filament Mapping</span>
                  {filamentComparison.some(f => f.status === 'mismatch') ? (
                    <span className="text-xs text-orange-400">(Type not found)</span>
                  ) : filamentComparison.some(f => f.status === 'type_only') ? (
                    <span className="text-xs text-yellow-400">(Color mismatch)</span>
                  ) : (
                    <span className="text-xs text-bambu-green">(Ready)</span>
                  )}
                  {showFilamentMapping ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                </button>

                {showFilamentMapping && (
                  <div className="mt-2 bg-bambu-dark rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-bambu-gray">Click to change slot assignment</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!printerId) return;
                          setIsRefreshing(true);
                          try {
                            await api.refreshPrinterStatus(printerId);
                            await new Promise((r) => setTimeout(r, 500));
                            await queryClient.refetchQueries({ queryKey: ['printer-status', printerId] });
                          } finally {
                            setIsRefreshing(false);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-bambu-gray/30 hover:border-bambu-gray hover:bg-bambu-dark-tertiary transition-colors text-bambu-gray hover:text-white"
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Re-read</span>
                      </button>
                    </div>
                    {filamentComparison.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid items-center gap-2 text-xs"
                        style={{ gridTemplateColumns: '16px minmax(70px, 1fr) auto 2fr 16px' }}
                      >
                        <span title={`Required: ${item.type} - ${getColorName(item.color)}`}>
                          <Circle className="w-3 h-3" fill={item.color} stroke={item.color} />
                        </span>
                        <span className="text-white truncate">
                          {item.type} <span className="text-bambu-gray">({item.used_grams}g)</span>
                        </span>
                        <span className="text-bambu-gray">→</span>
                        <select
                          value={item.loaded?.globalTrayId ?? ''}
                          onChange={(e) => {
                            const slotId = item.slot_id || 0;
                            if (slotId > 0) {
                              const value = e.target.value;
                              if (value === '') {
                                setManualMappings((prev) => {
                                  const next = { ...prev };
                                  delete next[slotId];
                                  return next;
                                });
                              } else {
                                setManualMappings((prev) => ({
                                  ...prev,
                                  [slotId]: parseInt(value, 10),
                                }));
                              }
                            }
                          }}
                          className={`flex-1 px-2 py-1 rounded border text-xs bg-bambu-dark-secondary focus:outline-none focus:ring-1 focus:ring-bambu-green ${
                            item.status === 'match'
                              ? 'border-bambu-green/50 text-bambu-green'
                              : item.status === 'type_only'
                              ? 'border-yellow-400/50 text-yellow-400'
                              : 'border-orange-400/50 text-orange-400'
                          } ${item.isManual ? 'ring-1 ring-blue-400/50' : ''}`}
                          title={item.isManual ? 'Manually selected' : 'Auto-matched'}
                        >
                          <option value="" className="bg-bambu-dark text-bambu-gray">
                            -- Select slot --
                          </option>
                          {loadedFilaments.map((f) => (
                            <option
                              key={f.globalTrayId}
                              value={f.globalTrayId}
                              className="bg-bambu-dark text-white"
                            >
                              {f.label}: {f.type} ({f.colorName})
                            </option>
                          ))}
                        </select>
                        {item.status === 'match' ? (
                          <Check className="w-3 h-3 text-bambu-green" />
                        ) : item.status === 'type_only' ? (
                          <span title="Same type, different color">
                            <AlertTriangle className="w-3 h-3 text-yellow-400" />
                          </span>
                        ) : (
                          <span title="Filament type not loaded">
                            <AlertTriangle className="w-3 h-3 text-orange-400" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Schedule type */}
            <div>
              <label className="block text-sm text-bambu-gray mb-2">When to print</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 px-2 py-2 rounded-lg border text-sm flex items-center justify-center gap-1.5 transition-colors ${
                    scheduleType === 'asap'
                      ? 'bg-bambu-green border-bambu-green text-white'
                      : 'bg-bambu-dark border-bambu-dark-tertiary text-bambu-gray hover:text-white'
                  }`}
                  onClick={() => setScheduleType('asap')}
                >
                  <Clock className="w-4 h-4" />
                  ASAP
                </button>
                <button
                  type="button"
                  className={`flex-1 px-2 py-2 rounded-lg border text-sm flex items-center justify-center gap-1.5 transition-colors ${
                    scheduleType === 'scheduled'
                      ? 'bg-bambu-green border-bambu-green text-white'
                      : 'bg-bambu-dark border-bambu-dark-tertiary text-bambu-gray hover:text-white'
                  }`}
                  onClick={() => setScheduleType('scheduled')}
                >
                  <Calendar className="w-4 h-4" />
                  Scheduled
                </button>
                <button
                  type="button"
                  className={`flex-1 px-2 py-2 rounded-lg border text-sm flex items-center justify-center gap-1.5 transition-colors ${
                    scheduleType === 'manual'
                      ? 'bg-bambu-green border-bambu-green text-white'
                      : 'bg-bambu-dark border-bambu-dark-tertiary text-bambu-gray hover:text-white'
                  }`}
                  onClick={() => setScheduleType('manual')}
                >
                  <Hand className="w-4 h-4" />
                  Queue Only
                </button>
              </div>
            </div>

            {/* Scheduled time input */}
            {scheduleType === 'scheduled' && (
              <div>
                <label className="block text-sm text-bambu-gray mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={getMinDateTime()}
                  required
                />
              </div>
            )}

            {/* Require previous success */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requirePrevious"
                checked={requirePreviousSuccess}
                onChange={(e) => setRequirePreviousSuccess(e.target.checked)}
                className="rounded border-bambu-dark-tertiary bg-bambu-dark text-bambu-green focus:ring-bambu-green"
              />
              <label htmlFor="requirePrevious" className="text-sm text-bambu-gray">
                Only start if previous print succeeded
              </label>
            </div>

            {/* Auto power off */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoOffAfter"
                checked={autoOffAfter}
                onChange={(e) => setAutoOffAfter(e.target.checked)}
                className="rounded border-bambu-dark-tertiary bg-bambu-dark text-bambu-green focus:ring-bambu-green"
              />
              <label htmlFor="autoOffAfter" className="text-sm text-bambu-gray flex items-center gap-1">
                <Power className="w-3.5 h-3.5" />
                Power off printer when done
              </label>
            </div>

            {/* Help text */}
            <p className="text-xs text-bambu-gray">
              {scheduleType === 'asap'
                ? 'Print will start as soon as the printer is idle.'
                : scheduleType === 'scheduled'
                ? 'Print will start at the scheduled time if the printer is idle. If busy, it will wait until the printer becomes available.'
                : 'Print will be staged but won\'t start automatically. Use the Start button to release it to the queue.'}
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={addMutation.isPending || !printerId || printers?.length === 0}
              >
                {addMutation.isPending ? 'Adding...' : 'Add to Queue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
