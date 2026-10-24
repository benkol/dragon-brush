import type { Equipped, Slot } from '../data/types';
import type { Season } from './seasons';

export type Category = Slot | 'shield';

export interface CatalogItem {
  id: string;
  category: Category;
  price: number;
  emoji: string;
  /** Not sold in the shop; granted by a streak, an egg, or a birthday. */
  unlock?: { streak?: number; egg?: boolean; birthday?: boolean; toothFairy?: boolean; anniversary?: boolean };
  /** Only sold during this holiday; kept forever once bought. */
  season?: Season;
  /** Owned by every kid from the start. */
  starter?: boolean;
}

// Prices assume roughly 40–80 points per day, so a new item every 3–5 days,
// with a few cheap ones early on so the first reward comes quickly.
export const CATALOG: CatalogItem[] = [
  // Dragons
  { id: 'dragon.ember', category: 'dragon', price: 0, emoji: '🐲', starter: true },
  { id: 'dragon.frost', category: 'dragon', price: 400, emoji: '❄️' },
  { id: 'dragon.leafy', category: 'dragon', price: 450, emoji: '🌿' },
  { id: 'dragon.sparkle', category: 'dragon', price: 550, emoji: '🦄' },
  { id: 'dragon.shadow', category: 'dragon', price: 650, emoji: '🌙' },
  { id: 'dragon.gold', category: 'dragon', price: 0, emoji: '👑', unlock: { streak: 30 } },
  { id: 'dragon.pip', category: 'dragon', price: 0, emoji: '🥚', unlock: { egg: true } },
  { id: 'dragon.mochi', category: 'dragon', price: 0, emoji: '🥚', unlock: { egg: true } },
  { id: 'dragon.bubbles', category: 'dragon', price: 0, emoji: '🥚', unlock: { egg: true } },

  // Hats
  { id: 'hat.none', category: 'hat', price: 0, emoji: '🚫', starter: true },
  { id: 'hat.party', category: 'hat', price: 40, emoji: '🥳' },
  { id: 'hat.cap', category: 'hat', price: 120, emoji: '🧢' },
  { id: 'hat.chef', category: 'hat', price: 150, emoji: '👨‍🍳' },
  { id: 'hat.pirate', category: 'hat', price: 200, emoji: '🏴‍☠️' },
  { id: 'hat.wizard', category: 'hat', price: 220, emoji: '🧙' },
  { id: 'hat.viking', category: 'hat', price: 260, emoji: '⚔️' },
  { id: 'hat.crown', category: 'hat', price: 300, emoji: '👑' },

  // Fire colors
  { id: 'fire.classic', category: 'fire', price: 0, emoji: '🔥', starter: true },
  { id: 'fire.blue', category: 'fire', price: 60, emoji: '💙' },
  { id: 'fire.green', category: 'fire', price: 140, emoji: '💚' },
  { id: 'fire.purple', category: 'fire', price: 180, emoji: '💜' },
  { id: 'fire.sparkles', category: 'fire', price: 240, emoji: '✨' },
  { id: 'fire.rainbow', category: 'fire', price: 320, emoji: '🌈' },

  // Glasses
  { id: 'glasses.none', category: 'glasses', price: 0, emoji: '🚫', starter: true },
  { id: 'glasses.round', category: 'glasses', price: 50, emoji: '👓' },
  { id: 'glasses.sun', category: 'glasses', price: 130, emoji: '🕶️' },
  { id: 'glasses.heart', category: 'glasses', price: 170, emoji: '💗' },
  { id: 'glasses.star', category: 'glasses', price: 190, emoji: '⭐' },
  { id: 'glasses.monocle', category: 'glasses', price: 210, emoji: '🧐' },

  // Necklaces
  { id: 'necklace.none', category: 'necklace', price: 0, emoji: '🚫', starter: true },
  { id: 'necklace.bowtie', category: 'necklace', price: 80, emoji: '🎀' },
  { id: 'necklace.scarf', category: 'necklace', price: 140, emoji: '🧣' },
  { id: 'necklace.lei', category: 'necklace', price: 170, emoji: '🌺' },
  { id: 'necklace.medal', category: 'necklace', price: 220, emoji: '🏅' },
  { id: 'necklace.chain', category: 'necklace', price: 280, emoji: '⛓️' },

  // Foods to grill
  { id: 'food.marshmallow', category: 'food', price: 0, emoji: '🍡', starter: true },
  { id: 'food.sausage', category: 'food', price: 90, emoji: '🌭' },
  { id: 'food.corn', category: 'food', price: 120, emoji: '🌽' },
  { id: 'food.apple', category: 'food', price: 120, emoji: '🍎' },
  { id: 'food.smore', category: 'food', price: 160, emoji: '🍫' },
  { id: 'food.pizza', category: 'food', price: 200, emoji: '🍕' },
  { id: 'food.broccoli', category: 'food', price: 100, emoji: '🥦' },

  // Backgrounds (the camera moves to a small window at the bottom)
  { id: 'bg.camera', category: 'bg', price: 0, emoji: '📷', starter: true },
  { id: 'bg.castle', category: 'bg', price: 250, emoji: '🏰' },
  { id: 'bg.volcano', category: 'bg', price: 300, emoji: '🌋' },
  { id: 'bg.space', category: 'bg', price: 350, emoji: '🚀' },
  { id: 'bg.candy', category: 'bg', price: 350, emoji: '🍭' },

  // Consumables
  { id: 'shield', category: 'shield', price: 150, emoji: '🛡️' },

  // Seasonal: only in the shop around the holiday.
  { id: 'food.pumpkin', category: 'food', price: 120, emoji: '🎃', season: 'halloween' },
  { id: 'hat.witch', category: 'hat', price: 150, emoji: '🧙‍♀️', season: 'halloween' },
  { id: 'food.sufganiya', category: 'food', price: 120, emoji: '🍩', season: 'hanukkah' },
  { id: 'hat.dreidel', category: 'hat', price: 150, emoji: '🕎', season: 'hanukkah' },
  { id: 'food.hamantash', category: 'food', price: 120, emoji: '🥟', season: 'purim' },
  { id: 'glasses.mask', category: 'glasses', price: 150, emoji: '🎭', season: 'purim' },
  { id: 'food.matzah', category: 'food', price: 100, emoji: '🫓', season: 'passover' },
  { id: 'food.pomegranate', category: 'food', price: 100, emoji: '🍎', season: 'roshhashana' },
  { id: 'food.etrog', category: 'food', price: 100, emoji: '🍋', season: 'sukkot' },
  { id: 'hat.flag', category: 'hat', price: 120, emoji: '🚩', season: 'sukkot' },
  { id: 'bg.sukkah', category: 'bg', price: 250, emoji: '🛖', season: 'sukkot' },
  { id: 'hat.leaves', category: 'hat', price: 130, emoji: '🍃', season: 'tubishvat' },
  { id: 'food.driedfruit', category: 'food', price: 100, emoji: '🌰', season: 'tubishvat' },
  { id: 'fire.leafy', category: 'fire', price: 180, emoji: '🌱', season: 'tubishvat' },
  { id: 'food.kebab', category: 'food', price: 120, emoji: '🍢', season: 'independence' },
  { id: 'fire.bluewhite', category: 'fire', price: 180, emoji: '🩵', season: 'independence' },
  { id: 'necklace.flag', category: 'necklace', price: 160, emoji: '🇮🇱', season: 'independence' },
  { id: 'hat.hammer', category: 'hat', price: 130, emoji: '🔨', season: 'independence' },
  { id: 'food.potato', category: 'food', price: 100, emoji: '🥔', season: 'lagbaomer' },
  { id: 'fire.bonfire', category: 'fire', price: 180, emoji: '🔥', season: 'lagbaomer' },
  { id: 'bg.campfire', category: 'bg', price: 250, emoji: '🏕️', season: 'lagbaomer' },
  { id: 'hat.flowers', category: 'hat', price: 140, emoji: '🌸', season: 'shavuot' },
  { id: 'food.blintz', category: 'food', price: 110, emoji: '🥞', season: 'shavuot' },
  { id: 'food.icecream', category: 'food', price: 120, emoji: '🍦', season: 'summer' },
  { id: 'food.watermelon', category: 'food', price: 110, emoji: '🍉', season: 'summer' },
  { id: 'food.snowball', category: 'food', price: 100, emoji: '⚪', season: 'winter' },
  { id: 'hat.beanie', category: 'hat', price: 130, emoji: '🧶', season: 'winter' },
  { id: 'bg.snow', category: 'bg', price: 250, emoji: '⛄', season: 'winter' },
  { id: 'fire.fireworks', category: 'fire', price: 220, emoji: '🎆', season: 'newyear' },
  { id: 'glasses.newyear', category: 'glasses', price: 150, emoji: '🥳', season: 'newyear' },

  // Gifts for special moments; never sold.
  { id: 'hat.birthday', category: 'hat', price: 0, emoji: '🎂', unlock: { birthday: true } },
  { id: 'necklace.fairywings', category: 'necklace', price: 0, emoji: '🧚', unlock: { toothFairy: true } },
  { id: 'food.cake', category: 'food', price: 0, emoji: '🍰', unlock: { anniversary: true } },
];

export const ITEMS: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((i) => [i.id, i]));

export const STARTER_OWNED = CATALOG.filter((i) => i.starter).map((i) => i.id);

export const DEFAULT_EQUIPPED: Equipped = {
  dragon: 'dragon.ember',
  hat: 'hat.none',
  glasses: 'glasses.none',
  necklace: 'necklace.none',
  fire: 'fire.classic',
  food: 'food.marshmallow',
  bg: 'bg.camera',
};

export const EGG_DRAGONS = CATALOG.filter((i) => i.unlock?.egg).map((i) => i.id);

export const SHOP_CATEGORIES: Category[] = ['hat', 'fire', 'glasses', 'necklace', 'food', 'dragon', 'bg', 'shield'];
export const WARDROBE_SLOTS: Slot[] = ['dragon', 'hat', 'glasses', 'necklace', 'fire', 'food', 'bg'];

/** i18n key for an item's name: "items.hat.party". */
export const itemNameKey = (id: string) => `items.${id}`;
