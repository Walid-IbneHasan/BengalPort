// Public settings are read at runtime from the PUBLIC_* environment variables
// of the running frontend, so the same build works in every environment.
import { env } from '$env/dynamic/public';

export const apiUrl = () => env.PUBLIC_API_URL || 'http://localhost:4000/api';
export const whatsappNumber = () => env.PUBLIC_WHATSAPP_NUMBER || '8801711991035';
export const googleClientId = () => env.PUBLIC_GOOGLE_CLIENT_ID || '';
