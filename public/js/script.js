document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('paste-form');
  const pasteList = document.getElementById('paste-list');
  const clearButton = document.getElementById('clear-history');
  let pasteCount = 0;
  const MAX_PASTES_BEFORE_CAPTCHA = 2;

  await loadPastes();

  form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const content = document.getElementById('paste-content').value.trim();
  const title = form.title.value.trim();
  const captchaContainer = document.getElementById('captcha-container');
  
  // Validaciones
  if (title.length > 100) {
    return showNotification('El título no puede exceder 100 caracteres', 'error');
  }
  if (!content) {
    return showNotification('El contenido no puede estar vacío', 'error');
  }
  if (content.length > 7500) {
    return showNotification('El contenido no puede exceder 7500 caracteres', 'error');
  }

  // Manejo de CAPTCHA
  let captchaToken = '';
  if (pasteCount >= MAX_PASTES_BEFORE_CAPTCHA) {
    if (!window.grecaptcha) {
      return showNotification('Error al cargar el CAPTCHA', 'error');
    }
    captchaToken = grecaptcha.getResponse();
    if (!captchaToken) {
      captchaContainer.style.display = 'block';
      return showNotification('Por favor completa el CAPTCHA', 'error');
    }
  }

  // Crear objeto de datos
  const data = {
    title: title || 'Sin título',
    content: content,
    captcha: captchaToken
  };

  try {
    const response = await fetch('/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error desconocido');
    }

    const result = await response.json();
    
    // Guardar en local si es anónimo
    if (result.paste && !result.paste.userId) {
      saveToLocalStorage(result.paste);
    }

    showNotification('Paste creado correctamente', 'success');
    pasteCount++;
    window.location.href = `/${result.urlId}`;
    
  } catch (error) {
    console.error('Error:', error);
    showNotification(`Error al crear paste: ${error.message}`, 'error');
    if (window.grecaptcha) grecaptcha.reset();
  }
});

  async function loadPastes() {
    try {
      const response = await fetch('/api/pastes');
      const firebasePastes = response.ok ? await response.json() : [];
      const localPastes = JSON.parse(localStorage.getItem('myPastes') || '[]');
      const allPastes = [...firebasePastes, ...localPastes];
      allPastes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      renderPastes(allPastes);
      pasteCount = allPastes.length;  
      console.log('Paste count:', pasteCount);
      if (pasteCount > MAX_PASTES_BEFORE_CAPTCHA) {
        document.getElementById('captcha-container').style.display = 'block';
      }
    } catch (error) {
      console.error('Error cargando pastes:', error);
      const localPastes = JSON.parse(localStorage.getItem('myPastes') || '[]');
      renderPastes(localPastes);
      pasteCount = localPastes.length;
      if (pasteCount > MAX_PASTES_BEFORE_CAPTCHA) {
        document.getElementById('captcha-container').style.display = 'block';
      }
    }
  }

  function renderPastes(pastes) {
    if (pastes.length > 0) {
      pasteList.innerHTML = `
        <h2>Tus Pastes</h2>
        <ul class="paste-list">
          ${pastes
            .map(
              (paste) => `
            <li>
              <a href="/${paste.urlId}">${paste.title}</a>
              <small>
                ${new Date(paste.createdAt).toLocaleString()}
              </small>
            </li>
          `
            )
            .join('')}
        </ul>
      `;
    } else {
      pasteList.innerHTML = '<p>No tienes pastes guardados</p>';
    }
  }

  function saveToLocalStorage(paste) {
    const pastes = JSON.parse(localStorage.getItem('myPastes') || '[]');
    const filteredPastes = pastes.filter((p) => p.urlId !== paste.urlId);
    filteredPastes.unshift(paste);
    localStorage.setItem('myPastes', JSON.stringify(filteredPastes));
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

clearButton?.addEventListener('click', () => {
  const existing = localStorage.getItem('myPastes');
  if (existing) {
    localStorage.removeItem('myPastes');
    loadPastes();
    showNotification('Historial local borrado', 'info');
  }
});
});