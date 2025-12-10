import { render, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';

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
        onFirebaseAuthStateChanged: (cb: (u: unknown) => void) => {
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
    };
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';
import { LocationProvider } from 'preact-iso';

import { UserProvider, useUser } from '../src/UserContext';

function Probe() {
    const { user, loading } = useUser();
    return <div data-testid="probe">{loading ? 'LOADING' : user ? `USER:${user.email}` : 'NOUSER'}</div>;
}

describe('delayed init auth', () => {
    it('completes email-link sign-in after init and clears stored email', async () => {
        // Simulate landing on an email sign-in link with stored email
        const url = 'https://example.com/?link=1';
        // Ensure `location` exists and is writable on `globalThis` for this test environment
        const globalWithLocation = globalThis as unknown as { location?: Location };
        const fakeLocation = { href: url } as unknown as Location;
        if (typeof globalWithLocation.location === 'undefined') {
            Object.defineProperty(globalThis, 'location', { value: fakeLocation, configurable: true });
        } else {
            (globalWithLocation.location as Location).href = url;
        }
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
