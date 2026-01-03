// Configuracion de Analytics y Advertising
// Reemplaza estos valores con tus IDs reales

export const analyticsConfig = {
  // Plausible Analytics
  // Registrate en: https://plausible.io/
  plausibleDomain: 'YOUR_DOMAIN', // ej: 'newsbot-latam.com'
};

export const adsConfig = {
  // Google AdSense
  // Registrate en: https://www.google.com/adsense/
  publisherId: 'ca-pub-XXXXXXXXXXXXXXXX', // Tu ID de publisher

  // Slots de anuncios (obtener de AdSense dashboard)
  slots: {
    topBanner: '1234567890',      // Banner superior (728x90)
    sidebar1: '0987654321',        // Sidebar arriba (300x250)
    sidebar2: '1122334455',        // Sidebar abajo (300x250)
    inArticle: '5566778899',       // Entre articulos
    footer: '9988776655',          // Footer (728x90)
  },
};

// Instrucciones de configuracion:
//
// 1. PLAUSIBLE ANALYTICS:
//    - Crea cuenta en https://plausible.io/
//    - Agrega tu dominio
//    - Actualiza 'plausibleDomain' con tu dominio
//    - Actualiza data-domain en index.html
//
// 2. GOOGLE ADSENSE:
//    - Crea cuenta en https://www.google.com/adsense/
//    - Espera aprobacion (puede tomar dias)
//    - Crea unidades de anuncios para cada ubicacion
//    - Actualiza 'publisherId' con tu ca-pub-XXX
//    - Actualiza cada 'slot' con los IDs de tus unidades
//    - Actualiza el script en index.html con tu ca-pub-XXX
