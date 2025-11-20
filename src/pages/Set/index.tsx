import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import {
    getSetById,
    saveAnnotation,
    requestReviewForUserInSet,
    getUserAnnotationsForSet,
    deleteAnnotation,
    getVisibleAnnotationsForUserInSet,
} from '../../dataStore';
import { useUser } from '../../UserContext';
import { users as allUsers } from '../../data';

export function SetPage(): preact.JSX.Element {
    const { url } = useLocation();
    const id = url.split('/set/')[1] || '';
    const set = getSetById(id);
    const { user } = useUser();

    const [selected, setSelected] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [version, setVersion] = useState(0); // bump to cause re-render after data changes

    if (!set) {
        return (
            <section>
                <h2>Set not found</h2>
            </section>
        );
    }

    if (!user) {
        return (
            <section>
                <h2>{set.title}</h2>
                <p>{set.description}</p>
                <p>Please sign in to view or create annotations.</p>
            </section>
        );
    }

    const userAnnotations = getUserAnnotationsForSet(user.id, set.id);
    const isLocked = userAnnotations.some((a) => a.status === 'pending');
    const hasAccepted = userAnnotations.some((a) => a.status === 'accepted');
    const [reflectionMode, setReflectionMode] = useState(false);

    function openObjectForNew(objId: string) {
        setSelected(objId);
        setEditingId(null);
        setText('');
    }

    function openAnnotationForEdit(aId: string) {
        const a = userAnnotations.find((x) => x.id === aId);
        if (!a) return;
        setSelected(a.objectId);
        setEditingId(a.id);
        setText(a.text);
    }

    function handleSave() {
        if (!user || !selected) return;
        if (isLocked) return;

        if (editingId) {
            saveAnnotation({
                id: editingId,
                setId: set.id,
                objectId: selected,
                userId: user.id,
                text,
                status: 'draft',
                visibility: 'private',
            });
        } else {
            saveAnnotation({
                setId: set.id,
                objectId: selected,
                userId: user.id,
                text,
                status: 'draft',
                visibility: 'private',
            });
        }
        setEditingId(null);
        setText('');
        setVersion((v) => v + 1);
    }

    function handleDelete(aId: string) {
        if (isLocked) return;
        deleteAnnotation(aId);
        setVersion((v) => v + 1);
    }

    function handleRequestReview() {
        if (!user) return;
        requestReviewForUserInSet(user.id, set.id);
        setVersion((v) => v + 1);
    }

    function renderAnnotationPanel(): preact.JSX.Element {
        if (isLocked) {
            return <div class="text-red-600">Review requested — annotations locked.</div>;
        }

        return (
            <div>
                <h3 class="text-lg font-medium mb-2">{editingId ? 'Edit Annotation' : selected ? `New annotation for ${selected}` : 'Select an object to annotate'}</h3>
                {selected && (
                    <div>
                        <textarea
                            class="w-full border rounded p-2 mb-2"
                            value={text}
                            onInput={(e: Event) => setText((e.target as HTMLTextAreaElement).value)}
                        />
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

    return (
        <section class="p-4">
            <h2 class="text-2xl font-semibold">{set.title}</h2>
            <p class="text-sm text-gray-600 mb-4">{set.description}</p>

            <div class="mb-4">
                {hasAccepted ? (
                    <button class="px-2 py-1 bg-indigo-600 text-white rounded" onClick={() => setReflectionMode((v) => !v)}>
                        {reflectionMode ? 'Exit Reflection View' : 'Enter Reflection View'}
                    </button>
                ) : (
                    <span class="text-sm text-gray-500">Create and get at least one accepted annotation to enable Reflection View.</span>
                )}
            </div>

            <div class="grid grid-cols-4 gap-2 mb-6">
                {set.objects.map((o) => (
                    <button
                        class={`border rounded p-3 text-center hover:shadow ${selected === o.id ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => openObjectForNew(o.id)}
                    >
                        {o.type === 'image' ? <img src={o.value} alt="object" /> : <span>{o.value}</span>}
                    </button>
                ))}
            </div>

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
                    {set.objects.map((o) => {
                        const anns = userAnnotations.filter((a) => a.objectId === o.id);
                        if (anns.length === 0) {
                            return (
                                <tr>
                                    <td class="p-2">{o.value}</td>
                                    <td class="p-2" colSpan={3}>
                                        No annotations
                                    </td>
                                </tr>
                            );
                        }
                        return anns.map((a) => (
                            <tr>
                                <td class="p-2 align-top">{o.value}</td>
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

            {reflectionMode ? (
                <section class="bg-gray-50 p-4 rounded">
                    <h3 class="text-lg mb-2">Reflection — visible annotations</h3>
                    <p class="text-sm text-gray-600 mb-4">You are viewing annotations visible to you (public + group if you have an accepted annotation).</p>
                    <table class="min-w-full bg-white border">
                        <thead>
                            <tr class="bg-gray-100 text-left">
                                <th class="p-2">Object</th>
                                <th class="p-2">Annotation</th>
                                <th class="p-2">User</th>
                                <th class="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getVisibleAnnotationsForUserInSet(user.id, set.id).map((a) => {
                                const obj = set.objects.find((o) => o.id === a.objectId);
                                const u = allUsers.find((uu) => uu.id === a.userId);
                                return (
                                    <tr>
                                        <td class="p-2 align-top">{obj ? obj.value : a.objectId}</td>
                                        <td class="p-2 align-top break-words">{a.text}</td>
                                        <td class="p-2 align-top">{u ? u.name : a.userId}</td>
                                        <td class="p-2 align-top">{a.status}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            ) : (
                <>
                    <div class="annotation-panel mb-4">{renderAnnotationPanel()}</div>

                    <div class="set-actions">
                        <button
                            class="px-3 py-2 bg-green-600 text-white rounded"
                            onClick={handleRequestReview}
                            disabled={isLocked || userAnnotations.filter((a) => a.status === 'draft').length === 0}
                        >
                            Request Review for Set
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}

export default SetPage;
