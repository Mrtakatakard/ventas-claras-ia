import axios from 'axios';
import * as logger from 'firebase-functions/logger';
import { defineString } from 'firebase-functions/params';

const WHATSAPP_TOKEN = defineString('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_ID = defineString('WHATSAPP_PHONE_ID');

export const sendMessage = async (to: string, text: string) => {
    const token = WHATSAPP_TOKEN.value();
    const phoneId = WHATSAPP_PHONE_ID.value();

    if (!token || !phoneId) {
        logger.error('MISSING_WHATSAPP_CREDENTIALS');
        return;
    }

    // Remove the '+' for the API call if present, although API usually accepts clean numbers.
    // Meta requires just the digits usually. `to` comes as "+1809..." from our DB.
    const cleanTo = to.replace('+', '');

    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v17.0/${phoneId}/messages`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                messaging_product: 'whatsapp',
                to: cleanTo,
                text: { body: text },
            },
        });
        logger.info('MESSAGE_SENT', { to: cleanTo });
    } catch (error: any) {
        logger.error('ERROR_SENDING_MESSAGE', error.response?.data || error.message);
    }
};
