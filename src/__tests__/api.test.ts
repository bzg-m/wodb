import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create hoisted mocks so they can be referenced inside the vi.mock factory safely
const mocks = vi.hoisted(() => {
  return {
    getSets: vi.fn(() => [{ id: 'set1', title: 'Set 1', description: '', objects: [] }]),
    saveAnnotation: vi.fn((a: any) => ({ id: 'm1', ...a })),
    getVisible: vi.fn((userId: string, setId: string) => []),
    getUserAnnotations: vi.fn((userId: string, setId: string) => []),
    deleteAnnotation: vi.fn(() => true),
    requestReviewForUserInSet: vi.fn(() => []),
    setAnnotationVisibility: vi.fn((id: string, v: any) => ({ id, visibility: v })),
    setAnnotationStatus: vi.fn((id: string, s: any) => ({ id, status: s })),
  } as const;
});

vi.mock('../dataStore', () => ({
  getSets: mocks.getSets,
  getSetById: (id: string) => ({ id, title: 'Set 1', description: '', objects: [] }),
  getAnnotationsForSet: (setId: string) => [],
  getUserAnnotationsForSet: mocks.getUserAnnotations,
  saveAnnotation: mocks.saveAnnotation,
  deleteAnnotation: mocks.deleteAnnotation,
  requestReviewForUserInSet: mocks.requestReviewForUserInSet,
  getVisibleAnnotationsForUserInSet: mocks.getVisible,
  setAnnotationVisibility: mocks.setAnnotationVisibility,
  setAnnotationStatus: mocks.setAnnotationStatus,
}));

import * as api from '../api';

describe('api shim (delegation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchSets delegates to dataStore.getSets', async () => {
    const sets = await api.fetchSets();
    expect(mocks.getSets).toHaveBeenCalled();
    expect(Array.isArray(sets)).toBe(true);
  });

  it('createOrUpdateAnnotation delegates to dataStore.saveAnnotation', async () => {
    const payload = { setId: 'set1', objectId: 'o1', userId: 'u1', text: 'x', status: 'draft', visibility: 'private' };
    const res = await api.createOrUpdateAnnotation(payload as any);
    expect(mocks.saveAnnotation).toHaveBeenCalledWith(payload);
    expect(res.id).toBeTruthy();
  });

  it('fetchVisibleAnnotationsForUserInSet delegates to dataStore.getVisibleAnnotationsForUserInSet', async () => {
    await api.fetchVisibleAnnotationsForUserInSet('u1', 'set1');
    expect(mocks.getVisible).toHaveBeenCalledWith('u1', 'set1');
  });
});
