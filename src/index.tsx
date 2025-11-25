import { render } from 'preact';
import { lazy, LocationProvider, Router, Route } from 'preact-iso';

import { Header } from './components/Header';
import { Home } from './pages/Home/index';
import './style.css';
import { UserProvider } from './UserContext';

function NotFound() {
	return (
		<section class="p-4">
			<h2 class="text-xl font-semibold">404: Not Found</h2>
			<p>The requested page was not found.</p>
		</section>
	);
}

const SetPage = lazy(() => import('./pages/Set/index'));
const AdminPage = lazy(() => import('./pages/Admin/index'));

export function App() {
	return (
		<LocationProvider>
			<UserProvider>
				<Header />
				<main>
					<Router>
						<Route path="/" component={Home} />
						<Route path="/set/:id" component={SetPage} />
						<Route path="/admin" component={AdminPage} />
						<Route default component={NotFound} />
					</Router>
				</main>
			</UserProvider>
		</LocationProvider>
	);
}

render(<App />, document.getElementById('app'));
