// Dragon and item pictures, rendered by the 3D code. That code (three.js)
// is big, so it loads in the background after the first screen appears;
// until then a placeholder emoji shows.
import { useEffect, useState } from 'react';
import type { Equipped } from '../data/types';

type PreviewModule = typeof import('../game/scene/preview');

let mod: Promise<PreviewModule> | null = null;
let loaded: PreviewModule | null = null;

function loadPreview() {
  mod ??= import('../game/scene/preview').then((m) => (loaded = m));
  return mod;
}

/** Renders `make` once the 3D code is ready (immediately if it already is). */
function usePreview(key: string, make: (m: PreviewModule) => string): string | null {
  const [src, setSrc] = useState<string | null>(() => (loaded ? make(loaded) : null));
  useEffect(() => {
    let alive = true;
    if (loaded) setSrc(make(loaded));
    else loadPreview().then((m) => alive && setSrc(make(m)));
    return () => {
      alive = false;
    };
    // `key` captures everything `make` depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return src;
}

export function DragonImg({ equipped, level, className = '' }: { equipped: Equipped; level: number; className?: string }) {
  const src = usePreview(`d:${JSON.stringify(equipped)}:${level}`, (m) => m.dragonPreview(equipped, level));
  return src ? <img className={className} src={src} alt="" /> : <span className={`${className} preview-wait`}>🐲</span>;
}

export function ItemImg({ id, className = '', fallback }: { id: string; className?: string; fallback: string }) {
  const src = usePreview(`i:${id}`, (m) => m.itemPreview(id));
  return src ? <img className={className} src={src} alt="" /> : <span className={`${className} emoji-art`}>{fallback}</span>;
}
