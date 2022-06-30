import { initializeApp } from "firebase/app";
import { getDatabase, onValue, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA17AjDSgyT32nA1VyggpHcAp9frI9MXes",
  authDomain: "iotsystem-f2bdd.firebaseapp.com",
  projectId: "iotsystem-f2bdd",
  storageBucket: "iotsystem-f2bdd.appspot.com",
  messagingSenderId: "475163319606",
  appId: "1:475163319606:web:345dbec20e97a51d40e797",
  measurementId: "G-CL6ZKT2GDH",
};

const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

export { database, onValue, ref, set };
