import { useMutation } from '@tanstack/react-query';
import { api, isConfirmationRequired } from '../../api/client';
import type { PrinterStatus } from '../../api/client';
import { useState, useId } from 'react';
import { ConfirmModal } from '../ConfirmModal';

interface JogPadProps {
  printerId: number;
  status: PrinterStatus | null | undefined;
  disabled?: boolean;
}

// Image map coordinates for 220x220 jog pad
// The jog pad has concentric rings: outer (10mm), inner (1mm), center (home)
const SIZE = 220;
const CENTER = SIZE / 2; // 110

// Ring radii (approximate based on typical jog pad design)
const OUTER_RADIUS = 108;  // Outer edge
const OUTER_INNER = 72;    // Inner edge of outer ring (10mm zone)
const INNER_INNER = 35;    // Inner edge of inner ring (1mm zone)
const HOME_RADIUS = 28;    // Home button radius

// Generate polygon points for a ring segment (pie slice)
function ringSegment(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startAngle: number, endAngle: number,
  steps: number = 8
): string {
  const points: string[] = [];

  // Outer arc (clockwise)
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const x = Math.round(cx + outerR * Math.cos(angle));
    const y = Math.round(cy + outerR * Math.sin(angle));
    points.push(`${x},${y}`);
  }

  // Inner arc (counter-clockwise)
  for (let i = steps; i >= 0; i--) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const x = Math.round(cx + innerR * Math.cos(angle));
    const y = Math.round(cy + innerR * Math.sin(angle));
    points.push(`${x},${y}`);
  }

  return points.join(',');
}

// Angle definitions (in radians, 0 = right, going clockwise)
// Each direction covers 90 degrees (π/2), offset by 45 degrees (π/4)
const ANGLES = {
  up:    { start: -Math.PI * 3/4, end: -Math.PI / 4 },     // Top: -135° to -45°
  right: { start: -Math.PI / 4, end: Math.PI / 4 },         // Right: -45° to 45°
  down:  { start: Math.PI / 4, end: Math.PI * 3/4 },        // Bottom: 45° to 135°
  left:  { start: Math.PI * 3/4, end: Math.PI * 5/4 },      // Left: 135° to 225° (or -135°)
};

export function JogPad({ printerId, status, disabled = false }: JogPadProps) {
  const isConnected = (status?.connected ?? false) && !disabled;
  const mapId = useId();

  const [confirmModal, setConfirmModal] = useState<{
    action: string;
    token: string;
    warning: string;
    onConfirm: () => void;
  } | null>(null);

  const homeMutation = useMutation({
    mutationFn: ({ axes, token }: { axes: string; token?: string }) =>
      api.homeAxes(printerId, axes, token),
    onSuccess: (result) => {
      if (isConfirmationRequired(result)) {
        setConfirmModal({
          action: 'home',
          token: result.token,
          warning: result.warning,
          onConfirm: () => homeMutation.mutate({ axes: 'XY', token: result.token }),
        });
      }
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ axis, distance, token }: { axis: string; distance: number; token?: string }) =>
      api.moveAxis(printerId, axis, distance, 3000, token),
    onSuccess: (result, variables) => {
      if (isConfirmationRequired(result)) {
        setConfirmModal({
          action: 'move',
          token: result.token,
          warning: result.warning,
          onConfirm: () =>
            moveMutation.mutate({
              axis: variables.axis,
              distance: variables.distance,
              token: result.token,
            }),
        });
      }
    },
  });

  const handleHome = () => {
    if (isDisabled) return;
    homeMutation.mutate({ axes: 'XY' });
  };

  const handleMove = (axis: string, distance: number) => {
    if (isDisabled) return;
    moveMutation.mutate({ axis, distance });
  };

  const handleConfirm = () => {
    if (confirmModal) {
      confirmModal.onConfirm();
      setConfirmModal(null);
    }
  };

  const isLoading = homeMutation.isPending || moveMutation.isPending;
  const isDisabled = !isConnected || isLoading;

  // Generate coordinates for circle (home button)
  const homeCoords = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const x = Math.round(CENTER + HOME_RADIUS * Math.cos(angle));
    const y = Math.round(CENTER + HOME_RADIUS * Math.sin(angle));
    return `${x},${y}`;
  }).join(',');

  return (
    <>
      <div className="relative w-[220px] h-[220px] mb-3.5">
        <img
          src="/icons/jogpad.svg"
          alt="Jog Pad"
          useMap={`#${mapId}`}
          className="w-full h-full jogpad-theme"
        />

        <map name={mapId}>
          {/* Outer ring - 10mm moves */}
          <area
            shape="poly"
            coords={ringSegment(CENTER, CENTER, OUTER_INNER, OUTER_RADIUS, ANGLES.up.start, ANGLES.up.end)}
            onClick={() => handleMove('Y', 10)}
            title="Y+10mm"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />
          <area
            shape="poly"
            coords={ringSegment(CENTER, CENTER, OUTER_INNER, OUTER_RADIUS, ANGLES.down.start, ANGLES.down.end)}
            onClick={() => handleMove('Y', -10)}
            title="Y-10mm"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />
          <area
            shape="poly"
            coords={ringSegment(CENTER, CENTER, OUTER_INNER, OUTER_RADIUS, ANGLES.left.start, ANGLES.left.end)}
            onClick={() => handleMove('X', -10)}
            title="X-10mm"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />
          <area
            shape="poly"
            coords={ringSegment(CENTER, CENTER, OUTER_INNER, OUTER_RADIUS, ANGLES.right.start, ANGLES.right.end)}
            onClick={() => handleMove('X', 10)}
            title="X+10mm"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />

          {/* Inner ring - 1mm moves */}
          <area
            shape="poly"
            coords={ringSegment(CENTER, CENTER, INNER_INNER, OUTER_INNER, ANGLES.up.start, ANGLES.up.end)}
            onClick={() => handleMove('Y', 1)}
            title="Y+1mm"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />
          <area
            shape="poly"
            coords={ringSegment(CENTER, CENTER, INNER_INNER, OUTER_INNER, ANGLES.down.start, ANGLES.down.end)}
            onClick={() => handleMove('Y', -1)}
            title="Y-1mm"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />
          <area
            shape="poly"
            coords={ringSegment(CENTER, CENTER, INNER_INNER, OUTER_INNER, ANGLES.left.start, ANGLES.left.end)}
            onClick={() => handleMove('X', -1)}
            title="X-1mm"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />
          <area
            shape="poly"
            coords={ringSegment(CENTER, CENTER, INNER_INNER, OUTER_INNER, ANGLES.right.start, ANGLES.right.end)}
            onClick={() => handleMove('X', 1)}
            title="X+1mm"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />

          {/* Center - Home button */}
          <area
            shape="poly"
            coords={homeCoords}
            onClick={handleHome}
            title="Home XY"
            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
          />
        </map>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          title="Confirm Action"
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
