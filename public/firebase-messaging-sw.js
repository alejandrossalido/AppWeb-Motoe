/* eslint-disable no-undef */
// 1. Cargar scripts de Firebase (Service Worker context)
importScripts('https://www.gstatic.com/firebasejs/9.17.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.17.2/firebase-messaging-compat.js');

// 2. Configuración (Credenciales reales)
const firebaseConfig = {
    apiKey: "AIzaSyBgmZFlq7If9BQmQBB-IjfIQco3jbau0TA",
    authDomain: "moto-e-app.firebaseapp.com",
    projectId: "moto-e-app",
    storageBucket: "moto-e-app.firebasestorage.app",
    messagingSenderId: "1050940329334",
    appId: "1:1050940329334:web:fb00dd1eae6737af8cfe57",
    measurementId: "G-YD5EREXSHF"
};

// 3. Inicializar Firebase en segundo plano
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 4. Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    // Personalizar la notificación visual
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/vite.svg', // Icono por defecto (puedes cambiarlo por tu logo)
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
