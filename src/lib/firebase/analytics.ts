'use client'; // This file will contain client-side code

import { app } from './config';

// This function ensures analytics is only initialized and used on the client
export async function logAnalyticsEvent(eventName: string, eventParams?: { [key: string]: any }) {
  // Check if we are in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Dynamically import the analytics functions
      const { getAnalytics, logEvent, isSupported } = await import('firebase/analytics');
      
      if (await isSupported()) {
          const analytics = getAnalytics(app);
          logEvent(analytics, eventName, eventParams);
      }
    } catch (error) {
      console.error('Error logging analytics event:', error);
    }
  }
}
