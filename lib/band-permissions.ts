/**
 * What the caller may do in a band.
 *
 * Content permissions come from the API (`my_permissions` on the band
 * detail and list), computed server side with the same rules it enforces:
 * owners and admins always have every permission, moderators and members
 * follow the band's permission matrix. The API still refuses anything not
 * allowed; the UI just avoids offering it.
 */

import {
  BAND_ROLE_LEVEL,
  type BandPermissions,
  type BandRole,
} from "@/types/api";

interface BandAccess {
  my_permissions: BandPermissions;
}

/** Setlists, gigs and tours (`manage_setlists`). */
export function canManageBandSetlists(band: BandAccess): boolean {
  return band.my_permissions.manage_setlists;
}

/** Editing or deleting the band's songs (`manage_songs`). */
export function canManageBandSongs(band: BandAccess): boolean {
  return band.my_permissions.manage_songs;
}

/** Exporting the band's setlists and songs to PDF (`export_pdf`). */
export function canExportBandPdf(band: BandAccess): boolean {
  return band.my_permissions.export_pdf;
}

/** Band settings, invites and role permissions (admin or owner). */
export function canAdministerBand(band: { my_role: BandRole }): boolean {
  return BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.admin;
}

/** Pinning reminders (moderator or above). */
export function canModerateBand(band: { my_role: BandRole }): boolean {
  return BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.moderator;
}
