// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBulqDJunx7mkijQVjTh_WZdMfS9yQGfxI",
    authDomain: "gestion-de-activos-60f8c.firebaseapp.com",
    projectId: "gestion-de-activos-60f8c",
    storageBucket: "gestion-de-activos-60f8c.firebasestorage.app",
    messagingSenderId: "1024745036309",
    appId: "1:1024745036309:web:0bfd76401887e548ac8c1c",
    measurementId: "G-HHRJK85QFM"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log('Firebase inicializado correctamente');
} else {
    console.error('Firebase no está disponible');
}
