import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, doc } from './spravca-turnaja-common.js';
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
async function displayGroupsByCategory() {
     if (!groupsContentDiv) return;
     groupsContentDiv.innerHTML = '';
     try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const sortedCategoriesDocs = categoriesSnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
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
              const categoryName = category.id;
              const groupsForThisCategory = groupsByCategory[categoryName] || [];
              const categorySectionDiv = document.createElement('div');
              categorySectionDiv.classList.add('category-group-section', 'section-block');
              const categoryHeading = document.createElement('h2');
              categoryHeading.textContent = `${categoryName}`;
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
                  td.textContent = `V kategórii "${categoryName}" zatiaľ nie sú žiadne skupiny.`;
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
                            if (!confirm(`Naozaj chcete vymazať skupinu "${group.data.name}" z kategórie "${group.data.categoryId}"? Tímy priradené k tejto skupine prídu o priradenie (groupId a orderInGroup sa nastavia na null)!`)) {
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
                                 alert(`Skupina "${group.data.name}" úspešne vymazaná.`);
                                 displayGroupsByCategory();
                            } catch (error) {
                                alert('Chyba pri mazaní skupiny! Prosím, skúste znova.');
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
         const errorMessage = document.createElement('p');
         errorMessage.textContent = 'Chyba pri načítaní dát skupín.';
         groupsContentDiv.appendChild(errorMessage);
     }
}
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
document.addEventListener('DOMContentLoaded', () => {
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
if (groupModalCloseBtn) {
    groupModalCloseBtn.addEventListener('click', () => {
        closeModal(groupModal);
        resetGroupModal();
    });
}
if (groupForm) {
    groupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedCategoryId = groupCategorySelect ? groupCategorySelect.value : '';
        const groupName = groupNameInput ? groupNameInput.value.trim() : '';
        if (selectedCategoryId === '' || selectedCategoryId.startsWith('--')) {
            alert('Prosím, vyberte platnú kategóriu pre skupinu.');
             if (groupCategorySelect) groupCategorySelect.focus();
            return;
        }
        if (groupName === '') {
            alert('Názov skupiny nemôže byť prázdny.');
             if (groupNameInput) groupNameInput.focus();
            return;
        }
        const compositeGroupId = `${selectedCategoryId} - ${groupName}`;
        const groupDocRef = doc(groupsCollectionRef, compositeGroupId);
        try {
            const existingDoc = await getDoc(groupDocRef);
            if (currentGroupModalMode === 'add') {
                if (existingDoc.exists()) {
                    alert(`Skupina s názvom "${groupName}" už v kategórii "${selectedCategoryId}" existuje! Názvy skupín musia byť unikátne v rámci kategórie.`);
                     if (groupNameInput) groupNameInput.focus();
                    return;
                }
                await setDoc(groupDocRef, { name: groupName, categoryId: selectedCategoryId });
                alert(`Skupina "${groupName}" v kategórii "${selectedCategoryId}" úspešne pridaná.`);
            } else if (currentGroupModalMode === 'edit') {
                const oldGroupId = editingGroupId;
                if (!oldGroupId) {
                    alert("Chyba pri úprave skupiny. Prosím, obnovte stránku.");
                     if (groupModal) closeModal(groupModal);
                     resetGroupModal();
                    return;
                }
                const oldGroupDocRef = doc(groupsCollectionRef, oldGroupId);
                if (oldGroupId !== compositeGroupId) {
                     if (existingDoc.exists()) {
                         alert(`Skupina s názvom "${groupName}" už v kategórii "${selectedCategoryId}" existuje (iná skupina)! Názvy skupín musia byť unikátne v rámci kategórie.`);
                          if (groupNameInput) groupNameInput.focus();
                         return;
                     }
                     const batch = writeBatch(db);
                     batch.set(groupDocRef, { name: groupName, categoryId: selectedCategoryId });
                     const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', oldGroupId));
                     const clubsSnapshot = await getDocs(clubsInGroupQuery);
                     clubsSnapshot.forEach(doc => {
                          batch.update(doc.ref, { groupId: compositeGroupId, categoryId: selectedCategoryId });
                     });
                     batch.delete(oldGroupDocRef);
                     await batch.commit();
                     alert(`Skupina "${oldGroupId.split(' - ').slice(1).join(' - ')}" úspešne premenovaná/presunutá na "${groupName}" v kategórii "${selectedCategoryId}".`);
                 } else {
                      await updateDoc(groupDocRef, {
                          name: groupName,
                      });
                       alert(`Skupina "${groupName}" v kategórii "${selectedCategoryId}" úspešne upravená.`);
                 }
            }
            if (groupModal) closeModal(groupModal);
            resetGroupModal();
            displayGroupsByCategory();
        } catch (error) {
            alert(`Chyba pri ukladaní skupiny! Detail: ${error.message}`);
             if (groupModal) closeModal(groupModal);
             resetGroupModal();
        }
    });
}
