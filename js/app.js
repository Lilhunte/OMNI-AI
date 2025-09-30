import { supabase } from './supabaseClient.js';
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

    // Highlight the active conversation in the list
    document.querySelectorAll('#conversation-list [data-conversation-id]').forEach(el => {
        el.classList.toggle('bg-gray-700', el.dataset.conversationId == conversationId);
    });

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
    renderMessage({ kind: 'text', body: promptText, sender_id: (await supabase.auth.getUser()).data.user.id });
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
 * Renders the list of conversations in the sidebar.
 * @param {Array} conversations - An array of conversation objects.
 */
const renderConversationList = (conversations) => {
    conversationList.innerHTML = ''; // Clear the list
    if (!conversations || conversations.length === 0) {
        conversationList.innerHTML = '<p class="text-gray-400">No conversations yet.</p>';
        return;
    }

    conversations.forEach(convo => {
        const convoEl = document.createElement('div');
        convoEl.classList.add('p-2', 'rounded-lg', 'hover:bg-gray-600', 'cursor-pointer', 'mb-2');
        convoEl.dataset.conversationId = convo.id;
        convoEl.innerHTML = `<p class="font-semibold truncate">${convo.title}</p>`;

        convoEl.addEventListener('click', () => {
            if (activeConversationId !== convo.id) {
                loadConversation(convo.id);
            }
        });
        conversationList.appendChild(convoEl);
    });
};

/**
 * Ensures the current user has a conversation, creating one if not.
 * Then loads the first conversation.
 */
const initializeConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Check for existing conversations
    let { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching conversations:', error);
        return;
    }

    // 2. If no conversation exists, create one
    if (conversations.length === 0) {
        const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({ owner_id: user.id, title: 'Default Conversation' })
            .select('id, title')
            .single();

        if (createError) {
            console.error('Error creating conversation:', createError);
            return;
        }
        conversations = [newConversation];
    }

    // 3. Render the conversation list and load the first one
    renderConversationList(conversations);
    if (conversations.length > 0) {
        loadConversation(conversations[0].id);
    }
};

/**
 * Subscribes to real-time updates for new messages.
 */
const subscribeToMessages = () => {
    const channel = supabase.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            if (payload.new.conversation_id === activeConversationId) {
                renderMessage(payload.new);
            }
        })
        .subscribe();
    return channel;
};

// --- Initialization ---
let messageChannel = null;

const initializeApp = () => {
    promptForm.addEventListener('submit', handlePromptSubmit);
    initializeConversation();
    if (messageChannel) {
        supabase.removeChannel(messageChannel);
    }
    messageChannel = subscribeToMessages();
};

// Listen for auth state changes to initialize or tear down the app
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        initializeApp();
    }
});

// Also initialize on page load if the user is already signed in
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        initializeApp();
    }
});