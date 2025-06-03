document.addEventListener('DOMContentLoaded', function () {
      const editor = document.getElementById('paste-content');
      const lineNumbers = document.getElementById('line-numbers');
      const codePreview = document.getElementById('code-preview');

      // Actualizar números de línea
      function updateLineNumbers() {
        const lines = editor.value.split('\n');
        lineNumbers.innerHTML = lines.map((_, i) => i + 1).join('<br>');
      }

      // Eventos
      editor.addEventListener('input', () => {
        updateLineNumbers();
      });

      editor.addEventListener('scroll', () => {
        lineNumbers.scrollTop = editor.scrollTop;
        codePreview.scrollTop = editor.scrollTop;
      });

      // Manejar tabulación
      editor.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = this.selectionStart;
          const end = this.selectionEnd;
          this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
          this.selectionStart = this.selectionEnd = start + 2;
          updateLineNumbers();
        }
      });

      // Inicialización
      updateLineNumbers();
    });