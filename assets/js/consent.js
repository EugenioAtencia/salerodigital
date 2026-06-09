(function () {
  const STORAGE_KEY = 'salero_cookie_consent_v1';
  const CONSENT_EVENT = 'salero_consent_update';

  const CONSENT_GRANTED = 'granted';
  const CONSENT_DENIED = 'denied';

  const defaultPreferences = {
    analytics: false,
    marketing: false
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  function getStoredConsent() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  function persistConsent(preferences) {
    const payload = {
      analytics: Boolean(preferences.analytics),
      marketing: Boolean(preferences.marketing),
      savedAt: new Date().toISOString(),
      version: 1
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    applyConsent(payload);
    closeBanner();
    showPreferencesButton();
  }

  function applyConsent(preferences) {
    const analyticsStatus = preferences.analytics ? CONSENT_GRANTED : CONSENT_DENIED;
    const marketingStatus = preferences.marketing ? CONSENT_GRANTED : CONSENT_DENIED;

    window.gtag('consent', 'update', {
      analytics_storage: analyticsStatus,
      ad_storage: marketingStatus,
      ad_user_data: marketingStatus,
      ad_personalization: marketingStatus,
      personalization_storage: marketingStatus,
      functionality_storage: CONSENT_GRANTED,
      security_storage: CONSENT_GRANTED
    });

    window.dataLayer.push({
      event: CONSENT_EVENT,
      consent_analytics: analyticsStatus,
      consent_marketing: marketingStatus
    });
  }

  function closeBanner() {
    const banner = document.querySelector('[data-salero-consent]');
    if (banner) banner.remove();
  }

  function showSettings(banner) {
    const settings = banner.querySelector('[data-consent-settings]');
    const save = banner.querySelector('[data-consent-save]');

    if (settings) settings.hidden = false;
    if (save) save.hidden = false;
  }

  function renderBanner() {
    closeBanner();

    const banner = document.createElement('aside');
    banner.className = 'salero-consent';
    banner.setAttribute('data-salero-consent', '');
    banner.setAttribute('aria-label', 'Panel de consentimiento de cookies');

    banner.innerHTML = `
      <div class="salero-consent__panel" role="dialog" aria-modal="false" aria-labelledby="salero-consent-title">
        <p class="salero-consent__eyebrow">Privacidad y cookies</p>
        <h2 id="salero-consent-title">Cookies con criterio</h2>
        <p>
          Usamos cookies técnicas necesarias para que la web funcione. Con tu permiso, también usamos cookies de análisis y publicidad para medir resultados y mejorar nuestras campañas.
        </p>

        <div class="salero-consent__settings" data-consent-settings hidden>
          <label class="salero-consent__option">
            <input type="checkbox" checked disabled>
            <span>
              <strong>Cookies técnicas necesarias</strong>
              <span>Permiten que la web funcione correctamente y no se pueden desactivar desde este panel.</span>
            </span>
          </label>

          <label class="salero-consent__option">
            <input type="checkbox" data-consent-analytics>
            <span>
              <strong>Cookies de análisis</strong>
              <span>Nos ayudan a entender cómo se usa la web para mejorar contenidos, navegación y rendimiento.</span>
            </span>
          </label>

          <label class="salero-consent__option">
            <input type="checkbox" data-consent-marketing>
            <span>
              <strong>Cookies de publicidad</strong>
              <span>Permiten medir campañas, conversiones y acciones publicitarias como Google Ads o remarketing.</span>
            </span>
          </label>
        </div>

        <div class="salero-consent__actions">
          <button type="button" data-consent-reject>Rechazar</button>
          <button type="button" data-consent-config>Configurar</button>
          <button type="button" data-consent-accept>Aceptar</button>
          <button type="button" data-consent-save hidden>Guardar configuración</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    banner.querySelector('[data-consent-reject]').addEventListener('click', function () {
      persistConsent({ analytics: false, marketing: false });
    });

    banner.querySelector('[data-consent-accept]').addEventListener('click', function () {
      persistConsent({ analytics: true, marketing: true });
    });

    banner.querySelector('[data-consent-config]').addEventListener('click', function () {
      const stored = getStoredConsent() || defaultPreferences;
      const analytics = banner.querySelector('[data-consent-analytics]');
      const marketing = banner.querySelector('[data-consent-marketing]');

      if (analytics) analytics.checked = Boolean(stored.analytics);
      if (marketing) marketing.checked = Boolean(stored.marketing);

      showSettings(banner);
    });

    banner.querySelector('[data-consent-save]').addEventListener('click', function () {
      persistConsent({
        analytics: Boolean(banner.querySelector('[data-consent-analytics]')?.checked),
        marketing: Boolean(banner.querySelector('[data-consent-marketing]')?.checked)
      });
    });
  }

  function showPreferencesButton() {
    if (document.querySelector('[data-salero-consent-preferences]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'salero-consent-preferences';
    button.setAttribute('data-salero-consent-preferences', '');
    button.textContent = 'Configurar cookies';
    button.addEventListener('click', renderBanner);

    document.body.appendChild(button);
  }

  function boot() {
    const stored = getStoredConsent();

    if (stored) {
      applyConsent(stored);
      showPreferencesButton();
      return;
    }

    renderBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.saleroOpenCookieSettings = renderBanner;
})();
