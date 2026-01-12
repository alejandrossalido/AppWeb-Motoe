
import { initializeApp } from "firebase/app";
import { BFcm, getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBgmZFlq7If9BQmQBB-IjfIQco3jbau0TA",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "moto-e-app.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "moto-e-app",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "moto-e-app.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1050940329334",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1050940329334:web:fb00dd1eae6737af8cfe57"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const VAPID_KEY = "BA1qG2GZ1cemkvwTahxM22rlx3ORcX3DW4Tv1HRMSgacdHaDVSjMUX7BcqNtbejwW8qGLhUY0dT88i6qIMuQnsM";
