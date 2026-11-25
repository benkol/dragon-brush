const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** Without a Firebase config the app runs in demo mode with on-device storage. */
export const DEMO_MODE = !env.VITE_FIREBASE_API_KEY;
export const USE_EMULATORS = env.VITE_USE_FIREBASE_EMULATORS === 'true';
/** reCAPTCHA Enterprise site key for Firebase App Check (public; see README). Empty = App Check off. */
export const RECAPTCHA_SITE_KEY: string = env.VITE_RECAPTCHA_SITE_KEY ?? '';

const params = new URLSearchParams(location.search);
/** `?debug=1`: mouse/touch aims and space/press opens the mouth; no camera needed. */
export const DEBUG = params.get('debug') === '1';
/** `?round=5` shortens each target to 5 seconds (debug only). */
export const DEBUG_ROUND_SECONDS = Number(params.get('round')) || 0;

export const MEDIAPIPE_WASM = '/mediapipe/wasm';
export const FACE_MODEL_LOCAL = '/mediapipe/face_landmarker.task';
export const FACE_MODEL_CDN =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** The page that explains the app (Hebrew), on Netlify. */
export const ABOUT_URL = 'https://dragon.benkol.com';
