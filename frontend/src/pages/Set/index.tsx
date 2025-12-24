// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';

import type { Annotation, WODBSet } from '../../../../common/model.js';
import { labelForIndex, labelForObjectId } from '../../../../common/model.js';
import {
    createOrUpdateAnnotation,
    fetchSetById,
    fetchUserAnnotationsForSet,
    removeAnnotation,
    sendRequestReview,
} from '../../api';
import { useUser } from '../../UserContext';

export function SetPage(): preact.JSX.Element {
    const { url } = useLocation();
    const id = url.split('/set/')[1] || '';
    const { user } = useUser();



    // If there's no signed-in user, redirect to the view-only page to avoid showing annotation UI.
    useEffect(() => {
        if (!user) {
            // Use replace so history isn't polluted and to avoid a back-loop.
            window.location.replace(`/set/${id}/view`);
        }
    }, [user, id]);

    const [set, setSet] = useState<WODBSet | null>(null);
    const [setLoading, setSetLoading] = useState(true);

    const [selected, setSelected] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const [userAnnotations, setUserAnnotations] = useState<Annotation[]>([]);

    useEffect(() => {
        let mounted = true;
        setSetLoading(true);
        (async () => {
            try {
                const s = await fetchSetById(id);
                if (!mounted) return;
                setSet(s as WODBSet | null);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                if (!mounted) return;
                // on error treat as not found / unavailable
                setSet(null);
            } finally {
                if (mounted) {
                    setSetLoading(false);
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, [id]);

    const isLocked = userAnnotations.some((a) => a.status === 'pending');
    const hasAccepted = userAnnotations.some((a) => a.status === 'accepted');

    function openObjectForNew(objId: string) {
        setSelected(objId);
        setEditingId(null);
    }

    const gridRef = useRef<HTMLDivElement | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function handleGridItemKeyDown(e: KeyboardEvent, idx: number, objId: string) {
        if (!set || !gridRef.current) return;

        // Determine number of columns from the container's computed grid template
        let cols = 2;
        try {
            const style = getComputedStyle(gridRef.current);
            const tpl = style.gridTemplateColumns;
            if (tpl) {
                // split on whitespace to count columns (e.g. "200px 200px")
                cols = tpl.trim().split(/\s+/).length;
            }
        } catch {
            // ignore, fall back to default
        }

        const len = set.objects.length;
        const col = idx % cols;
        let next = -1;

        const key = e.key;
        if (key === 'ArrowRight' || key === 'Right') {
            if (col + 1 < cols && idx + 1 < len) next = idx + 1;
        } else if (key === 'ArrowLeft' || key === 'Left') {
            if (col > 0) next = idx - 1;
        } else if (key === 'ArrowDown' || key === 'Down') {
            if (idx + cols < len) next = idx + cols;
        } else if (key === 'ArrowUp' || key === 'Up') {
            if (idx - cols >= 0) next = idx - cols;
        }

        if (next >= 0 && next !== idx) {
            e.preventDefault();
            const items = gridRef.current.querySelectorAll<HTMLElement>('[data-grid-item]');
            const target = items[next];
            if (target) {
                const nextObj = set.objects[next];
                // update selection and focus
                openObjectForNew(nextObj.id);
                target.focus();
            }
        }
    }

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

    // When the user logs out, clear user-specific state.
    useEffect(() => {
        if (!user) {
            setUserAnnotations([]);
            setSelected(null);
            setEditingId(null);
            setText('');
        }
    }, [user]);



    function openAnnotationForEdit(aId: string) {
        const a = userAnnotations.find((x) => x.id === aId);
        if (!a) return;
        setSelected(a.objectId);
        setEditingId(a.id);
        setText(a.text);
    }

    async function handleSave() {
        if (!user || !selected) return;
        if (isLocked) return;
        if (!set) return;
        if (editingId) {
            await createOrUpdateAnnotation({
                id: editingId,
                setId: set.id,
                objectId: selected,
                userId: user.uid,
                text,
                status: 'draft',
                visibility: 'private',
            });
        } else {
            await createOrUpdateAnnotation({
                setId: set.id,
                objectId: selected,
                userId: user.uid,
                text,
                status: 'draft',
                visibility: 'private'
            });
        }
        setEditingId(null);
        setText('');
        // refresh user's annotations and state
        const anns = await fetchUserAnnotationsForSet(set.id);
        setUserAnnotations(anns as Annotation[]);
    }

    async function handleDelete(aId: string) {
        if (isLocked) return;
        await removeAnnotation(aId);
        if (!set) return;
        const anns = await fetchUserAnnotationsForSet(set.id);
        setUserAnnotations(anns as Annotation[]);
    }

    async function handleRequestReview() {
        if (!user) return;
        if (!set) return;
        await sendRequestReview(set.id);
        const anns = await fetchUserAnnotationsForSet(set.id);
        setUserAnnotations(anns as Annotation[]);
    }

    function renderAnnotationPanel(): preact.JSX.Element {
        if (isLocked) return <div class="text-red-600">Review requested — annotations locked.</div>;
        const selectedLabel = selected ? labelForObjectId(set, selected) : null;
        return (
            <div>
                <h3 class="text-lg font-medium mb-2">{editingId ? 'Edit Annotation' : selected ? `New annotation for ${selectedLabel}` : 'Select an object to annotate'}</h3>
                {selected && (
                    <div>
                        <textarea class="w-full border rounded p-2 mb-2" value={text} onInput={(e: Event) => setText((e.target as HTMLTextAreaElement).value)} />
                        <div class="flex gap-2">
                            <button class="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleSave} disabled={!text.trim()}>
                                {editingId ? 'Save Changes' : 'Save Draft'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
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

            <div ref={gridRef} class="grid grid-cols-2 grid-rows-2 gap-2 mb-6">
                {set.objects.map((o, idx) => {
                    const isSelected = selected === o.id;
                    const label = labelForIndex(idx);
                    const badgePositions = ['-left-3 -top-3', '-right-3 -top-3', '-left-3 -bottom-3', '-right-3 -bottom-3'];
                    const badgePos = badgePositions[idx] ?? '-left-3 -top-3';
                    const itemClasses = [
                        'relative',
                        'w-[200px]',
                        'h-[200px]',
                        'border',
                        'border-gray-200',
                        'text-center',
                        'flex',
                        'items-center',
                        'justify-center',
                        'cursor-pointer',
                        'transition-transform',
                        'duration-200',
                        'focus:outline-none',
                        'focus:ring-1',
                        'focus:ring-blue-500',
                        'focus:ring-offset-1',
                    ];
                    if (isSelected) {
                        itemClasses.push('scale-105', 'ring-1', 'ring-blue-500', 'ring-offset-1');
                    } else {
                        itemClasses.push('hover:scale-105');
                    }

                    return (
                        <div
                            key={o.id}
                            data-grid-item
                            role="button"
                            tabIndex={isSelected || (!selected && idx === 0) ? 0 : -1}
                            aria-pressed={isSelected}
                            title={o.type === 'image' ? 'Open image for annotation' : `Select ${o.value}`}
                            class={itemClasses.join(' ')}
                            onClick={() => openObjectForNew(o.id)}
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            onFocus={(e: FocusEvent) => openObjectForNew(o.id)}
                            onKeyDown={(e: KeyboardEvent) => handleGridItemKeyDown(e, idx, o.id)}
                        >
                            <span class={`absolute ${badgePos} bg-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border`}>{label}</span>
                            {o.type === 'image' ? (
                                <img src={o.value} alt="object" class="max-h-full max-w-full object-contain rounded-md" />
                            ) : (
                                <span class="text-sm font-medium text-gray-700">{o.value}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div class="annotation-panel mb-4">{renderAnnotationPanel()}</div>

            <h3 class="text-xl mb-2">Your annotations for this set</h3>
            <table class="min-w-full bg-white border mb-6">
                <thead>
                    <tr class="bg-gray-100 text-left">
                        <th class="p-2">Object</th>
                        <th class="p-2">Annotation</th>
                        <th class="p-2">Status</th>
                        <th class="p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {set.objects.map((o, idx) => {
                        const anns = userAnnotations.filter((a) => a.objectId === o.id);
                        const objLabel = labelForIndex(idx);
                        if (anns.length === 0) {
                            return (
                                <tr key={o.id}>
                                    <td class="p-2">{objLabel}</td>
                                    <td class="p-2" colSpan={3}>
                                        No annotations
                                    </td>
                                </tr>
                            );
                        }
                        return anns.map((a) => (
                            <tr key={a.id}>
                                <td class="p-2 align-top">{objLabel}</td>
                                <td class="p-2 align-top break-words">{a.text}</td>
                                <td class="p-2 align-top">{a.status}</td>
                                <td class="p-2 align-top">
                                    <div class="flex gap-2">
                                        <button class="px-2 py-1 bg-yellow-500 text-white rounded" disabled={isLocked} onClick={() => openAnnotationForEdit(a.id)}>
                                            Edit
                                        </button>
                                        <button class="px-2 py-1 bg-red-500 text-white rounded" disabled={isLocked} onClick={() => handleDelete(a.id)}>
                                            Remove
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ));
                    })}
                </tbody>
            </table>
            <div class="set-actions">
                <button class="px-3 py-2 bg-green-600 text-white rounded" onClick={handleRequestReview} disabled={isLocked || userAnnotations.filter((a) => a.status === 'draft').length === 0}>
                    Request Review for Set
                </button>
            </div>
            {hasAccepted && (
                <div class="mt-4">
                    <a class="text-blue-600 underline" href={`/set/${id}/view`}>
                        Open view page
                    </a>
                </div>
            )}
        </section>
    );
}

export default SetPage;
