import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, addDoc, updateDoc, writeBatch, orderBy } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyD0h0rQZiIGi0-UDb4-YU_JihRGiIlfz40", // Použite váš skutočný API kľúč
    authDomain: "turnaj-a28c5.firebaseapp.com",
    projectId: "turnaj-a28c5",
    storageBucket: "turnaj-a28c5.appspot.com",
    messagingSenderId: "13732191148",
    appId: "1:13732191148:web:5ad78eaef2ad452a10f809"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Všetky referencie na kolekcie s novou, vnorenou cestou
export const categoriesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'categories');
export const groupsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'groups');
export const clubsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'clubs');
export const matchesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'matches');
export const playingDaysCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'playingDays'); // Nová kolekcia
export const sportHallsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'sportHalls'); // Nová kolekcia


// Funkcie pre modálne okná (zostávajú nezmenené)
export function openModal(modalElement) {
    if (modalElement) {
        modalElement.style.display = 'block';
        document.body.classList.add('modal-open');
    }
}

export function closeModal(modalElement) {
    if (modalElement) {
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Funkcie pre napĺňanie select boxov (zostávajú nezmenené)
export async function populateCategorySelect(selectElement, selectedCategoryId = '') {
    selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
    try {
        const querySnapshot = await getDocs(categoriesCollectionRef);
        querySnapshot.forEach((doc) => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = category.name;
            selectElement.appendChild(option);
        });
        if (selectedCategoryId) {
            selectElement.value = selectedCategoryId;
        }
    } catch (error) {
        console.error("Chyba pri načítaní kategórií: ", error);
    }
}

export async function populateGroupSelect(categoryId, selectElement, selectedGroupId = '') {
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
    selectElement.disabled = true; // Zakaždým ju najskôr zablokuj

    if (!categoryId) {
        return; // Ak nie je vybraná kategória, nič nenačítaj
    }

    try {
        const q = query(groupsCollectionRef, where("categoryId", "==", categoryId), orderBy("name"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne skupiny v tejto kategórii --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.forEach((doc) => {
                const group = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = group.name;
                selectElement.appendChild(option);
            });
            if (selectedGroupId) {
                selectElement.value = selectedGroupId;
            } else {
                selectElement.value = ""; // Vynúti výber prvej možnosti
            }
        }
        selectElement.disabled = false;
    } catch (error) {
        console.error("Chyba pri načítaní skupín: ", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

export async function populateTeamNumberSelect(categoryId, groupId, selectElement, selectedTeamNumber = '') {
    selectElement.innerHTML = '<option value="">-- Vyberte poradové číslo tímu --</option>';
    selectElement.disabled = true;

    if (!categoryId || !groupId) {
        return;
    }

    try {
        const q = query(
            clubsCollectionRef,
            where("categoryId", "==", categoryId),
            where("groupId", "==", groupId),
            orderBy("orderInGroup")
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne tímy v tejto skupine --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            const teamNumbers = querySnapshot.docs.map(doc => doc.data().orderInGroup || doc.data().orderNumber || doc.data().teamNumber || doc.id); 
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

            if (selectedTeamNumber && selectElement.querySelector(`option[value=\"${selectedTeamNumber}\"]`)) {
                selectElement.value = selectedTeamNumber;
            } else {
                selectElement.value = "";
            }
        }
        selectElement.disabled = false;
    } catch (error) {
        console.error("Chyba pri načítaní tímov: ", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
        selectElement.disabled = true;
    }
}

// Export ostatných Firebase funkcií, ktoré sa používajú priamo v JS súboroch
export { db, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, addDoc, doc, orderBy };
