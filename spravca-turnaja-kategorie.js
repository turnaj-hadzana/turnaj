import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, openModal, closeModal, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, doc } from './spravca-turnaja-common.js';
const addButton = document.getElementById('addButton');
const categoriesContentSection = document.getElementById('categoriesContentSection');
const categoryTableBody = document.getElementById('categoryTableBody');
const categoryModal = document.getElementById('categoryModal');
const categoryModalCloseBtn = categoryModal ? categoryModal.querySelector('.category-modal-close') : null;
const categoryForm = document.getElementById('categoryForm');
const categoryNameInput = document.getElementById('categoryName');
const categoryModalTitle = document.getElementById('categoryModalTitle');
let currentCategoryModalMode = 'add';
let editingCategoryName = null;
function addCategoryRowToTable(categoryName) {
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
        editingCategoryName = categoryName;
        if (categoryModalTitle) categoryModalTitle.textContent = 'Premenovať kategóriu';
        if (categoryNameInput) categoryNameInput.value = categoryName;
        openModal(categoryModal);
        if (categoryNameInput) categoryNameInput.focus();
    };
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Vymazať';
    deleteButton.classList.add('action-button', 'delete-button');
    deleteButton.onclick = async function() {
         const categoryToDelete = this.closest('tr').querySelector('td:first-child').textContent;
         if (!confirm(`Naozaj chcete vymazať kategóriu "${categoryToDelete}"? Akékoľvek priradené skupiny a kluby prídu o svoju kategóriu (categoryId a groupId sa nastavia na null)!`)) {
             return;
         }
         try {
             const batch = writeBatch(db);
             const groupsQuery = query(groupsCollectionRef, where('categoryId', '==', categoryToDelete));
             const groupsSnapshot = await getDocs(groupsQuery);
              for (const groupDoc of groupsSnapshot.docs) {
                  const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', groupDoc.id));
                  const clubsSnapshot = await getDocs(clubsInGroupQuery);
                  clubsSnapshot.forEach(clubDoc => {
                      batch.update(clubDoc.ref, { categoryId: null, groupId: null, orderInGroup: null });
                  });
                  batch.delete(groupDoc.ref);
              }
               const unassignedClubsQuery = query(clubsCollectionRef, where('categoryId', '==', categoryToDelete), where('groupId', '==', null));
                const unassignedClubsSnapshot = await getDocs(unassignedClubsQuery);
                unassignedClubsSnapshot.forEach(doc => {
                   batch.update(doc.ref, { categoryId: null });
                });
             batch.delete(doc(categoriesCollectionRef, categoryToDelete));
             await batch.commit();
             alert(`Kategória "${categoryToDelete}" úspešne vymazaná.`);
             loadCategoriesTable();
         } catch (error) {
             console.error('Chyba pri mazaní kategórie a súvisiacich dát: ', error);
             alert('Chyba pri mazaní kategórie! Prosím, skúste znova.');
         }
    };
    actionsTd.appendChild(renameButton);
    actionsTd.appendChild(deleteButton);
    tr.appendChild(nameTd);
    tr.appendChild(actionsTd);
    if (categoryTableBody) categoryTableBody.appendChild(tr);
}
async function loadCategoriesTable() {
    if (!categoryTableBody) return;
    categoryTableBody.innerHTML = '';
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
            const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
            sortedDocs.forEach((doc) => {
                const categoryName = doc.id;
                addCategoryRowToTable(categoryName);
            });
        }
    } catch (error) {
        console.error('Chyba pri načítaní kategórií: ', error);
        alert('Chyba pri načítaní kategórií!');
         const errorRow = document.createElement('tr');
         const td = document.createElement('td');
         td.colSpan = 2;
         td.textContent = "Chyba pri načítaní kategórií.";
         td.style.textAlign = 'center';
         errorRow.appendChild(td);
         categoryTableBody.appendChild(errorRow);
    }
}
function resetCategoryModal() {
    currentCategoryModalMode = 'add';
    editingCategoryName = null;
    if (categoryForm) categoryForm.reset();
    if (categoryModalTitle) categoryModalTitle.textContent = 'Pridať kategóriu';
}
document.addEventListener('DOMContentLoaded', () => {
    loadCategoriesTable();
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
      } else {
          console.error("Add button not found on categories page!");
      }
});
if (categoryModalCloseBtn) {
    categoryModalCloseBtn.addEventListener('click', () => {
        closeModal(categoryModal);
        resetCategoryModal();
    });
}
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = categoryNameInput ? categoryNameInput.value.trim() : '';
        if (categoryName === '') {
            alert('Názov kategórie nemôže byť prázdny.');
             if (categoryNameInput) categoryNameInput.focus();
            return;
        }
        if (currentCategoryModalMode === 'add') {
            const categoryDocRef = doc(categoriesCollectionRef, categoryName);
            try {
                const existingDoc = await getDoc(categoryDocRef);
                if (existingDoc.exists()) {
                    alert(`Kategória "${categoryName}" už existuje!`);
                     if (categoryNameInput) categoryNameInput.focus();
                    return;
                }
                await setDoc(categoryDocRef, { name: categoryName });
                alert(`Kategória "${categoryName}" úspešne pridaná.`);
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
                loadCategoriesTable();
            } catch (error) {
                console.error('Chyba pri pridávaní kategórie: ', error);
                alert('Chyba pri pridávaní kategórie! Prosím, skúste znova.');
                 if (categoryModal) closeModal(categoryModal);
                 resetCategoryModal();
            }
        } else if (currentCategoryModalMode === 'edit') {
            const oldCategoryName = editingCategoryName;
            const newCategoryName = categoryName;
            if (!oldCategoryName) {
                console.error("Chyba: Chýba pôvodný názov kategórie pri úprave.");
                alert("Chyba pri úprave kategórie.");
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
                loadCategoriesTable();
                return;
            }
            if (newCategoryName === oldCategoryName) {
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
                return;
            }
            const newCategoryDocRef = doc(categoriesCollectionRef, newCategoryName);
            try {
                const existingDoc = await getDoc(newCategoryDocRef);
                if (existingDoc.exists()) {
                    alert(`Kategória s názvom "${newCategoryName}" už existuje!`);
                     if (categoryNameInput) categoryNameInput.focus();
                    return;
                }
                const oldCategoryDocRef = doc(categoriesCollectionRef, oldCategoryName);
                const batch = writeBatch(db);
                batch.set(newCategoryDocRef, { name: newCategoryName });
                const groupsQuery = query(groupsCollectionRef, where('categoryId', '==', oldCategoryName));
                const groupsSnapshot = await getDocs(groupsQuery);
                 for (const groupDoc of groupsSnapshot.docs) {
                     const oldGroupId = groupDoc.id;
                     const groupData = groupDoc.data();
                     const newGroupId = `${newCategoryName} - ${groupData.name}`;
                     const newGroupDocRef = doc(groupsCollectionRef, newGroupId);
                     const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', oldGroupId));
                     const clubsSnapshot = await getDocs(clubsInGroupQuery);
                       clubsSnapshot.forEach(clubDoc => {
                           batch.update(clubDoc.ref, { groupId: newGroupId, categoryId: newCategoryName });
                       });
                     batch.set(newGroupDocRef, { name: groupData.name, categoryId: newCategoryName });
                     batch.delete(groupDoc.ref);
                 }
                 const unassignedClubsQuery = query(clubsCollectionRef, where('categoryId', '==', oldCategoryName), where('groupId', '==', null));
                 const unassignedClubsSnapshot = await getDocs(unassignedClubsQuery);
                  unassignedClubsSnapshot.forEach(doc => { // Toto 'doc' je iné (parameter callbacku), to je v poriadku
                     batch.update(doc.ref, { categoryId: newCategoryName });
                  });
                batch.delete(oldCategoryDocRef);
                await batch.commit();
                alert(`Kategória "${oldCategoryName}" úspešne premenovaná na "${newCategoryName}".`);
                if (categoryModal) closeModal(categoryModal);
                resetCategoryModal();
                loadCategoriesTable();
            } catch (error) {
                console.error('Chyba pri premenovaní kategórie a aktualizácii referencií: ', error);
                alert('Chyba pri premenovaní kategórie! Prosím, skúste znova.');
                 if (categoryModal) closeModal(categoryModal);
                 resetCategoryModal();
            }
        }
    });
}
