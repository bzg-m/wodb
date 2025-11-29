import { render } from '@testing-library/preact';
import { describe, it, expect } from 'vitest';
import { UserProvider } from '../src/UserContext';
import SetPage from '../src/pages/Set/index';
import { LocationProvider } from 'preact-iso';

describe('SetPage', () => {
    it('renders not found when no set', async () => {
        const { findByText } = render(
            <LocationProvider>
                <UserProvider>
                    <SetPage />
                </UserProvider>
            </LocationProvider>
        );
        const el = await findByText(/Set not found/);
        expect(el).toBeTruthy();
    });
});
