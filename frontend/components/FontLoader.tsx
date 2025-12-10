'use client';

import { useEffect } from 'react';

export default function FontLoader() {
  useEffect(() => {
    // Check if link already exists
    const existingLink = document.querySelector('link[href*="chillax"]');
    
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = 'https://fonts.cdnfonts.com/css/chillax';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  return null;
}
