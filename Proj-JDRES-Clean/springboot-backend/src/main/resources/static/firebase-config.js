import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCr0LUhwl5MdDCe7RBw6XPb6t0_-RmOzmw",
    authDomain: "syncplex-ca5c8.firebaseapp.com",
    projectId: "syncplex-ca5c8",
    storageBucket: "syncplex-ca5c8.firebasestorage.app",
    messagingSenderId: "972241272858",
    appId: "1:972241272858:web:ebdb48134de438ba21d1a3",
    measurementId: "G-RS4F4WL5CP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export default app;
