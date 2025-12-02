export function createGetIdTokenMock(token: string | null) {
    const getIdToken = async () => token;
    const isFirebaseConfigured = () => Boolean(token);
    return {
        getIdToken,
        isFirebaseConfigured,
        default: { getIdToken, isFirebaseConfigured },
    } as const;
}
