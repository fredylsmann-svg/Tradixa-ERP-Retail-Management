/**
 * TRADIXA - Email Template Engine
 * Menyediakan layout HTML dinamis untuk branding SaaS
 */

export const getEmailTemplate = ({ storeName, html, templateType = 'Standard', ctaUrl = '#', promoImage = '', fontFamily = 'Inter', brandColor = '#2563eb', logoUrl = '', showLogo = true, ctaText = 'Belanja Sekarang', logoAlign = 'center', logoSize = 'medium', trackingPixel = '' }) => {
  const fontConfig = {
    'Inter': "'Inter', sans-serif",
    'Roboto': "'Roboto', sans-serif",
    'Playfair Display': "'Playfair Display', serif",
    'Montserrat': "'Montserrat', sans-serif",
    'Outfit': "'Outfit', sans-serif"
  };

  const selectedFont = fontConfig[fontFamily] || fontConfig['Inter'];
  const fontImport = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@400;600;700;800;900&display=swap`;

  const getBgStyle = (color) => color.includes('gradient') ? `background: ${color};` : `background-color: ${color};`;
  
  const logoHeight = logoSize === 'small' ? '30px' : logoSize === 'large' ? '80px' : '50px';

  const baseStyles = `
    font-family: ${selectedFont};
    max-width: 600px;
    margin: 20px auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    background-color: #ffffff;
  `;

  const head = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${fontImport}" rel="stylesheet">
  `;

  if (templateType === 'Promotion') {
    return `
      ${head}
      <div style="${baseStyles}">
        <div style="${getBgStyle(brandColor)} padding: 50px 20px; text-align: ${logoAlign};">
          <h2 style="color: #ffffff; opacity: 0.8; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; text-align: center;">SPECIAL OFFER FROM</h2>
          ${(showLogo && logoUrl) ? `
            <div style="background: white; display: inline-block; padding: 10px; border-radius: 12px; margin-top: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <img src="${logoUrl}" style="max-height: ${logoHeight}; display: block;">
            </div>
          ` : `<h1 style="color: white; margin: 10px 0 0 0; font-size: 32px; font-weight: 900; text-align: center;">${storeName}</h1>`}
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          ${promoImage ? promoImage.split(',').map(img => img.trim()).filter(Boolean).map(img => `
            <div style="margin-bottom: 30px;">
              <img src="${img}" style="width: 100%; border-radius: 12px;" alt="Promo" />
            </div>
          `).join('') : ''}
          <div style="color: #1e293b; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
            ${html}
          </div>
          <a href="${ctaUrl}" style="display: inline-block; padding: 18px 36px; ${getBgStyle(brandColor)} color: white; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">${ctaText}</a>
        </div>
        ${trackingPixel}
      </div>
    `;
  }

  if (templateType === 'Announcement') {
    return `
      ${head}
      <div style="${baseStyles}; border: none; border-top: 5px solid ${brandColor}; border-radius: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="padding: 30px 40px;">
          <div style="margin-bottom: 40px; text-align: ${logoAlign};">
             ${(showLogo && logoUrl) ? `<img src="${logoUrl}" style="max-height: ${logoHeight}; max-width: 250px; object-fit: contain;">` : `<div style="font-size: 24px; font-weight: 900; color: ${brandColor};">${storeName}</div>`}
          </div>
          <div style="color: #334155; font-size: 16px; line-height: 1.8;">
            ${html}
          </div>
        </div>
        <div style="padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
          Powered by <strong>${storeName}</strong>
        </div>
        ${trackingPixel}
      </div>
    `;
  }

  // Default / Standard
  return `
    ${head}
    <div style="${baseStyles}">
      <div style="${getBgStyle(brandColor)} padding: 40px 20px; text-align: ${logoAlign};">
        ${(showLogo && logoUrl) ? `
          <div style="background: white; display: inline-block; padding: 8px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <img src="${logoUrl}" style="max-height: ${logoHeight}; display: block;">
          </div>
        ` : `<h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase;">${storeName}</h1>`}
      </div>
      <div style="padding: 40px 32px;">
        <div style="color: #334155; font-size: 16px; line-height: 1.7; margin-bottom: 32px;">
          ${html}
        </div>
      </div>
      ${trackingPixel}
    </div>
  `;
};
