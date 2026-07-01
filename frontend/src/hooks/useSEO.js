import { useEffect } from 'react';

export default function useSEO({ title, description, keywords, canonical }) {
  useEffect(() => {
    const baseTitle = 'RentFlow CRM — Best Bike & Car Rental Management System Software';
    document.title = title ? `${title} | RentFlow CRM` : baseTitle;

    const updateMeta = (attr, value, content) => {
      let element = document.querySelector(`meta[${attr}="${value}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, value);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const baseDesc = 'RentFlow is a premium CRM for bike, scooter, and car rental agencies in India. Manage vehicle fleet, agreements, customer verification, security deposits, digital invoices, and automatic daily sales reports.';
    updateMeta('name', 'description', description || baseDesc);

    const baseKeywords = 'bike rental software, car rental CRM, rental business management system, vehicle rental app, vahan crm, rentflow oneserve, rental billing software India';
    updateMeta('name', 'keywords', keywords || baseKeywords);

    updateMeta('property', 'og:title', title ? `${title} | RentFlow CRM` : baseTitle);
    updateMeta('property', 'og:description', description || baseDesc);
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:url', canonical || 'https://rentalflow.oneserve.in/');
    updateMeta('property', 'og:image', 'https://rentalflow.oneserve.in/favicon.svg');
    updateMeta('property', 'og:site_name', 'RentFlow CRM');

    updateMeta('name', 'twitter:card', 'summary');
    updateMeta('name', 'twitter:title', title ? `${title} | RentFlow CRM` : baseTitle);
    updateMeta('name', 'twitter:description', description || baseDesc);
    updateMeta('name', 'twitter:image', 'https://rentalflow.oneserve.in/favicon.svg');

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical || 'https://rentalflow.oneserve.in/');

  }, [title, description, keywords, canonical]);
}
