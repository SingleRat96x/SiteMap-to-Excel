import { ReactNode } from 'react';

export interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: string;
}

export interface FilterOptions {
    keyword: string;
    regex: string;
    excludeKeyword: string;
    excludeRegex: string;
}

export interface AppState {
    urls: SitemapUrl[];
    filteredUrls: SitemapUrl[];
    isLoading: boolean;
    error: ReactNode | null;
    filterOptions: FilterOptions;
}

export interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyFilter: (options: FilterOptions) => void;
    currentOptions: FilterOptions;
    urls: SitemapUrl[];
} 