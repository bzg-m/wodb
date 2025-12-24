import type { Annotation, WODBSet } from '../../../../common/model.js';

export async function loadAdminAnnotations(
    fetchSets: () => Promise<WODBSet[]>,
    fetchAllAnnotationsForSet: (setId: string) => Promise<Annotation[]>
): Promise<{ sets: WODBSet[]; pending: Annotation[]; accepted: Annotation[] }> {
    const sets = await fetchSets();
    const pending: Annotation[] = [];
    const accepted: Annotation[] = [];
    for (const set of sets) {
        try {
            const anns = await fetchAllAnnotationsForSet(set.id);
            for (const a of anns) {
                if (a.status === 'pending') pending.push(a);
                if (a.status === 'accepted') accepted.push(a);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            // Ignore per-set failures and continue aggregating annotations for
            // other sets.
        }
    }
    return { sets, pending, accepted };
}

export default loadAdminAnnotations;
