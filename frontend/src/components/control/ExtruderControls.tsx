import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, isConfirmationRequired } from '../../api/client';
import type { PrinterStatus } from '../../api/client';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';

interface ExtruderControlsProps {
  printerId: number;
  status: PrinterStatus | null | undefined;
  nozzleCount: number;
  disabled?: boolean;
}

export function ExtruderControls({ printerId, status, nozzleCount, disabled = false }: ExtruderControlsProps) {
  const queryClient = useQueryClient();
  const isConnected = (status?.connected ?? false) && !disabled;
  const isPrinting = status?.state === 'RUNNING' || status?.state === 'PAUSE';
  const isDualNozzle = nozzleCount > 1;

  // Active extruder from live status: 0=right, 1=left
  const activeExtruder = status?.active_extruder ?? 0;

  const [confirmModal, setConfirmModal] = useState<{
    token: string;
    warning: string;
    distance: number;
  } | null>(null);

  const selectExtruderMutation = useMutation({
    mutationFn: (extruder: number) => {
      console.log('selectExtruder called with:', extruder);
      return api.selectExtruder(printerId, extruder);
    },
    onSuccess: (data) => {
      console.log('selectExtruder success:', data);
      // Invalidate printer statuses to refresh the active extruder display
      // Add a small delay to allow the printer to process the switch and MQTT to update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['printerStatuses'] });
      }, 2000);
    },
    onError: (error) => {
      console.error('selectExtruder error:', error);
    },
  });

  const extrudeMutation = useMutation({
    mutationFn: ({ distance, token }: { distance: number; token?: string }) => {
      // G-code for extrusion: relative mode, extrude, back to absolute
      // Uses currently active extruder
      const gcode = `G91\nG1 E${distance} F300\nG90`;
      return api.sendGcode(printerId, gcode, token);
    },
    onSuccess: (result, variables) => {
      if (isConfirmationRequired(result)) {
        setConfirmModal({
          token: result.token,
          warning: result.warning,
          distance: variables.distance,
        });
      }
    },
  });

  const handleExtrude = (distance: number) => {
    extrudeMutation.mutate({ distance });
  };

  const handleConfirm = () => {
    if (confirmModal) {
      extrudeMutation.mutate({ distance: confirmModal.distance, token: confirmModal.token });
      setConfirmModal(null);
    }
  };

  const isDisabled = !isConnected || isPrinting || extrudeMutation.isPending;
  const isSwitching = selectExtruderMutation.isPending;

  // Get extruder image based on active state
  const getExtruderImage = () => {
    if (!isDualNozzle) return "/icons/single-extruder1.png";
    // activeExtruder: 0=right, 1=left
    return activeExtruder === 1 ? "/icons/dual-extruder-left.png" : "/icons/dual-extruder-right.png";
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1.5 justify-center">
        {/* Left/Right Toggle - only for dual nozzle */}
        {isDualNozzle && (
          <div className={`flex rounded-md overflow-hidden border border-bambu-dark-tertiary mb-1 flex-shrink-0 ${isDisabled || isSwitching ? 'opacity-50' : ''}`}>
            <button
              onClick={() => selectExtruderMutation.mutate(1)}
              disabled={isDisabled || isSwitching}
              className={`px-3 py-1.5 text-sm border-r border-bambu-dark-tertiary transition-colors disabled:cursor-not-allowed ${
                activeExtruder === 1
                  ? 'bg-bambu-green text-white'
                  : 'bg-bambu-dark-secondary text-bambu-gray hover:bg-bambu-dark-tertiary disabled:hover:bg-bambu-dark-secondary'
              }`}
            >
              Left
            </button>
            <button
              onClick={() => selectExtruderMutation.mutate(0)}
              disabled={isDisabled || isSwitching}
              className={`px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                activeExtruder === 0
                  ? 'bg-bambu-green text-white'
                  : 'bg-bambu-dark-secondary text-bambu-gray hover:bg-bambu-dark-tertiary disabled:hover:bg-bambu-dark-secondary'
              }`}
            >
              Right
            </button>
          </div>
        )}

        {/* Extrude Up Button */}
        <button
          onClick={() => handleExtrude(5)}
          disabled={isDisabled}
          className="w-9 h-[30px] rounded-md bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary border border-bambu-dark-tertiary flex items-center justify-center text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          title="Extrude 5mm"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Extruder Image */}
        <div className="h-[120px] flex items-center justify-center">
          <img
            src={getExtruderImage()}
            alt={isDualNozzle ? `${activeExtruder === 1 ? 'Left' : 'Right'} Extruder Active` : "Single Extruder"}
            className="h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Retract Down Button */}
        <button
          onClick={() => handleExtrude(-5)}
          disabled={isDisabled}
          className="w-9 h-[30px] rounded-md bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary border border-bambu-dark-tertiary flex items-center justify-center text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          title="Retract 5mm"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Label */}
        <span className="text-xs text-bambu-gray mt-0.5">Extruder</span>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          title="Confirm Extrusion"
          message={confirmModal.warning}
          confirmText="Continue"
          variant="warning"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  );
}
