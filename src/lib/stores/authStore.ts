// Auth Store - Google Sign-In for admin access
import { writable, get } from 'svelte/store';

const GOOGLE_CLIENT_ID = '25329112932-di6dcu29bb28qa8mcrdedcba4haqsr0g.apps.googleusercontent.com';
const ADMIN_EMAIL = 'hktmika@gmail.com';

export interface AuthUser {
    email: string;
    name: string;
    picture: string;
}

export interface AuthState {
    isInitialized: boolean;
    isLoggedIn: boolean;
    isAdmin: boolean;
    user: AuthUser | null;
}

const initialState: AuthState = {
    isInitialized: false,
    isLoggedIn: false,
    isAdmin: false,
    user: null
};

function createAuthStore() {
    const { subscribe, set, update } = writable<AuthState>(initialState);

    let googleClient: any = null;

    // Load Google Identity Services script
    const loadGoogleScript = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (document.getElementById('google-gsi-script')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.id = 'google-gsi-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google GSI script'));
            document.head.appendChild(script);
        });
    };

    // Handle credential response from Google
    const handleCredentialResponse = (response: any) => {
        // Decode the JWT token
        const payload = decodeJwt(response.credential);

        if (payload) {
            const user: AuthUser = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture
            };

            const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

            update(state => ({
                ...state,
                isLoggedIn: true,
                isAdmin,
                user
            }));

            // Store in sessionStorage for page refreshes
            sessionStorage.setItem('auth_user', JSON.stringify(user));
        }
    };

    // Decode JWT without library (basic implementation)
    const decodeJwt = (token: string): any => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Failed to decode JWT:', e);
            return null;
        }
    };

    return {
        subscribe,

        // Initialize Google Sign-In
        init: async () => {
            try {
                await loadGoogleScript();

                // Check for existing session
                const storedUser = sessionStorage.getItem('auth_user');
                if (storedUser) {
                    const user = JSON.parse(storedUser) as AuthUser;
                    const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                    set({
                        isInitialized: true,
                        isLoggedIn: true,
                        isAdmin,
                        user
                    });
                    return;
                }

                // @ts-ignore - google is loaded from script
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                    auto_select: false
                });

                update(state => ({ ...state, isInitialized: true }));
            } catch (error) {
                console.error('Failed to initialize Google Sign-In:', error);
                update(state => ({ ...state, isInitialized: true }));
            }
        },

        // Trigger sign-in prompt
        signIn: () => {
            // @ts-ignore
            if (typeof google !== 'undefined') {
                // @ts-ignore
                google.accounts.id.prompt();
            }
        },

        // Render Google Sign-In button
        renderButton: (element: HTMLElement) => {
            // @ts-ignore
            if (typeof google !== 'undefined') {
                // @ts-ignore
                google.accounts.id.renderButton(element, {
                    theme: 'filled_blue',
                    size: 'large',
                    type: 'standard',
                    text: 'signin_with',
                    shape: 'rectangular'
                });
            }
        },

        // Sign out
        signOut: () => {
            sessionStorage.removeItem('auth_user');
            set(initialState);
            // @ts-ignore
            if (typeof google !== 'undefined') {
                // @ts-ignore
                google.accounts.id.disableAutoSelect();
            }
        },

        // Check if current user is admin
        isAdmin: (): boolean => {
            return get({ subscribe }).isAdmin;
        }
    };
}

export const authStore = createAuthStore();
