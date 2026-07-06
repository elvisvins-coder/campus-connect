importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA4XMVH3pupxbA2Hmh716neg8-DGpGewZo",
  authDomain: "tsucampus-network.firebaseapp.com",
  projectId: "tsucampus-network",
  storageBucket: "tsucampus-network.firebasestorage.app",
  messagingSenderId: "394909553341",
  appId: "1:394909553341:web:3ec6178af25b069e431dd4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico',
  });
});