import { create } from 'zustand';
import { api, InitData, LoopFullData } from '@/lib/api';

interface LoopProject {
    id: string;
    name: string;
    github_repo_id: number;
    created_at: string;
}

interface LoopMembership {
    loop_id: string;
    loop_name: string;
    role: string;
    joined_at: string;
}

interface LoopsState {
    // State
    ownedLoops: LoopProject[];
    joinedLoops: LoopMembership[];
    selectedLoop: LoopFullData | null;
    isLoading: boolean;
    isLoopLoading: boolean;

    // Computed
    allLoops: () => Array<{ id: string; name: string; role: string }>;

    // Actions
    fetchLoops: () => Promise<void>;
    selectLoop: (name: string) => Promise<void>;
    prefetchLoop: (name: string) => void;
    clearSelectedLoop: () => void;
    invalidate: () => void;
}

export const useLoopsStore = create<LoopsState>((set, get) => ({
    // Initial state
    ownedLoops: [],
    joinedLoops: [],
    selectedLoop: null,
    isLoading: true,
    isLoopLoading: false,

    // Computed: combine owned and joined into unified list
    allLoops: () => {
        const { ownedLoops, joinedLoops } = get();
        const owned = ownedLoops.map(p => ({ id: p.id, name: p.name, role: 'owner' }));
        const joined = joinedLoops
            .filter(m => !ownedLoops.some(p => p.name === m.loop_name))
            .map(m => ({ id: m.loop_id, name: m.loop_name, role: m.role }));
        return [...owned, ...joined];
    },

    // Fetch all loops (owned + memberships)
    fetchLoops: async () => {
        set({ isLoading: true });
        try {
            const data: InitData = await api.getInit();
            set({
                ownedLoops: data.projects || [],
                joinedLoops: data.memberships || [],
                isLoading: false,
            });
        } catch (err) {
            console.error('Failed to fetch loops:', err);
            set({ isLoading: false });
        }
    },

    // Select and load a specific loop
    selectLoop: async (name: string) => {
        set({ isLoopLoading: true });
        try {
            const loop = await api.getLoopFull(name);
            set({ selectedLoop: loop, isLoopLoading: false });
        } catch (err) {
            console.error('Failed to load loop:', err);
            set({ isLoopLoading: false });
            throw err;
        }
    },

    // Prefetch loop data on hover (non-blocking)
    prefetchLoop: (name: string) => {
        api.prefetchLoop(name);
    },

    // Clear selected loop
    clearSelectedLoop: () => {
        set({ selectedLoop: null });
    },

    // Invalidate and refetch
    invalidate: () => {
        set({ ownedLoops: [], joinedLoops: [], isLoading: true });
        get().fetchLoops();
    },
}));

// Selector hooks for optimized re-renders
export const useOwnedLoops = () => useLoopsStore((state) => state.ownedLoops);
export const useJoinedLoops = () => useLoopsStore((state) => state.joinedLoops);
export const useSelectedLoop = () => useLoopsStore((state) => state.selectedLoop);
export const useLoopsLoading = () => useLoopsStore((state) => state.isLoading);
