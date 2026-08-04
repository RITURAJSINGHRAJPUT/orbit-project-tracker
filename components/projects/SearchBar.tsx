'use client';

import { useState, useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { FilterSheet } from './FilterSheet';
import { motion, AnimatePresence } from 'framer-motion';

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useProjectStore();
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2 px-4 py-3">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--muted)' }}
          />
          <input
            id="project-search"
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-10 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: 'var(--muted-bg)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-inter), sans-serif',
            }}
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--muted)' }}
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Filter button */}
        <button
          id="filter-button"
          onClick={() => setFilterOpen(true)}
          className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: 'var(--muted-bg)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
    </>
  );
}
