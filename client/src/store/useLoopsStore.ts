import { create } from 'zustand';
import { api, InitData, LoopFullData, Channel } from '@/lib/api';

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
    loopCache: Map<string, LoopFullData>; // Cache loops for instant switching
    activeChannel: Channel | null;
    isLoading: boolean;
    isLoopLoading: boolean;

    // Computed
    allLoops: () => Array<{ id: string; name: string; role: string }>;

    // Actions
    fetchLoops: () => Promise<void>;
    selectLoop: (name: string, forceRefresh?: boolean) => Promise<void>;
    prefetchLoop: (name: string) => void;
    setActiveChannel: (channel: Channel) => void;
    clearSelectedLoop: () => void;
    invalidate: () => void;
    updateLoopCache: (name: string, data: LoopFullData) => void;
}

export const useLoopsStore = create<LoopsState>((set, get) => ({
    // Initial state
    ownedLoops: [],
    joinedLoops: [],
    selectedLoop: null,
    loopCache: new Map(),
    activeChannel: null,
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

    // Select and load a specific loop with caching
    selectLoop: async (name: string, forceRefresh = false) => {
        const { loopCache } = get();
        
        // Check cache first for instant switching
        const cached = loopCache.get(name);
        if (cached && !forceRefresh) {
            set({ 
                selectedLoop: cached, 
                activeChannel: cached.active_channel || null,
                isLoopLoading: false 
            });
            
            // Background refresh to get latest messages
            api.getLoopFull(name).then(loop => {
                get().updateLoopCache(name, loop);
                // Only update if still viewing this loop
                if (get().selectedLoop?.name === name) {
                    set({ selectedLoop: loop, activeChannel: loop.active_channel || null });
                }
            }).catch(() => {});
            
            return;
        }
        
        set({ isLoopLoading: true });
        try {
            const loop = await api.getLoopFull(name);
            get().updateLoopCache(name, loop);
            set({ 
                selectedLoop: loop, 
                activeChannel: loop.active_channel || null,
                isLoopLoading: false 
            });
        } catch (err) {
            console.error('Failed to load loop:', err);
            set({ isLoopLoading: false });
            throw err;
        }
    },

    // Update loop cache
    updateLoopCache: (name: string, data: LoopFullData) => {
        const { loopCache } = get();
        const newCache = new Map(loopCache);
        newCache.set(name, data);
        set({ loopCache: newCache });
    },

    // Set active channel
    setActiveChannel: (channel: Channel) => {
        set({ activeChannel: channel });
    },

    // Prefetch loop data on hover (non-blocking)
    prefetchLoop: (name: string) => {
        const { loopCache } = get();
        if (loopCache.has(name)) return;
        
        api.prefetchLoop(name);
        // Also try to cache it
        api.getLoopFull(name).then(loop => {
            get().updateLoopCache(name, loop);
        }).catch(() => {});
    },

    // Clear selected loop
    clearSelectedLoop: () => {
        set({ selectedLoop: null, activeChannel: null });
    },

    // Invalidate and refetch
    invalidate: () => {
        set({ ownedLoops: [], joinedLoops: [], isLoading: true, loopCache: new Map() });
        get().fetchLoops();
    },
}));

// Selector hooks for optimized re-renders
export const useOwnedLoops = () => useLoopsStore((state) => state.ownedLoops);
export const useJoinedLoops = () => useLoopsStore((state) => state.joinedLoops);
export const useSelectedLoop = () => useLoopsStore((state) => state.selectedLoop);
export const useLoopsLoading = () => useLoopsStore((state) => state.isLoading);
export const useActiveChannel = () => useLoopsStore((state) => state.activeChannel);
