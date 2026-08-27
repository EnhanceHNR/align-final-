import { differenceInMinutes } from 'date-fns';
import { Employee } from './types';

/**
 * Calculates the attendance status based on clock-in time and shift start.
 * 
 * Double Late: Measured from shift start time.
 * Late: Measured from grace period end (shift start + buffer).
 */
export const calculateAttendanceStatus = (
  clockInTime: Date,
  shiftStartTime: Date,
  bufferMinutes: number,
  doubleLateThreshold: number = 30
): 'Present' | 'Late' | 'Double Late' => {
  const gracePeriodEndTime = new Date(shiftStartTime.getTime() + bufferMinutes * 60000);
  
  // Calculate minutes late relative to shift start for Double Late
  const minutesLateFromStart = differenceInMinutes(clockInTime, shiftStartTime);
  
  // Calculate minutes late relative to grace period for normal Late
  const minutesLateFromGrace = differenceInMinutes(clockInTime, gracePeriodEndTime);

  if (minutesLateFromStart >= doubleLateThreshold) {
    return 'Double Late';
  }
  if (minutesLateFromGrace > 0) {
    return 'Late';
  }
  return 'Present';
};
