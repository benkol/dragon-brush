// Whether to show the live tuning readout while brushing. A per-phone
// setting, since it's for whoever is holding the phone.
const KEY = 'dragonbrush.tuning';

export function tuningEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setTuningEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // Storage unavailable: the readout just stays off.
  }
}
