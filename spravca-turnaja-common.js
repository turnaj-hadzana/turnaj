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
// NOVÉ REFERENCIE NA KOLEKCIU HRACÍCH DNÍ A SPORTOVÝCH HÁL (ak ich máš definované inde, skontroluj duplicity)
export const playingDaysCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'playingDays');
export const sportHallsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'sportHalls');
// NOVÁ REFERENCIA NA KOLEKCIU TÍMOV (pre funkciu getTeamName, ak clubsCollectionRef slúži aj ako teams)
// Ak máš samostatnú kolekciu pre tímy, použi ju tu. Inak clubsCollectionRef je OK.
// export const teamsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'teams');


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
        console.log("--- Začínam načítavať kategórie ---");
        const querySnapshot = await getDocs(categoriesCollectionRef);

        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne kategórie --';
            option.disabled = true;
            selectElement.appendChild(option);
            console.log("Žiadne kategórie sa nenašli vo Firestore.");
        } else {
            console.log(`Načítaných kategórií: ${querySnapshot.docs.length}`);
            querySnapshot.docs.sort((a, b) => {
                const nameA = (a.data().name || a.id).toLowerCase();
                const nameB = (b.data().name || b.id).toLowerCase();
                return nameA.localeCompare(nameB);
            }).forEach((doc) => {
                const categoryId = doc.id;
                const categoryData = doc.data();

                // Vypísanie všetkých údajov kategórie do konzoly
                console.log(`Kategória - ID: ${categoryId}, Dáta: `, categoryData);

                const option = document.createElement('option');
                option.value = categoryId;
                // Používame 'name' pole pre zobrazenie, ak existuje, inak ID dokumentu
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
        console.log("--- Načítanie kategórií dokončené ---");
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
        console.log(`--- Začínam načítavať skupiny pre kategóriu ID: ${selectedCategoryId} ---`);
        const q = query(groupsCollectionRef, where("categoryId", "==", selectedCategoryId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne skupiny pre túto kategóriu --';
            option.disabled = true;
            selectElement.appendChild(option);
            console.log(`Žiadne skupiny sa nenašli pre kategóriu ID: ${selectedCategoryId}`);
        } else {
            console.log(`Načítaných skupín pre kategóriu ID ${selectedCategoryId}: ${querySnapshot.docs.length}`);
            const sortedDocs = querySnapshot.docs.sort((a, b) => {
                const nameA = (a.data().name || a.id).toLowerCase();
                const nameB = (b.data().name || b.id).toLowerCase();
                return nameA.localeCompare(nameB);
            });
            sortedDocs.forEach((doc) => {
                const groupId = doc.id;
                const groupData = doc.data();

                // Vypísanie všetkých údajov skupiny do konzoly
                console.log(`Skupina - ID: ${groupId}, Dáta: `, groupData);

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
        console.log("--- Načítanie skupín dokončené ---");
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
        console.log(`--- Začínam načítavať tímy pre kategóriu ID: ${selectedCategoryId} a skupinu ID: ${selectedGroupId} ---`);
        const q = query(
            clubsCollectionRef, // Predpokladám, že clubsCollectionRef slúži aj ako teams
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
            console.log(`Žiadne tímy sa nenašli pre kategóriu ID: ${selectedCategoryId} a skupinu ID: ${selectedGroupId}`);
        } else {
            console.log(`Načítaných tímov pre kategóriu ID ${selectedCategoryId} a skupinu ID ${selectedGroupId}: ${querySnapshot.docs.length}`);
            const teamNumbers = querySnapshot.docs.map(doc => {
                const teamData = doc.data();
                // Vypísanie všetkých údajov tímu do konzoly
                console.log(`Tím - ID: ${doc.id}, Dáta: `, teamData);
                return teamData.orderNumber || teamData.teamNumber || doc.id;
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
        console.log("--- Načítanie tímov dokončené ---");
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
