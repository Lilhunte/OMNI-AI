# OMNI-CAN-AI

OMNI-CAN-AI is an AI-first web application where users can generate and receive multimodal AI outputs (text, code, images, etc.), all powered by a centralized webhook-driven AI pipeline.

This project is built with a static frontend (HTML, JavaScript, Tailwind CSS) and a robust Supabase backend that handles the database, authentication, and serverless functions.

## Tech Stack

-   **Frontend**: Plain HTML, JavaScript, Tailwind CSS (via Play CDN)
-   **Backend**: Supabase (Postgres, Auth, Edge Functions, Realtime)
-   **Authentication**: Supabase Auth with Google OAuth

---

## Project Setup

To get this project running, you will need a Supabase account. Follow these steps to set up the backend and configure the application.

### 1. Set Up Your Supabase Project

1.  Go to [supabase.com](https://supabase.com) and create a new project.
2.  Once your project is created, keep the page open as you will need to retrieve several keys and URLs.

### 2. Configure the Frontend

1.  Open the `js/supabaseClient.js` file.
2.  In your Supabase project dashboard, navigate to **Project Settings > API**.
3.  Copy the **Project URL** and the **`anon` public key**.
4.  Paste these values into the `supabaseUrl` and `supabaseAnonKey` constants in `js/supabaseClient.js`.

### 3. Set Up the Database

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) to apply the database schema.

1.  Install the Supabase CLI on your machine.
2.  Log in to the CLI:
    ```bash
    supabase login
    ```
3.  Link your local project to your Supabase project (find your `<project-ref>` in your project's URL, e.g., `https://<project-ref>.supabase.co`):
    ```bash
    supabase link --project-ref <your-project-ref>
    ```
4.  Push the database schema to your Supabase project. This will run the migration file located in the `/migrations` directory.
    ```bash
    supabase db push
    ```

### 4. Configure Google Authentication

1.  In your Supabase project dashboard, go to **Authentication > Providers** and enable **Google**.
2.  You will need a **Google Client ID** and **Client Secret**. Follow the official [Supabase guide](https://supabase.com/docs/guides/auth/social-login/auth-google) to create these credentials in the Google Cloud Console.
3.  Add the credentials to the Google provider settings in your Supabase dashboard.

### 5. Deploy and Configure Edge Functions

The project uses three Edge Functions located in the `/functions` directory.

1.  Deploy the functions using the Supabase CLI:
    ```bash
    supabase functions deploy
    ```
2.  After deploying, you must set the required environment variables for them to work. In your Supabase dashboard, go to **Project Settings > Edge Functions**.
3.  Add the following secrets:
    -   `AI_CALLBACK_SECRET`: A strong, randomly generated secret you create. This is used to secure the `ai-callback` endpoint.
    -   `AI_WEBHOOK_URL`: The URL of the central AI webhook. For this project, it is `https://boxer-rich-raccoon.ngrok-free.app/webhook-test/8a3ff405-b427-477e-aea6-8fdb35f963fe`.
    -   `SUPABASE_URL`: Your project's URL (from **Project Settings > API**).
    -   `SUPABASE_SERVICE_ROLE_KEY`: Your project's `service_role` key (from **Project Settings > API**). **Keep this secret safe.**

---

## How to Run

After completing the setup, simply open the `index.html` file in a web browser. You can use a simple web server or an extension like VS Code's "Live Server" to serve the files locally.

You should be able to sign in with your Google account and start using the application.