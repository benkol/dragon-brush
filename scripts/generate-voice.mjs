// Generates the dragon's spoken lines with ElevenLabs, once, into
// public/voice/<lang>/<id>.mp3 plus public/voice/manifest.json. The app ships
// these files; the API key never leaves this computer.
//
//   npm run voice -- --list-voices     list the voices on your account
//   npm run voice                      generate missing clips (en + he)
//   npm run voice -- --force           regenerate everything
//   npm run voice -- --only=he         one language
//   npm run voice -- --line=go         one line (with --force to redo it)
//
// Settings come from .env.local (see .env.example):
//   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, optional ELEVENLABS_VOICE_ID_HE,
//   ELEVENLABS_MODEL_EN, ELEVENLABS_MODEL_HE.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'voice');
const API = 'https://api.elevenlabs.io/v1';
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('Missing ELEVENLABS_API_KEY. Add it to .env.local (see .env.example).');
  process.exit(1);
}
const headers = { 'xi-api-key': key, 'Content-Type': 'application/json' };

if (flag('list-voices')) {
  const r = await fetch(`${API}/voices`, { headers });
  if (!r.ok) {
    console.error(`ElevenLabs error ${r.status}: ${await r.text()}`);
    process.exit(1);
  }
  const { voices } = await r.json();
  for (const v of voices) {
    const labels = Object.values(v.labels ?? {}).join(', ');
    console.log(`${v.voice_id}  ${v.name}${labels ? `  (${labels})` : ''}`);
  }
  process.exit(0);
}

const LANGS = {
  // Hebrew needs a model that supports it; eleven_v3 does.
  en: { voice: process.env.ELEVENLABS_VOICE_ID, model: process.env.ELEVENLABS_MODEL_EN || 'eleven_multilingual_v2' },
  he: {
    voice: process.env.ELEVENLABS_VOICE_ID_HE || process.env.ELEVENLABS_VOICE_ID,
    model: process.env.ELEVENLABS_MODEL_HE || 'eleven_v3',
  },
};

const only = opt('only');
const onlyLine = opt('line');
const langs = Object.keys(LANGS).filter((l) => !only || l === only);
let failed = 0;
let chars = 0;

for (const lang of langs) {
  const { voice, model } = LANGS[lang];
  if (!voice) {
    console.error('Missing ELEVENLABS_VOICE_ID. Run `npm run voice -- --list-voices` and pick one.');
    process.exit(1);
  }
  // `voiceTts` (e.g. Hebrew with niqqud) overrides the display text for speech.
  const json = JSON.parse(readFileSync(join(root, 'src', 'i18n', `${lang}.json`), 'utf8'));
  const lines = { ...json.voice, ...(json.voiceTts ?? {}) };
  mkdirSync(join(out, lang), { recursive: true });

  for (const [id, text] of Object.entries(lines)) {
    if (onlyLine && id !== onlyLine) continue;
    const file = join(out, lang, `${id}.mp3`);
    if (existsSync(file) && !flag('force')) continue;

    const body = {
      text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      // Newer models accept a language hint; v2 infers it from the text.
      ...(model === 'eleven_multilingual_v2' ? {} : { language_code: lang }),
    };
    const r = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      failed++;
      console.error(`✗ ${lang}/${id}: ${r.status} ${await r.text()}`);
      continue;
    }
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    chars += text.length;
    console.log(`✓ ${lang}/${id}  "${text}"`);
  }
}

// The app reads this to know which clips exist.
const manifest = { generatedAt: new Date().toISOString() };
for (const lang of Object.keys(LANGS)) {
  const dir = join(out, lang);
  manifest[lang] = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort() : [];
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`\nGenerated ${chars} characters. Manifest: en ${manifest.en.length}, he ${manifest.he.length} clips.`);
if (failed) {
  console.error(`${failed} line(s) failed; see above. Run again to retry just those.`);
  process.exit(1);
}
