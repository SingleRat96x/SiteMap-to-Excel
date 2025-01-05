import { parseString } from 'xml2js';
import { SitemapUrl, FilterOptions } from '../types';
import * as XLSX from 'xlsx';
import pako from 'pako';

declare global {
    interface Window {
        pako: typeof pako;
    }
}

const COMMON_SITEMAP_PATHS = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap/sitemap.xml',
    '/sitemaps/sitemap.xml',
    '/wp-sitemap.xml', // WordPress
    '/sitemap/index.xml'
];

async function findSitemapUrlFromRobotsTxt(baseUrl: string): Promise<string | null> {
    try {
        const robotsUrl = `${baseUrl}/robots.txt`;
        console.log('Checking robots.txt at:', robotsUrl);
        
        const response = await fetch(robotsUrl);
        if (!response.ok) {
            console.log('No robots.txt found');
            return null;
        }

        const text = await response.text();
        const sitemapMatch = text.match(/^Sitemap:\s*(.+)$/im);
        
        if (sitemapMatch && sitemapMatch[1]) {
            const sitemapUrl = sitemapMatch[1].trim();
            console.log('Found sitemap in robots.txt:', sitemapUrl);
            return sitemapUrl;
        }
        
        console.log('No sitemap directive found in robots.txt');
        return null;
    } catch (error) {
        console.log('Error checking robots.txt:', error);
        return null;
    }
}

async function tryFetchSitemap(url: string): Promise<Response | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'text/xml, application/xml, application/gzip',
                'User-Agent': 'Mozilla/5.0 (compatible; SitemapFetcher/1.0)'
            }
        });
        
        if (response.ok) {
            return response;
        }
        return null;
    } catch (error) {
        console.log(`Error fetching ${url}:`, error);
        return null;
    }
}

export async function fetchSitemap(
    url: string,
    onProgress?: (status: string, progress: number) => void
): Promise<SitemapUrl[]> {
    try {
        console.log('Starting sitemap fetch for:', url);

        // Normalize the URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            console.log('Modified URL with https:', url);
            onProgress?.('Adding https protocol...', 10);
        }

        // First try the direct URL if it looks like a sitemap
        if (url.includes('sitemap') && url.endsWith('.xml')) {
            console.log('Trying direct sitemap URL:', url);
            onProgress?.('Fetching sitemap...', 20);
            const response = await tryFetchSitemap(url);
            if (response) {
                console.log('Successfully fetched sitemap from direct URL');
                return processSitemapResponse(response, onProgress);
            }
        }

        // If direct URL fails or isn't a sitemap URL, try to find the sitemap
        const baseUrl = url.replace(/\/(sitemap.*\.xml)?$/, '');
        console.log('Base URL:', baseUrl);
        onProgress?.('Detecting sitemap location...', 30);

        // First try robots.txt
        const sitemapFromRobots = await findSitemapUrlFromRobotsTxt(baseUrl);
        if (sitemapFromRobots) {
            const response = await tryFetchSitemap(sitemapFromRobots);
            if (response) {
                console.log('Successfully found sitemap from robots.txt');
                return processSitemapResponse(response, onProgress);
            }
        }

        // Try common sitemap locations
        onProgress?.('Checking common sitemap locations...', 40);
        for (const path of COMMON_SITEMAP_PATHS) {
            const sitemapUrl = `${baseUrl}${path}`;
            console.log('Trying sitemap location:', sitemapUrl);
            
            const response = await tryFetchSitemap(sitemapUrl);
            if (response) {
                console.log('Successfully found sitemap at:', sitemapUrl);
                return processSitemapResponse(response, onProgress);
            }
        }

        throw new Error('Could not find sitemap. Please check the URL and try again.');
    } catch (error: unknown) {
        console.error('Sitemap fetch error:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch sitemap: ${error.message}`);
        }
        throw new Error('Failed to fetch sitemap: Unknown error');
    }
}

async function processSitemapResponse(
    response: Response,
    onProgress?: (status: string, progress: number) => void
): Promise<SitemapUrl[]> {
    try {
        onProgress?.('Reading sitemap content...', 40);
        const contentType = response.headers.get('content-type');
        console.log('Content type:', contentType);
        let xmlText: string;

        if (contentType?.includes('gzip')) {
            console.log('Processing gzipped content');
            onProgress?.('Decompressing gzipped content...', 50);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const gunzipped = pako.ungzip(uint8Array);
            xmlText = new TextDecoder().decode(gunzipped);
        } else {
            console.log('Processing plain text content');
            xmlText = await response.text();
        }

        console.log('XML content length:', xmlText.length);
        console.log('First 200 characters of XML:', xmlText.substring(0, 200));

        onProgress?.('Parsing XML content...', 60);
        return new Promise((resolve, reject) => {
            parseString(xmlText, (err: Error | null, result: any) => {
                if (err) {
                    console.error('XML parsing error:', err);
                    reject(err);
                    return;
                }

                console.log('XML parsed successfully');
                onProgress?.('Extracting URLs...', 80);

                try {
                    const urls: SitemapUrl[] = [];
                    if (result?.urlset?.url) {
                        console.log('Number of URLs found:', result.urlset.url.length);
                        result.urlset.url.forEach((urlData: any) => {
                            if (urlData?.loc?.[0]) {
                                urls.push({
                                    loc: urlData.loc[0],
                                    lastmod: urlData.lastmod?.[0],
                                    changefreq: urlData.changefreq?.[0],
                                    priority: urlData.priority?.[0]
                                });
                            }
                        });
                    } else if (result?.sitemapindex?.sitemap) {
                        // This is a sitemap index file
                        console.log('Found sitemap index with', result.sitemapindex.sitemap.length, 'sitemaps');
                        throw new Error('Multiple sitemaps found. Please use one of these URLs:\n' + 
                            result.sitemapindex.sitemap
                                .map((sitemap: any) => sitemap.loc[0])
                                .join('\n'));
                    } else {
                        console.log('No urlset or sitemap index found in XML:', Object.keys(result));
                        throw new Error('Invalid sitemap format: no URLs found');
                    }

                    console.log('Successfully extracted URLs:', urls.length);
                    onProgress?.('Processing complete', 90);
                    resolve(urls);
                } catch (parseError) {
                    console.error('Error processing URLs:', parseError);
                    reject(parseError);
                }
            });
        });
    } catch (error) {
        console.error('Error processing sitemap response:', error);
        throw error;
    }
}

export function filterUrls(urls: SitemapUrl[], options: FilterOptions): SitemapUrl[] {
    console.log('Filtering URLs with options:', options);
    console.log('Total URLs before filtering:', urls.length);

    if (!options.keyword && !options.regex && !options.excludeKeyword && !options.excludeRegex) {
        console.log('No filters applied, returning all URLs');
        return urls;
    }

    const filteredUrls = urls.filter(url => {
        const urlString = url.loc.toLowerCase();
        let matchesKeyword = true;
        let matchesRegex = true;
        let passesExcludeKeyword = true;
        let passesExcludeRegex = true;

        // Include keyword filtering
        if (options.keyword) {
            const keywords = options.keyword.toLowerCase().split(' ').filter(k => k.length > 0);
            matchesKeyword = keywords.every(keyword => urlString.includes(keyword));
        }

        // Include regex filtering
        if (options.regex) {
            try {
                const regex = new RegExp(options.regex, 'i');
                matchesRegex = regex.test(url.loc);
            } catch (error) {
                console.error('Invalid include regex pattern:', error);
                matchesRegex = true;
            }
        }

        // Exclude keyword filtering
        if (options.excludeKeyword) {
            const excludeKeywords = options.excludeKeyword.toLowerCase().split(' ').filter(k => k.length > 0);
            passesExcludeKeyword = !excludeKeywords.some(keyword => urlString.includes(keyword));
        }

        // Exclude regex filtering
        if (options.excludeRegex) {
            try {
                const regex = new RegExp(options.excludeRegex, 'i');
                passesExcludeRegex = !regex.test(url.loc);
            } catch (error) {
                console.error('Invalid exclude regex pattern:', error);
                passesExcludeRegex = true;
            }
        }

        return matchesKeyword && matchesRegex && passesExcludeKeyword && passesExcludeRegex;
    });

    console.log('Total URLs after filtering:', filteredUrls.length);
    return filteredUrls;
}

export function exportToXLSX(urls: SitemapUrl[]): void {
    const worksheet = XLSX.utils.aoa_to_sheet([
        ['URL', 'Last Modified', 'Change Frequency', 'Priority'],
        ...urls.map(url => [
            url.loc,
            url.lastmod || '',
            url.changefreq || '',
            url.priority || ''
        ])
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sitemap URLs');

    const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
        url: url,
        filename: 'sitemap_urls.xlsx',
        saveAs: true
    });
} 