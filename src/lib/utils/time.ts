
export function formatLastSeen(date: string | Date | null): string {
    if (!date) return "Offline";
    
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return "Active just now";
    }

    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Active ${minutes}m ago`;
    }

    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Active ${hours}h ago`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (then.toDateString() === yesterday.toDateString()) {
        return `Active yesterday at ${then.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return `Active on ${then.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${then.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
