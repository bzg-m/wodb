import { render } from '@testing-library/preact';
import { LocationProvider } from 'preact-iso';
import { describe, expect,it } from 'vitest';

import { Header } from '../src/components/Header';
import { UserProvider } from '../src/UserContext';

describe('Header', () => {
    it('renders', () => {
        const { container } = render(
            <LocationProvider>
                <UserProvider>
                    <Header />
                </UserProvider>
            </LocationProvider>
        );
        expect(container.querySelector('header')).toBeTruthy();
    });
});
