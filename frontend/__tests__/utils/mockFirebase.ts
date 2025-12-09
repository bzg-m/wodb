export function createGetIdTokenMock(token: string | null) {
    const getIdToken = async () => token;
    const isFirebaseConfigured = () => Boolean(token);
    const signInWithGoogle = async () => true;
    const sendSignInLink = async (_email: string) => undefined;
    const isSignInLink = async (_url: string) => false;
    const completeSignInWithEmailLink = async (_email: string, _url: string) => false;
    const firebaseSignOut = async () => undefined;
    const onFirebaseAuthStateChanged = (_cb: (user: any) => void) => () => { };

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
