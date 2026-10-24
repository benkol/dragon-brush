import type { Equipped, Slot } from '../data/types';
import { ITEMS } from './catalog';
import { DragonImg, ItemImg } from '../ui/Preview';

const WEARABLE = new Set(['dragon', 'hat', 'glasses', 'necklace']);

/**
 * Picture of an item. Wearables are shown on the kid's own dragon (`wearer`);
 * other items get a 3D render, a background swatch or an emoji.
 */
export default function ItemArt({ id, wearer, mystery }: { id: string; wearer?: Equipped; mystery?: boolean }) {
  const item = ITEMS[id];
  if (!item) return null;
  if (mystery) return <span className="art emoji-art">🥚</span>;
  if (item.category === 'bg') return <span className={`art bg-swatch bg-${id.split('.')[1]}`}>{item.emoji}</span>;
  if (item.category === 'shield') return <span className="art emoji-art">{item.emoji}</span>;
  if (wearer && WEARABLE.has(item.category)) {
    return <DragonImg className="art" equipped={{ ...wearer, [item.category as Slot]: id }} level={1} />;
  }
  if (id.endsWith('.none')) return <span className="art emoji-art">{item.emoji}</span>;
  return <ItemImg className="art" id={id} fallback={item.emoji} />;
}
