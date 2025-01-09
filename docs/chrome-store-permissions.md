# Chrome Web Store Permissions Documentation

## Permission Justifications

### 1. activeTab Permission
The activeTab permission is required to access the current webpage's URL when the user explicitly requests sitemap extraction. This permission is essential for our core functionality of finding and processing sitemaps. We only access the active tab when the user initiates an action, and we don't store or track browsing history. The permission is temporary and limited to only when the user is actively using the extension.

### 2. downloads Permission
The downloads permission is required to save the extracted sitemap data as XLSX files to the user's computer. This is a core feature of our extension that allows users to export and analyze sitemap data offline. We only initiate downloads when explicitly requested by the user, and we only download the XLSX files that the user has generated from sitemap data. No other types of downloads are performed.

### 3. host Permission
The host permission is essential for fetching sitemap XML files from websites that users want to analyze. This permission is necessary because:
- We need to make HTTP/HTTPS requests to access sitemap.xml files from various domains
- We only access domains that users explicitly enter
- We only fetch publicly available sitemap files
- No user data is sent to these hosts; we only retrieve sitemap data

### 4. storage Permission
The storage permission is required to:
- Save user preferences for sitemap filtering options
- Temporarily store processed sitemap data during conversion
- Maintain user settings between sessions
All data is stored locally in the browser, is never shared with external servers, and can be cleared by the user at any time through the extension's interface.

## Data Usage Declaration

### Current Data Collection
The extension currently collects:
- Website content (sitemap URLs) - This is necessary for the core functionality of extracting and processing sitemap data

### Future Data Collection (With AdSense Implementation)
When AdSense is implemented in future versions, the extension will also collect:
- Location data (IP address, region) - Required for serving relevant ads
- User activity (ad interactions) - Required for ad performance tracking
- Device information - Required for ad delivery optimization

### Data NOT Collected
The extension does not and will not collect:
- Personally identifiable information
- Health information
- Financial and payment information
- Authentication information
- Personal communications
- Web browsing history
- Keystroke logging

### Data Usage Certifications
1. No data is sold or transferred to third parties, except for necessary ad-related data shared with Google AdSense
2. All data usage is strictly related to either the extension's core functionality (sitemap extraction and XLSX conversion) or ad delivery
3. No data is used for creditworthiness or lending purposes

### Privacy Considerations
- All core functionality data processing is done locally in the browser
- Users can clear their local data at any time through the extension interface
- When ads are implemented, users will be notified and given clear information about data collection
- Ad-related data collection will comply with Google AdSense privacy policies
- Users will have the option to manage their ad preferences 