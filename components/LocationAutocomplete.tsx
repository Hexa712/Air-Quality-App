import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Clock, Trash2, X } from 'lucide-react';
import { fetchSuggestions, type GeoResult } from '@/lib/api';
import styles from './LocationAutocomplete.module.css';

interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (result: GeoResult) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    onEnter?: () => void;
}

export default function LocationAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder = "Search location...",
    className = "",
    id,
    onEnter
}: LocationAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
    const [recentSearches, setRecentSearches] = useState<GeoResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const justSelected = useRef(false);

    // Initial load of recent searches
    useEffect(() => {
        const saved = localStorage.getItem('recent_searches');
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch (e) { console.error('Failed to parse recent searches'); }
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (justSelected.current) {
            justSelected.current = false;
            return;
        }

        const timer = setTimeout(async () => {
            if (value.length >= 3) {
                // If the exact value is already in suggestions or it matches a recent search, don't refetch
                const isExactMatch = suggestions.some(s => s.displayName === value) || 
                                   recentSearches.some(s => s.displayName === value);
                
                if (isExactMatch) return;

                setLoading(true);
                try {
                    const results = await fetchSuggestions(value);
                    setSuggestions(results);
                    setShowSuggestions(true);
                } catch (err) {
                    console.error('Suggestions error:', err);
                } finally {
                    setLoading(false);
                }
            } else if (value.length < 3) {
                setSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [value]);

    const handleSelect = (s: GeoResult) => {
        justSelected.current = true;
        onSelect(s);

        // Save to recent searches
        const updated = [s, ...recentSearches.filter(x => x.displayName !== s.displayName)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recent_searches', JSON.stringify(updated));

        setSuggestions([]);
        setShowSuggestions(false);
    };

    const clearRecent = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRecentSearches([]);
        localStorage.removeItem('recent_searches');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (showSuggestions && suggestions.length > 0) {
                setShowSuggestions(false);
            }
            if (onEnter) onEnter();
        }
    };

    const isInputFocused = showSuggestions;

    return (
        <div className={`${styles.container} ${className}`} ref={containerRef}>
            <div className={styles.inputGroup}>
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={placeholder}
                    className={styles.input}
                    autoComplete="off"
                />
                {loading && <Loader2 size={14} className={styles.spin} />}
                {value && !loading && (
                    <button 
                        className={styles.clearSearchBtn} 
                        onClick={() => onChange('')}
                        type="button"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>


            {showSuggestions && (
                <div className={styles.suggestions}>
                    {/* Real-time Suggestions */}
                    {suggestions.length > 0 && suggestions.map((s, i) => (
                        <div key={`sug-${i}`} className={styles.suggestionItem} onClick={() => handleSelect(s)}>
                            <div className={styles.suggestionText}>
                                <span className={styles.name}>{s.displayName}</span>
                            </div>
                        </div>
                    ))}

                    {/* Recent Searches Header */}
                    {value.length < 3 && recentSearches.length > 0 && (
                        <div className={styles.recentHeader}>
                            <div className={styles.recentTitle}>Recent Searches</div>
                            <button className={styles.clearBtn} onClick={clearRecent}>Clear</button>
                        </div>
                    )}

                    {/* Recent Searches Items */}
                    {value.length < 3 && recentSearches.map((s, i) => (
                        <div key={`rec-${i}`} className={styles.suggestionItem} onClick={() => handleSelect(s)}>
                            <div className={styles.suggestionText}>
                                <span className={styles.name}>{s.displayName}</span>
                            </div>
                        </div>
                    ))}

                    {/* Placeholder when nothing is found */}
                    {value.length >= 3 && suggestions.length === 0 && !loading && !recentSearches.some(s => s.displayName === value) && (
                        <div className={styles.noResults}>No locations found</div>
                    )}
                </div>
            )}
        </div>
    );
}
