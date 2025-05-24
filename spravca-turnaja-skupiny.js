import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, doc, showMessage, showConfirmation } from './spravca-turnaja-common.js';

const addButton = document.getElementById('addButton');
const groupsContentDiv = document.getElementById('groupsContent');
const groupModal = document.getElementById('groupModal');
const groupModalCloseBtn = groupModal ? groupModal.querySelector('.group-modal-close') : null;
const groupForm = document.getElementById('groupForm');
const groupCategorySelect = document.getElementById('groupCategory');
const groupNameInput = document.getElementById('groupName');
const groupModalTitle = document.getElementById('groupModalTitle');
const groupFormSubmitButton = groupForm ? groupForm.querySelector('button[type="submit"]') : null;

let currentGroupModalMode = 'add';
let editingGroupId = null;

/**
 * Otvorí modálne okno pre pridanie alebo úpravu skupiny.
 * @param {string|null} groupId - ID skupiny, ak sa upravuje existujúca skupina.
 * @param {object|null} groupData - Dáta skupiny, ak sa upravuje existujúca skupina.
 */
async function openGroupModal(groupId = null, groupData = null) {
    if (!groupModal || !groupForm || !groupCategorySelect || !groupNameInput || !groupModalTitle || !groupFormSubmitButton) {
        if (groupModal) closeModal(groupModal);
        return;
    }
    openModal(groupModal);
    groupForm.reset();
    groupNameInput.disabled = false;
    groupFormSubmitButton.textContent = 'Uložiť';

    if (groupId && groupData) {
        currentGroupModalMode = 'edit';
        editingGroupId = groupId;
        groupModalTitle.textContent = 'Premenovať skupinu';
        groupFormSubmitButton.textContent = 'Uložiť zmeny';
        await populateCategorySelect(groupCategorySelect, groupData.categoryId);
        groupCategorySelect.disabled = false;
        groupNameInput.value = groupData.name || '';
        groupNameInput.focus();
    } else {
        currentGroupModalMode = 'add';
        editingGroupId = null;
        groupModalTitle.textContent = 'Pridať skupinu';
        groupFormSubmitButton.textContent = 'Uložiť';
        await populateCategorySelect(groupCategorySelect, null);
        groupCategorySelect.disabled = false;
        if (groupCategorySelect.options.length > 1) {
            groupCategorySelect.focus();
        } else {
            groupNameInput.focus();
        }
    }
}

/**
 * Zobrazí skupiny kategorizované podľa kategórií.
 */
async function displayGroupsByCategory() {
    if (!groupsContentDiv) return;
    groupsContentDiv.innerHTML = ''; // Vyčistí obsah pred načítaním
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        // Zoradíme kategórie podľa poľa 'name' pre zobrazenie
        const sortedCategoriesDocs = categoriesSnapshot.docs.sort((a, b) => {
            const nameA = (a.data().name || '').toLowerCase();
            const nameB = (b.data().name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        const categories = sortedCategoriesDocs.map(doc => ({ id: doc.id, data: doc.data() }));

        if (categories.length === 0) {
            const message = document.createElement('p');
            message.textContent = "Pridajte kategórie v sekcii 'Kategórie' pre zobrazenie skupín.";
            groupsContentDiv.appendChild(message);
            return;
        }

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const groupsByCategory = {};
        groupsSnapshot.forEach(doc => {
            const groupData = doc.data();
            const groupId = doc.id;
            const categoryId = groupData.categoryId;
            if (categoryId) {
                if (!groupsByCategory[categoryId]) {
                    groupsByCategory[categoryId] = [];
                }
                groupsByCategory[categoryId].push({ id: groupId, data: groupData });
            }
        });

        categories.forEach(category => {
            const categoryDisplayName = category.data.name || category.id; // Používame názov kategórie z dát, s fallbackom na ID
            const categoryId = category.id; // ID kategórie pre filtrovanie skupín
            const groupsForThisCategory = groupsByCategory[categoryId] || [];

            const categorySectionDiv = document.createElement('div');
            categorySectionDiv.classList.add('category-group-section', 'section-block');

            const categoryHeading = document.createElement('h2');
            categoryHeading.textContent = categoryDisplayName; // Zobrazujeme názov kategórie
            categorySectionDiv.appendChild(categoryHeading);

            const categoryGroupsTable = document.createElement('table');
            categoryGroupsTable.classList.add('category-group-table');

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const groupNameTh = document.createElement('th');
            groupNameTh.textContent = 'Názov skupiny';
            const actionsTh = document.createElement('th');
            actionsTh.textContent = '';
            headerRow.appendChild(groupNameTh);
            headerRow.appendChild(actionsTh);
            thead.appendChild(headerRow);
            categoryGroupsTable.appendChild(thead);

            const tbody = document.createElement('tbody');
            if (groupsForThisCategory.length === 0) {
                const noGroupsRow = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 2;
                td.textContent = `V kategórii "${categoryDisplayName}" zatiaľ nie sú žiadne skupiny.`; // Zobrazujeme názov kategórie
                td.style.textAlign = 'center';
                noGroupsRow.appendChild(td);
                tbody.appendChild(noGroupsRow);
            } else {
                groupsForThisCategory.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || '', 'sk-SK'));
                groupsForThisCategory.forEach(group => {
                    const groupRow = document.createElement('tr');
                    const groupNameTd = document.createElement('td');
                    groupNameTd.textContent = group.data.name || 'Neznámy názov skupiny';
                    groupRow.appendChild(groupNameTd);

                    const groupActionsTd = document.createElement('td');
                    groupActionsTd.style.whiteSpace = 'nowrap';

                    const editGroupButton = document.createElement('button');
                    editGroupButton.textContent = 'Premenovať';
                    editGroupButton.classList.add('action-button');
                    editGroupButton.onclick = () => {
                        openGroupModal(group.id, group.data);
                    };
                    groupActionsTd.appendChild(editGroupButton);

                    const deleteGroupButton = document.createElement('button');
                    deleteGroupButton.textContent = 'Vymazať';
                    deleteGroupButton.classList.add('action-button', 'delete-button');
                    deleteGroupButton.onclick = async () => {
                        const confirmed = await showConfirmation('Potvrdenie vymazania', `Naozaj chcete vymazať skupinu "${group.data.name}" z kategórie "${categoryDisplayName}"? Tímy priradené k tejto skupine prídu o priradenie (groupId a orderInGroup sa nastavia na null)!`);
                        if (!confirmed) {
                            return;
                        }
                        try {
                            const batch = writeBatch(db);
                            const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', group.id));
                            const clubsSnapshot = await getDocs(clubsInGroupQuery);
                            clubsSnapshot.forEach(doc => {
                                batch.update(doc.ref, { groupId: null, orderInGroup: null });
                            });
                            batch.delete(doc(groupsCollectionRef, group.id));
                            await batch.commit();
                            await showMessage('Úspech', `Skupina "${group.data.name}" úspešne vymazaná.`);
                            displayGroupsByCategory();
                        } catch (error) {
                            console.error('Chyba pri mazaní skupiny:', error);
                            await showMessage('Chyba', 'Chyba pri mazaní skupiny! Prosím, skúste znova.');
                        }
                    };
                    groupActionsTd.appendChild(deleteGroupButton);
                    groupRow.appendChild(groupActionsTd);
                    tbody.appendChild(groupRow);
                });
            }
            categoryGroupsTable.appendChild(tbody);
            categorySectionDiv.appendChild(categoryGroupsTable);
            groupsContentDiv.appendChild(categorySectionDiv);
        });

        if (Object.keys(groupsByCategory).length === 0 && categories.length > 0) {
            const message = document.createElement('p');
            message.textContent = "Žiadne skupiny zatiaľ nemajú priradenú kategóriu, alebo žiadne skupiny neboli pridané.";
            groupsContentDiv.appendChild(message);
        }
    } catch (error) {
        console.error('Chyba pri načítaní dát skupín:', error);
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Chyba pri načítaní dát skupín.';
        groupsContentDiv.appendChild(errorMessage);
    }
}

/**
 * Resetuje stav modálneho okna skupiny.
 */
function resetGroupModal() {
    currentGroupModalMode = 'add';
    editingGroupId = null;
    if (groupForm) groupForm.reset();
    if (groupModalTitle) groupModalTitle.textContent = 'Pridať skupinu';
    if (groupCategorySelect) {
        groupCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
        groupCategorySelect.disabled = true;
    }
}

// Spustí sa po načítaní DOM obsahu
document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html'; // Presmerovanie na prihlasovaciu stránku, ak nie je admin
        return;
    }
    // Nie je potrebné volať loadAllCategoriesForDynamicSelects samostatne,
    // populateCategorySelect to urobí pri otvorení modálu.
    displayGroupsByCategory();

    if (groupsContentDiv) {
        groupsContentDiv.style.display = 'flex';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'groupsContent') {
                section.style.display = 'none';
            }
        });
    }

    if (addButton) {
        addButton.style.display = 'block';
        addButton.title = "Pridať skupinu";
        addButton.onclick = () => {
            openGroupModal();
        };
    }
});

// Listener pre zatvorenie modálneho okna
if (groupModalCloseBtn) {
    groupModalCloseBtn.addEventListener('click', () => {
        closeModal(groupModal);
        resetGroupModal();
    });
}

// Listener pre odoslanie formulára skupiny
if (groupForm) {
    groupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedCategoryId = groupCategorySelect ? groupCategorySelect.value : '';
        const groupName = groupNameInput ? groupNameInput.value.trim() : '';

        if (selectedCategoryId === '' || selectedCategoryId.startsWith('--')) {
            await showMessage('Chyba', 'Prosím, vyberte platnú kategóriu pre skupinu.');
            if (groupCategorySelect) groupCategorySelect.focus();
            return;
        }
        if (groupName === '') {
            await showMessage('Chyba', 'Názov skupiny nemôže byť prázdny.');
            if (groupNameInput) groupNameInput.focus();
            return;
        }

        // Získame názov kategórie pre zobrazenie v správach
        const categoryDoc = await getDoc(doc(categoriesCollectionRef, selectedCategoryId));
        const categoryDisplayName = categoryDoc.exists() ? categoryDoc.data().name : selectedCategoryId;

        // ID skupiny bude stále zložené z ID kategórie a názvu skupiny pre unikátnosť v rámci kategórie
        const compositeGroupId = `${selectedCategoryId} - ${groupName}`;
        const groupDocRef = doc(groupsCollectionRef, compositeGroupId);

        try {
            const existingDoc = await getDoc(groupDocRef);

            if (currentGroupModalMode === 'add') {
                if (existingDoc.exists()) {
                    await showMessage('Upozornenie', `Skupina s názvom "${groupName}" už v kategórii "${categoryDisplayName}" existuje! Názvy skupín musia byť unikátne v rámci kategórie.`);
                    if (groupNameInput) groupNameInput.focus();
                    return;
                }
                await setDoc(groupDocRef, { name: groupName, categoryId: selectedCategoryId });
                await showMessage('Úspech', `Skupina "${groupName}" v kategórii "${categoryDisplayName}" úspešne pridaná.`);
            } else if (currentGroupModalMode === 'edit') {
                const oldGroupId = editingGroupId;
                if (!oldGroupId) {
                    await showMessage('Chyba', "Chyba pri úprave skupiny. Prosím, obnovte stránku.");
                    if (groupModal) closeModal(groupModal);
                    resetGroupModal();
                    return;
                }
                const oldGroupDocRef = doc(groupsCollectionRef, oldGroupId);

                // Ak sa zmenilo ID skupiny (buď kategória, alebo názov skupiny)
                if (oldGroupId !== compositeGroupId) {
                    if (existingDoc.exists()) {
                        await showMessage('Upozornenie', `Skupina s názvom "${groupName}" už v kategórii "${categoryDisplayName}" existuje (iná skupina)! Názvy skupín musia byť unikátne v rámci kategórie.`);
                        if (groupNameInput) groupNameInput.focus();
                        return;
                    }
                    const batch = writeBatch(db);
                    batch.set(groupDocRef, { name: groupName, categoryId: selectedCategoryId });

                    // Aktualizujeme kluby, ktoré boli priradené k starej skupine
                    const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', oldGroupId));
                    const clubsSnapshot = await getDocs(clubsInGroupQuery);
                    clubsSnapshot.forEach(doc => {
                        batch.update(doc.ref, { groupId: compositeGroupId, categoryId: selectedCategoryId });
                    });
                    batch.delete(oldGroupDocRef); // Vymažeme starý dokument skupiny
                    await batch.commit();

                    // Získame starý názov skupiny pre správu
                    const oldGroupDoc = await getDoc(oldGroupDocRef);
                    const oldGroupDisplayName = oldGroupDoc.exists() ? oldGroupDoc.data().name : oldGroupId.split(' - ').slice(1).join(' - ');

                    await showMessage('Úspech', `Skupina "${oldGroupDisplayName}" úspešne premenovaná/presunutá na "${groupName}" v kategórii "${categoryDisplayName}".`);
                } else {
                    // Ak sa ID skupiny nezmenilo (len názov skupiny, ale kategória zostala rovnaká)
                    await updateDoc(groupDocRef, {
                        name: groupName,
                    });
                    await showMessage('Úspech', `Skupina "${groupName}" v kategórii "${categoryDisplayName}" úspešne upravená.`);
                }
            }
            if (groupModal) closeModal(groupModal);
            resetGroupModal();
            displayGroupsByCategory();
        } catch (error) {
            console.error('Chyba pri ukladaní skupiny:', error);
            await showMessage('Chyba', `Chyba pri ukladaní skupiny! Detail: ${error.message}`);
            if (groupModal) closeModal(groupModal);
            resetGroupModal();
        }
    });
}
