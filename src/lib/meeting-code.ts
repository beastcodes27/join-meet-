/** Accept a canonical meeting code or a shareable URL; never navigate to an input URL. */
export function parseMeetingCode(input: string): string | null {
    const raw = input.trim();
    try {
        const value = raw.includes('://')
            ? new URL(raw).pathname.split('/').filter(Boolean).at(-1)
            : raw;
        return value && /^[a-f0-9]{32}$/.test(value) ? value : null;
    }
    catch {
        return null;
    }
}
