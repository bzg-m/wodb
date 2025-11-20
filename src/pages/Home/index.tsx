import './style.css';
import { getSets } from '../../dataStore';

export function Home() {
	const sets = getSets();

	return (
		<div class="home">
			<h1>Which One Doesn't Belong — Sets</h1>
			<section>
				{sets.map((s) => (
					<a href={`/set/${s.id}`}>
						<h3>{s.title}</h3>
						<p>{s.description}</p>
					</a>
				))}
			</section>
		</div>
	);
}
