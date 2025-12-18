// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';

import { fetchSetById, fetchUserAnnotationsForSet, fetchUserNames, fetchVisibleAnnotationsForUserInSet } from '../../api';
import type { Annotation, WODBSet } from '../../data';
import { useUser } from '../../UserContext';

export function ViewPage(): preact.JSX.Element {
    const { url } = useLocation();
    // url may be '/set/:id' or '/set/:id/view' — extract only the id segment
    const id = (url.split('/set/')[1] || '').split('/')[0] || '';
    const { user } = useUser();

    const [set, setSet] = useState<WODBSet | null>(null);
    const [setLoading, setSetLoading] = useState(true);

    const [userAnnotations, setUserAnnotations] = useState<Annotation[]>([]);
    const [visibleAnnotations, setVisibleAnnotations] = useState<Annotation[]>([]);
    const [userNames, setUserNames] = useState<Record<string, string | null>>({});

    useEffect(() => {
        let mounted = true;
        setSetLoading(true);
        (async () => {
            try {
                const s = await fetchSetById(id);
                if (!mounted) return;
                setSet(s as WODBSet | null);
            } catch {
                if (!mounted) return;
                setSet(null);
            } finally {
                if (mounted) setSetLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [id]);

    useEffect(() => {
        let mounted = true;
        async function load() {
            if (!set || !user) return;
            const anns = await fetchUserAnnotationsForSet(set.id);
            if (!mounted) return;
            setUserAnnotations(anns as Annotation[]);
        }
        load();
        return () => {
            mounted = false;
        };
    }, [user?.uid, set?.id]);

    const hasAccepted = userAnnotations.some((a) => a.status === 'accepted');

    useEffect(() => {
        let mounted = true;
        async function loadVisible() {
            if (!set || !user) return;
            if (!hasAccepted) return;
            const vis = await fetchVisibleAnnotationsForUserInSet(set.id);
            if (!mounted) return;
            setVisibleAnnotations(vis as Annotation[]);
        }
        loadVisible();
        return () => {
            mounted = false;
        };
    }, [user?.uid, set?.id, hasAccepted]);

    // Resolve display names for users referenced by visibleAnnotations.
    useEffect(() => {
        let mounted = true;
        async function loadNames() {
            const ids = Array.from(new Set((visibleAnnotations || []).map((a) => a.userId))).filter((id) => !Object.prototype.hasOwnProperty.call(userNames, id));
            if (ids.length === 0) return;
            try {
                const res = await fetchUserNames(ids);
                if (!mounted) return;
                const next = { ...userNames };
                for (const id of ids) {
                    next[id] = res[id] ? res[id].name ?? null : null;
                }
                setUserNames(next);
            } catch {
                // ignore failures; leave missing ids unpopulated
            }
        }
        loadNames();
        return () => {
            mounted = false;
        };
    }, [visibleAnnotations]);

    if (setLoading) {
        return (
            <section class="p-4">
                <h2 class="text-2xl font-semibold">Loading set…</h2>
            </section>
        );
    }

    if (!set) {
        return (
            <section class="p-4">
                <h2>Set not found</h2>
            </section>
        );
    }

    return (
        <section class="p-4">
            <h2 class="text-2xl font-semibold">{set.title}</h2>
            <p class="text-sm text-gray-600 mb-4">{set.description}</p>

            <div class="grid grid-cols-2 grid-rows-2 gap-2 mb-6">
                {set.objects.map((o) => (
                    <div
                        key={o.id}
                        data-grid-item
                        role="group"
                        class="relative w-[200px] h-[200px] border border-gray-200 text-center flex items-center justify-center"
                    >
                        {o.type === 'image' ? (

                            <img src={o.value} alt="object" class="max-h-full max-w-full object-contain rounded-md" />
                        ) : (
                            <span class="text-sm font-medium text-gray-700">{o.value}</span>
                        )}
                    </div>
                ))}
            </div>

            <div class="mb-4">
                <a href={`/set/${id}`} class="text-blue-600 underline">
                    Open annotation page
                </a>
            </div>

            {hasAccepted ? (
                <div>
                    <h3 class="text-xl mb-2">Visible annotations</h3>
                    {visibleAnnotations.length === 0 ? (
                        <div>No visible annotations</div>
                    ) : (
                        <ul>
                            {visibleAnnotations.map((a) => (
                                <li key={a.id} class="mb-2 border p-2">
                                    <div class="font-medium">{a.text}</div>
                                    <div class="text-sm text-gray-600">Object: {a.objectId}</div>
                                    <div class="text-sm text-gray-600">By: {userNames[a.userId] ?? a.userId}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <div class="text-gray-700">You do not have an accepted annotation for this set.</div>
            )}
        </section>
    );
}

export default ViewPage;
