import { render } from 'preact';
import { lazy, LocationProvider, Router, Route } from 'preact-iso';

import { Header } from './components/Header';
import { Home } from './pages/Home/index';
import { NotFound } from './pages/_404';
import './style.css';
import { UserProvider } from './UserContext';

const SetPage = lazy(() => import('./pages/Set/index'));

export function App() {
	return (
		<LocationProvider>
			<UserProvider>
				<Header />
				<main>
					<Router>
						<Route path="/" component={Home} />
						<Route path="/set/:id" component={SetPage} />
						<Route default component={NotFound} />
					</Router>
				</main>
			</UserProvider>
		</LocationProvider>
	);
}

render(<App />, document.getElementById('app'));
