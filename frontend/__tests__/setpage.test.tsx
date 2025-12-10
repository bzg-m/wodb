import { render } from '@testing-library/preact';
import { LocationProvider } from 'preact-iso';
import { describe, expect, it } from 'vitest';

import SetPage from '../src/pages/Set/index';
import { UserProvider } from '../src/UserContext';

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
