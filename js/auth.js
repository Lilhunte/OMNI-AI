const publishableKey = "pk_test_YWNjZXB0ZWQtb3gtNTEuY2xlcmsuYWNjb3VudHMuZGV2JA";

const startClerk = async () => {
    const Clerk = window.Clerk;

    if (!Clerk) {
        console.error("Clerk.js not loaded");
        return;
    }

    try {
        await Clerk.load();

        const userButtonContainer = document.getElementById('user-button-container');
        const signInComponent = document.getElementById('sign-in-component');
        const authSection = document.getElementById('auth-section');
        const appContent = document.getElementById('app-content');

        Clerk.addListener(({ user }) => {
            if (user) {
                // Mount user button and show app content
                Clerk.mountUserButton(userButtonContainer);
                authSection.style.display = 'none';
                appContent.style.display = 'block';
            } else {
                // Mount sign in and show auth section
                Clerk.mountSignIn(signInComponent, {
                    appearance: {
                        baseTheme: 'dark'
                    }
                });
                authSection.style.display = 'block';
                appContent.style.display = 'none';
                // Clear user button if it exists
                userButtonContainer.innerHTML = '';
            }
        });

    } catch (err) {
        console.error("Error loading Clerk:", err);
    }
};

// Load Clerk.js script
const clerkScript = document.createElement('script');
clerkScript.setAttribute('data-clerk-publishable-key', publishableKey);
clerkScript.async = true;
clerkScript.src = `https://cdn.clerk.dev/clerk.browser.js`;
clerkScript.crossOrigin = 'anonymous';
clerkScript.addEventListener('load', startClerk);
clerkScript.addEventListener('error', () => {
  document.getElementById('auth-section').innerHTML = '<p>Error loading authentication service.</p>';
});
document.head.appendChild(clerkScript);