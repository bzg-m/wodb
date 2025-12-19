export function createGetIdTokenMock(token: string | null) {
    const getIdToken = async () => token;
    const isFirebaseConfigured = () => Boolean(token);
    const signInWithGoogle = async () => true;
    const firebaseSignOut = async () => undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onFirebaseAuthStateChanged = (cb: (user: unknown) => void) => () => { };

    const api = {
        getIdToken,
        isFirebaseConfigured,
        signInWithGoogle,
        firebaseSignOut,
        onFirebaseAuthStateChanged,
    } as const;

    return {
        ...api,
        default: api,
    };
}
