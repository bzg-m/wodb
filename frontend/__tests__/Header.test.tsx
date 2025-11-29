import { render } from '@testing-library/preact';
import { describe, it, expect } from 'vitest';
import { Header } from '../src/components/Header';
import { UserProvider } from '../src/UserContext';
import { LocationProvider } from 'preact-iso';

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
