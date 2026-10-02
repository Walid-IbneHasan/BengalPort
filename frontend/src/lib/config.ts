// Public settings are read at runtime from the PUBLIC_* environment variables
// of the running frontend, so the same build works in every environment.
import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { resolveApiUrl } from './api-url';

export const apiUrl = () => resolveApiUrl(env.PUBLIC_API_URL, { dev });
export const whatsappNumber = () => env.PUBLIC_WHATSAPP_NUMBER || '8801711991035';
export const googleClientId = () => env.PUBLIC_GOOGLE_CLIENT_ID || '';
