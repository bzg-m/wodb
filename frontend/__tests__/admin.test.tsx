import { render } from '@testing-library/preact';
import { LocationProvider } from 'preact-iso';
import { describe, expect,it } from 'vitest';

import AdminPage from '../src/pages/Admin/index';
import { UserProvider } from '../src/UserContext';

describe('AdminPage', () => {
    it('shows auth message when not signed in', () => {
        const { getByText } = render(
            <LocationProvider>
                <UserProvider>
                    <AdminPage />
                </UserProvider>
            </LocationProvider>
        );
        expect(getByText(/Please sign in as an admin/)).toBeTruthy();
    });
});
