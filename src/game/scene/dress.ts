import type { Equipped } from '../../data/types';
import { buildDragon, type Rig } from './dragons';
import { buildGlasses, buildHat, buildNecklace } from './items';

/** A dragon wearing the kid's equipped accessories. */
export function buildDressedDragon(equipped: Equipped, level: number): Rig {
  const rig = buildDragon(equipped.dragon, level);
  const hat = buildHat(equipped.hat);
  if (hat) rig.anchors.hat.add(hat);
  const glasses = buildGlasses(equipped.glasses);
  if (glasses) rig.anchors.glasses.add(glasses);
  const necklace = buildNecklace(equipped.necklace);
  if (necklace) rig.anchors.neck.add(necklace);
  return rig;
}
