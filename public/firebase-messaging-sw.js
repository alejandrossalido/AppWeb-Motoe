/* eslint-disable no-undef */
// 1. Cargamos las librerías necesarias (Igual que antes)
importScripts('https://www.gstatic.com/firebasejs/9.17.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.17.2/firebase-messaging-compat.js');

// 2. TUS CREDENCIALES (Son las mismas que ya tenías, no las perdemos)
const firebaseConfig = {
    apiKey: "AIzaSyBgmZFlq7If9BQmQBB-IjfIQco3jbau0TA",
    authDomain: "moto-e-app.firebaseapp.com",
    projectId: "moto-e-app",
    storageBucket: "moto-e-app.firebasestorage.app",
    messagingSenderId: "1050940329334",
    appId: "1:1050940329334:web:fb00dd1eae6737af8cfe57",
    measurementId: "G-YD5EREXSHF"
};

// 3. Inicializar (Igual que antes)
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. AQUÍ ESTÁ EL CAMBIO (La parte visual)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje recibido:', payload);

    // Truco: Si el mensaje no trae título, ponemos "UPV MOTO-E"
    const notificationTitle = payload.notification.title || 'UPV MOTO-E';

    const notificationOptions = {
        body: payload.notification.body,

        // CAMBIO 1: Usamos tu logo en vez de vite.svg
        icon: '/logo.png',

        // CAMBIO 2: Añadimos el icono pequeño para Android
        badge: '/logo.png',

        data: payload.data,
        vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});