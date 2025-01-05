import React, { useState, useEffect } from 'react';
import { FilterModal } from '../components/FilterModal';
import { SitemapUrl, FilterOptions, AppState } from '../types';
import { fetchSitemap, filterUrls, exportToXLSX } from '../utils/sitemapUtils';

const initialState: AppState = {
    urls: [],
    filteredUrls: [],
    isLoading: false,
    error: null,
    filterOptions: {
        keyword: '',
        regex: '',
        excludeKeyword: '',
        excludeRegex: ''
    }
};

// Load state from storage
const loadState = async (): Promise<AppState> => {
    const result = await chrome.storage.local.get('sitemapState');
    return result.sitemapState || initialState;
};

// Save state to storage
const saveState = async (state: AppState) => {
    await chrome.storage.local.set({ sitemapState: state });
};

export function Popup() {
    const [state, setState] = useState<AppState>(initialState);
    const [url, setUrl] = useState('');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');

    // Load saved state on mount
    useEffect(() => {
        loadState().then(savedState => {
            setState(savedState);
            if (savedState.urls.length > 0) {
                // Extract domain from the last fetched URL
                const match = savedState.urls[0].loc.match(/^https?:\/\/([^/]+)/);
                if (match) {
                    setUrl(match[1]);
                }
            }
        });
    }, []);

    // Save state whenever it changes
    useEffect(() => {
        saveState(state);
    }, [state]);

    const handleReset = () => {
        setState(initialState);
        setUrl('');
        setProgress(0);
        setStatusMessage('');
    };

    const handleFetch = async () => {
        if (!url) {
            setState(prev => ({ ...prev, error: 'Please enter a URL' }));
            return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));
        setProgress(0);
        setStatusMessage('Initializing...');

        try {
            const urls = await fetchSitemap(url, (status: string, currentProgress: number) => {
                setStatusMessage(status);
                setProgress(currentProgress);
            });

            // Reset any existing filters when new URLs are fetched
            setState(prev => ({
                ...prev,
                urls,
                filteredUrls: urls,
                isLoading: false,
                filterOptions: {
                    keyword: '',
                    regex: '',
                    excludeKeyword: '',
                    excludeRegex: ''
                }
            }));
            setProgress(100);
            setStatusMessage('Complete!');

            setTimeout(() => {
                setProgress(0);
                setStatusMessage('');
            }, 1000);

        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            }));
            setProgress(0);
            setStatusMessage('');
        }
    };

    const handleFilterApply = (options: FilterOptions) => {
        console.log('Applying filter with options:', options);
        const filteredUrls = filterUrls(state.urls, options);
        console.log('Filtered URLs count:', filteredUrls.length);
        
        setState(prev => ({
            ...prev,
            filteredUrls,
            filterOptions: options
        }));
    };

    const handleExport = () => {
        if (state.filteredUrls.length === 0) {
            setState(prev => ({ ...prev, error: 'No URLs to export' }));
            return;
        }
        exportToXLSX(state.filteredUrls);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !state.isLoading) {
            handleFetch();
        }
    };

    return (
        <div className="w-[400px] h-[500px] bg-white flex flex-col overflow-hidden">
            {/* Header Section */}
            <div className="flex-none px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-lg font-bold text-gray-800">Sitemap to XLSX</h1>
                    <div className="flex items-center space-x-2">
                        {state.urls.length > 0 && (
                            <div className="text-xs text-gray-600">
                                {state.filteredUrls.length} URLs
                                {state.filteredUrls.length !== state.urls.length && (
                                    <span className="text-gray-500">
                                        {' '}/ {state.urls.length} total
                                    </span>
                                )}
                            </div>
                        )}
                        {state.urls.length > 0 && (
                            <button
                                onClick={handleReset}
                                className="p-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Reset all data"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter website or sitemap URL"
                            className="flex-1 px-3 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                        />
                        <button
                            onClick={handleFetch}
                            disabled={state.isLoading}
                            className={`px-4 py-1.5 text-sm text-white font-medium rounded-lg transition-all duration-200 ${
                                state.isLoading
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:transform active:scale-95'
                            }`}
                        >
                            {state.isLoading ? 'Fetching...' : 'Fetch'}
                        </button>
                    </div>

                    {state.isLoading && (
                        <div className="space-y-1">
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            {statusMessage && (
                                <p className="text-xs text-gray-600 text-center">{statusMessage}</p>
                            )}
                        </div>
                    )}

                    {state.error && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-600">{state.error}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            {state.urls.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Filter Bar */}
                    <div className="flex-none px-4 py-2 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 mr-2">
                                {(state.filterOptions.keyword || state.filterOptions.regex || 
                                  state.filterOptions.excludeKeyword || state.filterOptions.excludeRegex) && (
                                    <div className="flex flex-wrap gap-1 text-xs">
                                        <span className="text-gray-500 py-0.5">Filters:</span>
                                        {state.filterOptions.keyword && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                include: {state.filterOptions.keyword}
                                            </span>
                                        )}
                                        {state.filterOptions.regex && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                                regex: {state.filterOptions.regex}
                                            </span>
                                        )}
                                        {state.filterOptions.excludeKeyword && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800">
                                                exclude: {state.filterOptions.excludeKeyword}
                                            </span>
                                        )}
                                        {state.filterOptions.excludeRegex && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                                                exclude regex: {state.filterOptions.excludeRegex}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                                <button
                                    onClick={() => setIsFilterModalOpen(true)}
                                    className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:shadow-sm transition-all duration-200 active:transform active:scale-95"
                                >
                                    Filter
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 hover:shadow-sm transition-all duration-200 active:transform active:scale-95"
                                >
                                    Export XLSX
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* URL List */}
                    <div className="flex-1 overflow-hidden bg-white p-4">
                        <div className="h-full overflow-y-auto space-y-1 pr-1">
                            {state.filteredUrls.slice(0, 100).map((url, index) => (
                                <div
                                    key={index}
                                    className="group relative py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors duration-150"
                                >
                                    <p className="text-xs text-gray-600 truncate group-hover:text-gray-900">
                                        {url.loc}
                                    </p>
                                    {url.lastmod && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            Last modified: {new Date(url.lastmod).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {state.filteredUrls.length > 100 && (
                                <div className="text-xs text-gray-500 italic py-1.5 px-2">
                                    ...and {state.filteredUrls.length - 100} more
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApplyFilter={handleFilterApply}
                currentOptions={state.filterOptions}
                urls={state.urls}
            />
        </div>
    );
} 