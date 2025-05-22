import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, addDoc, updateDoc, writeBatch, orderBy } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
const firebaseConfig = {
  apiKey: "AIzaSyD0h0rQZiIGi0-UDb4-YU_JihRGpIlfz40",
  authDomain: "turnaj-a28c5.firebaseapp.com",
  projectId: "turnaj-a28c5",
  storageBucket: "turnaj-a28c5.firebasestorage.app",
  messagingSenderId: "13732191148",
  appId: "1:13732191148:web:5ad78eaef2ad452a10f809"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get the app ID from the global variable, or use a default if not defined
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export const categoriesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'categories');
export const groupsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'groups');
export const clubsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'clubs');
export const matchesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'matches');
export const playingDaysCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'playingDays');
export const placesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'places'); // ZMENENÉ: Pôvodne sportHallsCollectionRef
export const busesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'buses');
export const settingsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'settings');
export const teamAccommodationsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'teamAccommodations'); // NOVÉ: Kolekcia pre priradenia ubytovania

/**
 * Otvorí modálne okno.
 * @param {HTMLElement} modalElement Element modálneho okna.
 */
function openModal(modalElement) {
    modalElement.style.display = 'block';
    document.body.classList.add('modal-open'); // Pridá triedu pre zablokovanie scrollovania
}

/**
 * Zatvorí modálne okno.
 * @param {HTMLElement} modalElement Element modálneho okna.
 */
function closeModal(modalElement) {
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open'); // Odstráni triedu pre zablokovanie scrollovania
}

/**
 * Naplní select element kategóriami z Firestore.
 * @param {HTMLSelectElement} selectElement Element <select>, ktorý sa má naplniť.
 * @param {string} [selectedCategoryId=''] Voliteľné ID kategórie, ktorá má byť predvybraná.
 */
async function populateCategorySelect(selectElement, selectedCategoryId = '') {
    selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
    try {
        const querySnapshot = await getDocs(query(categoriesCollectionRef, orderBy("name", "asc")));
        querySnapshot.forEach((doc) => {
            const category = { id: doc.id, ...doc.data() };
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            selectElement.appendChild(option);
        });
        if (selectedCategoryId) {
            selectElement.value = selectedCategoryId;
        }
    } catch (error) {
        console.error("Error loading categories: ", error);
    }
}

/**
 * Naplní select element skupinami pre danú kategóriu z Firestore.
 * @param {string} categoryId ID vybranej kategórie.
 * @param {HTMLSelectElement} selectElement Element <select>, ktorý sa má naplniť.
 * @param {string} [selectedGroupId=''] Voliteľné ID skupiny, ktorá má byť predvybraná.
 */
async function populateGroupSelect(categoryId, selectElement, selectedGroupId = '') {
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
    if (!categoryId) {
        selectElement.disabled = true;
        return;
    }
    selectElement.disabled = false;
    try {
        const q = query(groupsCollectionRef, where("categoryId", "==", categoryId), orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const group = { id: doc.id, ...doc.data() };
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            selectElement.appendChild(option);
        });
        if (selectedGroupId) {
            selectElement.value = selectedGroupId;
        }
    } catch (error) {
        console.error("Error loading groups: ", error);
    }
}

/**
 * Naplní select element číslami tímov pre danú kategóriu a skupinu.
 * @param {string} categoryId ID vybranej kategórie.
 * @param {string} groupId ID vybranej skupiny.
 * @param {HTMLSelectElement} selectElement Element <select>, ktorý sa má naplniť.
 * @param {string} [selectedTeamNumber=''] Voliteľné číslo tímu, ktoré má byť predvybrané.
 */
async function populateTeamNumberSelect(categoryId, groupId, selectElement, selectedTeamNumber = '') {
    selectElement.innerHTML = '<option value="">-- Vyberte číslo tímu --</option>';
    selectElement.disabled = true;
    if (!categoryId || !groupId) {
        return;
    }
    try {
        const q = query(
            clubsCollectionRef,
            where("categoryId", "==", categoryId),
            where("groupId", "==", groupId)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne tímy v tejto skupine --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            const teamNumbers = querySnapshot.docs.map(doc => {
                const teamData = doc.data();
                return teamData.orderNumber || teamData.teamNumber || doc.id; // Použiť orderNumber, ak existuje, inak teamNumber, inak ID
            });
            teamNumbers.sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                return numA - numB;
            });
            teamNumbers.forEach((teamNumber) => {
                const option = document.createElement('option');
                option.value = teamNumber;
                option.textContent = teamNumber;
                selectElement.appendChild(option);
            });
            if (selectedTeamNumber && selectElement.querySelector(`option[value="${selectedTeamNumber}"]`)) {
                selectElement.value = selectedTeamNumber;
            } else {
                selectElement.value = "";
            }
        }
        selectElement.disabled = false;
    } catch (error) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
        selectElement.disabled = true;
    }
}

export { db, openModal, closeModal, populateCategorySelect, populateGroupSelect, populateTeamNumberSelect, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, addDoc, doc, orderBy };
