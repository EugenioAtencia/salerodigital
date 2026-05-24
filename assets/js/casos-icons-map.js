/* Set de iconos para servicios trabajados en casos de éxito */
(function () {
  const CASE_SERVICE_ICONS = {
  "web": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <circle cx=\"32\" cy=\"32\" r=\"24\"/>  <path d=\"M8 32h48\"/>  <path d=\"M32 8c7.8 7.4 11.5 15.4 11.5 24S39.8 48.6 32 56\"/>  <path d=\"M32 8c-7.8 7.4-11.5 15.4-11.5 24S24.2 48.6 32 56\"/>  <path d=\"M14.5 17.5c4.5 2.7 10.4 4.2 17.5 4.2s13-1.5 17.5-4.2\"/>  <path d=\"M14.5 46.5c4.5-2.7 10.4-4.2 17.5-4.2s13 1.5 17.5 4.2\"/></svg>",
  "seo": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <circle cx=\"25\" cy=\"25\" r=\"14\"/>  <path d=\"M35.5 35.5 50 50\"/>  <path d=\"M17.5 31.5 24 25l5.8 5.2L40 17.8\"/>  <path d=\"M35.5 18h5.5v5.5\"/></svg>",
  "publicidad-digital": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <path d=\"M14 34h10l20-12v28L24 38H14z\"/>  <path d=\"M24 38 28 50h8\"/>  <path d=\"M48.5 29c3 2 4.8 4.8 4.8 8s-1.8 6-4.8 8\"/>  <path d=\"M10 22h9\"/>  <path d=\"M8 14h17\"/>  <path d=\"M10 50h8\"/></svg>",
  "redes-sociales": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <circle cx=\"18\" cy=\"32\" r=\"7\"/>  <circle cx=\"46\" cy=\"18\" r=\"7\"/>  <circle cx=\"46\" cy=\"46\" r=\"7\"/>  <path d=\"M24.2 28.8 39.8 21.2\"/>  <path d=\"M24.2 35.2 39.8 42.8\"/>  <path d=\"M46 25v14\"/></svg>",
  "contenido": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <path d=\"M18 10h23l7 7v37H18z\"/>  <path d=\"M41 10v9h9\"/>  <path d=\"M24 26h16\"/>  <path d=\"M24 35h20\"/>  <path d=\"M24 44h10\"/>  <path d=\"M40 44l7-7 5 5-7 7-7 2z\"/></svg>",
  "email-marketing": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <rect x=\"10\" y=\"17\" width=\"44\" height=\"32\" rx=\"5\"/>  <path d=\"M12.5 22 32 37l19.5-15\"/>  <path d=\"M37.5 39h9\"/>  <path d=\"m43 34 5 5-5 5\"/></svg>",
  "sms": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <path d=\"M14 16h36a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H28l-12 8v-8h-2a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6z\"/>  <path d=\"M21 31h.01\"/>  <path d=\"M32 31h.01\"/>  <path d=\"M43 31h.01\"/></svg>",
  "whatsapp": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <path d=\"M32 10a22 22 0 0 0-19 33L10 54l11-3a22 22 0 1 0 11-41z\"/>  <path d=\"M25 23c1.2-1.1 3.2-.8 4 1l2 4c.5 1.2.1 2.5-1 3l-1.3.8c2.1 4.1 5.3 7.3 9.5 9.5l.8-1.3c.6-1.1 1.9-1.5 3-1l4 2c1.8.8 2.1 2.8 1 4-2.1 2.5-5.4 3.4-9.2 2.2-8-2.5-15.5-10-18-18-1.2-3.8-.3-7.1 2.2-9.2z\"/></svg>",
  "automatizacion": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <circle cx=\"18\" cy=\"18\" r=\"6\"/>  <circle cx=\"46\" cy=\"18\" r=\"6\"/>  <circle cx=\"32\" cy=\"46\" r=\"6\"/>  <path d=\"M24 18h16\"/>  <path d=\"m21.5 23 7.5 17\"/>  <path d=\"m42.5 23-7.5 17\"/>  <circle cx=\"32\" cy=\"31\" r=\"5\"/>  <path d=\"M32 22v4\"/>  <path d=\"M32 36v4\"/>  <path d=\"M23 31h4\"/>  <path d=\"M37 31h4\"/></svg>",
  "analitica": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <path d=\"M12 52V28\"/>  <path d=\"M26 52V17\"/>  <path d=\"M40 52V34\"/>  <path d=\"M54 52V24\"/>  <path d=\"M12 28 26 17l14 17 14-14\"/>  <circle cx=\"12\" cy=\"28\" r=\"3\"/>  <circle cx=\"26\" cy=\"17\" r=\"3\"/>  <circle cx=\"40\" cy=\"34\" r=\"3\"/>  <circle cx=\"54\" cy=\"20\" r=\"3\"/></svg>",
  "streaming": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <rect x=\"10\" y=\"14\" width=\"44\" height=\"32\" rx=\"4\"/>  <path d=\"m28 24 12 8-12 8z\"/>  <path d=\"M20 54h24\"/>  <path d=\"M32 46v8\"/>  <path d=\"M22 46h20\"/></svg>",
  "soporte-tecnico": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">  <path d=\"M14 35v-7a18 18 0 0 1 36 0v7\"/>  <rect x=\"8\" y=\"32\" width=\"10\" height=\"15\" rx=\"4\"/>  <rect x=\"46\" y=\"32\" width=\"10\" height=\"15\" rx=\"4\"/>  <path d=\"M46 45c0 6-5 9-12 9h-4\"/>  <rect x=\"26\" y=\"50\" width=\"8\" height=\"5\" rx=\"2\"/>  <circle cx=\"32\" cy=\"34\" r=\"7\"/>  <path d=\"M32 24v3\"/>  <path d=\"M32 41v3\"/>  <path d=\"M22 34h3\"/>  <path d=\"M39 34h3\"/></svg>"
};

  const CASE_SERVICE_LABELS = {
    web: "web",
    seo: "seo",
    "publicidad-digital": "ads",
    "redes-sociales": "redes",
    contenido: "contenido",
    "email-marketing": "email",
    sms: "sms",
    whatsapp: "whatsapp",
    automatizacion: "automatización",
    analitica: "analítica",
    streaming: "streaming",
    "soporte-tecnico": "soporte"
  };

  function normalizeServiceKey(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "y")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getCaseServiceIcon(serviceName) {
    const key = normalizeServiceKey(serviceName);
    return CASE_SERVICE_ICONS[key] || CASE_SERVICE_ICONS.web;
  }

  function getCaseServiceLabel(serviceName) {
    const key = normalizeServiceKey(serviceName);
    return CASE_SERVICE_LABELS[key] || String(serviceName || "");
  }

  function renderCaseServices(services) {
    if (!Array.isArray(services) || !services.length) return "";

    return `
      <div class="case-services-grid">
        ${services.map((service) => {
          const key = normalizeServiceKey(service);

          return `
            <article class="case-service-item case-service-${key}">
              <div class="case-service-icon">
                ${getCaseServiceIcon(service)}
              </div>
              <span class="case-service-label">
                ${getCaseServiceLabel(service)}
              </span>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  window.SaleroCaseIcons = {
    CASE_SERVICE_ICONS,
    CASE_SERVICE_LABELS,
    normalizeServiceKey,
    getCaseServiceIcon,
    getCaseServiceLabel,
    renderCaseServices
  };
})();
