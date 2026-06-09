(function () {
  const STORAGE_KEY = 'salero_cookie_consent_v2';
  const CONSENT_EVENT = 'salero_consent_update';

  const CONSENT_GRANTED = 'granted';
  const CONSENT_DENIED = 'denied';

  const defaultPreferences = {
    analytics: true,
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
      analytics: true,
      marketing: Boolean(preferences.marketing),
      savedAt: new Date().toISOString(),
      version: 2
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    applyConsent(payload);
    closeBanner();
    showPreferencesButton();
  }

  function minimizeWithAnalyticsOnly() {
    persistConsent({ marketing: false });
  }

  function applyConsent(preferences) {
    const analyticsStatus = CONSENT_GRANTED;
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

  function bindOutsideClickToMinimize(banner) {
    window.setTimeout(function () {
      document.addEventListener('pointerdown', function handleOutsideClick(event) {
        if (!document.body.contains(banner)) {
          document.removeEventListener('pointerdown', handleOutsideClick, true);
          return;
        }

        const clickedInsideBanner = banner.contains(event.target);
        const clickedPreferencesButton = event.target.closest && event.target.closest('[data-salero-consent-preferences]');

        if (!clickedInsideBanner && !clickedPreferencesButton) {
          document.removeEventListener('pointerdown', handleOutsideClick, true);
          minimizeWithAnalyticsOnly();
        }
      }, true);
    }, 250);
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
          Mantenemos la analítica activa para medir navegación y mejorar la web. Puedes aceptar también cookies de publicidad para medir campañas.
        </p>

        <div class="salero-consent__settings" data-consent-settings hidden>
          <label class="salero-consent__option">
            <input type="checkbox" checked disabled>
            <span>
              <strong>Cookies técnicas necesarias</strong>
              <span>Permiten que la web funcione correctamente.</span>
            </span>
          </label>

          <label class="salero-consent__option">
            <input type="checkbox" data-consent-analytics checked disabled>
            <span>
              <strong>Cookies de análisis</strong>
              <span>Nos ayudan a medir navegación, contenidos y rendimiento.</span>
            </span>
          </label>

          <label class="salero-consent__option">
            <input type="checkbox" data-consent-marketing>
            <span>
              <strong>Cookies de publicidad</strong>
              <span>Permiten medir campañas, conversiones y acciones publicitarias.</span>
            </span>
          </label>
        </div>

        <div class="salero-consent__actions">
          <button type="button" data-consent-analytics-only>Solo analítica</button>
          <button type="button" data-consent-config>Configurar</button>
          <button type="button" data-consent-accept>Aceptar publicidad</button>
          <button type="button" data-consent-save hidden>Guardar configuración</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    bindOutsideClickToMinimize(banner);

    banner.querySelector('[data-consent-analytics-only]').addEventListener('click', function () {
      persistConsent({ marketing: false });
    });

    banner.querySelector('[data-consent-accept]').addEventListener('click', function () {
      persistConsent({ marketing: true });
    });

    banner.querySelector('[data-consent-config]').addEventListener('click', function () {
      const stored = getStoredConsent();
      const preferences = stored || defaultPreferences;
      const marketing = banner.querySelector('[data-consent-marketing]');

      if (marketing) marketing.checked = Boolean(preferences.marketing);

      showSettings(banner);
    });

    banner.querySelector('[data-consent-save]').addEventListener('click', function () {
      persistConsent({
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
    button.textContent = 'Cookies';
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

    applyConsent(defaultPreferences);
    renderBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.saleroOpenCookieSettings = renderBanner;
})();
