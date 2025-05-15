import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
        import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, addDoc, updateDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
        const firebaseConfig = {
            apiKey: "AIzaSyD0h0rQZiIGi0-UDb4-YU_JihRGpIlfz40",
            authDomain: "turnaj-a28c5.firebaseapp.com",
            projectId: "turnaj-a28c5",
            storageBucket: "turnaj-a28c5.firebaseapp.com",
            messagingSenderId: "13732191148",
            appId: "1:13732191148:web:5ad78eaef2ad452a10f809"
        };
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const categoriesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'categories');
        const groupsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'groups');
        const clubsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'clubs'); // Kolekcia pre tímy (kluby)

        // Nové referencie pre Súpisku
        const rosterContentSection = document.getElementById('rosterContentSection');
        const rosterModal = document.getElementById('rosterModal');
        const rosterModalCloseBtn = rosterModal ? rosterModal.querySelector('.roster-modal-close') : null;
        const rosterModalTitle = document.getElementById('rosterModalTitle');
        const rosterTeamSelectForm = document.getElementById('rosterTeamSelectForm'); // Formulár pre výber tímu
        const rosterTeamSelect = document.getElementById('rosterTeamSelect'); // Select pre výber tímu
        const selectedTeamCategoryParagraph = document.getElementById('selectedTeamCategory'); // Paragraf pre zobrazenie kategórie tímu
        const playerManagementArea = document.getElementById('playerManagementArea'); // Oblasť pre správu hráčov (skryta, kym nie je vybrany tim)
        const rosterTableBody = document.getElementById('rosterTableBody'); // Telo tabuľky súpisky
        const playerForm = document.getElementById('playerForm'); // Formulár na pridanie hráča
        const playerNumberInput = document.getElementById('playerNumber');
        const playerNameInput = document.getElementById('playerName');
        const playerSurnameInput = document.getElementById('playerSurname');

        const addButton = document.getElementById('addButton');
        const categoryModal = document.getElementById('categoryModal');
        const categoryModalCloseBtn = categoryModal ? categoryModal.querySelector('.category-modal-close') : null;
        const categoryForm = document.getElementById('categoryForm');
        const categoryNameInput = document.getElementById('categoryName');
        const categoryModalTitle = document.getElementById('categoryModalTitle');
        const groupModal = document.getElementById('groupModal');
        const groupModalCloseBtn = groupModal ? groupModal.querySelector('.group-modal-close') : null;
        const groupForm = document.getElementById('groupForm');
        const groupCategorySelect = document.getElementById('groupCategory');
        const groupNameInput = document.getElementById('groupName');
        const groupModalTitle = document.getElementById('groupModalTitle');
        const groupFormSubmitButton = groupForm ? groupForm.querySelector('button[type="submit"]') : null;

        const clubModal = document.getElementById('clubModal');
        const clubModalCloseBtn = clubModal ? clubModal.querySelector('.club-modal-close') : null;
        const clubForm = document.getElementById('clubForm');
        const clubNameInput = document.getElementById('clubName');
        const clubCategorySelect = document.getElementById('clubCategory');
        const clubGroupSelect = document.getElementById('clubGroup');
        const clubModalTitle = document.getElementById('clubModalTitle');
        const teamCreationModal = document.getElementById('teamCreationModal');
        const teamCreationModalCloseBtn = teamCreationModal ? teamCreationModal.querySelector('.team-creation-modal-close') : null;

        const manageTeamsModal = document.getElementById('manageTeamsModal');
        const baseTeamNameInModalSpan = document.getElementById('baseTeamNameInModal');
        const teamsListInModalDiv = document.getElementById('teamsListInModal');
        const manageTeamsModalCloseBtn = manageTeamsModal ? manageTeamsModal.querySelector('.manage-teams-modal-close') : null;

        const unassignedClubSelectContainer = document.getElementById('unassignedClubSelectContainer');
        const unassignedClubSelect = document.getElementById('unassignedClubSelect');
        const clubNameInputContainer = document.getElementById('clubNameInputContainer');
        const orderInputContainer = document.getElementById('orderInputContainer');
        const orderInGroupInput = document.getElementById('orderInGroup');
        const clubsFilterContainer = document.getElementById('clubsFilterContainer'); // Updated ID
        const clubFilterCategorySelect = document.getElementById('clubFilterCategorySelect');
        const clubFilterGroupSelect = document.getElementById('clubFilterGroupSelect');
        const categoriesContentSection = document.getElementById('categoriesContentSection');
        const groupsContentDiv = document.getElementById('groupsContent');
        const clubsContentDiv = document.getElementById('clubsContent');
        const teamCreationContentSection = document.getElementById('teamCreationContentSection');
        const categoryTable = document.getElementById('categoryTable');
        const categoryTableBody = document.getElementById('categoryTableBody');
        const createdTeamsTableBody = document.getElementById('createdTeamsTableBody');
        const createdTeamsTableHeader = document.getElementById('createdTeamsTableHeader');
        const teamCategoryCountContainer = document.getElementById('teamCategoryCountContainer'); // Kontajner pre dynamicke selecty
        const addCategoryCountPairButton = document.getElementById('addCategoryCountPairButton'); // Tlacitko na pridanie dynamickeho paru
        const teamNameInput = document.getElementById('teamNameInput'); // Input zakladneho nazvu timu

        let currentCategoryModalMode = 'add';
        let editingCategoryName = null;
        let currentGroupModalMode = 'add';
        let editingGroupId = null;
        let currentClubModalMode = 'add-assign';
        let editingClubId = null;
        let currentTeamCreationModalMode = 'add';
        let allAvailableCategories = [];
        let capturedClubSectionWidth = null;
        let openModalCount = 0;
        let selectedTeamForRoster = null; // Premenna pre ulozenie ID aktualne vybraneho timu v Roster modale

        function openModal(modalElement) {
            if (!modalElement) {
                console.error("Attempted to open a null modal element.");
                return;
            }
            modalElement.style.display = 'block';
            openModalCount++;
            if (openModalCount === 1) {
                document.body.classList.add('modal-open');
            }
        }

        function closeModal(modalElement) {
            if (!modalElement) {
                 console.error("Attempted to close a null modal element.");
                 return;
            }
            modalElement.style.display = 'none';
            openModalCount--;
            if (openModalCount < 0) {
                openModalCount = 0;
            }
            if (openModalCount === 0) {
                document.body.classList.remove('modal-open');
            }
        }
        // Pridajte funkciu pre zatvorenie Roster modalu
        function closeRosterModal() {
             if (!rosterModal) { console.error("rosterModal is null in closeRosterModal."); return; }
             rosterModal.style.display = 'none';
              // Reset stavov modalu
             selectedTeamForRoster = null;
             if (rosterTeamSelect) rosterTeamSelect.value = '';
             if (selectedTeamCategoryParagraph) selectedTeamCategoryParagraph.textContent = '';
             if (rosterTableBody) rosterTableBody.innerHTML = '';
             if (playerManagementArea) playerManagementArea.style.display = 'none';
             if (playerForm) playerForm.reset();
             closeModal(rosterModal); // Použite hlavnú funkciu closeModal
        }

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
                 if (!categoryModalTitle) { console.error('FATAL ERROR: categoryModalTitle is null in edit mode!'); return; }
                 categoryModalTitle.textContent = 'Premenovať kategóriu';
                 categoryNameInput.value = categoryName;
                 openModal(categoryModal);
                 categoryNameInput.focus();
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
                       const clubUpdates = [];
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
                      loadCategoriesTable();
                       if (window.location.hash === '#skupiny') {
                           groupsContentDiv.innerHTML = '';
                           displayGroupsByCategory();
                       }
                       displayCreatedTeams();
                       if (window.location.hash === '#timy-do-skupin') {
                           if (clubFilterCategorySelect && clubFilterCategorySelect.value === categoryToDelete) {
                               clubFilterCategorySelect.value = '';
                                populateClubFilterGroups('');
                           }
                           displayClubs();
                           populateClubFilterCategories();
                       }
                       // Ak je otvoreny modal pre súpisky a bola vymazana kategoria, ktorú má práve vybraný tím,
                       // alebo kategoria, ktora sa zobrazuje vo výbere timov, obnoviť modál/výber
                       if (rosterModal && rosterModal.style.display === 'block') {
                           populateRosterTeamsSelect(); // Obnoviť výber tímov
                           if (selectedTeamForRoster && selectedTeamForRoster.includes(categoryToDelete)) {
                                closeRosterModal(); // Ak bol vybraný tím z mazanej kategórie, zatvoriť modal
                                alert("Vybraný tím bol zmazaný v dôsledku zmazania kategórie.");
                           }
                       }
                  } catch (error) {
                      console.error('Chyba pri mazaní kategórie a súvisiacich dát: ', error);
                      alert('Chyba pri mazaní kategórie! Prosím, skúste znova.');
                      if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset();
                      currentCategoryModalMode = 'add'; editingCategoryName = null;
                  }
             };
             actionsTd.appendChild(renameButton);
             actionsTd.appendChild(deleteButton);
             tr.appendChild(nameTd);
             tr.appendChild(actionsTd);
             categoryTableBody.appendChild(tr);
         }

         async function loadCategoriesTable() {
             try {
                 if (!categoryTableBody) { console.error("categoryTableBody element not found."); return; }
                 categoryTableBody.innerHTML = '';
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

         async function populateCategorySelect(selectElement, selectedCategoryId = null) {
              if (!selectElement) { console.error("Select element for category population is null."); return; }
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
                       selectElement.disabled = true;
                  } else {
                       selectElement.disabled = false;
                       const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
                       sortedDocs.forEach((doc) => {
                            const categoryName = doc.id;
                            const option = document.createElement('option');
                            option.value = categoryName;
                            option.textContent = categoryName;
                            selectElement.appendChild(option);
                       });
                       if (selectedCategoryId) {
                           selectElement.value = selectedCategoryId;
                       }
                   }
               } catch (error) {
                   console.error('Chyba pri načítaní kategórií: ', error);
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '-- Chyba pri načítaní --';
                    option.disabled = true;
                    selectElement.appendChild(option);
                    selectElement.disabled = true;
               } finally {
                   if (selectElement.id === 'clubCategory' || selectElement.classList.contains('team-category-select-dynamic')) {
                        removeDuplicateOptions(selectElement);
                   }
               }
            }

         async function populateGroupSelect(selectedCategoryId, selectElement, selectedGroupId = null) {
              if (!selectElement) { console.error("Select element for group population is null."); return; }
              selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
              selectElement.disabled = true;
              if (!selectedCategoryId || selectedCategoryId === '' || selectedCategoryId === '-- Vyberte kategóriu --') {
                   return;
              }
              try {
                   const groupsQuery = query(groupsCollectionRef, where('categoryId', '==', selectedCategoryId));
                  const querySnapshot = await getDocs(groupsQuery);
                  if (querySnapshot.empty) {
                       const option = document.createElement('option');
                       option.value = '';
                       option.textContent = '-- Žiadne skupiny v kategórii --';
                       option.disabled = true;
                       selectElement.appendChild(option);
                       selectElement.disabled = true;
                  } else {
                       selectElement.disabled = false;
                       const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
                       sortedDocs.forEach((doc) => {
                            const groupName = doc.id;
                            const option = document.createElement('option');
                            option.value = groupName;
                            option.textContent = groupName;
                            selectElement.appendChild(option);
                       });
                       if (selectedGroupId) {
                           selectElement.value = selectedGroupId;
                       }
                   }
               } catch (error) {
                   console.error(`Chyba pri načítaní skupín pre kategóriu ${selectedCategoryId}: `, error);
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '-- Chyba pri načítaní --';
                    option.disabled = true;
                    selectElement.appendChild(option);
                    selectElement.disabled = true;
               } finally {
                   if (selectElement.id === 'clubGroup') {
                       removeDuplicateOptions(selectElement);
                   }
               }
         }

        async function openGroupModal(groupId = null, groupData = null) {
             if (!groupModal) { console.error("groupModal element not found."); return; }
             openModal(groupModal);
             currentGroupModalMode = 'add';
             editingGroupId = null;
             if (groupForm) groupForm.reset();
             if (groupNameInput) groupNameInput.disabled = false;
             if (groupFormSubmitButton) groupFormSubmitButton.textContent = 'Uložiť';
             if (groupCategorySelect) groupCategorySelect.value = "";

             if (!groupModalTitle) { console.error('FATAL ERROR: groupModalTitle element not found!'); return; }

             if (groupId && groupData) {
                 currentGroupModalMode = 'edit';
                 editingGroupId = groupId;
                 groupModalTitle.textContent = 'Premenovať skupinu';
                 if (groupFormSubmitButton) groupFormSubmitButton.textContent = 'Uložiť zmeny';
                 await populateCategorySelect(groupCategorySelect, groupData.categoryId);
                 if (groupNameInput) groupNameInput.value = groupData.name;
             } else {
                 groupModalTitle.textContent = 'Pridať skupinu';
                 await populateCategorySelect(groupCategorySelect, null);
             }
             if (groupNameInput) groupNameInput.focus();
        }


             async function displayGroupsByCategory() {
                  if (!groupsContentDiv) { console.error("groupsContentDiv element not found."); return; }
                  groupsContentDiv.innerHTML = '';
                  try {
                     const categoriesSnapshot = await getDocs(categoriesCollectionRef);
                     const sortedCategoriesDocs = categoriesSnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
                     const categories = sortedCategoriesDocs.map(doc => doc.id);
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
                          } else {
                          }
                     });
                     categories.forEach(categoryName => {
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
                          groupNameTh.textContent = 'Názov';
                          const actionsTh = document.createElement('th');
                          actionsTh.textContent = '';
                          actionsTh.style.width = '150px';
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
                              groupsForThisCategory.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''));
                              groupsForThisCategory.forEach(group => {
                                   const groupRow = document.createElement('tr');
                                   const groupNameTd = document.createElement('td');
                                   groupNameTd.textContent = group.data.name;
                                   const groupActionsTd = document.createElement('td');
                                   groupActionsTd.style.whiteSpace = 'nowrap';
                                    const editGroupButton = document.createElement('button');
                                    editGroupButton.textContent = 'Premenovať';
                                    editGroupButton.classList.add('action-button');
                                    editGroupButton.onclick = () => {
                                         openGroupModal(group.id, group.data);
                                    };
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
                                              displayGroupsByCategory();
                                               displayCreatedTeams();
                                              if (window.location.hash === '#timy-do-skupin') {
                                                    if (clubFilterGroupSelect && clubFilterGroupSelect.value === group.id) {
                                                         clubFilterGroupSelect.value = '';
                                                    }
                                                     populateClubFilterGroups(clubFilterCategorySelect ? clubFilterCategorySelect.value : '');
                                                   displayClubs();
                                              }
                                               // Ak je otvoreny modal pre súpisky a bola vymazana skupina, ktorú má práve vybraný tím,
                                               // alebo skupina, ktora sa zobrazuje vo výbere timov, obnoviť modál/výber
                                              if (rosterModal && rosterModal.style.display === 'block') {
                                                   populateRosterTeamsSelect(); // Obnoviť výber tímov
                                                   if (selectedTeamForRoster && selectedTeamForRoster.includes(group.id)) {
                                                        closeRosterModal(); // Ak bol vybraný tím zo zmazanej skupiny, zatvoriť modal
                                                        alert("Vybraný tím bol zmazaný v dôsledku zmazania skupiny."); // Alebo tím zostane, len sa zruší priradenie? Podľa logiky mazania skupiny, tím sa nepriradí.
                                                   }
                                              }

                                          } catch (error) {
                                              console.error('Chyba pri mazaní skupiny a súvisiacich dát: ', error);
                                              alert('Chyba pri mazaní skupiny! Prosím, skúste znova.');
                                          }
                                     };
                                     groupActionsTd.appendChild(editGroupButton);
                                     groupActionsTd.appendChild(deleteGroupButton);
                                     groupRow.appendChild(groupNameTd);
                                     groupRow.appendChild(groupActionsTd);
                                     tbody.appendChild(groupRow);
                               });
                            }
                            categoryGroupsTable.appendChild(tbody);
                            categorySectionDiv.appendChild(categoryGroupsTable);
                            groupsContentDiv.appendChild(categorySectionDiv);
                         });
                      } catch (error) {
                          console.error('Chyba pri načítaní alebo zobrazovaní skupín: ', error);
                          const errorMessage = document.createElement('p');
                          errorMessage.textContent = 'Chyba pri načítaní dát skupín.';
                          groupsContentDiv.appendChild(errorMessage);
                      }
             }
         async function populateUnassignedClubsSelect(selectElement, selectedClubId = null) {
              if (!selectElement) { console.error("selectElement for unassigned clubs is null."); return; }
             selectElement.innerHTML = '<option value="">-- Vyberte tím na priradenie --</option>';
             selectElement.disabled = true;
             try {
                 const unassignedQuery = query(clubsCollectionRef, where('groupId', '==', null));
                 const querySnapshot = await getDocs(unassignedQuery);
                 if (querySnapshot.empty) {
                       const option = document.createElement('option');
                       option.value = '';
                       option.textContent = '-- Žiadne nepriradené tímy --';
                       option.disabled = true;
                       selectElement.appendChild(option);
                       selectElement.disabled = true;
                 } else {
                      selectElement.disabled = false;
                       const sortedDocs = querySnapshot.docs.sort((a, b) => (a.data().name || '').localeCompare(b.data().name || ''));
                       sortedDocs.forEach((doc) => {
                           const club = doc.data();
                           const option = document.createElement('option');
                           option.value = doc.id;
                           option.textContent = club.name || 'Bez názvu';
                           selectElement.appendChild(option);
                       });
                       if (selectedClubId) {
                           selectElement.value = selectedClubId;
                       }
                 }
             } catch (error) {
                  console.error('Chyba pri načítaní nepriradených tímov: ', error);
                   const option = document.createElement('option');
                   option.value = '';
                   option.textContent = '-- Chyba pri načítaní --';
                   option.disabled = true;
                   selectElement.appendChild(option);
                   selectElement.disabled = true;
             }
         }
         function removeDuplicateOptions(selectElement) {
              if (!selectElement) {
                  return;
              }
              const seenValues = new Set();
              for (let i = selectElement.options.length - 1; i >= 0; i--) {
                   const option = selectElement.options[i];
                   if (seenValues.has(option.value)) {
                       selectElement.removeChild(option);
                   } else {
                        seenValues.add(option.value);
                   }
              }
         }

         async function openClubModal(clubId = null, clubData = null) {
             if (!clubForm) { console.error("FATAL ERROR: clubForm not found!"); if (clubModal) closeModal(clubModal); return; }
             clubForm.reset();
             const clubFormSubmitButton = clubForm.querySelector('button[type="submit"]');
             if (!clubFormSubmitButton) { console.error("FATAL ERROR: Submit button not found in clubForm!"); if (clubModal) closeModal(clubModal); return; }

             // Reset visibility for add-assign mode initially
             if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
             if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
             if (orderInputContainer) orderInputContainer.style.display = 'none';
             if (clubGroupSelect) clubGroupSelect.required = false;
             if (orderInGroupInput) orderInGroupInput.required = false;
             if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block'; // Ensure container is visible

             if (clubCategorySelect) {
                 clubCategorySelect.value = "";
                 clubCategorySelect.disabled = true; // Zablokovať kategoriu na zaciatku v add-assign mode
             } else { console.error("FATAL ERROR: clubCategorySelect not found!"); if (clubModal) closeModal(clubModal); return; }


             if (clubId && clubData) {
                 // Edit mode logic
                 currentClubModalMode = 'edit-assigned';
                 editingClubId = clubId;
                 if (clubCategorySelect) {
                      clubCategorySelect.disabled = false; // Odblokovat v edit mode
                      clubCategorySelect.value = clubData.categoryId || '';
                       if (clubData.groupId === null) { // If currently unassigned
                            if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'none'; // Hide group select
                            if (orderInputContainer) orderInputContainer.style.display = 'none'; // Hide order input
                            if (orderInGroupInput) orderInGroupInput.required = false;
                            if (clubGroupSelect) clubGroupSelect.required = false;
                       } else { // If currently assigned
                            if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block'; // Show group select
                            if (orderInputContainer) orderInputContainer.style.display = 'block'; // Show order input
                            if (orderInGroupInput) orderInGroupInput.required = true; // Order is required if assigned
                            if (clubGroupSelect) clubGroupSelect.required = true; // Group is required if assigned
                       }
                       await populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubData.groupId);
                 } else { console.error("FATAL ERROR: clubCategorySelect not found in edit mode!"); if (clubModal) closeModal(clubModal); return; }

                 if (clubNameInputContainer) clubNameInputContainer.style.display = 'block'; // Show name input in edit
                 if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'none'; // Hide unassigned select in edit

                 if (clubNameInput) clubNameInput.value = clubData.name || '';
                 if (orderInGroupInput) orderInGroupInput.value = typeof clubData.orderInGroup === 'number' ? clubData.orderInGroup : '';

                 if (!clubModalTitle) { console.error('FATAL ERROR: clubModalTitle is null in edit mode!'); if (clubModal) closeModal(clubModal); return; }
                 clubModalTitle.textContent = 'Upraviť tím';
                 if (clubFormSubmitButton) clubFormSubmitButton.textContent = 'Uložiť zmeny';

             } else { // Add-assign mode (triggered by '+')
                 currentClubModalMode = 'add-assign';
                 editingClubId = null;

                 if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
                 if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
                 if (clubGroupSelect) clubGroupSelect.required = false;
                 if (orderInGroupInput) orderInGroupInput.required = false;
                  if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block'; // Ensure container is visible
                  if (orderInputContainer) orderInputContainer.style.display = 'none'; // Hide order input initially

                 await populateUnassignedClubsSelect(unassignedClubSelect); // Nacitat nepriradene kluby

                 // Explicitly disable category and group selects AFTER population
                 if (clubCategorySelect) clubCategorySelect.disabled = true; // Znova zablokovat kategoriu
                 if (clubGroupSelect) clubGroupSelect.disabled = true; // Znova zablokovat skupinu
                 if (clubGroupSelect) clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>'; // Reset group options


                 if (!clubModalTitle) { console.error('FATAL ERROR: clubModalTitle is null in add mode!'); if (clubModal) closeModal(clubModal); return; }
                 clubModalTitle.textContent = 'Priradiť tím do skupiny';
                 if (clubFormSubmitButton) clubFormSubmitButton.textContent = 'Priradiť';
              }

              const validationMessages = clubForm ? clubForm.querySelectorAll('.validation-message') : [];
              validationMessages.forEach(msg => msg.textContent = '');
              openModal(clubModal);

               // Set focus based on mode and content availability
               if (currentClubModalMode === 'add-assign' && unassignedClubSelect && !unassignedClubSelect.disabled) {
                   unassignedClubSelect.focus();
               } else if (currentClubModalMode === 'edit-assigned' && clubNameInput) {
                   clubNameInput.focus();
               } else if (clubCategorySelect && !clubCategorySelect.disabled) {
                   clubCategorySelect.focus();
               } else {
                    if(clubModal) clubModal.focus(); // Fallback focus on the modal itself
               }
         }

        if (clubCategorySelect) {
            clubCategorySelect.addEventListener('change', async () => {
                const selectedCategoryId = clubCategorySelect.value;
                 if (orderInGroupInput) orderInGroupInput.value = '';
                 if (orderInputContainer) orderInputContainer.style.display = 'none';
                if (clubGroupSelect) clubGroupSelect.required = false;
                if (orderInGroupInput) orderInGroupInput.required = false;

                // Tento listener sa aktivuje len ak je selectbox kategórie odblokovaný (t.j. v edit mode)
                if (selectedCategoryId && selectedCategoryId !== '' && selectedCategoryId !== '-- Vyberte kategóriu --' && !clubCategorySelect.disabled && clubGroupSelect && clubGroupSelect.parentElement && clubGroupSelect.parentElement.style.display !== 'none') {
                       clubGroupSelect.disabled = true;
                       await populateGroupSelect(selectedCategoryId, clubGroupSelect);
                       clubGroupSelect.disabled = false;

                       if (clubGroupSelect.options.length > 1) {
                            if (clubGroupSelect && clubGroupSelect.parentElement && clubGroupSelect.parentElement.style.display !== 'none') {
                                clubGroupSelect.required = true;
                           }
                       } else {
                            clubGroupSelect.disabled = true;
                            clubGroupSelect.innerHTML = '<option value="">-- Žiadne skupiny v kategórii --</option>';
                            if (clubGroupSelect) clubGroupSelect.required = false;
                            if (orderInGroupInput) orderInGroupInput.required = false;
                       }

                       setTimeout(() => {
                             if (clubGroupSelect && !clubGroupSelect.disabled && clubGroupSelect.parentElement.style.display !== 'none' && clubGroupSelect.options.length > 1) {
                                 clubGroupSelect.focus();
                             } else if (orderInGroupInput && orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.required) {
                                 orderInGroupInput.focus();
                             }
                       }, 0);
                 } else {
                     if (clubGroupSelect) {
                          clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                          clubGroupSelect.disabled = true;
                          clubGroupSelect.required = false;
                     }
                     if (orderInGroupInput) orderInGroupInput.required = false;
                 }
            });
        } else { console.error("Club category select not found!"); }

         if (clubGroupSelect) {
             clubGroupSelect.addEventListener('change', () => {
                  const selectedGroupId = clubGroupSelect.value;
                  // Tento listener sa aktivuje len ak je selectbox skupiny odblokovany
                  if (selectedGroupId && selectedGroupId !== '' && selectedGroupId !== '-- Vyberte skupinu --' && selectedGroupId !== '-- Žiadne skupiny v kategórii --' && !clubGroupSelect.disabled) {
                       if (orderInputContainer) orderInputContainer.style.display = 'block';
                       if (orderInGroupInput) orderInGroupInput.required = true;
                        if (orderInGroupInput) orderInGroupInput.focus();
                  } else {
                       if (orderInputContainer) orderInputContainer.style.display = 'none';
                       if (orderInGroupInput) orderInGroupInput.required = false;
                       if (orderInGroupInput) orderInGroupInput.value = '';
                  }
             });
         } else { console.error("Club group select not found!"); }

            if (unassignedClubSelect) {
                 unassignedClubSelect.addEventListener('change', async () => {
                      const selectedClubId = unassignedClubSelect.value;
                      if (currentClubModalMode === 'add-assign' && selectedClubId && selectedClubId !== '-- Vyberte tím na priradenie --') {
                           try {
                               const clubDoc = await getDoc(doc(clubsCollectionRef, selectedClubId));
                               if (clubDoc.exists()) {
                                   const clubData = clubDoc.data();
                                   if (clubCategorySelect && clubGroupSelect) {
                                        const categoryIdToSet = clubData.categoryId || '';
                                        clubCategorySelect.value = categoryIdToSet; // Tu sa aktualizuje hodnota
                                        // clubCategorySelect.disabled = false; // TENTO RIADOK JE ODSTRANENÝ - kategória ZOSTAVA ZABLOKOVANA v tomto režime

                                         // Skupina sa odblokuje a naplni na zaklade vybraneho timu, ak ma priradenu kategoriu
                                         if (categoryIdToSet && categoryIdToSet !== '') {
                                              await populateGroupSelect(categoryIdToSet, clubGroupSelect, null);
                                              clubGroupSelect.disabled = false; // Odblokovat skupinu
                                              if (clubGroupSelect.options.length > 1) { // Ak existuju skupiny
                                                   if (clubGroupSelect && clubGroupSelect.parentElement && clubGroupSelect.parentElement.style.display !== 'none') {
                                                        clubGroupSelect.required = true;
                                                   }
                                              } else { // Ak neexistuju skupiny
                                                   clubGroupSelect.disabled = true;
                                                   clubGroupSelect.innerHTML = '<option value="">-- Žiadne skupiny v kategórii --</option>';
                                                   if (clubGroupSelect) clubGroupSelect.required = false;
                                                   if (orderInGroupInput) orderInGroupInput.required = false;
                                              }
                                         } else { // Ak vybrany tim nema priradenu kategoriu, skupina zostane zablokovana
                                              if (clubGroupSelect) {
                                                   clubGroupSelect.innerHTML = '<option value="">-- Tím nemá priradenú kategóriu --</option>';
                                                   clubGroupSelect.disabled = true;
                                                   clubGroupSelect.required = false;
                                              }
                                              if (orderInputContainer) orderInputContainer.style.display = 'none';
                                              if (orderInGroupInput) orderInGroupInput.required = false;
                                         }

                                         // Nastavit viditelnost kontajneru skupiny na zaklade toho, ci ma byt vyber skupiny aktivny
                                          if (clubGroupSelect && clubGroupSelect.parentElement) {
                                              if (clubGroupSelect.disabled) {
                                                   clubGroupSelect.parentElement.style.display = 'none';
                                              } else {
                                                   clubGroupSelect.parentElement.style.display = 'block';
                                              }
                                          }


                                         setTimeout(() => {
                                              // Presun fokusu na skupinu, ak je odblokovana a ma moznosti vyberu
                                              if (clubGroupSelect && !clubGroupSelect.disabled && clubGroupSelect.parentElement.style.display !== 'none' && clubGroupSelect.options.length > 1) {
                                                   clubGroupSelect.focus();
                                              } else if (orderInGroupInput && orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.required) {
                                                   orderInGroupInput.focus();
                                              } else {
                                                   // Ak nic ine, zostat na unassigned selecte alebo niekde v modale
                                                   if (unassignedClubSelect) unassignedClubSelect.focus();
                                              }
                                         }, 0);
                                   } else { console.error("clubCategorySelect or clubGroupSelect not found after selecting unassigned club."); }
                               } else {
                                    alert('Vybraný nepriradený tím už neexistuje.');
                                    populateUnassignedClubsSelect(unassignedClubSelect, null);
                                    if (clubModal) closeModal(clubModal);
                                    if (clubForm) clubForm.reset();
                                     if (clubGroupSelect) clubGroupSelect.required = false;
                                     if (orderInGroupInput) orderInGroupInput.required = false;
                                }
                            } catch (error) {
                               console.error('Chyba pri načítaní detailov vybraného nepriradeného tímu:', error);
                               alert('Chyba pri načítaní detailov tímu.');
                               unassignedClubSelect.value = "";
                               // Zablokovat kategoriu a skupinu spat pri chybe
                               if (clubCategorySelect) { clubCategorySelect.value = ""; clubCategorySelect.disabled = true; }
                               if (clubGroupSelect) {
                                   clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>'; // Mozno vhodnejsi text "Vyberte tim"
                                   clubGroupSelect.disabled = true;
                                   if (clubGroupSelect) clubGroupSelect.required = false;
                               }
                               if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block'; // Zobraziť kontajner skupiny
                               if (orderInputContainer) orderInputContainer.style.display = 'none';
                               if (orderInGroupInput) { orderInGroupInput.required = false; orderInGroupInput.value = ''; }
                            }
                       } else if (currentClubModalMode === 'add-assign' && unassignedClubSelectContainer && unassignedClubSelectContainer.style.display !== 'none' && (!selectedClubId || selectedClubId === '-- Vyberte tím na priradenie --')) {
                           // Ak uzivatel zrusi vyber timu (alebo nevybral nic)
                           if (clubCategorySelect) { clubCategorySelect.value = ""; clubCategorySelect.disabled = true; } // Zablokovat kategoriu
                             if (clubGroupSelect) {
                                 clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>'; // Mozno vhodnejsi text "Vyberte tim"
                                 clubGroupSelect.disabled = true;
                                  if (clubGroupSelect) clubGroupSelect.required = false;
                             }
                             if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block'; // Zobraziť kontajner skupiny
                              if (orderInputContainer) orderInputContainer.style.display = 'none';
                              if (orderInGroupInput) { orderInGroupInput.required = false; orderInGroupInput.value = ''; }
                       }
                 });
             } else { console.error("Unassigned club select not found!"); }

            if (clubForm) {
                clubForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const selectedCategoryId = clubCategorySelect ? clubCategorySelect.value : '';
                    const selectedGroupId = (clubGroupSelect && clubGroupSelect.parentElement.style.display !== 'none' && !clubGroupSelect.disabled && clubGroupSelect.required && clubGroupSelect.value !== '' && clubGroupSelect.value !== '-- Vyberte skupinu --' && clubGroupSelect.value !== '-- Žiadne skupiny v kategórii --') ? clubGroupSelect.value : null;
                     const orderInGroupValue = orderInGroupInput ? parseInt(orderInGroupInput.value, 10) : NaN;
                     const orderInGroup = (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput && orderInGroupInput.required && orderInGroupInput.value.trim() !== '' && !isNaN(orderInGroupValue) && orderInGroupValue >= 1) ? orderInGroupValue : null;


                     // Validacia pre add-assign mode - Kategoria nie je aktivna, ale jej hodnota MUSI byt nastavena z vybraneho timu
                     if (currentClubModalMode === 'add-assign') {
                          if (unassignedClubSelectContainer && unassignedClubSelectContainer.style.display !== 'none') {
                              const selectedUnassignedClubId = unassignedClubSelect ? unassignedClubSelect.value : '';
                              if (selectedUnassignedClubId === '' || selectedUnassignedClubId === '-- Vyberte tím na priradenie --') {
                                  alert('Prosím, vyberte tím na priradenie.');
                                   if (unassignedClubSelect) unassignedClubSelect.focus();
                                  return;
                              }
                               if (selectedCategoryId === '' || selectedCategoryId === '-- Vyberte kategóriu --' || (clubCategorySelect && clubCategorySelect.disabled && !selectedCategoryId)) { // Overiť, či má tím kategóriu
                                   alert('Vybraný tím nemá priradenú kategóriu a nemôže byť priradený do skupiny.');
                                    if (unassignedClubSelect) unassignedClubSelect.focus(); // Zostať na výbere tímu
                                   return;
                               }
                         }
                          if (clubGroupSelect && clubGroupSelect.parentElement.style.display !== 'none' && clubGroupSelect.required && (selectedGroupId === null || selectedGroupId === '' || selectedGroupId === '-- Žiadne skupiny v kategórii --')) {
                              alert('Prosím, vyberte platnú skupinu.');
                              if (clubGroupSelect) clubGroupSelect.focus();
                              return;
                          }
                          if (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput && orderInGroupInput.required && (orderInGroup === null || isNaN(orderInGroupValue) || orderInGroupValue < 1)) {
                               alert('Prosím, zadajte platné poradové číslo väčšie ako 0.');
                               if (orderInGroupInput) orderInGroupInput.focus();
                               return;
                          }
                     } else if (currentClubModalMode === 'edit-assigned') {
                           // Validacie pre edit mode
                            const updatedClubName = clubNameInput ? clubNameInput.value.trim() : '';
                             if (clubNameInputContainer && clubNameInputContainer.style.display !== 'none' && (!updatedClubName || updatedClubName === '')) {
                                alert('Názov klubu nemôže byť prázdny.');
                                 if (clubNameInput) clubNameInput.focus();
                                return;
                            }
                            if (selectedCategoryId === '' || selectedCategoryId === '-- Vyberte kategóriu --') {
                                alert('Prosím, vyberte platnú kategóriu pre tím.');
                                 if (clubCategorySelect) clubCategorySelect.focus();
                                return;
                            }
                             if (clubGroupSelect && clubGroupSelect.parentElement.style.display !== 'none' && clubGroupSelect.required && (selectedGroupId === null || selectedGroupId === '' || selectedGroupId === '-- Žiadne skupiny v kategórii --')) {
                                 alert('Prosím, vyberte platnú skupinu.');
                                 if (clubGroupSelect) clubGroupSelect.focus();
                                 return;
                             }
                             if (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput && orderInGroupInput.required && (orderInGroup === null || isNaN(orderInGroupValue) || orderInGroupValue < 1)) {
                                  alert('Prosím, zadajte platné poradové číslo väčšie ako 0.');
                                   if (orderInGroupInput) orderInGroupInput.focus();
                                  return;
                             }
                     }


                    try {
                        if (currentClubModalMode === 'add-assign') {
                            const selectedUnassignedClubId = unassignedClubSelect ? unassignedClubSelect.value : '';
                             if (!selectedUnassignedClubId || selectedUnassignedClubId === '-- Vyberte tím na priradenie --') {
                                alert('Prosím, vyberte tím na priradenie.');
                                 if (unassignedClubSelect) unassignedClubSelect.focus();
                                return;
                             }

                            const clubRefToAssign = doc(clubsCollectionRef, selectedUnassignedClubId);
                            const clubDocToAssign = await getDoc(clubRefToAssign);
                            if (!clubDocToAssign.exists()) {
                                alert('Vybraný nepriradený tím nebol nájdený alebo už bol priradený/zmazaný.');
                                populateUnassignedClubsSelect(unassignedClubSelect, null);
                                if (clubModal) closeModal(clubModal);
                                if (clubForm) clubForm.reset();
                                if (clubGroupSelect) clubGroupSelect.required = false;
                                if (orderInGroupInput) orderInGroupInput.required = false;
                                return;
                            }
                            const clubDataToAssign = clubDocToAssign.data();
                             // Pre istotu znova overit, ci ma kategoriu, aj ked by to mala riesit validacia vyssie
                             if (!clubDataToAssign.categoryId || clubDataToAssign.categoryId === '' || selectedCategoryId === '') {
                                 alert(`Vybraný tím "${clubDataToAssign.name}" nemá priradenú kategóriu a nemôže byť priradený do skupiny. Upravte tím v "Zozname tímov" alebo vyberte iný tím.`);
                                  if (unassignedClubSelect) unassignedClubSelect.focus();
                                 return;
                             }
                             if (clubDataToAssign.groupId !== null) {
                                alert(`Tím "${clubDataToAssign.name}" je už priradený do skupiny "${clubDataToAssign.groupId.split(' - ').slice(1).join(' - ')}" v kategórii "${clubDataToAssign.categoryId}".`);
                                populateUnassignedClubsSelect(unassignedClubSelect, null);
                                if (clubModal) closeModal(clubModal);
                                if (clubForm) clubForm.reset();
                                if (clubGroupSelect) clubGroupSelect.required = false;
                                if (orderInGroupInput) orderInGroupInput.required = false;
                                return;
                            }

                             const newCategoryId = selectedCategoryId; // Táto hodnota už bola nastavená z vybraného tímu
                             const newName = clubDataToAssign.name || 'Neznámy názov'; // Použiť názov z pôvodného tímu
                             const newGroupId = selectedGroupId;
                             const newOrderInGroup = orderInGroup;

                             // Skontrolovať unikátnosť poradia v cieľovej skupine pred vytvorením nového ID
                             if (newGroupId !== null && newOrderInGroup !== null) {
                                 const existingOrderQuery = query(clubsCollectionRef,
                                       where('groupId', '==', newGroupId),
                                       where('orderInGroup', '==', newOrderInGroup)
                                  );
                                  const existingOrderSnapshot = await getDocs(existingOrderQuery);
                                  if (!existingOrderSnapshot.empty) {
                                       alert(`Tím s poradovým číslom "${newOrderInGroup}" už v skupine "${newGroupId.split(' - ').slice(1).join(' - ')}" existuje! Prosím, zvoľte iné poradové číslo.`);
                                        if (orderInGroupInput) orderInGroupInput.focus();
                                       return;
                                  }
                             }

                             // Vytvoriť nové dokument ID pre priradený tím
                             const newDocumentId = `${newCategoryId} - ${newName}${newOrderInGroup !== null ? ' ' + newOrderInGroup : ''}`;
                             const newClubDocRef = doc(clubsCollectionRef, newDocumentId);

                             // Ešte raz skontrolovať, či už neexistuje dokument s novým ID (preventívne)
                             const existingNewIdDoc = await getDoc(newClubDocRef);
                             if (existingNewIdDoc.exists()) {
                                  alert(`Nemožno priradiť tím: Tím s finálnym názvom "${newName}" a kategóriou/skupinou/poradím už existuje (ID: ${newDocumentId}). Skontrolujte "Zoznam tímov".`);
                                  if (unassignedClubSelect) unassignedClubSelect.focus();
                                  return;
                             }


                            const batch = writeBatch(db);
                            batch.delete(clubRefToAssign); // Vymazať pôvodný nepriradený dokument
                            batch.set(newClubDocRef, { // Vytvoriť nový dokument s novým ID a aktualizovanými dátami
                                name: newName,
                                categoryId: newCategoryId,
                                groupId: newGroupId,
                                orderInGroup: newOrderInGroup
                            });
                            await batch.commit();
                            alert(`Tím "${newName}" úspešne priradený do skupiny "${newGroupId.split(' - ').slice(1).join(' - ')}" v kategórii "${newCategoryId}".`);

                             // Ak bol práve priradený tím, ktorý bol vybraný v Roster modale, obnoviť ho
                             if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForRoster === selectedUnassignedClubId) {
                                  // Po priradení nepriradeného tímu sa jeho ID zmení.
                                  // Roster modal by mal byť v takomto prípade pravdepodobne zatvorený
                                   closeRosterModal();
                                  alert("Tím, ktorý ste upravovali, bol priradený do skupiny. Modal súpisky bol zatvorený.");
                              }


                        } else if (currentClubModalMode === 'edit-assigned') {
                            const clubIdToEdit = editingClubId;
                            const updatedClubName = clubNameInput ? clubNameInput.value.trim() : '';
                            const updatedCategoryId = selectedCategoryId;
                            const updatedGroupId = selectedGroupId;
                             const updatedOrderInGroup = orderInGroup;

                            if (!clubIdToEdit) {
                                  console.error("Chyba: Režim úpravy klubu bez platného editingClubId.");
                                  alert("Chyba pri úprave klubu. Prosím, obnovte stránku.");
                                   if (clubModal) closeModal(clubModal); if (clubForm) clubForm.reset();
                                   currentClubModalMode = 'add-assign'; editingClubId = null;
                                   if (clubGroupSelect) clubGroupSelect.required = false;
                                   if (orderInGroupInput) orderInGroupInput.required = false;
                                  return;
                             }
                             if (!clubNameInput || updatedClubName === '') { // Toto by mala riešiť validácia vyššie
                                  alert('Názov klubu nemôže byť prázdny.');
                                  if (clubNameInput) clubNameInput.focus();
                                  return;
                             }
                             if (selectedCategoryId === '') { // Toto by mala riešiť validácia vyššie
                                 alert('Prosím, vyberte platnú kategóriu.');
                                  if (clubCategorySelect) clubCategorySelect.focus();
                                 return;
                             }


                            const clubRefToEdit = doc(clubsCollectionRef, clubIdToEdit);
                            const clubDocToEdit = await getDoc(clubRefToEdit);
                            if (!clubDocToEdit.exists()) {
                                console.error(`Chyba: Dokument klubu ${clubIdToEdit} nenájdený na úpravu.`);
                                alert("Klub na úpravu nebol nájdený.");
                                if (clubModal) closeModal(clubModal); if (clubForm) clubForm.reset();
                                currentClubModalMode = 'add-assign'; editingClubId = null;
                                displayClubs();
                                displayCreatedTeams();
                                 if (clubGroupSelect) clubGroupSelect.required = false;
                                 if (orderInGroupInput) orderInGroupInput.required = false;
                                return;
                            }
                            const originalClubData = clubDocToEdit.data();
                             const originalGroupId = originalClubData.groupId || null;
                             const originalName = originalClubData.name;
                             const originalCategory = originalClubData.categoryId || null;
                             const originalOrder = typeof originalClubData.orderInGroup === 'number' ? originalClubData.orderInGroup : null;

                             // Určiť nové ID dokumentu. Ak sa zmenila kategória, názov, skupina alebo poradie, ID sa zmení.
                             const newDocumentId = `${updatedCategoryId} - ${updatedClubName}${updatedGroupId !== null && updatedOrderInGroup !== null ? ' ' + updatedOrderInGroup : ''}`;
                             const newClubDocRef = doc(clubsCollectionRef, newDocumentId);


                             // Validacia unikatnosti mena iba ak sa zmenilo meno A (je priradeny do skupiny ALEBO zostava nepriradeny)
                              if (updatedClubName !== originalName) {
                                   if (updatedGroupId !== null) { // Ak je priradeny do skupiny
                                        const existingClubInTargetGroupQuery = query(clubsCollectionRef,
                                             where('groupId', '==', updatedGroupId),
                                             where('name', '==', updatedClubName),
                                             where('__name__', '!=', clubIdToEdit) // Vylúčiť aktuálne upravovaný dokument
                                        );
                                        const existingClubInTargetGroupSnapshot = await getDocs(existingClubInTargetGroupQuery);
                                        if (!existingClubInTargetGroupSnapshot.empty) {
                                             alert(`Klub s názvom "${updatedClubName}" už v cieľovej skupine "${updatedGroupId.split(' - ').slice(1).join(' - ')}" existuje! Prosím, zvoľte iný názov.`);
                                             if (clubNameInput) clubNameInput.focus();
                                             return;
                                        }
                                   } else if (originalGroupId === null && updatedGroupId === null) { // Ak zostava nepriradeny
                                         const existingUnassignedClubQuery = query(clubsCollectionRef,
                                              where('groupId', '==', null),
                                              where('name', '==', updatedClubName),
                                              where('__name__', '!=', clubIdToEdit) // Vylúčiť aktuálne upravovaný dokument
                                         );
                                         const existingUnassignedClubSnapshot = await getDocs(existingUnassignedClubQuery);
                                         if (!existingUnassignedClubSnapshot.empty) {
                                             alert(`Iný nepriradený klub s názvom "${updatedClubName}" už existuje!`);
                                              if (clubNameInput) clubNameInput.focus();
                                             return;
                                         }
                                   }
                              }

                              // Validacia unikatnosti poradia iba ak je priradeny do skupiny a zmenilo sa poradie alebo skupina
                              if (updatedGroupId !== null && updatedOrderInGroup !== null) {
                                   if (updatedGroupId !== originalGroupId || updatedOrderInGroup !== originalOrder) {
                                       const existingOrderQuery = query(clubsCollectionRef,
                                            where('groupId', '==', updatedGroupId),
                                            where('orderInGroup', '==', updatedOrderInGroup),
                                            where('__name__', '!=', clubIdToEdit) // Vylucit aktualne upravovany dokument
                                       );
                                       const existingOrderSnapshot = await getDocs(existingOrderQuery);
                                       if (!existingOrderSnapshot.empty) {
                                            alert(`Tím s poradovým číslom "${updatedOrderInGroup}" už v skupine "${updatedGroupId.split(' - ').slice(1).join(' - ')}" existuje! Prosím, zvoľte iné poradové číslo.`);
                                            if (orderInGroupInput) orderInGroupInput.focus();
                                            return;
                                       }
                                   }
                               }

                             // Skontrolovať, či sa zmenilo ID dokumentu
                             if (clubIdToEdit !== newDocumentId) {
                                  // Ak sa ID mení, skontrolovať, či nové ID už neexistuje
                                  const existingNewIdDoc = await getDoc(newClubDocRef);
                                   if (existingNewIdDoc.exists()) {
                                        alert(`Nemožno uložiť zmeny: Tím s finálnym názvom "${updatedClubName}" a kategóriou/skupinou/poradím už existuje (ID: ${newDocumentId}). Skontrolujte "Zoznam tímov".`);
                                        if (clubNameInput) clubNameInput.focus();
                                        return;
                                   }
                                   const batch = writeBatch(db);
                                   // Zkopírovať dáta (vrátane prípadnej subkolekcie 'roster')
                                   // Pri kopírovaní dokumentu sa subkolekcie nekopírujú automaticky!
                                   // Ak chceme zachovať súpisku, musíme ju presunúť manuálne.
                                   // Zjednodušené riešenie: pri zmene ID tímu, súpiska zostane pri starom ID.
                                   // Realistickejšie riešenie: buď zakázať zmenu ID ak má tím súpisku,
                                   // alebo súpisku presunúť/zmazať/upozorniť.
                                   // Pre účely tejto požiadavky predpokladajme, že pri zmene ID sa súpiska nezachováva
                                   // alebo to nie je kritické. Ak by bola potreba zachovať, bola by potrebná rozsiahlejšia logika Batch.
                                   batch.set(newClubDocRef, { // Vytvoriť nový dokument s novým ID a aktualizovanými dátami
                                       name: updatedClubName,
                                       categoryId: updatedCategoryId,
                                       groupId: updatedGroupId,
                                       orderInGroup: updatedGroupId !== null ? updatedOrderInGroup : null
                                   });
                                   batch.delete(clubRefToEdit); // Vymazať starý dokument
                                  await batch.commit();
                                   alert(`Klub úspešne upravený a premenovaný (ID zmenené).`);
                                   // Ak bol práve upravený tím, ktorý bol vybraný v Roster modale, zatvoriť ho
                                   if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForRoster === clubIdToEdit) {
                                       closeRosterModal();
                                       alert("Tím, ktorý ste upravovali, zmenil ID. Modal súpisky bol zatvorený.");
                                   }

                             } else {
                                  // Ak sa ID nemení, stačí aktualizovať existujúci dokument
                                   await updateDoc(clubRefToEdit, {
                                        name: updatedClubName,
                                       categoryId: updatedCategoryId,
                                       groupId: updatedGroupId,
                                        orderInGroup: updatedGroupId !== null ? updatedOrderInGroup : null
                                   });
                                   alert(`Klub úspešne upravený.`);

                                    // Ak bol práve upravený tím, ktorý bol vybraný v Roster modale, a ID sa nezmenilo, obnoviť súpisku
                                   if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForRoster === clubIdToEdit) {
                                        displayRoster(selectedTeamForRoster); // Obnoviť súpisku
                                   }
                             }

                         }
                         if (clubModal) closeModal(clubModal);
                         if (clubForm) clubForm.reset();
                         currentClubModalMode = 'add-assign';
                         editingClubId = null;
                          if (clubGroupSelect) clubGroupSelect.required = false;
                          if (orderInGroupInput) orderInGroupInput.required = false;

                          // Reset visibility for add-assign mode after closing
                           if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
                           if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
                            if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                            if (orderInputContainer) orderInputContainer.style.display = 'none';
                            if (clubCategorySelect) clubCategorySelect.disabled = true;


                          displayCreatedTeams();
                          if (window.location.hash === '#timy-do-skupin') {
                               displayClubs();
                          }
                           // Ak je otvoreny modal pre súpisky, obnoviť výber tímov
                           if (rosterModal && rosterModal.style.display === 'block') {
                                populateRosterTeamsSelect();
                           }

                     } catch (error) {
                         console.error('Chyba pri ukladaní alebo priradzovaní klubu: ', error);
                         alert(`Chyba pri ukladaní alebo priradzovaní klubu! Detail: ${error.message}`);
                          // Ensure state is reset on error
                          if (clubModal) closeModal(clubModal);
                          if (clubForm) clubForm.reset();
                          currentClubModalMode = 'add-assign'; editingClubId = null;
                           if (clubGroupSelect) clubGroupSelect.required = false;
                           if (orderInGroupInput) orderInGroupInput.required = false;
                            if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
                            if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
                             if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                            if (orderInputContainer) orderInputContainer.style.display = 'none';
                            if (clubCategorySelect) clubCategorySelect.disabled = true;
                     }
                });
            } else { console.error("Club form not found!"); }

             async function displayClubs() {
                if (!clubsContentDiv) { console.error("clubsContentDiv element not found for displayClubs."); return; }
                clubsContentDiv.innerHTML = ''; // Clear previous content

                if (!clubsFilterContainer) {
                     console.error("Filter container inside clubsContent not found!");
                     clubsContentDiv.innerHTML = '<p>Chyba: Kontajner filtrov nebol nájdený.</p>';
                     return;
                }

                // Append the filter container first
                clubsContentDiv.appendChild(clubsFilterContainer);
                 clubsFilterContainer.style.display = 'flex'; // Ensure filter is visible

                try {
                    const selectedCategoryId = clubFilterCategorySelect ? clubFilterCategorySelect.value : '';
                    const selectedGroupId = clubFilterGroupSelect ? clubFilterGroupSelect.value : '';

                    // 1. Fetch all groups for the selected category (if category is filtered)
                    let allGroupsForSelectedCategory = [];
                    if (selectedCategoryId && selectedCategoryId !== '') {
                         const groupsQueryForCategory = query(groupsCollectionRef, where('categoryId', '==', selectedCategoryId));
                         const groupsSnapshotForCategory = await getDocs(groupsQueryForCategory);
                         allGroupsForSelectedCategory = groupsSnapshotForCategory.docs.map(doc => ({ id: doc.id, data: doc.data() }));
                          // Sort groups by name/ID
                         allGroupsForSelectedCategory.sort((a, b) => a.id.localeCompare(b.id));
                    }

                    // 2. Fetch assigned clubs based on filters
                    let clubsQuery;
                    if (selectedCategoryId && selectedCategoryId !== '') {
                        if (selectedGroupId && selectedGroupId !== '') {
                            // If both category and group are selected, get clubs for that specific group
                            clubsQuery = query(clubsCollectionRef, where('categoryId', '==', selectedCategoryId), where('groupId', '==', selectedGroupId));
                        } else {
                            // If only category is selected, get all assigned clubs in that category
                            clubsQuery = query(clubsCollectionRef, where('categoryId', '==', selectedCategoryId), where('groupId', '!=', null));
                        }
                    } else {
                         // If no category is selected, get all assigned clubs regardless of category/group
                        clubsQuery = query(clubsCollectionRef, where('groupId', '!=', null));
                    }

                    const clubsSnapshot = await getDocs(clubsQuery);
                    const fetchedClubs = clubsSnapshot.docs.map(clubDoc => ({ id: clubDoc.id, data: clubDoc.data() }));

                     // 3. Create a map of fetched clubs keyed by groupId
                     const clubsByGroupId = {};
                     fetchedClubs.forEach(club => {
                         const groupId = club.data.groupId;
                         if (groupId) {
                             if (!clubsByGroupId[groupId]) {
                                 clubsByGroupId[groupId] = [];
                             }
                             clubsByGroupId[groupId].push(club);
                         }
                     });


                    // Now, decide what to display based on the selected category filter state
                    const contentArea = document.createElement('div'); // Create a container for the tables/messages
                    contentArea.style.display = 'flex';
                    contentArea.style.flexWrap = 'wrap';
                    contentArea.style.gap = '20px';
                    contentArea.style.justifyContent = 'center';
                    contentArea.style.padding = '0 20px 20px 20px'; // Add padding around tables


                    if (selectedCategoryId && selectedCategoryId !== '') {
                        // User filtered by category - show all groups in that category, populated with clubs
                        if (allGroupsForSelectedCategory.length === 0) {
                             // If no groups exist in the selected category AT ALL (this is different from no clubs)
                             const message = document.createElement('p');
                             message.textContent = `V kategórii "${selectedCategoryId}" zatiaľ nie sú žiadne skupiny.`;
                             contentArea.appendChild(message);
                             clubsContentDiv.appendChild(contentArea); // Append the content area to clubsContentDiv
                             return;
                        }

                         // Iterate through the fetched groups and display sections
                        const generatedClubSections = [];
                        allGroupsForSelectedCategory.forEach(group => {
                             // If a specific group filter is applied, only display that one group
                             if (selectedGroupId && selectedGroupId !== '' && group.id !== selectedGroupId) {
                                  return; // Skip this group if a specific group filter is active
                             }

                            const groupClubSectionDiv = document.createElement('div');
                            groupClubSectionDiv.classList.add('section-block');
                            const groupNameParts = group.id.split(' - ');
                            const groupName = groupNameParts.length > 1 ? groupNameParts.slice(1).join(' - ') : group.id;
                            const sectionHeading = document.createElement('h2');
                             sectionHeading.textContent = `${group.data.categoryId} - ${groupName}`; // Use categoryId from group data
                            groupClubSectionDiv.appendChild(sectionHeading);

                            const clubTable = document.createElement('table');
                            clubTable.classList.add('group-clubs-table');
                            const thead = document.createElement('thead');
                            const headerRow = document.createElement('tr');
                            const orderTh = document.createElement('th');
                            orderTh.textContent = '';
                            orderTh.style.width = '30px';
                            const clubNameTh = document.createElement('th');
                            clubNameTh.textContent = 'Názov klubu';
                             const actionsTh = document.createElement('th');
                             actionsTh.textContent = '';
                             actionsTh.style.width = '150px';
                             headerRow.appendChild(orderTh);
                             headerRow.appendChild(clubNameTh);
                             headerRow.appendChild(actionsTh);
                             thead.appendChild(headerRow);
                             clubTable.appendChild(thead);
                            const tbody = document.createElement('tbody');

                            const clubsInThisGroup = clubsByGroupId[group.id] || []; // Get clubs for this group from the map

                            if (clubsInThisGroup.length === 0) {
                                 const noClubsRow = document.createElement('tr');
                                 const td = document.createElement('td');
                                 td.colSpan = 3;
                                 td.textContent = `Žiadne kluby v tejto skupine.`;
                                 td.style.textAlign = 'center';
                                 tbody.appendChild(noClubsRow);
                            } else {
                                 // Sort clubs within this group
                                 clubsInThisGroup.sort((a, b) => {
                                     const orderA = a.data.orderInGroup;
                                     const orderB = b.data.orderInGroup;

                                     // Preferovat císla pred null/undefined
                                     const numA = typeof orderA === 'number' ? orderA : Infinity;
                                     const numB = typeof orderB === 'number' ? orderB : Infinity;

                                     if (numA !== numB) {
                                          return numA - numB;
                                     } else {
                                         // Ak su poradia rovnake (alebo oba null/Infinity), zoradit podla mena
                                         const nameA = a.data.name || '';
                                         const nameB = b.data.name || '';
                                         return nameA.localeCompare(nameB, 'sk-SK');
                                     }
                                 });

                                 clubsInThisGroup.forEach(club => {
                                     const tr = document.createElement('tr');
                                      tr.dataset.clubId = club.id; // Pridat data atribut pre jednoduchsie vyhladavanie
                                     const orderTd = document.createElement('td');
                                     orderTd.textContent = typeof club.data.orderInGroup === 'number' ? club.data.orderInGroup : '-';
                                     orderTd.style.textAlign = 'center';
                                     const nameTd = document.createElement('td');
                                     nameTd.textContent = club.data.name;
                                     const actionsTd = document.createElement('td');
                                     actionsTd.style.whiteSpace = 'nowrap';

                                      const editClubButton = document.createElement('button');
                                      editClubButton.textContent = 'Upraviť';
                                      editClubButton.classList.add('action-button');
                                      editClubButton.onclick = () => {
                                           openClubModal(club.id, club.data);
                                       };

                                       const unassignClubButton = document.createElement('button');
                                       unassignClubButton.textContent = 'Odobrať';
                                       unassignClubButton.classList.add('action-button', 'delete-button');
                                       unassignClubButton.onclick = async () => {
                                           if (!confirm(`Naozaj chcete odobrať klub "${club.data.name}" zo skupiny "${groupName}" v kategórii "${group.data.categoryId}"? Tím sa vráti medzi nepriradené tímy. Súpiska tímu zostane zachovaná.`)) {
                                               return;
                                           }
                                           try {
                                                await updateDoc(doc(clubsCollectionRef, club.id), {
                                                    groupId: null,
                                                    orderInGroup: null
                                                });
                                                displayClubs(); // Obnoviť zobrazenie klubov v skupinách
                                                displayCreatedTeams(); // Obnoviť zoznam tímov (možno sa zmenil pocet priradenych)
                                                 // Ak je otvoreny manageTeamsModal a tento tim bol v nom, zatvorit ho
                                                  if (manageTeamsModal.style.display === 'block' && teamsListInModalDiv && teamsListInModalDiv.querySelector(`tr[data-club-id="${club.id}"]`)) {
                                                      closeManageTeamsModal();
                                                  }
                                                   // Ak je otvoreny Roster modal a bol vybrany tento tim, zatvorit ho
                                                   if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForRoster === club.id) {
                                                       closeRosterModal();
                                                        alert(`Tím "${club.data.name}" bol odpriradený. Modal súpisky bol zatvorený.`);
                                                   }

                                           } catch (error) {
                                                console.error('Chyba pri odpriradzovaní klubu: ', error);
                                                alert('Chyba pri odpriradzovaní klubu! Prosím, skúste znova.');
                                           }
                                       };

                                        actionsTd.appendChild(editClubButton);
                                        actionsTd.appendChild(unassignClubButton);
                                       tr.appendChild(orderTd);
                                       tr.appendChild(nameTd);
                                       tr.appendChild(actionsTd);
                                       tbody.appendChild(tr);
                                    });
                                 }
                                 clubTable.appendChild(tbody);
                                 groupClubSectionDiv.appendChild(clubTable);
                                 generatedClubSections.push(groupClubSectionDiv);
                              });

                         // Append all generated group sections (including potentially empty ones) to the content area
                         generatedClubSections.forEach(sectionDiv => {
                             contentArea.appendChild(sectionDiv);
                         });


                    } else {
                        // No category filter selected - revert to displaying all assigned clubs, grouped by Category and then Group.
                        // This part uses the original grouping logic based *only* on fetched clubs.
                         if (fetchedClubs.length === 0) {
                              const message = document.createElement('p');
                             message.textContent = "Žiadne kluby zatiaľ neboli priradené do skupín zodpovedajúcim filtrom."; // Text upravený
                             contentArea.appendChild(message);
                             clubsContentDiv.appendChild(contentArea); // Append the content area
                             return;
                         }

                        const clubsByCategoryAndGroup = {};
                        fetchedClubs.forEach(club => {
                            const categoryId = club.data.categoryId;
                            const groupId = club.data.groupId;
                             // Zobrazujeme len kluby, ktore maju priradenu kategoriu AJ skupinu
                             if (categoryId && groupId && categoryId !== 'null' && groupId !== 'null') {
                                 if (!clubsByCategoryAndGroup[categoryId]) {
                                     clubsByCategoryAndGroup[categoryId] = {};
                                 }
                                 if (!clubsByCategoryAndGroup[categoryId][groupId]) {
                                     clubsByCategoryAndGroup[categoryId][groupId] = [];
                                 }
                                  clubsByCategoryAndGroup[categoryId][groupId].push(club);
                             } else {
                                // Tieto kluby by sa nemali objavit vo vysledkoch dotazu s where('groupId', '!=', null)
                                // ale pre istotu ich ignorujeme pri zobrazeni
                             }
                        });

                        const sortedCategories = Object.keys(clubsByCategoryAndGroup).sort();

                         // Ak po filtrovani alebo chybnych datach nemame ziadne zoskupene kluby na zobrazenie
                         if (sortedCategories.length === 0 && fetchedClubs.length > 0) {
                              const message = document.createElement('p');
                               message.textContent = "Existujú priradené kluby zodpovedajúce filtru, ale žiadne nemajú konzistentne priradenú kategóriu a skupinu pre zobrazenie tu (možné chyby v dátach).";
                              contentArea.appendChild(message);
                              clubsContentDiv.appendChild(contentArea); // Append the content area
                              return;
                         } else if (sortedCategories.length === 0 && fetchedClubs.length === 0) {
                              // Toto uz bolo osetrene vyssie, ale pre istotu
                                // const message = document.createElement('p');
                                // message.textContent = "Žiadne kluby zodpovedajúce filtru neboli nájdené.";
                                // contentArea.appendChild(message);
                                // clubsContentDiv.appendChild(contentArea); // Append the content area
                                return; // V tomto pripade by malo byt osetrene v prvom if (fetchedClubs.length === 0)
                         }


                         const generatedClubSections = [];
                        sortedCategories.forEach(categoryId => {
                            const sortedGroups = Object.keys(clubsByCategoryAndGroup[categoryId]).sort();
                            sortedGroups.forEach(groupId => {
                                const clubsInThisGroup = clubsByCategoryAndGroup[categoryId][groupId];
                                const groupClubSectionDiv = document.createElement('div');
                                groupClubSectionDiv.classList.add('section-block');
                                const groupNameParts = groupId.split(' - ');
                                const groupName = groupNameParts.length > 1 ? groupNameParts.slice(1).join(' - ') : groupId;
                                const sectionHeading = document.createElement('h2');
                                sectionHeading.textContent = `${categoryId} - ${groupName}`;
                                groupClubSectionDiv.appendChild(sectionHeading);

                                const clubTable = document.createElement('table');
                                clubTable.classList.add('group-clubs-table');
                                const thead = document.createElement('thead');
                                const headerRow = document.createElement('tr');
                                const orderTh = document.createElement('th');
                                orderTh.textContent = ''; // Pre poradové číslo
                                orderTh.style.width = '30px'; // Zmenšená šírka pre číslo
                                const clubNameTh = document.createElement('th');
                                clubNameTh.textContent = 'Názov klubu';
                                 const actionsTh = document.createElement('th');
                                 actionsTh.textContent = '';
                                 actionsTh.style.width = '150px';
                                 headerRow.appendChild(orderTh);
                                 headerRow.appendChild(clubNameTh);
                                 headerRow.appendChild(actionsTh);
                                 thead.appendChild(headerRow);
                                 clubTable.appendChild(thead);
                                const tbody = document.createElement('tbody');

                                if (clubsInThisGroup.length === 0) {
                                     const noClubsRow = document.createElement('tr');
                                     const td = document.createElement('td');
                                     td.colSpan = 3;
                                     td.textContent = `Žiadne kluby v tejto skupine.`;
                                     td.style.textAlign = 'center';
                                     tbody.appendChild(noClubsRow);
                                } else {
                                     // Zoradit najprv podla poradia, potom podla mena
                                     clubsInThisGroup.sort((a, b) => {
                                          const orderA = a.data.orderInGroup;
                                          const orderB = b.data.orderInGroup;
                                          const numA = typeof orderA === 'number' ? orderA : Infinity;
                                          const numB = typeof orderB === 'number' ? orderB : Infinity;
                                          if (numA !== numB) {
                                               return numA - numB;
                                          } else {
                                              const nameA = a.data.name || '';
                                              const nameB = b.data.name || '';
                                              return nameA.localeCompare(nameB, 'sk-SK');
                                          }
                                     });

                                     clubsInThisGroup.forEach(club => {
                                         const tr = document.createElement('tr');
                                         tr.dataset.clubId = club.id;
                                         const orderTd = document.createElement('td');
                                         orderTd.textContent = typeof club.data.orderInGroup === 'number' ? club.data.orderInGroup : '-';
                                         orderTd.style.textAlign = 'center';
                                         const nameTd = document.createElement('td');
                                         nameTd.textContent = club.data.name;
                                         const actionsTd = document.createElement('td');
                                         actionsTd.style.whiteSpace = 'nowrap';

                                          // Edit button
                                          const editClubButton = document.createElement('button');
                                          editClubButton.textContent = 'Upraviť';
                                          editClubButton.classList.add('action-button');
                                          editClubButton.onclick = () => {
                                               openClubModal(club.id, club.data);
                                           };
                                          actionsTd.appendChild(editClubButton);

                                           // Unassign button
                                           const unassignClubButton = document.createElement('button');
                                           unassignClubButton.textContent = 'Odobrať';
                                           unassignClubButton.classList.add('action-button', 'delete-button');
                                           unassignClubButton.onclick = async () => {
                                               if (!confirm(`Naozaj chcete odobrať klub "${club.data.name}" zo skupiny "${groupName}" v kategórii "${categoryId}"? Tím sa vráti medzi nepriradené tímy. Súpiska tímu zostane zachovaná.`)) {
                                                   return;
                                               }
                                               try {
                                                    await updateDoc(doc(clubsCollectionRef, club.id), {
                                                        groupId: null,
                                                        orderInGroup: null
                                                    });
                                                    displayClubs(); // Obnoviť zobrazenie klubov v skupinách
                                                    displayCreatedTeams(); // Obnoviť zoznam tímov (možno sa zmenil pocet priradenych)
                                                     if (manageTeamsModal.style.display === 'block' && teamsListInModalDiv && teamsListInModalDiv.querySelector(`tr[data-club-id="${club.id}"]`)) {
                                                         closeManageTeamsModal();
                                                     }
                                                      // Ak je otvoreny Roster modal a bol vybrany tento tim, zatvorit ho
                                                      if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForRoster === club.id) {
                                                          closeRosterModal();
                                                           alert(`Tím "${club.data.name}" bol odpriradený. Modal súpisky bol zatvorený.`);
                                                      }
                                               } catch (error) {
                                                    console.error('Chyba pri odpriradzovaní klubu: ', error);
                                                    alert('Chyba pri odpriradzovaní klubu! Prosím, skúste znova.');
                                               }
                                           };
                                          actionsTd.appendChild(unassignClubButton);

                                         tr.appendChild(orderTd);
                                         tr.appendChild(nameTd);
                                         actionsTd.appendChild(editClubButton); // Add Edit button
                                         actionsTd.appendChild(unassignClubButton); // Add Remove button
                                         tr.appendChild(actionsTd);
                                         tbody.appendChild(tr);
                                     });
                                  }
                                  clubTable.appendChild(tbody);
                                  groupClubSectionDiv.appendChild(clubTable);
                                  generatedClubSections.push(groupClubSectionDiv);
                               });
                            });

                         // Append all generated group sections to the content area
                         generatedClubSections.forEach(sectionDiv => {
                              contentArea.appendChild(sectionDiv);
                         });
                      }

                    clubsContentDiv.appendChild(contentArea); // Append the main content area with tables


                   // Adjustment for column width consistency (from previous fix)
                    contentArea.querySelectorAll('.section-block').forEach(section => {
                         section.style.width = 'auto';
                          section.style.flexGrow = '0';
                          section.style.flexShrink = '0';
                          section.style.flexBasis = 'auto';
                    });
                    const sectionBlocks = contentArea.querySelectorAll('.section-block'); // Adjust to use contentArea
                    if (window.innerWidth > 993 && sectionBlocks.length > 2) {
                         let maxWidth = 0;
                         sectionBlocks.forEach(section => {
                              if (section.offsetWidth > maxWidth) {
                                  maxWidth = section.offsetWidth;
                              }
                         });
                         if (maxWidth > 0) {
                             sectionBlocks.forEach(section => {
                                 section.style.width = maxWidth + 'px';
                             });
                         }
                    }


                } catch (error) {
                    console.error('Chyba pri načítaní alebo zobrazovaní klubov: ', error);
                    const errorMessage = document.createElement('p');
                    errorMessage.textContent = 'Chyba pri načítaní dát klubov priradených do skupín.';
                     clubsContentDiv.appendChild(errorMessage); // Append error message directly
                }
             }

             async function displayCreatedTeams() {
                  if (!createdTeamsTableBody || !createdTeamsTableHeader) { console.error("Created teams table elements not found."); return; }
                  createdTeamsTableBody.innerHTML = '';
                  createdTeamsTableHeader.innerHTML = '';
                  try {
                      const categoriesSnapshot = await getDocs(categoriesCollectionRef);
                      const categories = categoriesSnapshot.docs.map(doc => doc.id).sort((a, b) => a.localeCompare(b, 'sk-SK'));
                      // Zostavenie hlavičky tabuľky
                      const teamNameTh = document.createElement('th');
                      teamNameTh.textContent = 'Základný názov tímu';
                      createdTeamsTableHeader.appendChild(teamNameTh);
                      // Pridat stlpec pre kazdu kategoriu
                      categories.forEach(categoryName => {
                          const categoryTh = document.createElement('th');
                          categoryTh.textContent = categoryName;
                          categoryTh.style.textAlign = 'center';
                          createdTeamsTableHeader.appendChild(categoryTh);
                      });
                      // Stlpec pre akcie
                      const actionsTh = document.createElement('th');
                      actionsTh.textContent = '';
                      actionsTh.style.width = '150px';
                      createdTeamsTableHeader.appendChild(actionsTh);
                      const q = query(clubsCollectionRef);
                      const querySnapshot = await getDocs(q);
                      const teamsByBaseName = {};
                      querySnapshot.docs.forEach(doc => {
                          const clubData = doc.data();
                           const fullTeamName = clubData.name || 'Neznámy názov';
                           // Regex na najdenie posledneho slova, ktore vyzera ako pismeno skupiny (A, B, C...)
                           // Predpoklad: nazov timu nema na konci jedno velke pismeno, pokial to nie je sucast ozn. sk.
                           const nameSuffixMatch = fullTeamName.match(/^(.*)\s[A-Z]$/);
                           const baseTeamName = nameSuffixMatch ? nameSuffixMatch[1] : fullTeamName; // Odobrat pismeno sk. ak existuje
                          const categoryId = clubData.categoryId || 'Nepriradená'; // Kategorie pre zobrazenie su aj 'Nepriradená'
                          if (!teamsByBaseName[baseTeamName]) {
                              teamsByBaseName[baseTeamName] = {
                                  categories: {}, // Pocet timov pre kazdu kategoriu
                                  originalTeams: [] // Referencie na vsetky individualne timy s tymto zakladnym nazvom
                              };
                          }
                          if (!teamsByBaseName[baseTeamName].categories[categoryId]) {
                               teamsByBaseName[baseTeamName].categories[categoryId] = 0;
                          }
                          teamsByBaseName[baseTeamName].categories[categoryId]++;
                          teamsByBaseName[baseTeamName].originalTeams.push({ id: doc.id, data: clubData });
                      });
                      const sortedBaseNames = Object.keys(teamsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));
                      if (sortedBaseNames.length === 0) {
                          const noDataRow = document.createElement('tr');
                          const td = document.createElement('td');
                          td.colSpan = 2 + categories.length; // Názov + Počet kategórií + Akcie
                          td.textContent = "Žiadne tímy zatiaľ pridané.";
                          td.style.textAlign = 'center';
                          noDataRow.appendChild(td);
                          createdTeamsTableBody.appendChild(noDataRow);
                      } else {
                          sortedBaseNames.forEach(baseTeamName => {
                              const teamSummary = teamsByBaseName[baseTeamName];
                              const tr = document.createElement('tr');
                              // Stlpec nazov timu
                              const nameTd = document.createElement('td');
                              nameTd.textContent = baseTeamName;
                              tr.appendChild(nameTd);
                              // Stlpce poctu timov v kategoriach
                              categories.forEach(categoryName => {
                                  const countTd = document.createElement('td');
                                  const count = teamSummary.categories[categoryName] || 0;
                                  countTd.textContent = count > 0 ? count : '-'; // Zobrazit '-' ak je pocet 0
                                  countTd.style.textAlign = 'center';
                                  tr.appendChild(countTd);
                              });
                              // Stlpec akcii
                              const actionsTd = document.createElement('td');
                              actionsTd.style.whiteSpace = 'nowrap';
                               // Tlacitko "Spravovat timy"
                               const manageTeamsButton = document.createElement('button');
                               manageTeamsButton.textContent = 'Spravovať tímy';
                               manageTeamsButton.classList.add('action-button');
                               manageTeamsButton.onclick = () => {
                                   openManageTeamsModal(baseTeamName, teamSummary.originalTeams);
                               };
                               actionsTd.appendChild(manageTeamsButton);
                               // Tlacitko "Vymazat vsetko" (pre vsetky timy s tymto zakladnym nazvom)
                               const deleteAllButton = document.createElement('button');
                               deleteAllButton.textContent = 'Vymazať všetko';
                               deleteAllButton.classList.add('action-button', 'delete-button');
                               deleteAllButton.onclick = async () => {
                                   if (!confirm(`Naozaj chcete vymazať VŠETKY tímy s názvom "${baseTeamName}" (${teamSummary.originalTeams.length} ks)? Táto akcia vymaže všetky individuálne tímy priradené k tomuto základnému názvu a ich súpisky.`)) { // Upozornit aj na súpisky
                                       return;
                                   }
                                   try {
                                        const batch = writeBatch(db);
                                        for (const team of teamSummary.originalTeams) {
                                            // Akcia na vymazanie subkolekcie 'roster' pre každý tím
                                             const rosterSnapshot = await getDocs(collection(clubsCollectionRef, team.id, 'roster'));
                                             rosterSnapshot.forEach(playerDoc => {
                                                  batch.delete(playerDoc.ref); // Pridať vymazanie každého hráča do batchu
                                             });
                                            batch.delete(doc(clubsCollectionRef, team.id)); // Pridať vymazanie tímu do batchu
                                        }
                                       await batch.commit();
                                       displayCreatedTeams(); // Obnovit zoznam timov
                                       if (window.location.hash === '#timy-do-skupin') {
                                            displayClubs(); // Obnovit zobrazenie klubov v skupinach
                                       }
                                         // Ak je otvorene modalne okno vytvarania timov a pouzivatel by chcel vytvorit dalsie, obnovit zoznam kategorii
                                         if (teamCreationModal && teamCreationModal.style.display === 'block') {
                                              loadAllCategoriesForDynamicSelects();
                                         }
                                          // Ak je otvorene modalne okno klubu a upraval sa tim s tymto nazvom, zatvorit ho
                                          if (clubModal && clubModal.style.display === 'block') {
                                              if (currentClubModalMode === 'edit-assigned' && teamSummary.originalTeams.some(t => t.id === editingClubId)) {
                                                  if (clubModal) closeModal(clubModal);
                                              }
                                               // Ak je otvorene modalne okno pre priradenie a mazali sa nepriradene timy, obnovit selectbox
                                              if (currentClubModalMode === 'add-assign' && unassignedClubSelect) {
                                                   populateUnassignedClubsSelect(unassignedClubSelect, null);
                                              }
                                           }
                                          // Ak je otvorene modalne okno spravy timov pre tento zakladny nazov, zatvorit ho
                                          if (manageTeamsModal.style.display === 'block' && baseTeamNameInModalSpan && baseTeamNameInModalSpan.textContent === `Tímy: ${baseTeamName}`) {
                                               closeManageTeamsModal();
                                          }
                                           // Ak je otvoreny Roster modal a bol vybrany tim s týmto základným názvom, zatvoriť ho
                                          if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForRoster) {
                                               const selectedTeamDoc = await getDoc(doc(clubsCollectionRef, selectedTeamForRoster));
                                                if (!selectedTeamDoc.exists() || (selectedTeamDoc.exists() && (selectedTeamDoc.data().name || 'Neznámy názov').includes(baseTeamName))) {
                                                     closeRosterModal();
                                                      alert(`Tím, ktorý ste spravovali v móde súpisky, bol zmazaný. Modal súpisky bol zatvorený.`);
                                                } else {
                                                    // Ak bol vybraný tím s týmto základným názvom, ale nebol zmazaný (možno bol upravený názov),
                                                    // obnoviť výber tímov v Roster modale
                                                     populateRosterTeamsSelect();
                                                }
                                          }

                                   } catch (error) {
                                       console.error(`Chyba pri mazaní tímov s názvom "${baseTeamName}": `, error);
                                       alert('Chyba pri mazaní tímov!');
                                   }
                                };
                                actionsTd.appendChild(deleteAllButton);
                              tr.appendChild(actionsTd);
                              createdTeamsTableBody.appendChild(tr);
                          });
                      }
                  } catch (error) {
                      console.error('Chyba pri načítaní alebo zobrazovaní vytvorených tímov: ', error);
                      const errorMessage = document.createElement('tr');
                      const td = document.createElement('td');
                      td.colSpan = 2 + categories.length; // Podla poctu stlpcov
                      td.textContent = 'Chyba pri načítaní dát tímov.';
                      td.style.textAlign = 'center';
                      errorMessage.appendChild(td);
                      createdTeamsTableBody.appendChild(errorMessage);
                  }
             }

             function closeManageTeamsModal() {
                  if (!manageTeamsModal) { console.error("manageTeamsModal is null v closeManageTeamsModal."); return; }
                  manageTeamsModal.style.display = 'none';
                   if (teamsListInModalDiv) teamsListInModalDiv.innerHTML = '';
                   if (baseTeamNameInModalSpan) baseTeamNameInModalSpan.textContent = '';
                   closeModal(manageTeamsModal);
              }

             async function openManageTeamsModal(baseTeamName, individualTeams) {
                  if (!manageTeamsModal || !baseTeamNameInModalSpan || !teamsListInModalDiv) { console.error("Missing manage teams modal elements."); return; }
                  openModal(manageTeamsModal);
                  baseTeamNameInModalSpan.textContent = `Tímy: ${baseTeamName}`;
                  teamsListInModalDiv.innerHTML = '';
                  if (!individualTeams || individualTeams.length === 0) {
                      teamsListInModalDiv.innerHTML = '<p>Žiadne individuálne tímy nájdené pre tento základný názov.</p>';
                      return;
                  }
                  const teamsByCategory = {};
                  individualTeams.forEach(team => {
                      const category = team.data.categoryId || 'Nepriradená';
                      if (!teamsByCategory[category]) {
                          teamsByCategory[category] = [];
                      }
                      teamsByCategory[category].push(team);
                  });
                  const sortedCategories = Object.keys(teamsByCategory).sort();
                  sortedCategories.forEach(categoryName => {
                      const teamsInThisCategory = teamsByCategory[categoryName];
                      const categoryHeading = document.createElement('h3');
                      categoryHeading.textContent = `${categoryName}`;
                      teamsListInModalDiv.appendChild(categoryHeading);
                      const categoryTeamsTable = document.createElement('table');
                      categoryTeamsTable.classList.add('group-clubs-table'); // Pouzit rovnake styly tabulky
                      const thead = document.createElement('thead');
                      const headerRow = document.createElement('tr');
                      const teamNameTh = document.createElement('th');
                      teamNameTh.textContent = 'Názov tímu';
                       const groupTh = document.createElement('th');
                       groupTh.textContent = 'Skupina';
                        const orderTh = document.createElement('th');
                        orderTh.textContent = 'Poradie';
                        orderTh.style.textAlign = 'center';
                        orderTh.style.width = '50px'; // Mensia sirka pre poradie
                       const actionsTh = document.createElement('th');
                       actionsTh.textContent = '';
                       actionsTh.style.width = '150px'; // Sirka pre akcie
                       headerRow.appendChild(teamNameTh);
                       headerRow.appendChild(groupTh);
                       headerRow.appendChild(orderTh);
                       headerRow.appendChild(actionsTh);
                       thead.appendChild(headerRow);
                       categoryTeamsTable.appendChild(thead);
                      const tbody = document.createElement('tbody');
                       // Zoradit timy - najprv nepriradene, potom podla mena
                       teamsInThisCategory.sort((a, b) => {
                            const isAssignedA = a.data.groupId !== null;
                            const isAssignedB = b.data.groupId !== null;
                            if (isAssignedA !== isAssignedB) {
                                 return isAssignedA ? 1 : -1; // Nepriradene idu prve
                            }
                             return (a.data.name || '').localeCompare(b.data.name || '', 'sk-SK'); // Potom podla mena
                       });
                      teamsInThisCategory.forEach(team => {
                          const tr = document.createElement('tr');
                           tr.dataset.clubId = team.id; // Pridat data atribut pre jednoduchsie vyhladavanie
                          const nameTd = document.createElement('td');
                          nameTd.textContent = team.data.name || 'Neznámy názov';
                          tr.appendChild(nameTd);
                           const groupTd = document.createElement('td');
                           const groupNameParts = (team.data.groupId || '').split(' - ');
                           groupTd.textContent = team.data.groupId ? (groupNameParts.length > 1 ? groupNameParts.slice(1).join(' - ') : team.data.groupId) : 'Nepriradené';
                           tr.appendChild(groupTd);
                           const orderTd = document.createElement('td');
                           orderTd.textContent = team.data.groupId !== null && typeof team.data.orderInGroup === 'number' ? team.data.orderInGroup : '-';
                           orderTd.style.textAlign = 'center';
                           tr.appendChild(orderTd);
                          const actionsTd = document.createElement('td');
                          actionsTd.style.whiteSpace = 'nowrap';
                          // Tlacitko "Upravit" individualny tim
                          const editIndividualTeamButton = document.createElement('button');
                          editIndividualTeamButton.textContent = 'Upraviť';
                          editIndividualTeamButton.classList.add('action-button');
                          editIndividualTeamButton.onclick = () => {
                              closeManageTeamsModal(); // Zatvorit toto modalne okno
                              openClubModal(team.id, team.data); // otvorit modalne okno klubu v edit mode
                          };
                          actionsTd.appendChild(editIndividualTeamButton);
                          // Tlacitko "Vymazat" individualny tim
                          const deleteIndividualTeamButton = document.createElement('button');
                          deleteIndividualTeamButton.textContent = 'Vymazať';
                          deleteIndividualTeamButton.classList.add('action-button', 'delete-button');
                          deleteIndividualTeamButton.onclick = async () => {
                               if (!confirm(`Naozaj chcete vymazať tím "${team.data.name}" z kategórie "${categoryName}"? Táto akcia vymaže tím úplne z databázy a jeho súpisku.`)) { // Upozornit aj na súpisku
                                   return;
                               }
                              try {
                                   const teamDocRef = doc(clubsCollectionRef, team.id);
                                   const batch = writeBatch(db);
                                   // Vymazat vsetkych hracov v subkolekcii 'roster'
                                    const rosterSnapshot = await getDocs(collection(teamDocRef, 'roster'));
                                    rosterSnapshot.forEach(playerDoc => {
                                         batch.delete(playerDoc.ref);
                                    });
                                   batch.delete(teamDocRef); // Vymazat samotny dokument timu
                                   await batch.commit();

                                   // Po vymazani obnovit zobrazenia
                                   closeManageTeamsModal(); // Zatvorit toto modalne okno
                                   displayCreatedTeams(); // Obnovit zoznam timov
                                  if (window.location.hash === '#timy-do-skupin') {
                                       displayClubs(); // Obnovit zobrazenie klubov v skupinach
                                  }
                                   // Ak je otvoreny Roster modal a bol vybrany tento tim, zatvorit ho
                                  if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForRoster === team.id) {
                                      closeRosterModal();
                                       alert(`Tím "${team.data.name}" bol zmazaný. Modal súpisky bol zatvorený.`);
                                  }

                              } catch (error) {
                                  console.error(`Chyba pri mazaní individuálneho tímu "${team.data.name}" (ID: ${team.id}): `, error);
                                  alert('Chyba pri mazaní tímu!');
                              }
                          };
                          actionsTd.appendChild(deleteIndividualTeamButton);
                          tr.appendChild(actionsTd);
                          tbody.appendChild(tr);
                      });
                      categoryTeamsTable.appendChild(tbody);
                      teamsListInModalDiv.appendChild(categoryTeamsTable);
                  });
             }

             async function loadAllCategoriesForDynamicSelects() {
                 try {
                     const querySnapshot = await getDocs(categoriesCollectionRef);
                     // Zoradit kategorie abecedne
                     allAvailableCategories = querySnapshot.docs.map(doc => doc.id).sort((a, b) => a.localeCompare(b, 'sk-SK'));
                      // Aktualizovat dynamic selecty v modalnom okne vytvarania timov, ak je otvorene
                      if (teamCreationModal && teamCreationModal.style.display === 'block') {
                           updateDynamicCategorySelects();
                           checkIfAddCategoryCountPairButtonShouldBeVisible();
                      }
                 } catch (error) {
                     console.error('Chyba pri načítaní kategórií pre dynamické selecty: ', error);
                     allAvailableCategories = []; // V pripade chyby nastavit na prazdne pole
                      checkIfAddCategoryCountPairButtonShouldBeVisible(); // Aktualizovat viditelnost tlacitka
                 }
            }
            // Pomocná funkcia na naplnenie dynamického selectu kategórií
            function populateDynamicCategorySelect(selectElement, currentSelectedId, allCategories, categoriesToExclude) {
                 if (!selectElement) { console.error("selectElement for dynamic category select is null."); return; }
                 selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>'; // Pociatocna moznost
                 selectElement.disabled = allCategories.length === 0; // Zablokovat ak nie su ziadne kategorie

                 // Pridat aktualne vybranu moznost (ak existuje a je v platnych kategoriach)
                 if (currentSelectedId && allCategories.includes(currentSelectedId)) {
                      const currentOption = document.createElement('option');
                      currentOption.value = currentSelectedId;
                      currentOption.textContent = currentSelectedId;
                      currentOption.selected = true; // Nastavit ako vybrane
                      selectElement.appendChild(currentOption);
                 }
                 // Pridat ostatne dostupne kategorie, ktore nie su vylucene
                 allAvailableCategories.forEach(categoryName => {
                     if (categoryName !== currentSelectedId && !categoriesToExclude.includes(categoryName)) {
                         const option = document.createElement('option');
                         option.value = categoryName;
                         option.textContent = categoryName;
                         selectElement.appendChild(option);
                     }
                 });
                  // Ak po naplneni stale nie je vybrana ziadna hodnota, nastavit na prazdny placeholder
                  if (!selectElement.value) {
                      selectElement.value = "";
                  }
            }
            // Aktualizuje možnosti v dynamických selectboxoch kategórií
            function updateDynamicCategorySelects() {
                 if (!teamCategoryCountContainer) { console.error("teamCategoryCountContainer not found for updateDynamicCategorySelects."); return; }
                 const allSelectElements = teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic');
                 // Zoznam aktualne vybranych kategorii vo VSETKYCH dynamickych selectoch
                 const currentSelections = Array.from(allSelectElements)
                     .map(select => select.value)
                     .filter(value => value !== ''); // Ignorovat prazdne hodnoty
                 // Pre kazdy dynamic selectbox
                 allSelectElements.forEach(selectElement => {
                     const currentSelectedIdInThisSelect = selectElement.value;
                     // Vylucit tie kategorie, ktore su vybrane v INYCH selectboxoch
                     const categoriesToExcludeForThisSelect = currentSelections.filter(cat => cat !== currentSelectedIdInThisSelect);
                     // Znovu naplnit selectbox s aktualnym vyberom a vylucenymi kategoriami
                     populateDynamicCategorySelect(
                         selectElement,
                         currentSelectedIdInThisSelect,
                         allAvailableCategories,
                         categoriesToExcludeForThisSelect
                     );
                 });
                 // Skontrolovat, ci je mozne pridat dalsi par kategoria/pocet
                 checkIfAddCategoryCountPairButtonShouldBeVisible();
            }
             // Aktualizuje viditeľnosť tlačidiel "Odstrániť" pre dynamické páry kategória/počet
             function updateRemoveButtonVisibility() {
                 if (!teamCategoryCountContainer) { console.error("teamCategoryCountContainer not found for updateRemoveButtonVisibility."); return; }
                  const allRemoveButtons = teamCategoryCountContainer.querySelectorAll('.category-count-pair .delete-button');
                  if (allRemoveButtons.length > 0) {
                       allRemoveButtons.forEach((button, index) => {
                            // Tlacitko "Odstranit" zobrazit len ak je viac ako 1 par
                            if (allRemoveButtons.length <= 1) {
                                 button.style.display = 'none';
                            } else {
                                 button.style.display = 'inline-block';
                            }
                       });
                  }
             }
             // Skontroluje, či má byť viditeľné tlačidlo "Pridať ďalšiu kategóriu"
             function checkIfAddCategoryCountPairButtonShouldBeVisible() {
                 if (!teamCategoryCountContainer || !addCategoryCountPairButton) { console.error("teamCategoryCountContainer or addCategoryCountPairButton not found."); return; }
                  const allSelectElements = teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic');
                  const currentSelections = Array.from(allSelectElements)
                      .map(select => select.value)
                      .filter(value => value !== '');
                  // Tlacitko zobrazit len ak existuju kategorie a este neboli vsetky vybrane
                  if (allAvailableCategories.length > 0 && currentSelections.length < allAvailableCategories.length) {
                       addCategoryCountPairButton.style.display = 'inline-block';
                  } else {
                       addCategoryCountPairButton.style.display = 'none';
                  }
             }
             // Pridá nový riadok pre výber kategórie a zadanie počtu tímov
             async function addCategoryCountPair(initialCategory = null) {
                 if (!teamCategoryCountContainer || !addCategoryCountPairButton) { console.error("Missing teamCategoryCountContainer or addCategoryCountPairButton."); return; }

                 const container = teamCategoryCountContainer;
                 const pairDiv = document.createElement('div');
                 pairDiv.classList.add('category-count-pair');
                 const categorySelectLabel = document.createElement('label');
                 categorySelectLabel.textContent = 'Kategória:';
                 const categorySelect = document.createElement('select');
                 categorySelect.classList.add('team-category-select-dynamic'); // Identifikacna trieda
                 categorySelect.name = 'category';
                 categorySelect.required = true;
                 // Listener pre aktualizaciu ostatnych selectboxov a tlacidiel po zmene vyberu
                 categorySelect.addEventListener('change', () => {
                     updateDynamicCategorySelects();
                     updateRemoveButtonVisibility();
                 });
                 const teamCountLabel = document.createElement('label');
                 teamCountLabel.textContent = 'Počet tímov:';
                 const teamCountInput = document.createElement('input');
                 teamCountInput.classList.add('team-count-input-dynamic'); // Identifikacna trieda
                 teamCountInput.type = 'number';
                 teamCountInput.name = 'count';
                 teamCountInput.min = '1';
                 teamCountInput.value = '1';
                 teamCountInput.required = true;
                 const removeButton = document.createElement('button');
                 removeButton.textContent = 'Odstrániť';
                 removeButton.classList.add('action-button', 'delete-button');
                 removeButton.type = 'button'; // Aby nespustilo submit formulára
                 removeButton.style.marginLeft = '10px';
                  // Listener pre odstranenie tohto paru
                  removeButton.onclick = () => {
                      pairDiv.remove(); // Odstrani cely div s parom
                      updateDynamicCategorySelects(); // Aktualizuje ostatne selectboxy
                      updateRemoveButtonVisibility(); // Aktualizuje viditelnost tlacidiel Odstranit
                  };
                 // Vytvorenie kontajnerov pre flexibilne zobrazenie label/input
                 const selectContainer = document.createElement('div');
                 selectContainer.style.marginBottom = '10px';
                 selectContainer.appendChild(categorySelectLabel);
                 selectContainer.appendChild(categorySelect);
                  const inputContainer = document.createElement('div');
                  inputContainer.style.marginBottom = '10px';
                 inputContainer.appendChild(teamCountLabel);
                 inputContainer.appendChild(teamCountInput);
                  pairDiv.appendChild(selectContainer);
                  pairDiv.appendChild(inputContainer);
                  pairDiv.appendChild(removeButton);
                 container.appendChild(pairDiv);
                 // Ziskat aktualne vybrane kategorie v ostatnych selectboxoch (pred naplnenim tohto noveho)
                 const allSelectElementsBeforeAdding = container.querySelectorAll('.team-category-select-dynamic');
                 const categoriesSelectedInOthers = Array.from(allSelectElementsBeforeAdding)
                     .map(select => select.value)
                     .filter(value => value !== '' && value !== initialCategory); // Vylucit prazdnu a inicialnu kategoriu
                 // Naplnit novy selectbox s dostupnymi (nevybranymi) kategoriami
                 populateDynamicCategorySelect(
                    categorySelect,
                    initialCategory, // Ak je zadana pociatocna kategoria, vybrat ju
                    allAvailableCategories,
                    categoriesSelectedInOthers // Vylucit kategorie uz vybrane v inych riadkoch
                 );
                   // Znovu aktualizovat vsetky dynamicke selecty po pridani noveho paru
                   updateDynamicCategorySelects();
                   // Znovu skontrolovat viditelnost tlacidiel Odstranit
                   updateRemoveButtonVisibility();
            }

            async function openTeamCreationModal() {
                 if (!teamCreationModal || !teamCreationModalTitle || !teamCreationForm || !teamCategoryCountContainer || !addCategoryCountPairButton || !teamNameInput) {
                     console.error("Missing team creation modal elements.");
                     if (teamCreationModal) closeModal(teamCreationModal);
                     return;
                 }
                 openModal(teamCreationModal);
                 currentTeamCreationModalMode = 'add';
                 teamCreationModalTitle.textContent = 'Vytvoriť tímy';
                 teamCreationForm.reset();
                 teamCategoryCountContainer.innerHTML = ''; // Vymazat predchadzajuce pary
                 // Nacitat kategorie, ak este nie su nacitane
                 if (allAvailableCategories.length === 0) {
                      await loadAllCategoriesForDynamicSelects();
                 } else {
                       // Ak uz su nacitane, staci aktualizovat zobrazenie
                       updateDynamicCategorySelects();
                       updateRemoveButtonVisibility();
                   }
                 // Pridat prvy par kategoria/pocet
                 await addCategoryCountPair();
                 // Nastavit fokus na prve vstupne pole
                 teamNameInput.focus();
            }

            async function populateClubFilterCategories() {
                 if (!clubFilterCategorySelect) { console.error("clubFilterCategorySelect not found!"); return; }
                 // Zachovat aktualnu hodnotu filtra
                 const currentSelectedFilterCategory = clubFilterCategorySelect.value;
                 clubFilterCategorySelect.innerHTML = '<option value="">Všetky kategórie</option>'; // Pociatocna moznost
                 clubFilterCategorySelect.disabled = true; // Zablokovat pocas nacitavania
                 try {
                     const querySnapshot = await getDocs(categoriesCollectionRef);
                     if (querySnapshot.empty) {
                          const option = document.createElement('option');
                          option.value = ''; // Prazdna hodnota pre "Žiadne kategórie"
                          option.textContent = 'Žiadne kategórie';
                          option.disabled = true;
                          clubFilterCategorySelect.appendChild(option);
                           // Zostane zablokovane, ak nie su kategorie
                     } else {
                          clubFilterCategorySelect.disabled = false; // Odblokovat ak su kategorie
                          const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
                          sortedDocs.forEach((doc) => {
                               const categoryName = doc.id;
                               const option = document.createElement('option');
                               option.value = categoryName;
                               option.textContent = categoryName;
                               clubFilterCategorySelect.appendChild(option);
                          });
                          // Nastavit spat predchadzajucu hodnotu, ak existuje
                          if (currentSelectedFilterCategory && clubFilterCategorySelect.querySelector(`option[value="${currentSelectedFilterCategory}"]`)) {
                               clubFilterCategorySelect.value = currentSelectedFilterCategory;
                          } else {
                               clubFilterCategorySelect.value = ''; // Resetovat na "Všetky kategórie" ak predchadzajuca neexistuje
                          }
                     }
                      // Naplnit filter skupin na zaklade aktualne vybranej kategorie (aj ak je prazdna)
                      populateClubFilterGroups(clubFilterCategorySelect.value);
                 } catch (error) {
                     console.error('Chyba pri načítaní kategórií pre filter klubov: ', error);
                     const option = document.createElement('option');
                     option.value = '';
                     option.textContent = 'Chyba pri načítaní';
                     option.disabled = true;
                     clubFilterCategorySelect.appendChild(option);
                      clubFilterCategorySelect.disabled = true; // Zablokovat pri chybe
                 }
            }

            async function populateClubFilterGroups(categoryId) {
                 if (!clubFilterGroupSelect) { console.error("clubFilterGroupSelect not found!"); return; }
                 // Zachovat aktualnu hodnotu filtra skupiny
                 const currentSelectedFilterGroup = clubFilterGroupSelect.value;
                 clubFilterGroupSelect.innerHTML = '<option value="">Všetky skupiny</option>'; // Pociatocna moznost
                 clubFilterGroupSelect.disabled = true; // Zablokovat pocas nacitavania
                 // Ak nie je vybrana ziadna kategoria, nie je mozne vybrat skupinu
                 if (!categoryId || categoryId === '' || categoryId === 'Všetky kategórie') {
                      if (clubFilterGroupSelect) {
                          clubFilterGroupSelect.innerHTML = '<option value="">Všetky skupiny</option>';
                          clubFilterGroupSelect.disabled = true;
                      }
                     return;
                 }
                 try {
                     const groupsQuery = query(groupsCollectionRef, where('categoryId', '==', categoryId));
                     const querySnapshot = await getDocs(groupsQuery);
                     if (querySnapshot.empty) {
                          const option = document.createElement('option');
                          option.value = '';
                          option.textContent = 'Žiadne skupiny v kategórii';
                          option.disabled = true;
                          clubFilterGroupSelect.appendChild(option);
                           clubFilterGroupSelect.disabled = true; // Zostane zablokovane ak nie su skupiny
                     } else {
                          clubFilterGroupSelect.disabled = false; // Odblokovat ak su skupiny
                          const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
                          sortedDocs.forEach((doc) => {
                               const groupName = doc.id;
                               const option = document.createElement('option');
                               option.value = groupName;
                               option.textContent = groupName;
                               clubFilterGroupSelect.appendChild(option);
                          });
                          // Nastavit spat predchadzajucu hodnotu, ak existuje a je platna
                          if (currentSelectedFilterGroup && clubFilterGroupSelect.querySelector(`option[value="${currentSelectedFilterGroup}"]`)) {
                               clubFilterGroupSelect.value = currentSelectedFilterGroup;
                          } else {
                               clubFilterGroupSelect.value = ''; // Resetovat na "Všetky skupiny" ak predchadzajuca neexistuje
                          }
                     }
                 } catch (error) {
                     console.error(`Chyba pri načítaní skupín pre filter klubov kategórie "${categoryId}": `, error);
                     const option = document.createElement('option');
                     option.value = '';
                     option.textContent = 'Chyba pri načítaní';
                     option.disabled = true;
                     clubFilterGroupSelect.appendChild(option);
                      clubFilterGroupSelect.disabled = true; // Zablokovat pri chybe
                 }
            }

            // Nová funkcia na načítanie tímov do výberu v Roster modale
             async function populateRosterTeamsSelect() {
                 if (!rosterTeamSelect) { console.error("rosterTeamSelect not found!"); return; }
                 rosterTeamSelect.innerHTML = '<option value="">-- Vyberte tím --</option>';
                 rosterTeamSelect.disabled = true;
                 if (selectedTeamCategoryParagraph) selectedTeamCategoryParagraph.textContent = ''; // Vymazať kategóriu
                 if (rosterTableBody) rosterTableBody.innerHTML = ''; // Vymazať súpisku
                 if (playerManagementArea) playerManagementArea.style.display = 'none'; // Skryť oblasť pre správu hráčov
                 selectedTeamForRoster = null; // Reset vybraného tímu

                 try {
                     // Načítať všetky tímy (kluby)
                     const querySnapshot = await getDocs(clubsCollectionRef);
                     if (querySnapshot.empty) {
                         const option = document.createElement('option');
                         option.value = '';
                         option.textContent = '-- Žiadne tímy --';
                         option.disabled = true;
                         rosterTeamSelect.appendChild(option);
                         rosterTeamSelect.disabled = true;
                     } else {
                         rosterTeamSelect.disabled = false;
                         // Zoradiť tímy abecedne podľa názvu
                         const sortedDocs = querySnapshot.docs.sort((a, b) => (a.data().name || '').localeCompare(b.data().name || '', 'sk-SK'));
                         sortedDocs.forEach((doc) => {
                             const team = doc.data();
                             const option = document.createElement('option');
                             option.value = doc.id; // ID dokumentu tímu bude hodnota option
                             // Zobraziť aj kategóriu v zozname tímov
                             const teamDisplayName = `${team.name || 'Bez názvu'} (${team.categoryId || 'Bez kategórie'})`;
                             option.textContent = teamDisplayName;
                             rosterTeamSelect.appendChild(option);
                         });
                     }
                 } catch (error) {
                     console.error('Chyba pri načítaní tímov pre výber súpisky: ', error);
                     const option = document.createElement('option');
                     option.value = '';
                     option.textContent = '-- Chyba pri načítaní --';
                     option.disabled = true;
                     rosterTeamSelect.appendChild(option);
                     rosterTeamSelect.disabled = true;
                 }
             }

             // Nová funkcia na zobrazenie súpisky pre vybraný tím
             async function displayRoster(teamId) {
                  if (!rosterTableBody || !selectedTeamCategoryParagraph || !playerManagementArea) {
                       console.error("Missing roster display elements.");
                       return;
                  }
                 rosterTableBody.innerHTML = ''; // Vyčistiť predchádzajúcu súpisku
                 selectedTeamCategoryParagraph.textContent = ''; // Vyčistiť predchádzajúcu kategóriu
                 playerManagementArea.style.display = 'none'; // Skryť oblasť správy hráčov kým sa nenačíta tím

                 if (!teamId || teamId === '') {
                      selectedTeamForRoster = null;
                      return; // Nič nezobrazovať, ak nie je vybraný tím
                 }

                 selectedTeamForRoster = teamId; // Uložiť ID aktuálne vybraného tímu

                 try {
                     const teamDocRef = doc(clubsCollectionRef, teamId);
                     const teamDoc = await getDoc(teamDocRef);

                     if (!teamDoc.exists()) {
                         console.error(`Tím s ID ${teamId} nebol nájdený pre zobrazenie súpisky.`);
                         rosterTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Tím nebol nájdený.</td></tr>';
                         if (selectedTeamCategoryParagraph) selectedTeamCategoryParagraph.textContent = 'Tím nebol nájdený.';
                         selectedTeamForRoster = null;
                         // Resetovať výber tímu v selecte, ak tím neexistuje
                         if (rosterTeamSelect && rosterTeamSelect.value === teamId) {
                              rosterTeamSelect.value = '';
                              populateRosterTeamsSelect(); // Znova naplniť select
                         }
                         return;
                     }

                     const teamData = teamDoc.data();
                     if (selectedTeamCategoryParagraph) selectedTeamCategoryParagraph.textContent = `Kategória: ${teamData.categoryId || 'Nepriradená'}`;

                     const rosterCollectionRef = collection(teamDocRef, 'roster');
                     const rosterSnapshot = await getDocs(rosterCollectionRef);

                      if (playerManagementArea) playerManagementArea.style.display = 'block'; // Zobraziť oblasť správy hráčov po úspešnom načítaní tímu

                     if (rosterSnapshot.empty) {
                         rosterTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Zatiaľ žiadni hráči na súpiske.</td></tr>';
                     } else {
                         const players = rosterSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
                         // Zoradiť hráčov podľa čísla, potom podľa priezviska, potom podľa mena
                         players.sort((a, b) => {
                             const numA = typeof a.data.number === 'number' ? a.data.number : Infinity;
                             const numB = typeof b.data.number === 'number' ? b.data.number : Infinity;

                             if (numA !== numB) {
                                 return numA - numB;
                             } else {
                                 const surnameA = a.data.surname || '';
                                 const surnameB = b.data.surname || '';
                                  const surnameComparison = surnameA.localeCompare(surnameB, 'sk-SK');
                                  if (surnameComparison !== 0) {
                                      return surnameComparison;
                                  } else {
                                       const nameA = a.data.name || '';
                                       const nameB = b.data.name || '';
                                       return nameA.localeCompare(nameB, 'sk-SK');
                                  }
                             }
                         });

                         players.forEach(player => {
                             const tr = document.createElement('tr');
                             tr.dataset.playerId = player.id; // Uložiť ID hráča

                             const numberTd = document.createElement('td');
                             numberTd.textContent = typeof player.data.number === 'number' ? player.data.number : '-';
                             numberTd.style.textAlign = 'center';
                             tr.appendChild(numberTd);

                             const nameTd = document.createElement('td');
                             nameTd.textContent = player.data.name || 'Neznáme meno';
                             tr.appendChild(nameTd);

                             const surnameTd = document.createElement('td');
                             surnameTd.textContent = player.data.surname || 'Neznáme priezvisko';
                             tr.appendChild(surnameTd);

                             const actionsTd = document.createElement('td');
                             actionsTd.style.whiteSpace = 'nowrap';
                              actionsTd.style.textAlign = 'center'; // Centrovať tlačidlá

                             // Tlačidlo "Upraviť" hráča
                             const editPlayerButton = document.createElement('button');
                             editPlayerButton.textContent = 'Upraviť';
                             editPlayerButton.classList.add('action-button');
                             editPlayerButton.onclick = () => {
                                 // TODO: Implementovať logiku úpravy hráča (napr. otvoriť mini-modal alebo inline formulár)
                                 alert(`Úprava hráča: ${player.data.name} ${player.data.surname}`);
                                 // Pre túto požiadavku len alert, v reálnej aplikácii by bola implementácia úpravy
                             };
                             //actionsTd.appendChild(editPlayerButton); // Zatiaľ nepridávame tlačidlo úpravy

                             // Tlačidlo "Vymazať" hráča
                             const deletePlayerButton = document.createElement('button');
                             deletePlayerButton.textContent = 'Vymazať';
                             deletePlayerButton.classList.add('action-button', 'delete-button');
                             deletePlayerButton.onclick = async () => {
                                 if (!confirm(`Naozaj chcete vymazať hráča "${player.data.name} ${player.data.surname}" zo súpisky tímu "${teamData.name}"?`)) {
                                     return;
                                 }
                                 try {
                                     const playerDocRef = doc(rosterCollectionRef, player.id);
                                     await deleteDoc(playerDocRef);
                                     displayRoster(teamId); // Obnoviť zobrazenie súpisky po vymazaní
                                 } catch (error) {
                                     console.error(`Chyba pri mazaní hráča "${player.data.name} ${player.data.surname}" (ID: ${player.id}): `, error);
                                     alert('Chyba pri mazaní hráča!');
                                 }
                             };
                             actionsTd.appendChild(deletePlayerButton); // Pridávame tlačidlo mazania

                             tr.appendChild(actionsTd);
                             rosterTableBody.appendChild(tr);
                         });
                     }
                 } catch (error) {
                     console.error(`Chyba pri načítaní súpisky pre tím ${teamId}: `, error);
                     rosterTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Chyba pri načítaní súpisky.</td></tr>';
                     if (selectedTeamCategoryParagraph) selectedTeamCategoryParagraph.textContent = 'Chyba pri načítaní súpisky.';
                     if (playerManagementArea) playerManagementArea.style.display = 'none'; // Skryť oblasť správy hráčov pri chybe
                      selectedTeamForRoster = null; // Reset vybraného tímu pri chybe
                 }
             }


            function toggleContentDisplay() {
                 const hash = window.location.hash;
                 // Skryť všetky sekcie a modálne okná
                 if (addButton) addButton.style.display = 'none';
                 if (categoriesContentSection) categoriesContentSection.style.display = 'none';
                 if (groupsContentDiv) groupsContentDiv.style.display = 'none';
                 if (clubsContentDiv) clubsContentDiv.style.display = 'none';
                 if (teamCreationContentSection) teamCreationContentSection.style.display = 'none';
                 if (rosterContentSection) rosterContentSection.style.display = 'none'; // Nová sekcia súpisky skrytá
                 if (clubsFilterContainer) clubsFilterContainer.style.display = 'none'; // Hide filter inside clubsContent
                 // Zatvoriť všetky modálne okná
                 if (categoryModal) closeModal(categoryModal);
                 if (groupModal) closeModal(groupModal);
                 if (clubModal) closeModal(clubModal);
                 if (teamCreationModal) closeModal(teamCreationModal);
                 if (manageTeamsModal) closeModal(manageTeamsModal);
                 if (rosterModal) closeRosterModal(); // Zatvoriť aj roster modal

                 // Vyčistiť obsah dynamických tabuliek a filtrov
                 if (categoryTableBody) categoryTableBody.innerHTML = '';
                 if (groupsContentDiv) groupsContentDiv.innerHTML = '';
                 if (clubsContentDiv) clubsContentDiv.innerHTML = ''; // Clubs content div now holds filter and sections
                 if (createdTeamsTableBody) createdTeamsTableBody.innerHTML = '';
                 if (createdTeamsTableHeader) createdTeamsTableHeader.innerHTML = '';
                 if (teamsListInModalDiv) teamsListInModalDiv.innerHTML = '';
                 if (rosterTableBody) rosterTableBody.innerHTML = ''; // Vyčistiť roster table body
                 if (selectedTeamCategoryParagraph) selectedTeamCategoryParagraph.textContent = ''; // Vyčistiť kategóriu tímu v roster modale
                 if (playerManagementArea) playerManagementArea.style.display = 'none'; // Skryť player management area

                 // Resetovať filtre klubov a ich stav
                 if (clubFilterCategorySelect) clubFilterCategorySelect.value = '';
                 if (clubFilterGroupSelect) { clubFilterGroupSelect.value = ''; clubFilterGroupSelect.disabled = true; }

                 if (window.location.hash !== '#timy-do-skupin') {
                      capturedClubSectionWidth = null; // Reset captured width if leaving clubs section
                 }

                 // Resetovať stavy modálnych okien
                  currentCategoryModalMode = 'add'; editingCategoryName = null;
                  if (categoryForm) categoryForm.reset();
                  currentGroupModalMode = 'add'; editingGroupId = null;
                  if (groupForm) groupForm.reset();
                  currentClubModalMode = 'add-assign'; editingClubId = null; // Reset to add-assign mode
                  if (clubForm) {
                      clubForm.reset();
                      // Ensure required state is off when form is reset for add-assign
                      if (clubGroupSelect) clubGroupSelect.required = false;
                      if (orderInGroupInput) orderInGroupInput.required = false;
                  }
                   // Reset visibility of club form sections for add-assign mode
                   if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
                   if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
                   if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                   if (orderInputContainer) orderInputContainer.style.display = 'none';
                   if (clubCategorySelect) clubCategorySelect.disabled = true; // Ensure category is disabled initially in add-assign mode

                  currentTeamCreationModalMode = 'add';
                  if (teamCreationForm) teamCreationForm.reset();
                   if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = ''; // Clear dynamic pairs
                   if (addCategoryCountPairButton) addCategoryCountPairButton.style.display = 'none';
                   allAvailableCategories = []; // Clear cached categories

                   selectedTeamForRoster = null; // Reset selected team for roster

                 // Remove all section-specific classes from body first
                 document.body.classList.remove('categories-section-active', 'groups-section-active', 'teams-list-section-active', 'clubs-section-active', 'roster-section-active');

                 // Zobraziť relevantnú sekciu a nastaviť titulok tlačidla "+"
                 if (hash === '#kategorie') {
                     if (addButton) addButton.style.display = 'block';
                     if (categoriesContentSection) categoriesContentSection.style.display = 'block';
                     loadCategoriesTable();
                     if (addButton) addButton.title = "Pridať kategóriu";
                     document.body.classList.add('categories-section-active'); // Pridať triedu pre túto sekciu
                 } else if (hash === '#skupiny') {
                     if (addButton) addButton.style.display = 'block';
                     if (groupsContentDiv) groupsContentDiv.style.display = 'flex';
                     if (groupsContentDiv) groupsContentDiv.innerHTML = ''; // Clear previous groups
                     displayGroupsByCategory();
                     if (addButton) addButton.title = "Pridať skupinu";
                     document.body.classList.add('groups-section-active'); // Pridať triedu pre túto sekciu
                 } else if (hash === '#zoznam-timov') {
                     if (addButton) addButton.style.display = 'block';
                     if (teamCreationContentSection) teamCreationContentSection.style.display = 'block';
                     displayCreatedTeams();
                     if (addButton) addButton.title = "Vytvoriť tímy";
                      loadAllCategoriesForDynamicSelects(); // Nacitat kategorie pre dynamicke selecty
                      document.body.classList.add('teams-list-section-active'); // Pridať triedu pre túto sekciu
                 }
                 else if (hash === '#timy-do-skupin') {
                     if (addButton) addButton.style.display = 'block';
                     if (clubsContentDiv) clubsContentDiv.style.display = 'flex'; // Show clubsContent
                     // Filter is now inside clubsContent and managed by displayClubs
                     populateClubFilterCategories(); // Populate category filter first
                     displayClubs(); // Display clubs based on initial filter state (will show filter inside)
                     if (addButton) addButton.title = "Priradiť tím do skupiny";
                     document.body.classList.add('clubs-section-active'); // Pridať triedu pre sekciu tímov do skupín
                 } else if (hash === '#supiska') { // Nová sekcia súpisky
                      if (addButton) addButton.style.display = 'block'; // Tlačidlo "+" bude viditeľné
                      if (rosterContentSection) rosterContentSection.style.display = 'block'; // Zobraziť sekciu súpisky
                      if (addButton) addButton.title = "Spravovať súpisky"; // Titulok tlačidla "+"
                       // Načítanie dát do sekcie súpisky (ak je potrebné zobraziť zoznam tímov priamo v sekcii)
                       // displayTeamsForRosterSection(); // Prípadná funkcia na zobrazenie zoznamu tímov v hlavnej sekcii súpisky
                      document.body.classList.add('roster-section-active'); // Pridať triedu pre túto sekciu
                 }
                 else {
                     // Default state or other sections
                     if (addButton) addButton.style.display = 'none';
                     if (clubsFilterContainer) clubsFilterContainer.style.display = 'none'; // Ensure filter is hidden
                     if (addButton) addButton.title = "Pridať položku";
                     // No section class added for default or unknown hash
                 }
            }

            if (addButton) {
                addButton.addEventListener('click', () => {
                    const hash = window.location.hash;
                    if (hash === '#kategorie') {
                         currentCategoryModalMode = 'add';
                         editingCategoryName = null;
                         if (!categoryModalTitle) { console.error('FATAL ERROR: categoryModalTitle is null in add mode!'); return; }
                         categoryModalTitle.textContent = 'Pridať kategóriu';
                         if (categoryForm) categoryForm.reset();
                         if (categoryModal) openModal(categoryModal);
                         if (categoryNameInput) categoryNameInput.focus();
                    } else if (hash === '#skupiny') {
                         openGroupModal();
                    } else if (hash === '#zoznam-timov') {
                         openTeamCreationModal();
                    }
                    else if (hash === '#timy-do-skupin') {
                         openClubModal(); // Open club modal for adding/assigning
                    } else if (hash === '#supiska') { // Akcia pre súpisku
                         openRosterModal(); // Otvoriť nový modal pre súpisky
                    }
                });
            } else {
                console.error("Add button not found!");
            }

            // Implementácia otvorenia Roster modalu
            async function openRosterModal() {
                 if (!rosterModal || !rosterModalTitle || !rosterTeamSelectForm || !rosterTeamSelect || !selectedTeamCategoryParagraph || !playerManagementArea || !rosterTableBody || !playerForm || !playerNumberInput || !playerNameInput || !playerSurnameInput) {
                      console.error("Missing roster modal elements.");
                      if (rosterModal) closeModal(rosterModal); // Skúsiť zatvoriť ak existuje
                      return;
                 }
                 openModal(rosterModal);
                 rosterModalTitle.textContent = 'Spravovať súpisku tímu';
                 rosterTeamSelectForm.reset(); // Resetovať formulár výberu tímu
                 playerForm.reset(); // Resetovať formulár hráča
                 if (selectedTeamCategoryParagraph) selectedTeamCategoryParagraph.textContent = ''; // Vyčistiť kategóriu
                 if (rosterTableBody) rosterTableBody.innerHTML = ''; // Vyčistiť tabuľku súpisky
                 if (playerManagementArea) playerManagementArea.style.display = 'none'; // Skryť oblasť správy hráčov
                 selectedTeamForRoster = null; // Reset vybraného tímu

                 // Naplniť výber tímov
                 await populateRosterTeamsSelect();

                 // Pridanie event listenera na zmenu výberu tímu v modale
                 // Robíme to tu, aby sme sa uistili, že select existuje
                 rosterTeamSelect.addEventListener('change', async () => {
                      const selectedTeamId = rosterTeamSelect.value;
                       if (playerForm) playerForm.reset(); // Resetovať formulár hráča pri zmene tímu
                       displayRoster(selectedTeamId); // Zobraziť súpisku pre vybraný tím
                 });

                 // Nastaviť fokus na výber tímu
                 if (rosterTeamSelect && !rosterTeamSelect.disabled) {
                     rosterTeamSelect.focus();
                 } else {
                      if(rosterModal) rosterModal.focus();
                 }
            }


// Implementácia pridania hráča do súpisky
            if (playerForm) {
                playerForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    // Získame ID vybraného tímu z hlavnej stránky, nie z modalu
                    const selectedTeamForRoster = document.getElementById('mainRosterTeamSelect') ? document.getElementById('mainRosterTeamSelect').value : null;

                    if (!selectedTeamForRoster || selectedTeamForRoster === '') {
                        alert('Prosím, najprv vyberte tím v hlavnej sekcii Súpiska.');
                         // Ak je modal otvorený, ale tím nie je vybraný na hlavnej stránke, zatvoriť modal? Alebo len upozorniť?
                         // Necháme len upozornenie a modal zostane otvorený, aby si užívateľ mohol vybrať tím.
                         if (document.getElementById('mainRosterTeamSelect')) document.getElementById('mainRosterTeamSelect').focus(); // Zamerať na výber tímu na hlavnej stránke
                        return;
                    }

                    const playerNumber = playerNumberInput ? parseInt(playerNumberInput.value, 10) : NaN;
                    const playerName = playerNameInput ? playerNameInput.value.trim() : '';
                    const playerSurname = playerSurnameInput ? playerSurnameInput.value.trim() : '';

                    // Validácia vstupov
                     if (playerNumberInput && (isNaN(playerNumber) || playerNumber < 0)) {
                         alert('Prosím, zadajte platné číslo hráča (nezáporné celé číslo).');
                          if (playerNumberInput) playerNumberInput.focus();
                         return;
                     }
                     if (playerNameInput && playerName === '') {
                         alert('Prosím, zadajte meno hráča.');
                          if (playerNameInput) playerNameInput.focus();
                         return;
                     }
                    if (playerSurnameInput && playerSurname === '') {
                        alert('Prosím, zadajte priezvisko hráča.');
                         if (playerSurnameInput) playerSurnameInput.focus();
                        return;
                    }

                    // Vytvorenie ID dokumentu na základe čísla, mena a priezviska
                    const playerId = `${playerNumber} - ${playerName} ${playerSurname}`;

                    try {
                         // Referencia na subkolekciu 'roster' pre vybraný tím
                        const rosterCollectionRef = collection(clubsCollectionRef, selectedTeamForRoster, 'roster');
                         // Referencia na dokument hráča s novým ID
                        const playerDocRef = doc(rosterCollectionRef, playerId);

                         // Skontrolovať, či dokument s týmto ID už existuje
                         const existingPlayerDoc = await getDoc(playerDocRef);
                          if (existingPlayerDoc.exists()) {
                               alert(`Hráč s ID "${playerId}" už na súpiske tohto tímu existuje. Prosím, skontrolujte zadané údaje (číslo, meno, priezvisko).`);
                               // Zameranie na prvé pole, ktoré tvorí ID (číslo hráča)
                                if (playerNumberInput) playerNumberInput.focus();
                               return; // Zastaviť pridávanie, ak hráč už existuje
                          }

                        // Pridať nového hráča do subkolekcie 'roster' vybraného tímu pomocou setDoc a vlastného ID
                        await setDoc(playerDocRef, {
                            number: playerNumber,
                            name: playerName,
                            surname: playerSurname
                             // Prípadne ďalšie polia, ak by boli potrebné (napr. pozícia)
                        });

                        alert(`Hráč "${playerName} ${playerSurname}" úspešne pridaný na súpisku tímu.`);
                        playerForm.reset(); // Vyčistiť formulár
                         if (playerNumberInput) playerNumberInput.focus(); // Nastaviť fokus späť na číslo

                        // Obnoviť zobrazenie súpisky na hlavnej stránke
                        displayMainRoster(selectedTeamForRoster);

                    } catch (error) {
                        console.error('Chyba pri pridávaní hráča na súpisku: ', error);
                        alert('Chyba pri pridávaní hráča na súpisku! Prosím, skúste znova.');
                    }
                });
            } else { console.error("Player form not found!"); }

            // TODO: Implementovať úpravu hráča (otvoriť modal/inline formulár a uložiť zmeny cez updateDoc)
            // Táto funkcionalita nie je súčasťou tejto rozsiahlej úpravy, ale je načrtnutá
             // v rámci listenera na deletePlayerButton v displayRoster.

             // Delegovanie udalostí pre tlačidlá v tabuľke súpisky (zatiaľ len mazanie)
             if (rosterTableBody) {
                 rosterTableBody.addEventListener('click', async (e) => {
                     // Kontrola, či bolo kliknuté na tlačidlo "Vymazať"
                     if (e.target && e.target.classList.contains('delete-button') && e.target.textContent === 'Vymazať') {
                         const row = e.target.closest('tr');
                         const playerId = row ? row.dataset.playerId : null;
                         if (playerId && selectedTeamForRoster) {
                              const playerName = row.cells[1].textContent; // Meno je v druhom stĺpci
                              const playerSurname = row.cells[2].textContent; // Priezvisko je v treťom stĺpci

                              if (!confirm(`Naozaj chcete vymazať hráča "${playerName} ${playerSurname}" zo súpisky?`)) {
                                  return;
                              }

                              try {
                                   const playerDocRef = doc(collection(clubsCollectionRef, selectedTeamForRoster, 'roster'), playerId);
                                   await deleteDoc(playerDocRef);
                                   displayRoster(selectedTeamForRoster); // Obnoviť zobrazenie súpisky
                                   alert(`Hráč "${playerName} ${playerSurname}" úspešne vymazaný.`);
                              } catch (error) {
                                   console.error(`Chyba pri mazaní hráča (ID: ${playerId}) z tímu (ID: ${selectedTeamForRoster}): `, error);
                                   alert('Chyba pri mazaní hráča!');
                              }
                         } else {
                              console.warn("Nepodarilo sa získať ID hráča alebo tímu pre mazanie.");
                         }
                     }
                     // TODO: Pridať logiku pre kliknutie na tlačidlo "Upraviť" (ak bude implementované)
                      /*
                      if (e.target && e.target.classList.contains('action-button') && e.target.textContent === 'Upraviť') {
                           const row = e.target.closest('tr');
                           const playerId = row ? row.dataset.playerId : null;
                           if (playerId && selectedTeamForRoster) {
                                // Získať dáta hráča a otvoriť modal/inline formulár na úpravu
                                 const playerDocRef = doc(collection(clubsCollectionRef, selectedTeamForRoster, 'roster'), playerId);
                                 const playerDoc = await getDoc(playerDocRef);
                                  if (playerDoc.exists()) {
                                      const playerData = playerDoc.data();
                                       console.log("Úprava hráča:", playerData); // Placeholder
                                      // openEditPlayerModal(selectedTeamForRoster, playerId, playerData); // Implementovať túto funkciu
                                  } else {
                                       console.warn(`Dokument hráča s ID ${playerId} pre úpravu nenájdený.`);
                                       alert("Hráč na úpravu nebol nájdený.");
                                       displayRoster(selectedTeamForRoster); // Obnoviť súpisku pre istotu
                                  }
                           }
                       }
                       */
                 });
             } else { console.error("rosterTableBody not found for event delegation."); }


            // Listeners pre zatvorenie modálnych okien
            if (categoryModalCloseBtn) {
                categoryModalCloseBtn.addEventListener('click', () => {
                     if (categoryModal) closeModal(categoryModal);
                     currentCategoryModalMode = 'add'; editingCategoryName = null; // Reset state
                     if (categoryForm) categoryForm.reset();
                      // Refresh relevant selects/displays if modals are open
                      if (teamCreationModal && teamCreationModal.style.display === 'block') {
                          loadAllCategoriesForDynamicSelects(); // Refresh categories for dynamic selects
                      }
                       if (clubModal && clubModal.style.display === 'block') {
                           // Re-populate category/group selects for club modal if it's open
                           populateCategorySelect(clubCategorySelect, clubCategorySelect.value);
                           // Re-populate group select based on category if category is selected/enabled
                           if (clubCategorySelect && !clubCategorySelect.disabled && clubCategorySelect.value) {
                                populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubGroupSelect.value);
                           } else if (clubGroupSelect) {
                                // Reset group select if category is not selected/disabled
                                clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                clubGroupSelect.disabled = true;
                                if (clubGroupSelect) clubGroupSelect.required = false;
                           }
                            if (clubGroupSelect && clubGroupSelect.parentElement) {
                                // Ensure container visibility is correct after closing category modal
                                if (clubGroupSelect.disabled) {
                                     clubGroupSelect.parentElement.style.display = 'none';
                                } else {
                                     clubGroupSelect.parentElement.style.display = 'block';
                                }
                            }
                           // Ensure required state is correct after closing category modal
                           if (clubGroupSelect) clubGroupSelect.required = (clubGroupSelect.parentElement.style.display !== 'none' && !clubGroupSelect.disabled && clubGroupSelect.value !== '' && clubGroupSelect.value !== '-- Vyberte skupinu --' && clubGroupSelect.value !== '-- Žiadne skupiny v kategórii --');
                           if (orderInGroupInput) orderInGroupInput.required = (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.value.trim() !== '' && !isNaN(parseInt(orderInGroupInput.value, 10)));
                       }
                       if (window.location.hash === '#timy-do-skupin') {
                           populateClubFilterCategories(); // Refresh filter categories
                       }
                        // Ak je otvorený roster modal, obnoviť výber tímov (môže sa zmeniť kategória)
                       if (rosterModal && rosterModal.style.display === 'block') {
                            populateRosterTeamsSelect();
                       }
                });
            }

            if (groupModalCloseBtn) {
                groupModalCloseBtn.addEventListener('click', () => {
                     if (groupModal) closeModal(groupModal);
                     currentGroupModalMode = 'add'; editingGroupId = null; // Reset state
                     if (groupForm) groupForm.reset();
                       // Refresh relevant selects/displays if modals are open
                       if (clubModal && clubModal.style.display === 'block') {
                            if (clubCategorySelect && !clubCategorySelect.disabled && clubCategorySelect.value) {
                                populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubGroupSelect.value);
                           } else if (clubGroupSelect) {
                                // Reset group select if category is not selected/disabled
                                clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                clubGroupSelect.disabled = true;
                                if (clubGroupSelect) clubGroupSelect.required = false;
                           }
                           if (clubGroupSelect) clubGroupSelect.required = (clubGroupSelect.parentElement.style.display !== 'none' && !clubGroupSelect.disabled && clubGroupSelect.value !== '' && clubGroupSelect.value !== '-- Vyberte skupinu --' && clubGroupSelect.value !== '-- Žiadne skupiny v kategórii --');
                           if (orderInGroupInput) orderInGroupInput.required = (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.value.trim() !== '' && !isNaN(parseInt(orderInGroupInput.value, 10)));
                       }
                       if (window.location.hash === '#timy-do-skupin') {
                             populateClubFilterGroups(clubFilterCategorySelect ? clubFilterCategorySelect.value : ''); // Refresh filter groups
                             displayClubs(); // Refresh clubs display as group data might have changed
                       }
                       // Ak je otvorený roster modal, obnoviť výber tímov (môže sa zmeniť skupina, ale tím by mal zostať vo výbere)
                       if (rosterModal && rosterModal.style.display === 'block') {
                           populateRosterTeamsSelect(); // Obnoviť výber tímov
                           // Ak bol vybraný tím, jeho súpiska by sa mala zobraziť automaticky po zmene selectu
                       }
                });
            }

            if (clubModalCloseBtn) {
                 clubModalCloseBtn.addEventListener('click', () => {
                     if (clubModal) closeModal(clubModal);
                     currentClubModalMode = 'add-assign'; editingClubId = null; // Reset state
                     if (clubForm) clubForm.reset();
                      // Reset required state and element visibility for add-assign mode
                      if (clubGroupSelect) clubGroupSelect.required = false;
                      if (orderInGroupInput) orderInGroupInput.required = false;
                       if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
                       if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
                       if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                       if (orderInputContainer) orderInputContainer.style.display = 'none';
                       if (clubCategorySelect) clubCategorySelect.disabled = true;

                       if (window.location.hash === '#timy-do-skupin') {
                           populateClubFilterCategories(); // Refresh filter categories (in case a team's category was changed/added in edit mode)
                            displayClubs(); // Refresh clubs display in case assignment changed
                       }
                        displayCreatedTeams(); // Refresh created teams list

                       // Ak je otvorený roster modal, obnoviť výber tímov a súpisku aktuálneho tímu
                       if (rosterModal && rosterModal.style.display === 'block') {
                            populateRosterTeamsSelect(); // Obnoviť výber tímov
                            if (selectedTeamForRoster) {
                                 displayRoster(selectedTeamForRoster); // Obnoviť súpisku aktuálneho tímu
                            }
                       }
                 });
            }

             if (teamCreationModalCloseBtn) {
                 teamCreationModalCloseBtn.addEventListener('click', () => {
                     if (teamCreationModal) closeModal(teamCreationModal);
                     currentTeamCreationModalMode = 'add'; // Reset state
                     if (teamCreationForm) teamCreationForm.reset();
                      if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = ''; // Clear dynamic pairs
                       if (addCategoryCountPairButton) addCategoryCountPairButton.style.display = 'none';

                       displayCreatedTeams(); // Refresh created teams list
                       // Ak je otvorený roster modal, obnoviť výber tímov
                       if (rosterModal && rosterModal.style.display === 'block') {
                            populateRosterTeamsSelect();
                       }
                 });
             }

            if (manageTeamsModalCloseBtn) {
                manageTeamsModalCloseBtn.addEventListener('click', closeManageTeamsModal);
            }

            // Nový poslucháč pre zatvorenie Roster modalu
            if (rosterModalCloseBtn) {
                 rosterModalCloseBtn.addEventListener('click', closeRosterModal);
            }

            // Close modals when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === categoryModal) {
                     if (categoryModal) closeModal(categoryModal);
                     currentCategoryModalMode = 'add'; editingCategoryName = null;
                     if (categoryForm) categoryForm.reset();
                      if (teamCreationModal && teamCreationModal.style.display === 'block') {
                          loadAllCategoriesForDynamicSelects();
                      }
                       if (clubModal && clubModal.style.display === 'block') {
                           populateCategorySelect(clubCategorySelect, clubCategorySelect.value);
                           if (clubCategorySelect && !clubCategorySelect.disabled && clubCategorySelect.value) {
                                populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubGroupSelect.value);
                           } else if (clubGroupSelect) {
                                clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                clubGroupSelect.disabled = true;
                                if (clubGroupSelect) clubGroupSelect.required = false;
                           }
                            if (clubGroupSelect && clubGroupSelect.parentElement) {
                                if (clubGroupSelect.disabled) {
                                     clubGroupSelect.parentElement.style.display = 'none';
                                } else {
                                     clubGroupSelect.parentElement.style.display = 'block';
                                }
                            }
                           if (clubGroupSelect) clubGroupSelect.required = (clubGroupSelect.parentElement.style.display !== 'none' && !clubGroupSelect.disabled && clubGroupSelect.value !== '' && clubGroupSelect.value !== '-- Vyberte skupinu --' && clubGroupSelect.value !== '-- Žiadne skupiny v kategórii --');
                           if (orderInGroupInput) orderInGroupInput.required = (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.value.trim() !== '' && !isNaN(parseInt(orderInGroupInput.value, 10)));
                       }
                       if (window.location.hash === '#timy-do-skupin') {
                           populateClubFilterCategories();
                       }
                       if (rosterModal && rosterModal.style.display === 'block') {
                           populateRosterTeamsSelect();
                       }
                }
                if (e.target === groupModal) {
                     if (groupModal) closeModal(groupModal);
                     currentGroupModalMode = 'add'; editingGroupId = null;
                     if (groupForm) groupForm.reset();
                       if (clubModal && clubModal.style.display === 'block') {
                            if (clubCategorySelect && !clubCategorySelect.disabled && clubCategorySelect.value) {
                                populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubGroupSelect.value);
                           } else if (clubGroupSelect) {
                                clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                clubGroupSelect.disabled = true;
                                if (clubGroupSelect) clubGroupSelect.required = false;
                           }
                            if (clubGroupSelect) clubGroupSelect.required = (clubGroupSelect.parentElement.style.display !== 'none' && !clubGroupSelect.disabled && clubGroupSelect.value !== '' && clubGroupSelect.value !== '-- Vyberte skupinu --' && clubGroupSelect.value !== '-- Žiadne skupiny v kategórii --');
                           if (orderInGroupInput) orderInGroupInput.required = (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.value.trim() !== '' && !isNaN(parseInt(orderInGroupInput.value, 10)));
                       }
                       if (window.location.hash === '#timy-do-skupin') {
                             populateClubFilterGroups(clubFilterCategorySelect ? clubFilterCategorySelect.value : '');
                             displayClubs();
                       }
                        if (rosterModal && rosterModal.style.display === 'block') {
                            populateRosterTeamsSelect();
                       }
                }
                 if (e.target === clubModal) {
                     if (clubModal) closeModal(clubModal);
                     currentClubModalMode = 'add-assign'; editingClubId = null;
                     if (clubForm) clubForm.reset();
                      if (clubGroupSelect) clubGroupSelect.required = false;
                      if (orderInGroupInput) orderInGroupInput.required = false;
                       if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
                       if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
                       if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                       if (orderInputContainer) orderInputContainer.style.display = 'none';
                       if (clubCategorySelect) clubCategorySelect.disabled = true;

                       if (window.location.hash === '#timy-do-skupin') {
                           populateClubFilterCategories();
                            displayClubs();
                       }
                        displayCreatedTeams();
                       if (rosterModal && rosterModal.style.display === 'block') {
                            populateRosterTeamsSelect();
                             if (selectedTeamForRoster) {
                                 displayRoster(selectedTeamForRoster);
                            }
                       }
                 }
                 if (e.target === teamCreationModal) {
                     if (teamCreationModal) closeModal(teamCreationModal);
                     currentTeamCreationModalMode = 'add';
                     if (teamCreationForm) teamCreationForm.reset();
                      if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
                       if (addCategoryCountPairButton) addCategoryCountPairButton.style.display = 'none';

                       displayCreatedTeams();
                        if (rosterModal && rosterModal.style.display === 'block') {
                            populateRosterTeamsSelect();
                       }
                 }
                 if (e.target === manageTeamsModal) {
                      closeManageTeamsModal();
                       if (rosterModal && rosterModal.style.display === 'block') {
                           populateRosterTeamsSelect();
                           if (selectedTeamForRoster) {
                               displayRoster(selectedTeamForRoster);
                           }
                       }
                 }
                 if (e.target === rosterModal) { // Poslucháč pre kliknutie mimo Roster modalu
                      closeRosterModal();
                 }
            });

            // Listen for hash changes to toggle content display
            window.addEventListener('hashchange', toggleContentDisplay);

            // Initial display on page load
            window.addEventListener('load', () => {
                 if (!window.location.hash || window.location.hash === '#') {
                      window.location.hash = '#kategorie'; // Default section
                 } else {
                     toggleContentDisplay(); // Show content based on initial hash
                 }
            });

            // Filter change listeners
            if (clubFilterCategorySelect) {
                 clubFilterCategorySelect.addEventListener('change', () => {
                      const selectedCategoryId = clubFilterCategorySelect.value;
                      populateClubFilterGroups(selectedCategoryId); // Update group filter based on category
                      displayClubs(); // Refresh clubs display based on new filter
                 });
            } else { console.error("Club filter category select not found!"); }

            if (clubFilterGroupSelect) {
                 clubFilterGroupSelect.addEventListener('change', () => {
                      displayClubs(); // Refresh clubs display based on new filter
                 });
            } else { console.error("Club filter group select not found!"); }


            // Form submit listeners (already existed, adding checks for null forms)
            if (categoryForm) {
                categoryForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const categoryName = categoryNameInput ? categoryNameInput.value.trim() : '';
                    if (!categoryNameInput || categoryName === '') { alert('Názov kategórie nemôže byť prázdny.'); return; }

                    if (currentCategoryModalMode === 'add') {
                         const categoryDocRef = doc(categoriesCollectionRef, categoryName);
                         try {
                              const existingDoc = await getDoc(categoryDocRef);
                              if (existingDoc.exists()) { alert(`Kategória "${categoryName}" už existuje!`); return; }
                              await setDoc(categoryDocRef, { }); // Add category document

                              alert(`Kategória "${categoryName}" úspešne pridaná.`); // Success feedback
                              if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset();
                              currentCategoryModalMode = 'add'; editingCategoryName = null;
                              // Refresh displays that use categories
                              loadCategoriesTable();
                              if (window.location.hash === '#skupiny') {
                                  if (groupsContentDiv) groupsContentDiv.innerHTML = '';
                                  displayGroupsByCategory();
                              }
                              displayCreatedTeams(); // Team list includes categories
                              if (window.location.hash === '#timy-do-skupin') {
                                  populateClubFilterCategories(); // Update filter categories
                              }
                               // If related modals are open, refresh their selects
                               if (teamCreationModal && teamCreationModal.style.display === 'block') {
                                    loadAllCategoriesForDynamicSelects();
                               }
                                if (clubModal && clubModal.style.display === 'block') {
                                     populateCategorySelect(clubCategorySelect, clubCategorySelect.value);
                                      if (clubCategorySelect && !clubCategorySelect.disabled && clubCategorySelect.value) {
                                           populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubGroupSelect.value);
                                      } else if (clubGroupSelect) {
                                          clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                          clubGroupSelect.disabled = true;
                                           if (clubGroupSelect) clubGroupSelect.required = false;
                                      }
                                     if (clubGroupSelect) clubGroupSelect.required = (clubGroupSelect.parentElement.style.display !== 'none' && !clubGroupSelect.disabled && clubGroupSelect.value !== '' && clubGroupSelect.value !== '-- Vyberte skupinu --' && clubGroupSelect.value !== '-- Žiadne skupiny v kategórii --');
                                     if (orderInGroupInput) orderInGroupInput.required = (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.value.trim() !== '' && !isNaN(parseInt(orderInGroupInput.value, 10)));
                                }
                                // Ak je otvorený roster modal, obnoviť výber tímov
                               if (rosterModal && rosterModal.style.display === 'block') {
                                   populateRosterTeamsSelect();
                               }


                         } catch (error) {
                              console.error('Chyba pri pridávaní kategórie: ', error);
                              alert('Chyba pri pridávaní kategórie! Prosím, skúste znova.');
                              // Reset state on error
                              if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset();
                              currentCategoryModalMode = 'add'; editingCategoryName = null;
                         }
                    } else if (currentCategoryModalMode === 'edit') {
                         const oldCategoryName = editingCategoryName;
                         const newCategoryName = categoryName;

                         if (!oldCategoryName) { console.error("Chyba: Chýba pôvodný názov kategórie pri úprave."); alert("Chyba pri úprave kategórie."); if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset(); currentCategoryModalMode = 'add'; editingCategoryName = null; return; }
                         if (newCategoryName === oldCategoryName) { if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset(); currentCategoryModalMode = 'add'; editingCategoryName = null; return; } // No change

                         const newCategoryDocRef = doc(categoriesCollectionRef, newCategoryName);
                         try {
                              // Check if a category with the new name already exists
                              const existingDoc = await getDoc(newCategoryDocRef);
                              if (existingDoc.exists()) { alert(`Kategória s názvom "${newCategoryName}" už existuje!`); return; }

                              const oldCategoryDocRef = doc(categoriesCollectionRef, oldCategoryName);
                              const oldDocSnapshot = await getDoc(oldCategoryDocRef);
                              if (!oldDocSnapshot.exists()) { console.error(`Chyba: Pôvodný dokument kategórie ${oldCategoryName} nenájdený na úpravu.`); alert("Pôvodná kategória na úpravu nebola nájdena."); if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset(); currentCategoryModalMode = 'add'; editingCategoryName = null; loadCategoriesTable(); return; }

                              const oldDocData = oldDocSnapshot.data();
                              const batch = writeBatch(db);

                              // Create new category document with data from the old one
                              batch.set(newCategoryDocRef, oldDocData);

                              // Find all groups associated with the old category and update their categoryId and document ID
                              const groupsQuery = query(groupsCollectionRef, where('categoryId', '==', oldCategoryName));
                              const groupsSnapshot = await getDocs(groupsQuery);
                              for (const groupDoc of groupsSnapshot.docs) {
                                  const oldGroupId = groupDoc.id;
                                  const groupData = groupDoc.data();
                                  const newGroupId = `${newCategoryName} - ${groupData.name}`; // Construct new Group ID
                                  const newGroupDocRef = doc(groupsCollectionRef, newGroupId);

                                   // Create new group document with updated categoryId
                                   batch.set(newGroupDocRef, { name: groupData.name, categoryId: newCategoryName });

                                  // Find all clubs associated with the old group and update their groupId and categoryId
                                  // POZOR: Ak sa zmeni ID tímu (co sa stane ak sa zmeni kategoria alebo nazov), súpiska sa NEPRESUNIE automaticky.
                                  // Tu meníme len priradenie tímu k skupine a kategórii. ID tímu sa zmení pri úprave/priradení tímu v clubModal.
                                  // Preto pri premenovaní kategórie, tímom zostane ich staré ID, len sa zmení categoryId/groupId.
                                  const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', oldGroupId));
                                  const clubsSnapshot = await getDocs(clubsInGroupQuery);
                                  clubsSnapshot.forEach(clubDoc => {
                                       // Aktualizovať categoryId a groupId v existujúcom dokumente tímu
                                       batch.update(clubDoc.ref, { groupId: newGroupId, categoryId: newCategoryName });
                                  });

                                   // Delete the old group document
                                   batch.delete(groupDoc.ref);
                              }

                              // Find all unassigned clubs associated with the old category and update their categoryId
                               const unassignedClubsQuery = query(clubsCollectionRef, where('categoryId', '==', oldCategoryName), where('groupId', '==', null));
                               const unassignedClubsSnapshot = await getDocs(unassignedClubsQuery);
                               unassignedClubsSnapshot.forEach(doc => {
                                  batch.update(doc.ref, { categoryId: newCategoryName });
                               });


                              // Delete the old category document
                              batch.delete(oldCategoryDocRef);

                              // Commit all batch operations
                              await batch.commit();

                              // Success feedback and close modal
                              alert(`Kategória "${oldCategoryName}" úspešne premenovaná na "${newCategoryName}".`);
                              currentCategoryModalMode = 'add'; editingCategoryName = null;
                              if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset();

                              // Refresh displays that use categories/groups/clubs
                              loadCategoriesTable();
                              if (window.location.hash === '#skupiny') {
                                  displayGroupsByCategory();
                              }
                              displayCreatedTeams(); // Team list includes categories
                              if (window.location.hash === '#timy-do-skupin') {
                                   populateClubFilterCategories(); // Update filter categories
                                   displayClubs(); // Refresh clubs display
                              }
                               // If related modals are open, refresh their selects/data
                               if (teamCreationModal && teamCreationModal.style.display === 'block') {
                                    loadAllCategoriesForDynamicSelects();
                               }
                                 if (clubModal && clubModal.style.display === 'block') {
                                      // Re-populate category/group selects for club modal if it's open
                                      const originalSelectedCategoryId = clubCategorySelect ? clubCategorySelect.value : ''; // Try to keep the selected category if it still exists
                                     populateCategorySelect(clubCategorySelect, originalSelectedCategoryId);
                                      if (clubCategorySelect && !clubCategorySelect.disabled && clubCategorySelect.value) {
                                           populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubGroupSelect.value);
                                      } else if (clubGroupSelect) {
                                           clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                           clubGroupSelect.disabled = true;
                                            if (clubGroupSelect) clubGroupSelect.required = false;
                                      }
                                     // Ensure required state is correct after renaming category
                                     if (clubGroupSelect) clubGroupSelect.required = (clubGroupSelect.parentElement.style.display !== 'none' && !clubGroupSelect.disabled && clubGroupSelect.value !== '' && clubGroupSelect.value !== '-- Vyberte skupinu --' && clubGroupSelect.value !== '-- Žiadne skupiny v kategórii --');
                                     if (orderInGroupInput) orderInGroupInput.required = (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.value.trim() !== '' && !isNaN(parseInt(orderInGroupInput.value, 10)));
                                 }
                                  // Ak je otvorený roster modal a bola premenovaná kategória vybraného tímu, obnoviť zobrazenie
                                 if (rosterModal && rosterModal.style.display === 'block') {
                                     populateRosterTeamsSelect(); // Obnoviť výber tímov (názov tímu vo výbere sa môže zmeniť)
                                     if (selectedTeamForRoster) {
                                         // Ak bol vybraný tím, jeho kategória sa mohla zmeniť, obnoviť zobrazenie kategórie a súpisky
                                          displayRoster(selectedTeamForRoster);
                                     }
                                 }


                           } catch (error) {
                                console.error('Chyba pri premenovaní kategórie a aktualizácii referencií: ', error);
                                alert('Chyba pri premenovaní kategórie! Prosím, skúste znova.');
                                // Reset state on error
                                currentCategoryModalMode = 'add'; editingCategoryName = null;
                                if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset();
                           }
                      }
                });
            }

              if (groupForm) {
                 groupForm.addEventListener('submit', async (e) => {
                     e.preventDefault();
                     const selectedCategoryId = groupCategorySelect ? groupCategorySelect.value : '';
                     const groupName = groupNameInput ? groupNameInput.value.trim() : '';
                     // Validation
                     if (!groupCategorySelect || selectedCategoryId === '' || selectedCategoryId === '-- Vyberte kategóriu --' || groupCategorySelect.disabled) {
                         alert('Prosím, vyberte platnú kategóriu pre skupinu.');
                         if (groupCategorySelect) groupCategorySelect.focus();
                         return;
                     }
                     if (!groupNameInput || groupName === '') {
                         alert('Názov skupiny nemôže byť prázdny.');
                          if (groupNameInput) groupNameInput.focus();
                         return;
                     }
                     const compositeGroupId = `${selectedCategoryId} - ${groupName}`;
                     const groupDocRef = doc(groupsCollectionRef, compositeGroupId);

                     try {
                         const existingDoc = await getDoc(groupDocRef);

                         if (currentGroupModalMode === 'add') {
                             // Check if a group with the same composite ID already exists
                             if (existingDoc.exists()) {
                                  alert(`Skupina s názvom "${groupName}" už v kategórii "${selectedCategoryId}" existuje! Názvy skupín musia byť unikátne v rámci kategórie.`);
                                   if (groupNameInput) groupNameInput.focus();
                                  return;
                             }
                             await setDoc(groupDocRef, { name: groupName, categoryId: selectedCategoryId }); // Add new group document
                              alert(`Skupina "${groupName}" v kategórii "${selectedCategoryId}" úspešne pridaná.`);

                         } else if (currentGroupModalMode === 'edit') {
                             const oldGroupId = editingGroupId;
                             if (!oldGroupId) { console.error("Chyba: Režim úpravy skupiny bez platného editingGroupId."); alert("Chyba pri úprave skupiny. Prosím, obnovte stránku."); if (groupModal) closeModal(groupModal); if (groupForm) groupForm.reset(); currentGroupModalMode = 'add'; editingGroupId = null; return; }

                             const oldGroupDocRef = doc(groupsCollectionRef, oldGroupId);
                             const oldDocSnapshot = await getDoc(oldGroupDocRef);
                             if (!oldDocSnapshot.exists()) { console.error(`Chyba: Pôvodný dokument skupiny ${oldGroupId} nenájdený.`); alert("Pôvodná skupina na úpravu nebola nájdená."); if (groupModal) closeModal(groupModal); if (groupForm) groupForm.reset(); currentGroupModalMode = 'add'; editingGroupId = null; displayGroupsByCategory(); return; }

                             const oldGroupData = oldDocSnapshot.data();

                             // If the group ID has changed (due to name or category change)
                             if (oldGroupId !== compositeGroupId) {
                                  // Check if a group with the new composite ID already exists (excluding the old one)
                                  if (existingDoc.exists()) {
                                     alert(`Skupina s názvom "${groupName}" už v kategórii "${selectedCategoryId}" existuje (iná skupina)! Názvy skupín musia byť unikátne v rámci kategórie.`);
                                      if (groupNameInput) groupNameInput.focus();
                                     return;
                                  }

                                  const batch = writeBatch(db);
                                   // Create new group document with updated data
                                   batch.set(groupDocRef, { name: groupName, categoryId: selectedCategoryId });

                                  // Find all clubs associated with the old group and update their groupId and categoryId
                                  const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', oldGroupId));
                                  const clubsSnapshot = await getDocs(clubsInGroupQuery);
                                  clubsSnapshot.forEach(clubDoc => {
                                       batch.update(clubDoc.ref, { groupId: compositeGroupId, categoryId: selectedCategoryId });
                                  });

                                   // Delete the old group document
                                   batch.delete(oldGroupDocRef);
                                  await batch.commit();
                                   alert(`Skupina "${oldGroupData.name}" úspešne premenovaná/presunutá na "${groupName}" v kategórii "${selectedCategoryId}".`);

                                   // Ak je otvorený roster modal a bol vybraný tím z tejto starej skupiny,
                                   // jeho groupId sa zmení, takže by sa súpiska mala obnoviť a výber tímov tiež
                                  if (rosterModal && rosterModal.style.display === 'block') {
                                      populateRosterTeamsSelect(); // Obnoviť výber tímov
                                       if (selectedTeamForRoster) {
                                            // Overiť, či vybraný tím existuje a obnoviť jeho súpisku
                                            const selectedTeamDocCheck = await getDoc(doc(clubsCollectionRef, selectedTeamForRoster));
                                            if (selectedTeamDocCheck.exists()) {
                                                 displayRoster(selectedTeamForRoster);
                                            } else {
                                                 closeRosterModal(); // Ak tím neexistuje, zatvoriť modal
                                            }
                                       }
                                  }

                              } else {
                                   // If only the name changed (category and ID is the same)
                                  await updateDoc(groupDocRef, {
                                      name: groupName,
                                      // categoryId is already correct if ID didn't change
                                  });
                                   alert(`Skupina "${oldGroupData.name}" v kategórii "${selectedCategoryId}" úspešne upravená.`);
                                   // Ak je otvorený roster modal a bol vybraný tím z tejto skupiny,
                                   // jeho skupina sa zmenila, takže by sa súpiska mala obnoviť (zobraziť nový názov skupiny ak by sa niekde zobrazoval)
                                    if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForRoster) {
                                         const selectedTeamDocCheck = await getDoc(doc(clubsCollectionRef, selectedTeamForRoster));
                                          if (selectedTeamDocCheck.exists()) {
                                               displayRoster(selectedTeamForRoster);
                                          }
                                     }
                              }
                         }

                         // Success feedback and close modal
                         if (groupModal) closeModal(groupModal); if (groupForm) groupForm.reset();
                         currentGroupModalMode = 'add'; editingGroupId = null; // Reset state

                         // Refresh displays that use groups/clubs
                         if (window.location.hash === '#skupiny') displayGroupsByCategory(); // Refresh groups display
                         displayCreatedTeams(); // Team list includes groups implicitly
                         if (window.location.hash === '#timy-do-skupin') {
                             populateClubFilterGroups(clubFilterCategorySelect ? clubFilterCategorySelect.value : ''); // Update filter groups
                             displayClubs(); // Refresh clubs display
                         }
                          // If club modal is open, refresh group select
                          if (clubModal && clubModal.style.display === 'block') {
                               if (clubCategorySelect && !clubCategorySelect.disabled && clubCategorySelect.value) {
                                    populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubGroupSelect.value);
                               } else if (clubGroupSelect) {
                                    clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                    clubGroupSelect.disabled = true;
                                     if (clubGroupSelect) clubGroupSelect.required = false;
                               }
                               // Ensure required state is correct after editing group
                               if (clubGroupSelect) clubGroupSelect.required = (clubGroupSelect.parentElement.style.display !== 'none' && !clubGroupSelect.disabled && clubGroupSelect.value !== '' && clubGroupSelect.value !== '-- Vyberte skupinu --' && clubGroupSelect.value !== '-- Žiadne skupiny v kategórii --');
                               if (orderInGroupInput) orderInGroupInput.required = (orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.value.trim() !== '' && !isNaN(parseInt(orderInGroupInput.value, 10)));
                          }

                      } catch (error) {
                          console.error('Chyba pri ukladaní skupiny: ', error);
                          alert(`Chyba pri ukladaní skupiny! Detail: ${error.message}`);
                          // Reset state on error
                          if (groupModal) closeModal(groupModal);
                          if (groupForm) groupForm.reset();
                          currentGroupModalMode = 'add'; editingGroupId = null;
                       }
                  });
             }

            if (teamCreationForm) {
                teamCreationForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const teamNameBase = teamNameInput ? teamNameInput.value.trim() : '';
                    // Basic validation
                    if (!teamNameInput || teamNameBase === '') {
                        alert('Základný názov tímu nemôže byť prázdny.');
                         if (teamNameInput) teamNameInput.focus();
                        return;
                    }

                    const categoryCountPairsContainer = document.getElementById('teamCategoryCountContainer');
                    const categoryCountPairs = categoryCountPairsContainer ? categoryCountPairsContainer.querySelectorAll('.category-count-pair') : [];

                    if (!categoryCountPairs || categoryCountPairs.length === 0) {
                        alert('Pridajte aspoň jednu kategóriu a počet tímov.');
                         if (addCategoryCountPairButton) addCategoryCountPairButton.focus(); // Focus on add button
                        return;
                    }

                    const teamsToProcess = [];
                    const seenCategories = new Set();

                    // Validate each pair and collect data
                    for (const pairDiv of categoryCountPairs) {
                         const categorySelect = pairDiv.querySelector('.team-category-select-dynamic');
                         const teamCountInput = pairDiv.querySelector('.team-count-input-dynamic');

                         const categoryId = categorySelect ? categorySelect.value : '';
                         const teamCount = teamCountInput ? parseInt(teamCountInput.value, 10) : NaN;

                         if (!categorySelect || categoryId === '' || categorySelect.disabled) {
                             alert('Prosím, vyberte platnú kategóriu pre každý riadok.');
                              if (categorySelect) categorySelect.focus();
                             return;
                         }
                          if (!teamCountInput || isNaN(teamCount) || teamCount < 1) {
                             alert('Počet tímov musí byť platné číslo väčšie ako 0 pre každú kategóriu.');
                             if (teamCountInput) teamCountInput.focus();
                             return;
                          }
                           // Check for duplicate categories in the input
                           if (seenCategories.has(categoryId)) {
                               alert(`Kategória "${categoryId}" bola vybraná viackrát. Pre každú kategóriu môžete zadať iba jeden počet.`);
                                // Find the first select with this duplicate value and focus it
                                const firstDuplicateSelect = categoryCountPairsContainer.querySelector(`.team-category-select-dynamic[value="${categoryId}"]`);
                                if (firstDuplicateSelect) firstDuplicateSelect.focus();
                               return;
                           }
                           seenCategories.add(categoryId); // Add to seen categories

                           // Check for too many teams for alphabetical suffix
                           if (teamCount > 26) {
                                alert(`Pre kategóriu "${categoryId}": Pre abecedné označenie je možné vytvoriť maximálne 26 tímov naraz (A-Z). Prosím, znížte počet tímov.`);
                                if (teamCountInput) teamCountInput.focus();
                                return;
                           }

                         teamsToProcess.push({ categoryId: categoryId, count: teamCount });
                    }


                    const batch = writeBatch(db);
                    let successfullyAddedCount = 0;
                    const failedCreations = [];

                    try {
                        // Process each planned team creation
                        for (const teamPlan of teamsToProcess) {
                             const categoryId = teamPlan.categoryId;
                             const teamCount = teamPlan.count;

                             for (let i = 1; i <= teamCount; i++) {
                                  let teamName;
                                  let teamSuffixForId = '';
                                  // Add alphabetical suffix if creating more than one team for this base name/category
                                  if (teamCount > 1) {
                                       const letter = String.fromCharCode(65 + (i - 1)); // 'A', 'B', 'C', ...
                                       teamName = `${teamNameBase} ${letter}`;
                                       teamSuffixForId = ` ${letter}`; // Suffix used for Firestore document ID
                                  } else {
                                       teamName = teamNameBase; // No suffix for single team
                                  }

                                  // Construct a unique document ID (e.g., "U10 - Spartak A", "U12 - Slovan")
                                  const documentId = `${categoryId} - ${teamNameBase}${teamSuffixForId}`;
                                  const teamDocRef = doc(clubsCollectionRef, documentId);

                                  // Check if a document with this ID already exists BEFORE attempting to set
                                  const existingDoc = await getDoc(teamDocRef);
                                   if (existingDoc.exists()) {
                                       failedCreations.push({ id: documentId, name: teamName, reason: 'Už existuje dokument s rovnakým ID.' });
                                        console.warn(`Preskočené vytvorenie tímu "${teamName}" (${documentId}) - dokument už existuje.`);
                                       continue; // Skip this team creation if ID exists
                                   }

                                  // Add the new team document to the batch
                                  batch.set(teamDocRef, {
                                      name: teamName,
                                      categoryId: categoryId,
                                      groupId: null, // Initially unassigned to a group
                                      orderInGroup: null // Initially no order in group
                                      // Nové tímy nemajú súpisky, subkolekcia 'roster' bude vytvorená až pri pridávaní prvého hráča
                                  });
                                  successfullyAddedCount++;
                             }
                        }

                        await batch.commit();

                         let resultMessage = `Pokus o vytvorenie tímov dokončený. Úspešne vytvorených: ${successfullyAddedCount}.`;
                         if (failedCreations.length > 0) {
                              resultMessage += `\n\nNiektoré tímy nebolo možné vytvoriť, pretože záznam s príslušným ID už existoval (${failedCreations.length} ks). Skontrolujte zoznam tímov.`;
                             console.warn("Neúspešné pokusy o vytvorenie tímov:", failedCreations);
                         } else {
                             resultMessage += " Všetky plánované tímy boli úspešne vytvorené.";
                         }
                         alert(resultMessage);

                        if (teamCreationModal) closeModal(teamCreationModal);
                        if (teamCreationForm) teamCreationForm.reset();
                        if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
                        if (addCategoryCountPairButton) addCategoryCountPairButton.style.display = 'none';

                        displayCreatedTeams(); // Obnoviť zoznam vytvorených tímov

                        // Ak je otvorený roster modal, obnoviť výber tímov, aby sa zobrazili aj nové tímy
                         if (rosterModal && rosterModal.style.display === 'block') {
                             populateRosterTeamsSelect();
                         }

                    } catch (error) {
                        console.error('Chyba pri vytváraní tímov: ', error);
                        alert(`Chyba pri vytváraní tímov! Prosím, skúste znova. Detail: ${error.message}`);
                         // Ensure state is reset on error
                         if (teamCreationModal && teamCreationModal.style.display === 'block') {
                             loadAllCategoriesForDynamicSelects(); // Znovu načítať kategórie ak modal zostal otvorený
                         } else {
                               if (teamCreationForm) teamCreationForm.reset();
                               if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
                         }
                    }
                });
            }

            if (addCategoryCountPairButton) {
                addCategoryCountPairButton.addEventListener('click', async () => {
                     if (allAvailableCategories.length === 0) {
                          await loadAllCategoriesForDynamicSelects();
                     }
                     await addCategoryCountPair();
                });
            } else { console.error("Add category count pair button not found!"); }
