import { DEMO_MODE } from '../config';
import type { Repo } from './repo';

/** Loads the Firebase repo only when configured, keeping the demo bundle small. */
export async function loadRepo(): Promise<Repo> {
  if (DEMO_MODE) return (await import('./localRepo')).localRepo;
  return (await import('./firebaseRepo')).firebaseRepo;
}
