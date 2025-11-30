"""API routes for K-profile (pressure advance) management."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.models.printer import Printer
from backend.app.schemas.kprofile import (
    KProfile,
    KProfileCreate,
    KProfileDelete,
    KProfilesResponse,
)
from backend.app.services.printer_manager import printer_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/printers/{printer_id}/kprofiles", tags=["kprofiles"])


@router.get("/", response_model=KProfilesResponse)
async def get_kprofiles(
    printer_id: int,
    nozzle_diameter: str = "0.4",
    db: AsyncSession = Depends(get_db),
):
    """Get K-profiles from a printer.

    Args:
        printer_id: ID of the printer
        nozzle_diameter: Filter by nozzle diameter (default: "0.4")
    """
    # Check printer exists
    result = await db.execute(select(Printer).where(Printer.id == printer_id))
    printer = result.scalar_one_or_none()
    if not printer:
        raise HTTPException(404, "Printer not found")

    # Get MQTT client for printer
    client = printer_manager.get_client(printer_id)
    if not client or not client.state.connected:
        raise HTTPException(400, "Printer not connected")

    # Request K-profiles from printer
    profiles = await client.get_kprofiles(nozzle_diameter=nozzle_diameter)

    # Convert from MQTT dataclass to Pydantic schema
    return KProfilesResponse(
        profiles=[
            KProfile(
                slot_id=p.slot_id,
                extruder_id=p.extruder_id,
                nozzle_id=p.nozzle_id,
                nozzle_diameter=p.nozzle_diameter,
                filament_id=p.filament_id,
                name=p.name,
                k_value=p.k_value,
                n_coef=p.n_coef,
                ams_id=p.ams_id,
                tray_id=p.tray_id,
                setting_id=p.setting_id,
            )
            for p in profiles
        ],
        nozzle_diameter=nozzle_diameter,
    )


@router.post("/", response_model=dict)
async def set_kprofile(
    printer_id: int,
    profile: KProfileCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create or update a K-profile on the printer.

    Args:
        printer_id: ID of the printer
        profile: K-profile data to set
    """
    # Check printer exists
    result = await db.execute(select(Printer).where(Printer.id == printer_id))
    printer = result.scalar_one_or_none()
    if not printer:
        raise HTTPException(404, "Printer not found")

    # Get MQTT client for printer
    client = printer_manager.get_client(printer_id)
    if not client or not client.state.connected:
        raise HTTPException(400, "Printer not connected")

    # Send the K-profile to printer
    success = client.set_kprofile(
        filament_id=profile.filament_id,
        name=profile.name,
        k_value=profile.k_value,
        nozzle_diameter=profile.nozzle_diameter,
        nozzle_id=profile.nozzle_id,
        extruder_id=profile.extruder_id,
        setting_id=profile.setting_id,
        slot_id=profile.slot_id,
    )

    if not success:
        raise HTTPException(500, "Failed to send K-profile command")

    return {"success": True, "message": "K-profile set successfully"}


@router.delete("/", response_model=dict)
async def delete_kprofile(
    printer_id: int,
    profile: KProfileDelete,
    db: AsyncSession = Depends(get_db),
):
    """Delete a K-profile from the printer.

    Args:
        printer_id: ID of the printer
        profile: K-profile identification data for deletion
    """
    # Check printer exists
    result = await db.execute(select(Printer).where(Printer.id == printer_id))
    printer = result.scalar_one_or_none()
    if not printer:
        raise HTTPException(404, "Printer not found")

    # Get MQTT client for printer
    client = printer_manager.get_client(printer_id)
    if not client or not client.state.connected:
        raise HTTPException(400, "Printer not connected")

    # Send the delete command to printer
    success = client.delete_kprofile(
        cali_idx=profile.slot_id,
        filament_id=profile.filament_id,
        nozzle_id=profile.nozzle_id,
        nozzle_diameter=profile.nozzle_diameter,
        extruder_id=profile.extruder_id,
    )

    if not success:
        raise HTTPException(500, "Failed to send K-profile delete command")

    return {"success": True, "message": "K-profile deleted successfully"}
