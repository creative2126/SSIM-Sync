/**
 * Automated Safety Filter for SSIM Sync
 * Focus: Substance abuse (Drugs/Alcohol) and Violence (Harm/Kill).
 * Privacy: Intimate conversations are allowed.
 */

const BLOCKED_TERMS = [
    // Violence & Harm
    "kill", "murder", "suicide", "stab", "shoot", "bomb", "terrorist", "death", "die", "harm", "hurt",
    // Drugs & Substances (Illegal/Abuse)
    "cocaine", "heroin", "meth", "weed", "marijuana", "ganja", "drug", "pills", "ecstasy", "acid", "lsd",
    "alcohol", "liquor", "beer", "whiskey", "vodka", "wine", "drunk", "high",
    // Common Slurs & Hate Speech (Standard Safety)
    "nigger", "faggot", "retard", "slut", "whore", "rape"
];

/**
 * Checks if a message contains prohibited content.
 * Uses a basic regex-based check for "smart matching".
 * @param content The text to check
 * @returns { isHarmful: boolean, blockedWord: string | null }
 */
export function checkContentSafety(content: string): { isHarmful: boolean; blockedWord: string | null } {
    if (!content) return { isHarmful: false, blockedWord: null };

    const sanitizedContent = content.toLowerCase();

    for (const term of BLOCKED_TERMS) {
        // Basic word search
        if (sanitizedContent.includes(term)) {
            return { isHarmful: true, blockedWord: term };
        }
    }

    return { isHarmful: false, blockedWord: null };
}
