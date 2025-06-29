const API_URL = import.meta.env.VITE_BACKEND_URL;

export async function getProjectTemplate(prompt: string) {
    try {
        const response = await fetch(`${API_URL}/template`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error('Failed to get project template');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting project template:', error);
        throw error;
    }
}

export async function sendChatMessage(messages: any[]) {
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
            throw new Error('Failed to send chat message');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending chat message:', error);
        throw error;
    }
} 