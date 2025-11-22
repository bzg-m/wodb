import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Annotation, WODBSet } from '../../data';
import {
    fetchSets,
    fetchAnnotationsForSet,
    updateAnnotationStatus,
    updateAnnotationVisibility,
} from '../../api';
import { useUser } from '../../UserContext';

export function AdminPage(): preact.JSX.Element {
    const { user } = useUser();
    const [sets, setSets] = useState<WODBSet[]>([]);
    const [pending, setPending] = useState<Annotation[]>([]);
    const [accepted, setAccepted] = useState<Annotation[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyIds, setBusyIds] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        let mounted = true;
        async function loadPending() {
            setLoading(true);
            const s = await fetchSets();
            if (!mounted) return;
            setSets(s);

            const allPending: Annotation[] = [];
            const allAccepted: Annotation[] = [];
            for (const set of s) {
                const anns = await fetchAnnotationsForSet(set.id);
                if (!mounted) return;
                for (const a of anns) {
                    if (a.status === 'pending') allPending.push(a);
                    if (a.status === 'accepted') allAccepted.push(a);
                }
            }
            if (!mounted) return;
            setPending(allPending);
            setAccepted(allAccepted);
            setLoading(false);
        }
        loadPending();
        return () => {
            mounted = false;
        };
    }, []);

    if (!user) {
        return (
            <section class="p-4">
                <h2 class="text-xl font-semibold">Admin</h2>
                <p>Please sign in as an admin to review annotations.</p>
            </section>
        );
    }

    if (!user.isAdmin) {
        return (
            <section class="p-4">
                <h2 class="text-xl font-semibold">Admin</h2>
                <p>You do not have permission to view this page.</p>
            </section>
        );
    }

    function markBusy(id: string) {
        setBusyIds((b) => (b.includes(id) ? b : [...b, id]));
    }
    function clearBusy(id: string) {
        setBusyIds((b) => b.filter((x) => x !== id));
    }

    async function reject(aId: string) {
        markBusy(aId);
        setErrors((e) => ({ ...e, [aId]: '' }));
        try {
            // In a real backend, rejecting would also enforce private visibility.
            await updateAnnotationStatus(aId, 'rejected');
            setPending((p) => p.filter((x) => x.id !== aId));
            setAccepted((a) => a.filter((x) => x.id !== aId));
        } catch (err: any) {
            setErrors((e) => ({ ...e, [aId]: String(err) || 'Failed to reject annotation' }));
        } finally {
            clearBusy(aId);
        }
    }

    async function accept(aId: string) {
        markBusy(aId);
        setErrors((e) => ({ ...e, [aId]: '' }));
        try {
            // Accept first; backend will normally promote private -> group visibility.
            const res = await updateAnnotationStatus(aId, 'accepted');
            if (res) {
                setPending((p) => p.filter((x) => x.id !== aId));
                setAccepted((prev) => [res as Annotation, ...prev]);
            } else {
                // If API didn't return updated annotation, remove from pending and add a placeholder
                setPending((p) => p.filter((x) => x.id !== aId));
            }
        } catch (err: any) {
            setErrors((e) => ({ ...e, [aId]: String(err) || 'Failed to accept annotation' }));
        } finally {
            clearBusy(aId);
        }
    }

    async function makePublic(aId: string) {
        markBusy(aId);
        setErrors((e) => ({ ...e, [aId]: '' }));
        try {
            // Accept first (idempotent if already accepted), then promote visibility to public.
            const acceptedRes = await updateAnnotationStatus(aId, 'accepted');
            if (acceptedRes) {
                setPending((p) => p.filter((x) => x.id !== aId));
                setAccepted((prev) => [acceptedRes as Annotation, ...prev.filter((x) => x.id !== aId)]);
            }
        } catch (err: any) {
            setErrors((e) => ({ ...e, [aId]: `Accept failed: ${String(err)}` }));
            clearBusy(aId);
            return;
        }

        try {
            await updateAnnotationVisibility(aId, 'public');
            setAccepted((prev) => prev.map((x) => (x.id === aId ? { ...x, visibility: 'public' } : x)));
        } catch (err: any) {
            // Accept succeeded but making public failed — surface error and keep the annotation in accepted list
            setErrors((e) => ({ ...e, [aId]: `Make public failed: ${String(err)}` }));
        } finally {
            clearBusy(aId);
        }
    }

    async function changeAcceptedVisibility(aId: string, v: 'group' | 'public') {
        markBusy(aId);
        setErrors((e) => ({ ...e, [aId]: '' }));
        try {
            await updateAnnotationVisibility(aId, v as any);
            setAccepted((prev) => prev.map((x) => (x.id === aId ? { ...x, visibility: v } : x)));
        } catch (err: any) {
            setErrors((e) => ({ ...e, [aId]: String(err) || 'Failed to change visibility' }));
        } finally {
            clearBusy(aId);
        }
    }

    return (
        <section class="p-4">
            <h2 class="text-2xl font-semibold mb-4">Admin Review</h2>
            {loading ? (
                <div>Loading pending annotations...</div>
            ) : pending.length === 0 ? (
                <div>No pending annotations.</div>
            ) : (
                <table class="min-w-full bg-white border">
                    <thead>
                        <tr class="bg-gray-100 text-left">
                            <th class="p-2">Set</th>
                            <th class="p-2">Object</th>
                            <th class="p-2">Text</th>
                            <th class="p-2">User</th>
                            <th class="p-2">Visibility</th>
                            <th class="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pending.map((a) => {
                            const set = sets.find((s) => s.id === a.setId);
                            return (
                                <tr>
                                    <td class="p-2 align-top">{set ? set.title : a.setId}</td>
                                    <td class="p-2 align-top">{a.objectId}</td>
                                    <td class="p-2 align-top break-words">{a.text}</td>
                                    <td class="p-2 align-top">{a.userId}</td>
                                    <td class="p-2 align-top">{a.visibility}</td>
                                    <td class="p-2 align-top">
                                        <div class="flex gap-2 items-start">
                                            <button class="px-2 py-1 bg-green-600 text-white rounded" onClick={() => accept(a.id)} disabled={busyIds.includes(a.id)}>
                                                Accept
                                            </button>
                                            <button class="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => makePublic(a.id)} disabled={busyIds.includes(a.id)}>
                                                Make Public
                                            </button>
                                            <button class="px-2 py-1 bg-red-600 text-white rounded" onClick={() => reject(a.id)} disabled={busyIds.includes(a.id)}>
                                                Reject
                                            </button>
                                        </div>
                                        {errors[a.id] && <div class="text-red-600 text-sm mt-1">{errors[a.id]}</div>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            {/* Accepted annotations section */}
            {accepted.length > 0 && (
                <section class="mt-6">
                    <h3 class="text-xl mb-2">Accepted annotations</h3>
                    <table class="min-w-full bg-white border">
                        <thead>
                            <tr class="bg-gray-100 text-left">
                                <th class="p-2">Set</th>
                                <th class="p-2">Object</th>
                                <th class="p-2">Text</th>
                                <th class="p-2">User</th>
                                <th class="p-2">Visibility</th>
                                <th class="p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accepted.map((a) => {
                                const set = sets.find((s) => s.id === a.setId);
                                return (
                                    <tr>
                                        <td class="p-2 align-top">{set ? set.title : a.setId}</td>
                                        <td class="p-2 align-top">{a.objectId}</td>
                                        <td class="p-2 align-top break-words">{a.text}</td>
                                        <td class="p-2 align-top">{a.userId}</td>
                                        <td class="p-2 align-top">
                                            <select
                                                class="border p-1"
                                                value={a.visibility}
                                                onChange={(e) => changeAcceptedVisibility(a.id, (e.target as HTMLSelectElement).value as any)}
                                                disabled={busyIds.includes(a.id)}
                                            >
                                                <option value="group">group</option>
                                                <option value="public">public</option>
                                            </select>
                                        </td>
                                        <td class="p-2 align-top">
                                            <div class="flex gap-2">
                                                <button class="px-2 py-1 bg-red-600 text-white rounded" onClick={() => reject(a.id)} disabled={busyIds.includes(a.id)}>
                                                    Reject
                                                </button>
                                            </div>
                                            {errors[a.id] && <div class="text-red-600 text-sm mt-1">{errors[a.id]}</div>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            )}
        </section>
    );
}

export default AdminPage;
