/**
 * Configuration Snapshot Utilities
 * 
 * Functions for fetching and working with effective-dated employee configuration snapshots.
 * These utilities ensure historical data integrity by providing the correct configuration
 * for any given date, preventing retroactive changes from affecting past calculations.
 */

import { initializeAdminApp } from '@/lib/firebase/admin-config';
import { EmployeeConfigSnapshot, Employee, ShiftSegment } from '@/lib/types';

const { adminDb } = initializeAdminApp();

// Default shift for employees without configured shift times
const DEFAULT_SHIFT: ShiftSegment[] = [
  { startTime: '09:00', endTime: '18:00' }
];

// In-memory cache for snapshot lookups
// Key format: "employeeId:YYYY-MM-DD"
const snapshotCache = new Map<string, EmployeeConfigSnapshot>();

// Cache TTL: 5 minutes (in milliseconds)
const CACHE_TTL = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

/**
 * Get the effective configuration snapshot for an employee on a specific date.
 * 
 * **Graceful Fallback Contract:**
 * This function guarantees a usable configuration result. If no snapshot exists in Firestore,
 * it constructs a seed configuration from the employee's current record (shift, bufferTime, baseSalary).
 * Returns null only in exceptional cases (employee not found, database error).
 * 
 * @param employeeId - The employee's Firebase Auth UID
 * @param targetDate - The date for which to retrieve the configuration (defaults to today)
 * @returns The effective configuration snapshot, or null only if employee not found or exceptional error
 * 
 * @example
 * // Get current configuration (guaranteed non-null for valid employee)
 * const config = await getEffectiveConfig('employee123');
 * 
 * @example
 * // Get historical configuration
 * const historicalConfig = await getEffectiveConfig('employee123', new Date('2024-01-15'));
 */
export async function getEffectiveConfig(
  employeeId: string,
  targetDate: Date = new Date()
): Promise<EmployeeConfigSnapshot | null> {
  // Normalize target date to start of day (UTC) for consistent cache keys
  const normalizedDate = new Date(targetDate);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  const dateKey = normalizedDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const cacheKey = `${employeeId}:${dateKey}`;

  // Check cache
  const cachedSnapshot = snapshotCache.get(cacheKey);
  const cacheTime = cacheTimestamps.get(cacheKey);
  
  if (cachedSnapshot && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    return cachedSnapshot;
  }

  try {
    // Query Firestore for the effective snapshot
    // We need a snapshot where:
    // 1. employeeId matches
    // 2. effectiveFrom <= targetDate
    // 3. effectiveTo is null OR effectiveTo > targetDate
    const targetTimestamp = normalizedDate.toISOString();
    
    const snapshotsRef = adminDb.collection('employeeConfigSnapshots');
    
    // Query for snapshots that could be effective on the target date
    const querySnapshot = await snapshotsRef
      .where('employeeId', '==', employeeId)
      .where('effectiveFrom', '<=', targetTimestamp)
      .orderBy('effectiveFrom', 'desc')
      .limit(10) // Get recent snapshots, should only need 1-2
      .get();

    if (!querySnapshot.empty) {
      // Filter to find the snapshot that covers the target date
      for (const doc of querySnapshot.docs) {
        const snapshot = { id: doc.id, ...doc.data() } as EmployeeConfigSnapshot;
        
        // Check if this snapshot is effective on the target date
        const effectiveTo = snapshot.effectiveTo;
        const isActive = !effectiveTo || effectiveTo > targetTimestamp;
        
        if (isActive) {
          // Cache the result
          snapshotCache.set(cacheKey, snapshot);
          cacheTimestamps.set(cacheKey, Date.now());
          
          return snapshot;
        }
      }
    }

    // No snapshot found - fall back to creating seed configuration from employee record
    console.warn(`[getEffectiveConfig] No snapshot found for employee ${employeeId}, falling back to employee record`);
    return await createSeedConfigFromEmployee(employeeId, cacheKey);

  } catch (error) {
    console.error('[getEffectiveConfig] Error fetching snapshot:', error);
    return null;
  }
}

/**
 * Create a seed configuration snapshot from the employee's current record.
 * This is used as a graceful fallback when no snapshot exists in Firestore.
 * 
 * @param employeeId - The employee's Firebase Auth UID
 * @param cacheKey - Optional cache key to store the result
 * @returns A seed configuration snapshot, or null if employee not found
 */
async function createSeedConfigFromEmployee(
  employeeId: string,
  cacheKey?: string
): Promise<EmployeeConfigSnapshot | null> {
  try {
    // Fetch employee record
    const employeeDoc = await adminDb.collection('employees').doc(employeeId).get();
    
    if (!employeeDoc.exists) {
      console.error(`[createSeedConfigFromEmployee] Employee ${employeeId} not found`);
      return null;
    }

    const employee = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;

    // Construct seed snapshot from employee's current configuration
    const seedSnapshot: EmployeeConfigSnapshot = {
      id: `seed-${employeeId}`, // Virtual ID (not stored in Firestore)
      employeeId: employeeId,
      effectiveFrom: employee.joiningDate || new Date().toISOString(),
      effectiveTo: null, // Currently active
      
      // Configuration from employee record
      shiftSegments: employee.shift && employee.shift.length > 0 ? employee.shift : DEFAULT_SHIFT,
      punchInBufferMinutes: employee.bufferTime ?? 15,
      lateThresholdMinutes: 1, // Current system behavior: > 0 minutes = Late
      doubleLateThresholdMinutes: 30, // Current system behavior: >= 30 minutes = Double Late
      overtimeThresholdMinutes: 30, // Legacy default (matches current payroll logic)
      baseSalary: employee.baseSalary ?? 0,
      
      // Status tracking
      isDraft: false, // Seed configs are active, not drafts
      status: 'active', // Currently active configuration
      
      // Metadata
      createdBy: 'system-fallback',
      createdAt: new Date().toISOString(),
      notes: 'Seed configuration generated from employee record (no snapshot in Firestore)',
    };

    // Cache the seed snapshot
    if (cacheKey) {
      snapshotCache.set(cacheKey, seedSnapshot);
      cacheTimestamps.set(cacheKey, Date.now());
    }

    return seedSnapshot;

  } catch (error) {
    console.error('[createSeedConfigFromEmployee] Error creating seed config:', error);
    return null;
  }
}

/**
 * Get all configuration snapshots for an employee, ordered by effectiveFrom (newest first).
 * 
 * @param employeeId - The employee's Firebase Auth UID
 * @returns Array of all configuration snapshots for the employee
 */
export async function getAllConfigSnapshots(
  employeeId: string
): Promise<EmployeeConfigSnapshot[]> {
  try {
    const snapshotsRef = adminDb.collection('employeeConfigSnapshots');
    
    const querySnapshot = await snapshotsRef
      .where('employeeId', '==', employeeId)
      .orderBy('effectiveFrom', 'desc')
      .get();

    if (querySnapshot.empty) {
      return [];
    }

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EmployeeConfigSnapshot));

  } catch (error) {
    console.error('[getAllConfigSnapshots] Error fetching snapshots:', error);
    return [];
  }
}

/**
 * Create a new configuration snapshot for an employee.
 * 
 * @param snapshot - The snapshot data (without id)
 * @returns The created snapshot with id, or null if creation failed
 */
export async function createConfigSnapshot(
  snapshot: Omit<EmployeeConfigSnapshot, 'id'>
): Promise<EmployeeConfigSnapshot | null> {
  try {
    // Validate: effectiveFrom must be in the future (unless this is the first snapshot)
    const existingSnapshots = await getAllConfigSnapshots(snapshot.employeeId);
    
    if (existingSnapshots.length > 0) {
      const now = new Date().toISOString();
      if (snapshot.effectiveFrom <= now) {
        console.error('[createConfigSnapshot] effectiveFrom must be in the future for new snapshots');
        return null;
      }

      // Validate: no overlapping dates
      for (const existing of existingSnapshots) {
        if (existing.effectiveTo === null && existing.effectiveFrom < snapshot.effectiveFrom) {
          // This existing snapshot needs to be closed before the new one starts
          await adminDb
            .collection('employeeConfigSnapshots')
            .doc(existing.id)
            .update({ effectiveTo: snapshot.effectiveFrom });
        }
      }
    }

    // Create the new snapshot
    const docRef = await adminDb.collection('employeeConfigSnapshots').add(snapshot);
    const newSnapshot = { id: docRef.id, ...snapshot };

    // Invalidate cache for this employee
    clearCacheForEmployee(snapshot.employeeId);

    return newSnapshot;

  } catch (error) {
    console.error('[createConfigSnapshot] Error creating snapshot:', error);
    return null;
  }
}

/**
 * Update a future (draft) configuration snapshot.
 * Only snapshots with effectiveFrom in the future can be updated.
 * 
 * @param snapshotId - The snapshot document ID
 * @param updates - Partial snapshot data to update
 * @returns True if update succeeded, false otherwise
 */
export async function updateConfigSnapshot(
  snapshotId: string,
  updates: Partial<Omit<EmployeeConfigSnapshot, 'id' | 'employeeId' | 'createdAt' | 'createdBy'>>
): Promise<boolean> {
  try {
    const snapshotRef = adminDb.collection('employeeConfigSnapshots').doc(snapshotId);
    const snapshot = await snapshotRef.get();

    if (!snapshot.exists) {
      console.error('[updateConfigSnapshot] Snapshot not found:', snapshotId);
      return false;
    }

    const data = snapshot.data() as EmployeeConfigSnapshot;
    
    // Validate: can only update future snapshots
    const now = new Date().toISOString();
    if (data.effectiveFrom <= now) {
      console.error('[updateConfigSnapshot] Cannot update past/current snapshots');
      return false;
    }

    await snapshotRef.update(updates);

    // Invalidate cache for this employee
    clearCacheForEmployee(data.employeeId);

    return true;

  } catch (error) {
    console.error('[updateConfigSnapshot] Error updating snapshot:', error);
    return false;
  }
}

/**
 * Delete a future (draft) configuration snapshot.
 * Only snapshots with effectiveFrom in the future can be deleted.
 * 
 * @param snapshotId - The snapshot document ID
 * @returns True if deletion succeeded, false otherwise
 */
export async function deleteConfigSnapshot(snapshotId: string): Promise<boolean> {
  try {
    const snapshotRef = adminDb.collection('employeeConfigSnapshots').doc(snapshotId);
    const snapshot = await snapshotRef.get();

    if (!snapshot.exists) {
      console.error('[deleteConfigSnapshot] Snapshot not found:', snapshotId);
      return false;
    }

    const data = snapshot.data() as EmployeeConfigSnapshot;
    
    // Validate: can only delete future snapshots
    const now = new Date().toISOString();
    if (data.effectiveFrom <= now) {
      console.error('[deleteConfigSnapshot] Cannot delete past/current snapshots');
      return false;
    }

    await snapshotRef.delete();

    // Invalidate cache for this employee
    clearCacheForEmployee(data.employeeId);

    return true;

  } catch (error) {
    console.error('[deleteConfigSnapshot] Error deleting snapshot:', error);
    return false;
  }
}

/**
 * Clear cached snapshots for a specific employee.
 * Useful after creating/updating/deleting snapshots.
 */
function clearCacheForEmployee(employeeId: string): void {
  const keysToDelete: string[] = [];
  
  for (const key of snapshotCache.keys()) {
    if (key.startsWith(`${employeeId}:`)) {
      keysToDelete.push(key);
    }
  }
  
  for (const key of keysToDelete) {
    snapshotCache.delete(key);
    cacheTimestamps.delete(key);
  }
}

/**
 * Clear all cached snapshots.
 * Useful for testing or memory management.
 */
export function clearSnapshotCache(): void {
  snapshotCache.clear();
  cacheTimestamps.clear();
}

/**
 * Configuration segment with date range for timeline-based calculations.
 * Each segment represents a period where a specific configuration is active.
 */
export type ConfigSegment = {
  config: EmployeeConfigSnapshot;
  startDate: string; // YYYY-MM-DD - Start of this segment (inclusive)
  endDate: string;   // YYYY-MM-DD - End of this segment (inclusive)
  daysCount: number; // Number of days in this segment
};

/**
 * Build a configuration timeline for an employee over a date range.
 * This returns ordered segments with their effective date ranges,
 * optimized for salary calculations that span multiple config periods.
 * 
 * @param employeeId - The employee's Firebase Auth UID
 * @param startDate - Start of the period (inclusive)
 * @param endDate - End of the period (inclusive)
 * @returns Array of config segments covering the date range
 * 
 * @example
 * // Get timeline for November 2025
 * const timeline = await buildConfigTimeline('emp123', 
 *   new Date('2025-11-01'), 
 *   new Date('2025-11-30')
 * );
 * // Returns: [
 * //   { config: {...}, startDate: '2025-11-01', endDate: '2025-11-09', daysCount: 9 },
 * //   { config: {...}, startDate: '2025-11-10', endDate: '2025-11-30', daysCount: 21 }
 * // ]
 */
export async function buildConfigTimeline(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<ConfigSegment[]> {
  const segments: ConfigSegment[] = [];
  
  // Normalize dates to YYYY-MM-DD format
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const parseDate = (s: string) => new Date(s + 'T00:00:00.000Z');
  
  const periodStart = formatDate(startDate);
  const periodEnd = formatDate(endDate);

  try {
    // Fetch all snapshots for the employee
    const snapshotsRef = adminDb.collection('employeeConfigSnapshots');
    const querySnapshot = await snapshotsRef
      .where('employeeId', '==', employeeId)
      .get();

    // Sort snapshots by effectiveFrom ascending
    const allSnapshots: EmployeeConfigSnapshot[] = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as EmployeeConfigSnapshot))
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

    // If no snapshots, create a fallback from employee record
    if (allSnapshots.length === 0) {
      const seedConfig = await createSeedConfigFromEmployee(employeeId);
      if (seedConfig) {
        const daysDiff = Math.floor((parseDate(periodEnd).getTime() - parseDate(periodStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        segments.push({
          config: seedConfig,
          startDate: periodStart,
          endDate: periodEnd,
          daysCount: daysDiff,
        });
      }
      return segments;
    }

    // Build segments by finding which config is active for each date in the range
    let currentDate = parseDate(periodStart);
    const endDateTime = parseDate(periodEnd);

    while (currentDate <= endDateTime) {
      const dateStr = formatDate(currentDate);
      
      // Find the active config for this date
      let activeConfig: EmployeeConfigSnapshot | null = null;
      
      for (const snapshot of allSnapshots) {
        const effectiveFrom = snapshot.effectiveFrom.split('T')[0];
        const effectiveTo = snapshot.effectiveTo ? snapshot.effectiveTo.split('T')[0] : null;
        
        // Check if this snapshot is active on the current date
        if (effectiveFrom <= dateStr && (!effectiveTo || effectiveTo > dateStr)) {
          activeConfig = snapshot;
        }
      }

      // If no config found, use seed config
      if (!activeConfig) {
        activeConfig = await createSeedConfigFromEmployee(employeeId);
      }

      if (!activeConfig) {
        // Skip this date if no config available
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        continue;
      }

      // Determine how long this config is active
      let segmentEndDate = periodEnd;
      
      // Check if there's a newer config that starts before periodEnd
      for (const snapshot of allSnapshots) {
        const effectiveFrom = snapshot.effectiveFrom.split('T')[0];
        if (effectiveFrom > dateStr && effectiveFrom <= periodEnd) {
          // This config becomes active at effectiveFrom
          // So current config ends the day before
          const dayBefore = new Date(parseDate(effectiveFrom).getTime() - 24 * 60 * 60 * 1000);
          const dayBeforeStr = formatDate(dayBefore);
          if (dayBeforeStr < segmentEndDate && dayBeforeStr >= dateStr) {
            segmentEndDate = dayBeforeStr;
          }
        }
      }

      // Calculate days in this segment
      const segmentStartTime = parseDate(dateStr).getTime();
      const segmentEndTime = parseDate(segmentEndDate).getTime();
      const daysCount = Math.floor((segmentEndTime - segmentStartTime) / (1000 * 60 * 60 * 24)) + 1;

      // Check if we can extend the last segment (same config)
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment.config.id === activeConfig.id) {
        // Extend existing segment
        lastSegment.endDate = segmentEndDate;
        lastSegment.daysCount = Math.floor(
          (parseDate(lastSegment.endDate).getTime() - parseDate(lastSegment.startDate).getTime()) 
          / (1000 * 60 * 60 * 24)
        ) + 1;
      } else {
        // Create new segment
        segments.push({
          config: activeConfig,
          startDate: dateStr,
          endDate: segmentEndDate,
          daysCount: daysCount,
        });
      }

      // Move to the next segment start
      currentDate = new Date(parseDate(segmentEndDate).getTime() + 24 * 60 * 60 * 1000);
    }

    return segments;

  } catch (error) {
    console.error('[buildConfigTimeline] Error building timeline:', error);
    
    // Return fallback with seed config
    const seedConfig = await createSeedConfigFromEmployee(employeeId);
    if (seedConfig) {
      const daysDiff = Math.floor((parseDate(periodEnd).getTime() - parseDate(periodStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return [{
        config: seedConfig,
        startDate: periodStart,
        endDate: periodEnd,
        daysCount: daysDiff,
      }];
    }
    return [];
  }
}
