import admin from 'firebase-admin';

// Initialize Firebase Admin SDK.
// Initialization strategy:
// 1. If `FIREBASE_SERVICE_ACCOUNT_BASE64` is provided, parse it and initialize
//    using the service account JSON (convenient for CI / ephemeral containers
//    where mounting files is inconvenient).
// 2. Otherwise, fall back to Application Default Credentials via
//    `admin.credential.applicationDefault()` which uses `GOOGLE_APPLICATION_CREDENTIALS`
//    or GCP metadata when running on Google Cloud.
function initAdmin() {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (base64) {
        try {
            const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
            admin.initializeApp({ credential: admin.credential.cert(json) });
            // eslint-disable-next-line no-console
            console.log('Initialized Firebase Admin from FIREBASE_SERVICE_ACCOUNT_BASE64');
            return admin;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64', err);
            throw err;
        }
    }

    // Prefer ADC (uses GOOGLE_APPLICATION_CREDENTIALS or GCP metadata).
    try {
        // If running with the Auth emulator, the Admin SDK can be initialized
        // without credentials and will direct Auth calls to the emulator when
        // `FIREBASE_AUTH_EMULATOR_HOST` is set (e.g. "localhost:9099'). However
        // in production we must NOT connect to the emulator even if the env var
        // is present. Guard by checking NODE_ENV !== 'production'.
        const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
        const isProd = process.env.NODE_ENV === 'production';
        if (emulatorHost && !isProd) {
            const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-project';
            admin.initializeApp({ projectId });
            // eslint-disable-next-line no-console
            console.log(`Initialized Firebase Admin against Auth emulator at ${emulatorHost}`);
        } else {
            if (emulatorHost && isProd) {
                // eslint-disable-next-line no-console
                console.warn('FIREBASE_AUTH_EMULATOR_HOST is set but NODE_ENV=production — ignoring emulator and using application default credentials.');
            }
            admin.initializeApp({ credential: admin.credential.applicationDefault() });
            // eslint-disable-next-line no-console
            console.log('Initialized Firebase Admin using applicationDefault()');
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Firebase Admin with applicationDefault()', err);
        // allow caller to handle; rethrow
        throw err;
    }

    return admin;
}

export default initAdmin();
