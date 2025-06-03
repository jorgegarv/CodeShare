    document.addEventListener('DOMContentLoaded', () => {
      const codeBlock = document.getElementById('codeContent');
      if (!codeBlock) return;

      // Si no hay lenguaje especificado, intentar detectarlo automáticamente
      const detectedLanguage = window.pasteLang;

      if (!detectedLanguage || detectedLanguage === 'plaintext') {
        const content = codeBlock.textContent;
        let autoDetectedLang = 'plaintext';

        if (content.match(/function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|\bvar\s+\w+|=>\s*{?|console\.log/)) {
          autoDetectedLang = 'javascript';
        } else if (content.match(/<\?php|<\?=|\$\w+\s*=|function\s+\w+\s*\(.*\)\s*{/)) {
          autoDetectedLang = 'php';
        } else if (content.match(/def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|print\s*\(|if\s+__name__\s*==\s*['""]__main__['""]:/)) {
          autoDetectedLang = 'python';
        } else if (content.match(/<(!DOCTYPE html|html|head|body|div|span|p|a|img)\b/i)) {
          autoDetectedLang = 'html';
        } else if (content.match(/{\s*[\w-]+\s*:\s*[^}]+}|\.\w+\s*{|#\w+\s*{|@media\s*\(/)) {
          autoDetectedLang = 'css';
        } else if (content.match(/SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|DELETE\s+FROM|CREATE\s+TABLE/i)) {
          autoDetectedLang = 'sql';
        } else if (content.match(/public\s+class\s+\w+|private\s+\w+|public\s+static\s+void\s+main/)) {
          autoDetectedLang = 'java';
        } else if (content.match(/^\s*{[\s\S]*}$/) && content.includes('"') && content.includes(':')) {
          autoDetectedLang = 'json';
        } else if (content.match(/^<\?xml|<\w+.*>.*<\/\w+>/)) {
          autoDetectedLang = 'xml';
        }

        // Actualizar la clase del elemento
        codeBlock.className = `language-${autoDetectedLang}`;

        const langDisplay = document.getElementById('languageDisplay');
        if (langDisplay) {
          langDisplay.textContent = autoDetectedLang;
        }
      }

      // Aplicar highlight.js
      hljs.highlightElement(codeBlock);

      // Agregar números de línea
      addLineNumbers(codeBlock);
    });

    // Función para agregar números de línea
    function addLineNumbers(codeBlock) {
      const lines = codeBlock.innerHTML.split('\n');
      const numberedLines = lines.map(line => `<span class="line">${line}</span>`);
      codeBlock.innerHTML = numberedLines.join('\n');
    }

    // Función copiar
    async function copyCode() {
      const btn = document.querySelector('.copy-btn');
      try {
        const code = document.getElementById('codeContent').textContent;
        await navigator.clipboard.writeText(code);

        btn.textContent = '✅ Copiado!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '📋 Copiar';
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = document.getElementById('codeContent').textContent;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          btn.textContent = '✅ Copiado!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = '📋 Copiar';
            btn.classList.remove('copied');
          }, 2000);
        } catch (e) {
          btn.textContent = '❌ Error';
          setTimeout(() => btn.textContent = '📋 Copiar', 2000);
        }
        document.body.removeChild(textArea);
      }
    }