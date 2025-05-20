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

export const categoriesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'categories');
export const groupsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'groups');
export const clubsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'clubs');
// NOVÁ REFERENCIA NA KOLEKCIU ZÁPASOV
export const matchesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'matches');


let openModalCount = 0;

export function openModal(modalElement) {
    if (!modalElement) {
        return;
    }
    openModalCount++;
    modalElement.style.display = 'flex';
    document.body.classList.add('modal-open');
}

export function closeModal(modalElement) {
    if (!modalElement) {
        return;
    }
    openModalCount--;
    if (openModalCount <= 0) {
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
        openModalCount = 0; // Reset pre istotu
    } else {
        modalElement.style.display = 'none'; // Zatvorí konkrétny modal, ale nezatvorí body.modal-open, ak sú ďalšie
    }
}

// Global click handler to close modal when clicking outside modal-content
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target);
    }
});

export async function populateCategorySelect(selectElement, selectedCategoryId = null) {
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
    selectElement.disabled = true;

    try {
        const querySnapshot = await getDocs(categoriesCollectionRef);
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne kategórie --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.docs.sort((a, b) => {
                const nameA = (a.data().name || a.id).toLowerCase();
                const nameB = (b.data().name || b.id).toLowerCase();
                return nameA.localeCompare(nameB);
            }).forEach((doc) => {
                const categoryId = doc.id;
                const categoryData = doc.data();
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = categoryData.name || categoryId;
                selectElement.appendChild(option);
            });

            if (selectedCategoryId && selectElement.querySelector(`option[value="${selectedCategoryId}"]`)) {
                selectElement.value = selectedCategoryId;
            } else {
                selectElement.value = "";
            }
        }
        selectElement.disabled = false;
    } catch (error) {
        console.error("Chyba pri načítaní kategórií: ", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
        selectElement.disabled = true;
    }
}

export async function populateGroupSelect(selectedCategoryId, selectElement, selectedGroupId = null) {
    if (!selectedCategoryId || !selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte kategóriu najprv --</option>';
        selectElement.disabled = true;
        return;
    }

    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
    selectElement.disabled = true;

    try {
        const q = query(groupsCollectionRef, where("categoryId", "==", selectedCategoryId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne skupiny pre túto kategóriu --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            const sortedDocs = querySnapshot.docs.sort((a, b) => {
                const nameA = (a.data().name || a.id).toLowerCase();
                const nameB = (b.data().name || b.id).toLowerCase();
                return nameA.localeCompare(nameB);
            });
            sortedDocs.forEach((doc) => {
                const groupId = doc.id;
                const groupData = doc.data();
                const groupName = groupData.name || groupId;
                const option = document.createElement('option');
                option.value = groupId;
                option.textContent = groupName;
                selectElement.appendChild(option);
            });

            if (selectedGroupId && selectElement.querySelector(`option[value="${selectedGroupId}"]`)) {
                selectElement.value = selectedGroupId;
            } else {
                selectElement.value = "";
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
        selectElement.disabled = true;
    }
}

// Zostáva aj keď sa select už nepoužíva, kvôli getTeamName()
export async function populateTeamNumberSelect(selectedCategoryId, selectedGroupId, selectElement, selectedTeamNumber = null) {
    if (!selectedCategoryId || !selectedGroupId || !selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte kategóriu a skupinu --</option>';
        selectElement.disabled = true;
        return;
    }

    selectElement.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
    selectElement.disabled = true;

    try {
        const q = query(
            clubsCollectionRef,
            where("categoryId", "==", selectedCategoryId),
            where("groupId", "==", selectedGroupId)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne tímy v tejto skupine --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            const teamNumbers = querySnapshot.docs.map(doc => doc.data().orderNumber || doc.data().teamNumber || doc.id); 
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
        console.error("Chyba pri načítaní tímov: ", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
        selectElement.disabled = true;
    }
}


export { db, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, addDoc, doc, orderBy };
