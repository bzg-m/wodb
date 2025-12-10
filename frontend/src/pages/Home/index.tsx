import './style.css';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { fetchSets } from '../../api';
import type { WODBSet } from '../../data';

export function Home() {
    useEffect(() => {
        fetchSets().then((sets) => {
            setSets(sets);
        });
    }, []);

    const [sets, setSets] = useState<WODBSet[]>([]);

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
