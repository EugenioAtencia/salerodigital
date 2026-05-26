document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const phone = '34665688916';

  form.addEventListener('submit', event => {
    event.preventDefault();

    const data = new FormData(form);
    const value = key => String(data.get(key) || '').trim();

    const message = [
      'Hola, quiero pedir una cata digital con Salero Digital.',
      '',
      `Nombre: ${value('nombre')}`,
      `Empresa: ${value('empresa')}`,
      `Zona: ${value('zona')}`,
      `Teléfono: ${value('telefono')}`,
      `Email: ${value('email')}`,
      `Necesito ayuda con: ${value('interes')}`,
      '',
      `Mensaje: ${value('mensaje')}`
    ].join('\n');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  });
});
