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
        onProgress?.('Initializing...', 10);

        // Step 1: URL Normalization
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }
        // Remove trailing slashes but keep the path
        normalizedUrl = normalizedUrl.replace(/\/+$/, '');
        console.log('Normalized URL:', normalizedUrl);

        // Function to try fetching a URL with proper headers
        async function tryFetchUrl(urlToTry: string): Promise<Response | null> {
            try {
                console.log('Attempting to fetch:', urlToTry);
                const response = await fetch(urlToTry, {
                    headers: {
                        'Accept': 'text/xml, application/xml, application/gzip, text/plain, */*',
                        'User-Agent': 'Mozilla/5.0 (compatible; SitemapFetcher/1.0)',
                        'Accept-Encoding': 'gzip, deflate'
                    }
                });
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    console.log('Response status:', response.status, 'Content-Type:', contentType);
                    return response;
                }
                console.log('Failed to fetch URL:', urlToTry, 'Status:', response.status);
                return null;
            } catch (error) {
                console.log('Error fetching URL:', urlToTry, error);
                return null;
            }
        }

        let response: Response | null = null;

        // Step 2: Try direct URL first
        onProgress?.('Trying direct URL...', 20);
        response = await tryFetchUrl(normalizedUrl);

        // Step 3: If direct URL fails and doesn't end with .xml, try with .xml extension
        if (!response && !normalizedUrl.endsWith('.xml')) {
            onProgress?.('Trying with .xml extension...', 30);
            response = await tryFetchUrl(normalizedUrl + '.xml');
        }

        // Step 4: Try common variations if still no response
        if (!response) {
            const baseUrl = new URL(normalizedUrl).origin;
            const variations = [
                '/sitemap.xml',
                '/sitemap_index.xml',
                '/sitemap/sitemap.xml',
                '/sitemaps/sitemap.xml',
                '/wp-sitemap.xml',
                '/sitemap/index.xml',
                '/sitemap/SiteTree.xml',
                '/sitemap/SiteTree/1.xml',
                '/sitemap/SiteTree/1',
                '/post-sitemap.xml',
                '/page-sitemap.xml',
                '/product-sitemap.xml',
                '/category-sitemap.xml'
            ];

            onProgress?.('Checking common sitemap locations...', 40);
            for (const variation of variations) {
                response = await tryFetchUrl(baseUrl + variation);
                if (response) {
                    console.log('Found sitemap at variation:', variation);
                    break;
                }
            }
        }

        // Step 5: Check robots.txt as last resort
        if (!response) {
            onProgress?.('Checking robots.txt...', 50);
            const baseUrl = new URL(normalizedUrl).origin;
            const robotsResponse = await tryFetchUrl(baseUrl + '/robots.txt');
            
            if (robotsResponse) {
                const robotsText = await robotsResponse.text();
                const sitemapMatches = robotsText.match(/^Sitemap:\s*(.+)$/gm);
                
                if (sitemapMatches) {
                    console.log('Found sitemap entries in robots.txt:', sitemapMatches.length);
                    const sitemapUrls = sitemapMatches
                        .map(match => match.replace(/^Sitemap:\s*/, '').trim())
                        .filter(Boolean);

                    // Try each sitemap URL from robots.txt
                    for (const sitemapUrl of sitemapUrls) {
                        response = await tryFetchUrl(sitemapUrl);
                        if (response) {
                            console.log('Successfully fetched sitemap from robots.txt:', sitemapUrl);
                            break;
                        }
                    }
                }
            }
        }

        if (!response) {
            throw new Error('Could not find sitemap. Please check the URL and try again.');
        }

        onProgress?.('Processing sitemap...', 60);
        return processSitemapResponse(response, onProgress);
    } catch (error) {
        console.error('Sitemap fetch error:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch sitemap: ${error.message}`);
        }
        throw new Error('Failed to fetch sitemap: Unknown error');
    }
}

interface SitemapIndexEntry {
    loc: string;
}

interface SitemapUrlEntry {
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: string;
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