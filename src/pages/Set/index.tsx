import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import {
    getSetById,
    getUserAnnotationForObject,
    saveAnnotation,
    requestReviewForUserInSet,
    getUserAnnotationsForSet,
    deleteAnnotation,
} from '../../dataStore';
import { useUser } from '../../UserContext';

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

    function openObjectForNew(objId: string) {
        setSelected(objId);
        setEditingId(null);
        setText('');
    }

    function openAnnotationForEdit(aId: string) {
        const a = getUserAnnotationForObject(user.id, set.id, aId) || userAnnotations.find((x) => x.id === aId);
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

    return (
        <section>
            <h2>{set.title}</h2>
            <p>{set.description}</p>

            <div>
                {set.objects.map((o) => (
                    <button onClick={() => openObjectForNew(o.id)}>
                        {o.type === 'image' ? <img src={o.value} alt="object" /> : <span>{o.value}</span>}
                    </button>
                ))}
            </div>

            <h3>Your annotations for this set</h3>
            <table>
                <thead>
                    <tr>
                        <th>Object</th>
                        <th>Annotation</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {set.objects.map((o) => {
                        const anns = userAnnotations.filter((a) => a.objectId === o.id);
                        if (anns.length === 0) {
                            return (
                                <tr>
                                    <td>{o.value}</td>
                                    <td colSpan={3}>No annotations</td>
                                </tr>
                            );
                        }
                        return anns.map((a) => (
                            <tr>
                                <td>{o.value}</td>
                                <td>{a.text}</td>
                                <td>{a.status}</td>
                                <td>
                                    <button disabled={isLocked} onClick={() => openAnnotationForEdit(a.id)}>
                                        Edit
                                    </button>
                                    <button disabled={isLocked} onClick={() => handleDelete(a.id)}>
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ));
                    })}
                </tbody>
            </table>

            <div>
                {isLocked ? (
                    <div>Review requested — annotations locked.</div>
                ) : (
                    <div>
                        <h3>{editingId ? 'Edit Annotation' : selected ? `New annotation for ${selected}` : 'Select an object to annotate'}</h3>
                        {selected && (
                            <div>
                                <textarea value={text} onInput={(e: Event) => setText((e.target as HTMLTextAreaElement).value)} />
                                <div>
                                    <button onClick={handleSave} disabled={!text.trim()}>
                                        {editingId ? 'Save Changes' : 'Save Draft'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <button onClick={handleRequestReview} disabled={isLocked || userAnnotations.filter((a) => a.status === 'draft').length === 0}>
                    Request Review for Set
                </button>
            </div>
        </section>
    );
}

export default SetPage;
