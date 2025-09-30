import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Supabase and Clerk Configuration ---
const supabaseUrl = 'https://oztifuyijinimlowqviu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dGlmdXlpamluaW1sb3dxdml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTE5MzIsImV4cCI6MjA3NDcyNzkzMn0.eXTGVvWyk025L414pt9Yj0jifPAMP5sDgsPMW-z6GLE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
let activeConversationId = null; // This will be set when a conversation is selected or created.

// --- DOM Elements ---
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const messagesContainer = document.getElementById('messages-container');
const conversationList = document.getElementById('conversation-list');

// --- Main Application Logic ---

/**
 * Renders a single message object to the UI.
 * @param {object} message - The message object from Supabase.
 */
const renderMessage = (message) => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('p-4', 'rounded-lg', 'mb-4', 'bg-gray-700');

    let content = '';
    switch (message.kind) {
        case 'text':
            content = `<p>${message.body}</p>`;
            break;
        case 'code':
            content = `<pre class="bg-gray-800 p-2 rounded"><code>${message.body}</code></pre>`;
            break;
        case 'image':
            content = message.media.urls.map(url => `<img src="${url}" class="max-w-xs rounded-lg my-2">`).join('');
            break;
        default:
            content = `<p class="text-gray-500">Unsupported message type: ${message.kind}</p>`;
    }
    msgDiv.innerHTML = content;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
};

/**
 * Fetches and displays all messages for a given conversation.
 * @param {number} conversationId - The ID of the conversation.
 */
const loadConversation = async (conversationId) => {
    activeConversationId = conversationId;
    messagesContainer.innerHTML = '<p class="text-center text-gray-500">Loading messages...</p>';

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        messagesContainer.innerHTML = '<p class="text-center text-red-500">Error loading messages.</p>';
        return;
    }

    messagesContainer.innerHTML = ''; // Clear loading message
    messages.forEach(renderMessage);
};

/**
 * Handles the submission of the prompt form.
 * @param {Event} e - The form submission event.
 */
const handlePromptSubmit = async (e) => {
    e.preventDefault();
    const promptText = promptInput.value.trim();
    if (!promptText || !activeConversationId) {
        alert('Please select a conversation and enter a prompt.');
        return;
    }

    // Add user's message to the UI immediately
    renderMessage({ kind: 'text', body: promptText });
    promptInput.value = '';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('You must be signed in to send a prompt.');
            return;
        }

        // Call the ai-submit Edge Function
        const response = await supabase.functions.invoke('ai-submit', {
            body: {
                prompt: promptText,
                conversation_id: activeConversationId,
            },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (response.error) {
            throw response.error;
        }

        // You can show a "Job pending" toast here
        console.log('Job submitted successfully:', response.data.jobId);

    } catch (error) {
        console.error('Error submitting prompt:', error);
        renderMessage({ kind: 'text', body: `Error: ${error.message}` });
    }
};

/**
 * Subscribes to real-time updates for new messages.
 */
const subscribeToMessages = () => {
    supabase.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            // Check if the new message belongs to the active conversation
            if (payload.new.conversation_id === activeConversationId) {
                renderMessage(payload.new);
            }
        })
        .subscribe();
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Only set up the app if the app-content section is visible
    if (document.getElementById('app-content').style.display !== 'none') {
        promptForm.addEventListener('submit', handlePromptSubmit);

        // For now, let's create/use a default conversation
        // In a real app, you would fetch and list conversations.
        // For simplicity, we'll hardcode a conversation to start.
        loadConversation(1); // You'd need to create a conversation with ID 1 in your DB

        subscribeToMessages();
    }
});

// We need to re-initialize the app logic when the user logs in.
// A simple way is to listen for changes on the app-content element.
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.attributeName === 'style') {
            const display = document.getElementById('app-content').style.display;
            if (display === 'block') {
                promptForm.addEventListener('submit', handlePromptSubmit);
                // Hardcoded conversation for now
                // TODO: Replace with dynamic conversation loading
                loadConversation(1);
                subscribeToMessages();
            }
        }
    }
});

observer.observe(document.getElementById('app-content'), { attributes: true });