import { render, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

// Mock the firebase module to simulate delayed initialization and the
// email-link sign-in flow. The mock calls the auth-state callback
// asynchronously to simulate init delay.
vi.mock('../src/firebase', () => {
    return {
        getIdToken: async () => 'mock-token',
        isFirebasePresent: () => true,
        sendSignInLink: async () => undefined,
        isSignInLink: async () => true,
        completeSignInWithEmailLink: async () => true,
        firebaseSignOut: async () => undefined,
        onFirebaseAuthStateChanged: (cb: (u: any) => void) => {
            // Call back on next microtask to emulate delayed init.
            Promise.resolve().then(() =>
                cb({
                    uid: 'u1',
                    displayName: 'Test User',
                    email: 'user@example.com',
                    getIdToken: async () => 'mock-token',
                    getIdTokenResult: async () => ({ claims: {} }),
                })
            );
            return () => { };
        },
    } as any;
});

import { UserProvider, useUser } from '../src/UserContext';
import { LocationProvider } from 'preact-iso';
import { h } from 'preact';

function Probe() {
    const { user, loading } = useUser();
    return <div data-testid="probe">{loading ? 'LOADING' : user ? `USER:${user.email}` : 'NOUSER'}</div>;
}

describe('delayed init auth', () => {
    it('completes email-link sign-in after init and clears stored email', async () => {
        // Simulate landing on an email sign-in link with stored email
        const url = 'https://example.com/?link=1';
        // Set location and stored email before rendering
        (globalThis as any).window = globalThis.window || {};
        window.location.href = url;
        localStorage.setItem('wodb:emailForSignIn', 'user@example.com');

        const { container } = render(
            <LocationProvider>
                <UserProvider>
                    <Probe />
                </UserProvider>
            </LocationProvider>
        );

        // Wait for the probe to show the signed-in user
        await waitFor(() => {
            const el = container.querySelector('[data-testid="probe"]');
            expect(el).toBeTruthy();
            expect(el!.textContent).toContain('USER:user@example.com');
        });

        // Stored email should be removed after successful completion
        expect(localStorage.getItem('wodb:emailForSignIn')).toBeNull();
    });
});
