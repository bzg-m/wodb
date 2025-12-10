export function createGetIdTokenMock(token: string | null) {
    const getIdToken = async () => token;
    const isFirebaseConfigured = () => Boolean(token);
    const signInWithGoogle = async () => true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const sendSignInLink = async (email: string) => undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isSignInLink = async (url: string) => false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const completeSignInWithEmailLink = async (email: string, url: string) => false;
    const firebaseSignOut = async () => undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onFirebaseAuthStateChanged = (cb: (user: unknown) => void) => () => { };

    const api = {
        getIdToken,
        isFirebaseConfigured,
        signInWithGoogle,
        sendSignInLink,
        isSignInLink,
        completeSignInWithEmailLink,
        firebaseSignOut,
        onFirebaseAuthStateChanged,
    } as const;

    return {
        ...api,
        default: api,
    };
}
