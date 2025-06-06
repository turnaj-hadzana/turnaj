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

// Získajte ID aplikácie z globálnej premennej, alebo použite predvolené, ak nie je definované
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export const categoriesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'categories');
export const groupsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'groups');
export const clubsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'clubs');
export const matchesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'matches');
export const playingDaysCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'playingDays');
export const placesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'places');
export const busesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'buses');
export const teamAccommodationsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'teamAccommodations');
export const settingsCollectionRef = collection(db, `artifacts/${appId}/public/data/settings`);

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
        openModalCount = 0;
    } else {
        modalElement.style.display = 'none';
    }
}
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target);
    }
});

// Globálne premenné pre modálne okno správ
let resolveMessagePromise;
let rejectMessagePromise;
let messageModalElement;
let messageModalTitleElement;
let messageModalTextElement;
let messageModalButtonsElement;

document.addEventListener('DOMContentLoaded', () => {
    messageModalElement = document.getElementById('messageModal');
    if (messageModalElement) {
        messageModalTitleElement = messageModalElement.querySelector('#messageModalTitle');
        messageModalTextElement = messageModalElement.querySelector('#messageModalText');
        messageModalButtonsElement = messageModalElement.querySelector('#messageModalButtons');

        const messageModalCloseBtn = messageModalElement.querySelector('.message-modal-close');
        if (messageModalCloseBtn) {
            messageModalCloseBtn.addEventListener('click', () => {
                closeModal(messageModalElement);
                if (rejectMessagePromise) {
                    rejectMessagePromise(new Error('Modal closed by user'));
                }
            });
        }
    }
});

/**
 * Zobrazí generické modálne okno so správou.
 * @param {string} title - Nadpis modálneho okna.
 * @param {string} message - Text správy.
 * @returns {Promise<boolean>} - Vždy sa vyrieši na `true` po kliknutí na OK.
 */
export function showMessage(title, message) {
    return new Promise((resolve) => {
        if (!messageModalElement) {
            console.error('Message modal elements not found.');
            resolve(false); // Záložný stav, ak modál nie je prítomný
            return;
        }
        messageModalTitleElement.textContent = title;
        messageModalTextElement.textContent = message;
        messageModalButtonsElement.innerHTML = ''; // Vyčistí predchádzajúce tlačidlá
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.classList.add('action-button');
        okButton.onclick = () => {
            closeModal(messageModalElement);
            resolve(true);
        };
        messageModalButtonsElement.appendChild(okButton);
        openModal(messageModalElement);
    });
}

/**
 * Zobrazí generické modálne okno s potvrdením (Áno/Zrušiť).
 * @param {string} title - Nadpis modálneho okna.
 * @param {string} message - Text otázky.
 * @returns {Promise<boolean>} - Vyrieši sa na `true` pre Áno, `false` pre Zrušiť.
 */
export function showConfirmation(title, message) {
    return new Promise((resolve, reject) => {
        if (!messageModalElement) {
            console.error('Confirmation modal elements not found.');
            resolve(false); // Záložný stav, ak modál nie je prítomný
            return;
        }
        resolveMessagePromise = resolve;
        rejectMessagePromise = reject;

        messageModalTitleElement.textContent = title;
        messageModalTextElement.textContent = message;
        messageModalButtonsElement.innerHTML = ''; // Vyčistí predchádzajúce tlačidlá

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Áno';
        confirmButton.classList.add('action-button', 'confirm-button');
        confirmButton.onclick = () => {
            closeModal(messageModalElement);
            resolveMessagePromise(true);
        };

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Zrušiť';
        cancelButton.classList.add('action-button', 'cancel-button');
        cancelButton.onclick = () => {
            closeModal(messageModalElement);
            resolveMessagePromise(false); // Používateľ zrušil
        };

        messageModalButtonsElement.appendChild(confirmButton);
        messageModalButtonsElement.appendChild(cancelButton);
        openModal(messageModalElement);
    });
}

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
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
        selectElement.disabled = true;
    }
}

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
            const teamNumbers = querySnapshot.docs.map(doc => {
                const teamData = doc.data();
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
    } catch (error) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
        selectElement.disabled = true;
    }
}
export { db, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, addDoc, doc, orderBy };
