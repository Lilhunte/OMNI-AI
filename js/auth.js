import { supabase } from './supabaseClient.js';

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const authSection = document.getElementById('auth-section');
const appContent = document.getElementById('app-content');

// --- Auth Functions ---

const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
    });
    if (error) {
        console.error('Error signing in with Google:', error);
    }
};

const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
    }
};

// --- UI Update Logic ---

const setupUI = (user) => {
    if (user) {
        // User is signed in
        authContainer.innerHTML = `
            <button id="sign-out-button" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Sign Out
            </button>
        `;
        document.getElementById('sign-out-button').addEventListener('click', signOut);

        if (authSection) authSection.style.display = 'none';
        if (appContent) appContent.style.display = 'flex'; // Use flex for main app layout

    } else {
        // User is signed out
        authContainer.innerHTML = `
            <button id="sign-in-button" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Sign in with Google
            </button>
        `;
        document.getElementById('sign-in-button').addEventListener('click', signInWithGoogle);

        if (authSection) authSection.style.display = 'flex';
        if (appContent) appContent.style.display = 'none';
    }
};


// --- Event Listeners ---

// Listen for authentication state changes
supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    setupUI(user);
});

// Initial UI setup on page load
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setupUI(session?.user);
});