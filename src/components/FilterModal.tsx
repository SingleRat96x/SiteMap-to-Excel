import React, { useState, useEffect } from 'react';
import { FilterModalProps, FilterOptions } from '../types';
import { filterUrls } from '../utils/sitemapUtils';

export function FilterModal({ isOpen, onClose, onApplyFilter, currentOptions, urls }: FilterModalProps) {
    const [keyword, setKeyword] = useState(currentOptions.keyword);
    const [regex, setRegex] = useState(currentOptions.regex);
    const [excludeKeyword, setExcludeKeyword] = useState(currentOptions.excludeKeyword);
    const [excludeRegex, setExcludeRegex] = useState(currentOptions.excludeRegex);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isRegexValid, setIsRegexValid] = useState(true);
    const [isExcludeRegexValid, setIsExcludeRegexValid] = useState(true);
    const [totalMatches, setTotalMatches] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setKeyword(currentOptions.keyword);
            setRegex(currentOptions.regex);
            setExcludeKeyword(currentOptions.excludeKeyword);
            setExcludeRegex(currentOptions.excludeRegex);
            setError(null);
            updatePreview(
                currentOptions.keyword,
                currentOptions.regex,
                currentOptions.excludeKeyword,
                currentOptions.excludeRegex
            );
        }
    }, [isOpen, currentOptions]);

    const updatePreview = (
        newKeyword: string,
        newRegex: string,
        newExcludeKeyword: string,
        newExcludeRegex: string
    ) => {
        try {
            console.log('Updating preview with:', {
                keyword: newKeyword,
                regex: newRegex,
                excludeKeyword: newExcludeKeyword,
                excludeRegex: newExcludeRegex
            });
            const filteredUrls = filterUrls(urls, {
                keyword: newKeyword,
                regex: newRegex,
                excludeKeyword: newExcludeKeyword,
                excludeRegex: newExcludeRegex
            });
            setPreviewUrls(filteredUrls.map(url => url.loc).slice(0, 10));
            setTotalMatches(filteredUrls.length);
            setError(null);
        } catch (error) {
            console.error('Error updating preview:', error);
            setError(error instanceof Error ? error.message : 'An error occurred while filtering');
            setPreviewUrls([]);
            setTotalMatches(0);
        }
    };

    const handleKeywordChange = (value: string) => {
        setKeyword(value);
        updatePreview(value, regex, excludeKeyword, excludeRegex);
    };

    const handleRegexChange = (value: string) => {
        setRegex(value);
        try {
            if (value) {
                new RegExp(value);
                setIsRegexValid(true);
                updatePreview(keyword, value, excludeKeyword, excludeRegex);
            } else {
                setIsRegexValid(true);
                updatePreview(keyword, '', excludeKeyword, excludeRegex);
            }
        } catch {
            setIsRegexValid(false);
            setError('Invalid include regex pattern');
        }
    };

    const handleExcludeKeywordChange = (value: string) => {
        setExcludeKeyword(value);
        updatePreview(keyword, regex, value, excludeRegex);
    };

    const handleExcludeRegexChange = (value: string) => {
        setExcludeRegex(value);
        try {
            if (value) {
                new RegExp(value);
                setIsExcludeRegexValid(true);
                updatePreview(keyword, regex, excludeKeyword, value);
            } else {
                setIsExcludeRegexValid(true);
                updatePreview(keyword, regex, excludeKeyword, '');
            }
        } catch {
            setIsExcludeRegexValid(false);
            setError('Invalid exclude regex pattern');
        }
    };

    const handleApply = () => {
        if (!isRegexValid || !isExcludeRegexValid) {
            setError('Cannot apply filter with invalid regex pattern');
            return;
        }
        onApplyFilter({ keyword, regex, excludeKeyword, excludeRegex });
        onClose();
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && isRegexValid && isExcludeRegexValid) {
            handleApply();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[380px] max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex-none px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-base font-bold text-gray-800">Filter URLs</h2>
                        <button
                            onClick={onClose}
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Include Filters Section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-800 pb-1 border-b border-gray-200">
                            Include Filters
                        </h3>
                        {/* Include Keyword Filter */}
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">
                                Include Keywords
                                <span className="text-gray-400 text-xs ml-1 font-normal">
                                    (space-separated)
                                </span>
                            </label>
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => handleKeywordChange(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                                placeholder="Enter keywords to include..."
                            />
                        </div>

                        {/* Include Regex Filter */}
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">
                                Include Regex Pattern
                                <span className="text-gray-400 text-xs ml-1 font-normal">
                                    (case-insensitive)
                                </span>
                            </label>
                            <input
                                type="text"
                                value={regex}
                                onChange={(e) => handleRegexChange(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className={`w-full px-3 py-1.5 text-xs bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 ${
                                    isRegexValid ? 'border-gray-300' : 'border-red-300 bg-red-50'
                                }`}
                                placeholder="Enter regex pattern to include..."
                            />
                            {!isRegexValid && (
                                <p className="text-xs text-red-600 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Invalid include regex pattern
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Exclude Filters Section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-800 pb-1 border-b border-gray-200">
                            Exclude Filters
                        </h3>
                        {/* Exclude Keyword Filter */}
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">
                                Exclude Keywords
                                <span className="text-gray-400 text-xs ml-1 font-normal">
                                    (space-separated)
                                </span>
                            </label>
                            <input
                                type="text"
                                value={excludeKeyword}
                                onChange={(e) => handleExcludeKeywordChange(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                                placeholder="Enter keywords to exclude..."
                            />
                        </div>

                        {/* Exclude Regex Filter */}
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">
                                Exclude Regex Pattern
                                <span className="text-gray-400 text-xs ml-1 font-normal">
                                    (case-insensitive)
                                </span>
                            </label>
                            <input
                                type="text"
                                value={excludeRegex}
                                onChange={(e) => handleExcludeRegexChange(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className={`w-full px-3 py-1.5 text-xs bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 ${
                                    isExcludeRegexValid ? 'border-gray-300' : 'border-red-300 bg-red-50'
                                }`}
                                placeholder="Enter regex pattern to exclude..."
                            />
                            {!isExcludeRegexValid && (
                                <p className="text-xs text-red-600 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Invalid exclude regex pattern
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-xs text-red-600 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Preview Section */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-medium text-gray-700">Preview</h3>
                            {totalMatches > 0 && (
                                <span className="text-[10px] text-gray-500">
                                    Showing {Math.min(previewUrls.length, 10)} of {totalMatches} matches
                                </span>
                            )}
                        </div>
                        <div className="bg-gray-50 rounded-md border border-gray-200">
                            <div className="max-h-[150px] overflow-y-auto p-2">
                                {previewUrls.length > 0 ? (
                                    <ul className="space-y-1">
                                        {previewUrls.map((url, index) => (
                                            <li 
                                                key={index}
                                                className="text-xs text-gray-600 hover:text-gray-900 truncate transition-colors"
                                                title={url}
                                            >
                                                {url}
                                            </li>
                                        ))}
                                        {totalMatches > 10 && (
                                            <li className="text-[10px] text-gray-400 italic pt-1 border-t border-gray-200">
                                                ...and {totalMatches - 10} more matches
                                            </li>
                                        )}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-500 text-center py-2">
                                        {error ? 'Preview unavailable' : 'No matches found'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-none px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:shadow-sm transition-all duration-200 active:transform active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={!isRegexValid || !isExcludeRegexValid || !!error}
                            className={`px-4 py-1.5 text-xs font-medium text-white rounded-md transition-all duration-200 ${
                                isRegexValid && isExcludeRegexValid && !error
                                    ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-sm active:transform active:scale-95'
                                    : 'bg-blue-300 cursor-not-allowed'
                            }`}
                        >
                            Apply Filter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 