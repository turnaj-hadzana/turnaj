import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, openModal, closeModal, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, doc, showMessage, showConfirmation } from './spravca-turnaja-common.js';

const addButton = document.getElementById('addButton');
const categoriesContentSection = document.getElementById('categoriesContentSection');
const categoryTableBody = document.getElementById('categoryTableBody');
const categoryModal = document.getElementById('categoryModal');
const categoryModalCloseBtn = categoryModal ? categoryModal.querySelector('.category-modal-close') : null;
const categoryForm = document.getElementById('categoryForm');
const categoryNameInput = document.getElementById('categoryName');
const categoryModalTitle = document.getElementById('categoryModalTitle');

let currentCategoryModalMode = 'add';
let editingCategoryName = null; // Bude uchovávať ID dokumentu kategórie pri úprave

/**
 * Pridá riadok kategórie do tabuľky.
 * @param {string} categoryId - ID dokumentu kategórie vo Firestore.
 * @param {string} categoryName - Zobrazovaný názov kategórie.
 */
function addCategoryRowToTable(categoryId, categoryName) {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = categoryName;
    const actionsTd = document.createElement('td');
    actionsTd.style.whiteSpace = 'nowrap';

    const renameButton = document.createElement('button');
    renameButton.textContent = 'Premenovať';
    renameButton.classList.add('action-button');
    renameButton.onclick = function() {
        currentCategoryModalMode = 'edit';
        editingCategoryName = categoryId; // Uložíme skutočné ID dokumentu
        if (categoryModalTitle) categoryModalTitle.textContent = 'Premenovať kategóriu';
        if (categoryNameInput) {
            categoryNameInput.value = categoryName;
            // Uložíme starý zobrazovaný názov pre neskoršie porovnanie a správy
            categoryNameInput.dataset.oldCategoryDisplayName = categoryName;
        }
        openModal(categoryModal);
        if (categoryNameInput) categoryNameInput.focus();
    };

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Vymazať';
    deleteButton.classList.add('action-button', 'delete-button');
    deleteButton.onclick = async function() {
        const categoryIdToDelete = categoryId; // Použijeme skutočné ID dokumentu
        const categoryDisplayName = categoryName; // Použijeme zobrazovaný názov pre prompt

        const confirmed = await showConfirmation('Potvrdenie vymazania', `Naozaj chcete vymazať kategóriu "${categoryDisplayName}"? Akékoľvek priradené skupiny a kluby prídu o svoju kategóriu (categoryId a groupId sa nastavia na null)!`);
        if (!confirmed) {
            return;
        }

        try {
            const batch = writeBatch(db);

            // 1. Nájdeme a aktualizujeme kluby patriace do skupín tejto kategórie
            const groupsQuery = query(groupsCollectionRef, where('categoryId', '==', categoryIdToDelete));
            const groupsSnapshot = await getDocs(groupsQuery);
            for (const groupDoc of groupsSnapshot.docs) {
                const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', groupDoc.id));
                const clubsSnapshot = await getDocs(clubsInGroupQuery);
                clubsSnapshot.forEach(clubDoc => {
                    batch.update(clubDoc.ref, { categoryId: null, groupId: null, orderInGroup: null });
                });
                batch.delete(groupDoc.ref); // Vymažeme aj samotnú skupinu
            }

            // 2. Nájdeme a aktualizujeme kluby, ktoré boli priradené len k tejto kategórii (groupId == null)
            const unassignedClubsQuery = query(clubsCollectionRef, where('categoryId', '==', categoryIdToDelete), where('groupId', '==', null));
            const unassignedClubsSnapshot = await getDocs(unassignedClubsQuery);
            unassignedClubsSnapshot.forEach(doc => {
                batch.update(doc.ref, { categoryId: null });
            });

            // 3. Vymažeme samotný dokument kategórie
            batch.delete(doc(categoriesCollectionRef, categoryIdToDelete));
            await batch.commit();

            await showMessage('Potvrdenie', `Kategória "${categoryDisplayName}" úspešne vymazaná.`);
            loadCategoriesTable();
        } catch (error) {
            console.error('Chyba pri mazaní kategórie:', error);
            await showMessage('Chyba', 'Chyba pri mazaní kategórie! Prosím, skúste znova.');
        }
    };

    actionsTd.appendChild(renameButton);
    actionsTd.appendChild(deleteButton);
    tr.appendChild(nameTd);
    tr.appendChild(actionsTd);
    if (categoryTableBody) categoryTableBody.appendChild(tr);
}

/**
 * Načíta kategórie z Firestore a naplní tabuľku.
 */
async function loadCategoriesTable() {
    if (!categoryTableBody) return;
    categoryTableBody.innerHTML = ''; // Vyčistí tabuľku pred načítaním
    try {
        const querySnapshot = await getDocs(categoriesCollectionRef);
        if (querySnapshot.empty) {
            const noDataRow = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = "Žiadne kategórie zatiaľ pridané.";
            td.style.textAlign = 'center';
            noDataRow.appendChild(td);
            categoryTableBody.appendChild(noDataRow);
        } else {
            // Zoradíme kategórie podľa poľa 'name' pre zobrazenie
            const sortedDocs = querySnapshot.docs.sort((a, b) => {
                const nameA = (a.data().name || '').toLowerCase();
                const nameB = (b.data().name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            sortedDocs.forEach((doc) => {
                const categoryId = doc.id; // Získame ID dokumentu
                const categoryName = doc.data().name; // Získame pole 'name'
                if (categoryName) { // Pridáme len ak názov existuje
                    addCategoryRowToTable(categoryId, categoryName);
                }
            });
        }
    } catch (error) {
        console.error('Chyba pri načítaní kategórií:', error);
        await showMessage('Chyba', 'Chyba pri načítaní kategórií!');
        const errorRow = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 2;
        td.textContent = "Chyba pri načítaní kategórií.";
        td.style.textAlign = 'center';
        errorRow.appendChild(td);
        categoryTableBody.appendChild(errorRow);
    }
}

/**
 * Resetuje stav modálneho okna kategórie.
 */
function resetCategoryModal() {
    currentCategoryModalMode = 'add';
    editingCategoryName = null; // Vyčistíme ID kategórie
    if (categoryForm) categoryForm.reset();
    if (categoryNameInput) {
        categoryNameInput.value = '';
        delete categoryNameInput.dataset.oldCategoryDisplayName; // Vyčistíme starý zobrazovaný názov
    }
    if (categoryModalTitle) categoryModalTitle.textContent = 'Pridať kategóriu';
}

// Spustí sa po načítaní DOM obsahu
document.addEventListener('DOMContentLoaded', () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html'; // Presmerovanie na prihlasovaciu stránku, ak nie je admin
        return;
    }

    loadCategoriesTable(); // Načíta tabuľku kategórií pri štarte

    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    if (addButton) {
        addButton.style.display = 'block';
        addButton.title = "Pridať kategóriu";
        addButton.onclick = () => {
            resetCategoryModal();
            openModal(categoryModal);
            if (categoryNameInput) categoryNameInput.focus();
        };
    }
});

// Listener pre zatvorenie modálneho okna
if (categoryModalCloseBtn) {
    categoryModalCloseBtn.addEventListener('click', () => {
        closeModal(categoryModal);
        resetCategoryModal();
    });
}

// Listener pre odoslanie formulára kategórie
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = categoryNameInput ? categoryNameInput.value.trim() : '';

        if (categoryName === '') {
            await showMessage('Chyba', 'Názov kategórie nemôže byť prázdny.');
            if (categoryNameInput) categoryNameInput.focus();
            return;
        }

        if (currentCategoryModalMode === 'add') {
            // Režim pridávania novej kategórie
            try {
                // Skontrolujeme, či kategória s rovnakým názvom už existuje (podľa poľa 'name')
                const qExistingName = query(categoriesCollectionRef, where('name', '==', categoryName));
                const existingNameSnapshot = await getDocs(qExistingName);
                if (!existingNameSnapshot.empty) {
                    await showMessage('Upozornenie', `Kategória s názvom "${categoryName}" už existuje!`);
                    if (categoryNameInput) categoryNameInput.focus();
                    return;
                }

                // Generujeme náhodné ID pre nový dokument kategórie
                const newCategoryDocRef = doc(categoriesCollectionRef);
                await setDoc(newCategoryDocRef, { name: categoryName });

                await showMessage('Potvrdenie', `Kategória "${categoryName}" úspešne pridaná.`);
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
                loadCategoriesTable();
            } catch (error) {
                console.error('Chyba pri pridávaní kategórie:', error);
                await showMessage('Chyba', 'Chyba pri pridávaní kategórie! Prosím, skúste znova.');
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
            }
        } else if (currentCategoryModalMode === 'edit') {
            // Režim úpravy existujúcej kategórie
            const categoryIdToUpdate = editingCategoryName; // Skutočné ID dokumentu
            const oldCategoryDisplayName = categoryNameInput.dataset.oldCategoryDisplayName; // Starý zobrazovaný názov
            const newCategoryDisplayName = categoryName; // Nový zobrazovaný názov

            if (!categoryIdToUpdate) {
                await showMessage('Chyba', "Chyba pri úprave kategórie: Chýba ID kategórie.");
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
                loadCategoriesTable();
                return;
            }

            if (newCategoryDisplayName === oldCategoryDisplayName) {
                // Ak sa názov nezmenil, len zatvoríme modál
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
                return;
            }

            try {
                // Skontrolujeme, či kategória s novým názvom už existuje (okrem tej, ktorú práve upravujeme)
                const qExistingName = query(categoriesCollectionRef, where('name', '==', newCategoryDisplayName));
                const existingNameSnapshot = await getDocs(qExistingName);
                if (!existingNameSnapshot.empty && existingNameSnapshot.docs[0].id !== categoryIdToUpdate) {
                    await showMessage('Upozornenie', `Kategória s názvom "${newCategoryDisplayName}" už existuje!`);
                    if (categoryNameInput) categoryNameInput.focus();
                    return;
                }

                // Aktualizujeme iba pole 'name' v existujúcom dokumente kategórie
                const categoryDocRef = doc(categoriesCollectionRef, categoryIdToUpdate);
                await updateDoc(categoryDocRef, { name: newCategoryDisplayName });

                await showMessage('Potvrdenie', `Kategória "${oldCategoryDisplayName}" úspešne premenovaná na "${newCategoryDisplayName}".`);
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
                loadCategoriesTable();
            } catch (error) {
                console.error('Chyba pri premenovaní kategórie:', error);
                await showMessage('Chyba', 'Chyba pri premenovaní kategórie! Prosím, skúste znova.');
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
            }
        }
    });
}
