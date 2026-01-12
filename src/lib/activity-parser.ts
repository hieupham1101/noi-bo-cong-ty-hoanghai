
export type ChangeType = 'PRICE_INCREASE' | 'PRICE_DECREASE' | 'STOCK_CHANGE' | 'CREATE' | 'UPDATE' | 'DELETE' | 'GENERIC' | 'IMPORT';

export interface ParsedActivity {
    type: ChangeType;
    field?: string;
    oldValue?: string;
    newValue?: string;
    productName?: string;
    raw: string;
    // For rich diffs (multiple fields), we might need an array or just render the primary one
    changes?: { field: string, old: any, new: any }[];
}

export function parseActivityDetails(details: any, action: string): ParsedActivity {
    const normalize = (s: string) => s.trim();

    // 1. Handle JSON Object (New Format)
    if (typeof details === 'object' && details !== null) {
        // Special Case: Import
        if (action.includes('IMPORT') || details.batches) {
            return {
                type: 'IMPORT',
                raw: details.message || `Imported ${details.count} items`
            }
        }

        // Generic Diff Handling e.g. { sellingPrice: { old: 100, new: 200 } }
        const changes = Object.entries(details).map(([key, val]: [string, any]) => ({
            field: key,
            old: val.old,
            new: val.new
        }));

        if (changes.length > 0) {
            // Prioritize Price/Stock for the main badge
            const priceChange = changes.find(c => c.field === 'sellingPrice' || c.field === 'costPrice');
            if (priceChange) {
                const oldVal = Number(priceChange.old);
                const newVal = Number(priceChange.new);
                return {
                    type: newVal > oldVal ? 'PRICE_INCREASE' : 'PRICE_DECREASE',
                    field: priceChange.field === 'sellingPrice' ? 'Giá bán' : 'Giá vốn',
                    oldValue: String(priceChange.old),
                    newValue: String(priceChange.new),
                    raw: JSON.stringify(details),
                    changes
                }
            }

            // Stock logic...

            // Default generic update
            return {
                type: 'UPDATE',
                raw: 'Updated ' + changes.map(c => c.field).join(', '),
                changes
            }
        }

        return {
            type: 'GENERIC',
            raw: JSON.stringify(details)
        }
    }

    // 2. Handle String (Legacy Format)
    const detailsStr = String(details || '');

    // Scenario: Creation
    if (action.includes('Create') || detailsStr.toLowerCase().includes('created')) {
        return {
            type: 'CREATE',
            raw: detailsStr
        };
    }

    // Scenario: Price Change "Price: 100 -> 200"
    // Regex for "Field: Old -> New"
    const changeRegex = /^(.*?):\s*(.*?)\s*->\s*(.*)$/;
    const match = detailsStr.match(changeRegex);

    if (match) {
        const field = normalize(match[1]);
        const oldValStr = normalize(match[2]);
        const newValStr = normalize(match[3]);

        // Try to parse as numbers
        const oldVal = parseFloat(oldValStr.replace(/[^0-9.-]+/g, ""));
        const newVal = parseFloat(newValStr.replace(/[^0-9.-]+/g, ""));

        if (!isNaN(oldVal) && !isNaN(newVal)) {
            // Price specific logic
            if (field.toLowerCase().includes('price') || field.includes('giá') || field.includes('sellingPrice')) {
                return {
                    type: newVal > oldVal ? 'PRICE_INCREASE' : 'PRICE_DECREASE',
                    field,
                    oldValue: oldValStr,
                    newValue: newValStr,
                    raw: detailsStr
                };
            }

            // Stock specific logic
            if (field.toLowerCase().includes('stock') || field.includes('tồn')) {
                return {
                    type: 'STOCK_CHANGE',
                    field,
                    oldValue: oldValStr,
                    newValue: newValStr,
                    raw: detailsStr
                };
            }
        }

        // Generic field change
        return {
            type: 'UPDATE',
            field,
            oldValue: oldValStr,
            newValue: newValStr,
            raw: detailsStr
        };
    }

    return {
        type: 'GENERIC',
        raw: detailsStr
    };
}
