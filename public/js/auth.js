document.addEventListener('DOMContentLoaded', function() {
  // Configuración
  const firebaseConfig = {
    apiKey: "AIzaSyBJ5m7gXhQBmr_LcIIBQQ-UcArE2PAcHhk",
    authDomain: "copypaste-91817.firebaseapp.com",
    projectId: "copypaste-91817",
    storageBucket: "copypaste-91817.appspot.com",
    messagingSenderId: "1018471230331",
    appId: "1:1018471230331:web:dba7d6a14ed3d045d5abde"
  };

  // Inicialización
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  document.getElementById('google-login')?.addEventListener('click', function() {
    auth.signInWithPopup(provider)
      .then(function(result) {
        return result.user.getIdToken();
      })
      .then(function(idToken) {
        return fetch('/sessionLogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Error en la autenticación');
        return response.json();
      })
      .then(function() {
        window.location.reload();
      })
      .catch(function(error) {
        console.error("Error:", error);
        alert("Error de autenticación: " + error.message);
      });
  });

  document.getElementById('logout-btn')?.addEventListener('click', function() {
    auth.signOut()
      .then(function() {
        return fetch('/sessionLogout', { method: 'POST' });
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Error al cerrar sesión');
        window.location.reload();
      })
      .catch(function(error) {
        console.error("Error:", error);
        alert("Error al cerrar sesión: " + error.message);
      });
  });
});