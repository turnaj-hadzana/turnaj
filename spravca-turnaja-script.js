// Nové/upravené referencie pre Súpisku na hlavnej stránke
        const rosterContentSection = document.getElementById('rosterContentSection');
        const mainRosterTeamSelect = document.getElementById('mainRosterTeamSelect'); // Select pre výber tímu na hlavnej stránke
        const mainRosterArea = document.getElementById('mainRosterArea'); // Oblasť pre zobrazenie súpisky na hlavnej stránke
        const mainSelectedTeamInfo = document.getElementById('mainSelectedTeamInfo'); // Hlavička s info o tíme na hlavnej stránke
        const mainRosterTableBody = document.getElementById('mainRosterTableBody'); // Telo tabuľky súpisky na hlavnej stránke

        // Upravené referencie pre Roster Modal (len pre pridávanie hráča)
        const rosterModal = document.getElementById('rosterModal');
        const rosterModalCloseBtn = rosterModal ? rosterModal.querySelector('.roster-modal-close') : null;
        const rosterModalTitle = document.getElementById('rosterModalTitle');
        const rosterModalTeamInfo = document.getElementById('rosterModalTeamInfo'); // Info o vybranom tíme v modale
        const playerForm = document.getElementById('playerForm'); // Formulár na pridanie hráča (stále v modale)
        const playerNumberInput = document.getElementById('playerNumber');
        const playerNameInput = document.getElementById('playerName');
        const playerSurnameInput = document.getElementById('playerSurname');


        // Ostatné existujúce referencie zostávajú nezmenené...
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
        const clubsFilterContainer = document.getElementById('clubsFilterContainer');
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
        const teamCategoryCountContainer = document.getElementById('teamCategoryCountContainer');
        const addCategoryCountPairButton = document.getElementById('addCategoryCountPairButton');
        const teamNameInput = document.getElementById('teamNameInput');

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
        // Premenná pre ulozenie ID aktualne vybraneho timu na HLAVNEJ stranke Súpiska
        let selectedTeamForMainRoster = null;

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
        // Upravená funkcia pre zatvorenie Roster modalu
        function closeRosterModal() {
             if (!rosterModal) { console.error("rosterModal is null in closeRosterModal."); return; }
             rosterModal.style.display = 'none';
              // Reset stavov modalu (len formulár hráča a info o tíme v modale)
             if (rosterModalTeamInfo) rosterModalTeamInfo.textContent = '';
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
                       // Ak je otvorený roster modal, obnoviť výber tímov.
                       // Ak bol na hlavnej stránke súpisky vybraný tím z mazanej kategórie, vyčistiť zobrazenie.
                       if (mainRosterTeamSelect && window.location.hash === '#supiska') {
                            populateRosterTeamsSelect(); // Obnoviť výber tímov na hlavnej stránke
                            // Skontrolujeme, či aktuálne zobrazený tím patrí do mazanej kategórie
                             if (selectedTeamForMainRoster) {
                                  const selectedTeamDoc = await getDoc(doc(clubsCollectionRef, selectedTeamForMainRoster));
                                  if (!selectedTeamDoc.exists() || (selectedTeamDoc.exists() && selectedTeamDoc.data().categoryId === categoryToDelete)) {
                                      // Ak tím neexistuje alebo patrí do mazanej kategórie, vyčistiť zobrazenie súpisky
                                      if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                                      if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                                      if (mainRosterArea) mainRosterArea.style.display = 'none';
                                      selectedTeamForMainRoster = null;
                                  }
                             }
                       }
                       // Ak je otvorený modal pridania hráča a bol vybraný tím z mazanej kategórie, zatvoriť ho
                       if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForMainRoster && selectedTeamForMainRoster.includes(categoryToDelete)) {
                           closeRosterModal();
                           alert("Tím, pre ktorý ste chceli pridať hráča, bol zmazaný v dôsledku zmazania kategórie. Modal súpisky bol zatvorený.");
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
                  if (!groupsContentDiv) { console.error("groupsContentDiv element not found for displayGroupsByCategory."); return; }
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
                                               // Ak je otvorený roster modal, obnoviť výber tímov.
                                               // Ak je na hlavnej stránke súpisky vybraný tím zo zmazanej skupiny, vyčistiť zobrazenie.
                                              if (mainRosterTeamSelect && window.location.hash === '#supiska') {
                                                   populateRosterTeamsSelect(); // Obnoviť výber tímov na hlavnej stránke
                                                    // Skontrolujeme, či aktuálne zobrazený tím patrí do mazanej skupiny
                                                     if (selectedTeamForMainRoster) {
                                                         const selectedTeamDoc = await getDoc(doc(clubsCollectionRef, selectedTeamForMainRoster));
                                                          if (!selectedTeamDoc.exists() || (selectedTeamDoc.exists() && selectedTeamDoc.data().groupId === group.id)) {
                                                               // Ak tím neexistuje alebo patrí do mazanej skupiny, vyčistiť zobrazenie súpisky
                                                               if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                                                               if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                                                                if (mainRosterArea) mainRosterArea.style.display = 'none';
                                                               selectedTeamForMainRoster = null;
                                                          }
                                                     }
                                              }
                                               // Ak je otvorený modal pridania hráča a bol vybraný tím zo zmazanej skupiny, zatvoriť ho
                                              if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForMainRoster && selectedTeamForMainRoster.includes(group.id)) {
                                                  closeRosterModal();
                                                  alert("Tím, pre ktorého ste chceli pridať hráča, bol ovplyvnený zmazaním skupiny. Modal súpisky bol zatvorený.");
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
             if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';

             if (clubCategorySelect) {
                 clubCategorySelect.value = "";
                 clubCategorySelect.disabled = true;
             } else { console.error("FATAL ERROR: clubCategorySelect not found!"); if (clubModal) closeModal(clubModal); return; }


             if (clubId && clubData) {
                 // Edit mode logic
                 currentClubModalMode = 'edit-assigned';
                 editingClubId = clubId;
                 if (clubCategorySelect) {
                      clubCategorySelect.disabled = false;
                      clubCategorySelect.value = clubData.categoryId || '';
                       if (clubData.groupId === null) {
                            if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'none';
                            if (orderInputContainer) orderInputContainer.style.display = 'none';
                            if (orderInGroupInput) orderInGroupInput.required = false;
                            if (clubGroupSelect) clubGroupSelect.required = false;
                       } else {
                            if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                            if (orderInputContainer) orderInputContainer.style.display = 'block';
                            if (orderInGroupInput) orderInGroupInput.required = true;
                            if (clubGroupSelect) clubGroupSelect.required = true;
                       }
                       await populateGroupSelect(clubCategorySelect.value, clubGroupSelect, clubData.groupId);
                 } else { console.error("FATAL ERROR: clubCategorySelect not found in edit mode!"); if (clubModal) closeModal(clubModal); return; }

                 if (clubNameInputContainer) clubNameInputContainer.style.display = 'block';
                 if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'none';

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
                  if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                  if (orderInputContainer) orderInputContainer.style.display = 'none';

                 await populateUnassignedClubsSelect(unassignedClubSelect);

                 if (clubCategorySelect) clubCategorySelect.disabled = true;
                 if (clubGroupSelect) clubGroupSelect.disabled = true;
                 if (clubGroupSelect) clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';


                 if (!clubModalTitle) { console.error('FATAL ERROR: clubModalTitle is null in add mode!'); if (clubModal) closeModal(clubModal); return; }
                 clubModalTitle.textContent = 'Priradiť tím do skupiny';
                 if (clubFormSubmitButton) clubFormSubmitButton.textContent = 'Priradiť';
              }

              const validationMessages = clubForm ? clubForm.querySelectorAll('.validation-message') : [];
              validationMessages.forEach(msg => msg.textContent = '');
              openModal(clubModal);

               if (currentClubModalMode === 'add-assign' && unassignedClubSelect && !unassignedClubSelect.disabled) {
                   unassignedClubSelect.focus();
               } else if (currentClubModalMode === 'edit-assigned' && clubNameInput) {
                   clubNameInput.focus();
               } else if (clubCategorySelect && !clubCategorySelect.disabled) {
                   clubCategorySelect.focus();
               } else {
                    if(clubModal) clubModal.focus();
               }
         }

        if (clubCategorySelect) {
            clubCategorySelect.addEventListener('change', async () => {
                const selectedCategoryId = clubCategorySelect.value;
                 if (orderInGroupInput) orderInGroupInput.value = '';
                 if (orderInputContainer) orderInputContainer.style.display = 'none';
                if (clubGroupSelect) clubGroupSelect.required = false;
                if (orderInGroupInput) orderInGroupInput.required = false;

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
                                        clubCategorySelect.value = categoryIdToSet;

                                         if (categoryIdToSet && categoryIdToSet !== '') {
                                              await populateGroupSelect(categoryIdToSet, clubGroupSelect, null);
                                              clubGroupSelect.disabled = false;
                                              if (clubGroupSelect.options.length > 1) {
                                                   if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                                                   if (clubGroupSelect) clubGroupSelect.required = true;
                                              } else {
                                                   clubGroupSelect.disabled = true;
                                                   clubGroupSelect.innerHTML = '<option value="">-- Žiadne skupiny v kategórii --</option>';
                                                   if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block'; // Stále zobraziť kontajner
                                                   if (clubGroupSelect) clubGroupSelect.required = false;
                                                   if (orderInGroupInput) orderInGroupInput.required = false;
                                              }
                                         } else {
                                              if (clubGroupSelect) {
                                                   clubGroupSelect.innerHTML = '<option value="">-- Tím nemá priradenú kategóriu --</option>';
                                                   clubGroupSelect.disabled = true;
                                                   if (clubGroupSelect) clubGroupSelect.required = false;
                                              }
                                              if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block'; // Stále zobraziť kontajner
                                              if (orderInputContainer) orderInputContainer.style.display = 'none';
                                              if (orderInGroupInput) orderInGroupInput.required = false;
                                         }

                                         setTimeout(() => {
                                              if (clubGroupSelect && !clubGroupSelect.disabled && clubGroupSelect.parentElement.style.display !== 'none' && clubGroupSelect.options.length > 1) {
                                                   clubGroupSelect.focus();
                                              } else if (orderInGroupInput && orderInputContainer && orderInputContainer.style.display !== 'none' && orderInGroupInput.required) {
                                                   orderInGroupInput.focus();
                                              } else {
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
                               if (clubCategorySelect) { clubCategorySelect.value = ""; clubCategorySelect.disabled = true; }
                               if (clubGroupSelect) {
                                   clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                   clubGroupSelect.disabled = true;
                                   if (clubGroupSelect) clubGroupSelect.required = false;
                               }
                               if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                               if (orderInputContainer) orderInputContainer.style.display = 'none';
                               if (orderInGroupInput) { orderInGroupInput.required = false; orderInGroupInput.value = ''; }
                            }
                       } else if (currentClubModalMode === 'add-assign' && unassignedClubSelectContainer && unassignedClubSelectContainer.style.display !== 'none' && (!selectedClubId || selectedClubId === '-- Vyberte tím na priradenie --')) {
                           if (clubCategorySelect) { clubCategorySelect.value = ""; clubCategorySelect.disabled = true; }
                             if (clubGroupSelect) {
                                 clubGroupSelect.innerHTML = '<option value="">-- Najprv vyberte kategóriu --</option>';
                                 clubGroupSelect.disabled = true;
                                  if (clubGroupSelect) clubGroupSelect.required = false;
                             }
                             if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
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


                     if (currentClubModalMode === 'add-assign') {
                          if (unassignedClubSelectContainer && unassignedClubSelectContainer.style.display !== 'none') {
                              const selectedUnassignedClubId = unassignedClubSelect ? unassignedClubSelect.value : '';
                              if (selectedUnassignedClubId === '' || selectedUnassignedClubId === '-- Vyberte tím na priradenie --') {
                                  alert('Prosím, vyberte tím na priradenie.');
                                   if (unassignedClubSelect) unassignedClubSelect.focus();
                                  return;
                              }
                               if (selectedCategoryId === '' || selectedCategoryId === '-- Vyberte kategóriu --' || (clubCategorySelect && clubCategorySelect.disabled && !selectedCategoryId)) {
                                   alert('Vybraný tím nemá priradenú kategóriu a nemôže byť priradený do skupiny.');
                                    if (unassignedClubSelect) unassignedClubSelect.focus();
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
                             if (!clubDataToAssign.categoryId || clubDataToAssign.categoryId === '' || selectedCategoryId === '') {
                                 alert(`Vybraný tím "${clubDataToAssign.name}" nemá priradenú kategóriu a nemôže byť priradený do skupiny. Upravte tím v "Zozname tímov" alebo vyberte iný tím.`);
                                  if (unassignedClubSelect) unassignedClubSelect.focus();
                                 return;
                             }

                             const newCategoryId = selectedCategoryId;
                             const newName = clubDataToAssign.name || 'Neznámy názov';
                             const newGroupId = selectedGroupId;
                             const newOrderInGroup = orderInGroup;

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

                             const newDocumentId = `${newCategoryId} - ${newName}${newOrderInGroup !== null ? ' ' + newOrderInGroup : ''}`;
                             const newClubDocRef = doc(clubsCollectionRef, newDocumentId);

                             const existingNewIdDoc = await getDoc(newClubDocRef);
                             if (existingNewIdDoc.exists()) {
                                  alert(`Nemožno priradiť tím: Tím s finálnym názvom "${newName}" a kategóriou/skupinou/poradím už existuje (ID: ${newDocumentId}). Skontrolujte "Zoznam tímov".`);
                                  if (unassignedClubSelect) unassignedClubSelect.focus();
                                  return;
                             }

                            const batch = writeBatch(db);
                            batch.delete(clubRefToAssign);
                            batch.set(newClubDocRef, {
                                name: newName,
                                categoryId: newCategoryId,
                                groupId: newGroupId,
                                orderInGroup: newOrderInGroup
                            });
                            await batch.commit();
                            alert(`Tím "${newName}" úspešne priradený do skupiny "${newGroupId.split(' - ').slice(1).join(' - ')}" v kategórii "${newCategoryId}".`);


                             if (mainRosterTeamSelect && window.location.hash === '#supiska') {
                                  populateRosterTeamsSelect(); // Obnoviť výber tímov na hlavnej stránke
                                  // Ak bol priradený tím, ktorý bol pred tým nepriradený a vybraný v Roster modale,
                                  // jeho ID sa zmení. Roster modal by mal byť zatvorený (rieši sa inde),
                                  // a hlavné zobrazenie súpisky by sa malo vyčistiť (rieši sa inde).
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
                             if (!clubNameInput || updatedClubName === '') {
                                alert('Názov klubu nemôže byť prázdny.');
                                 if (clubNameInput) clubNameInput.focus();
                                return;
                            }
                            if (selectedCategoryId === '' || selectedCategoryId === '-- Vyberte kategóriu --') {
                                alert('Prosím, vyberte platnú kategóriu pre tím.');
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


                             const newDocumentId = `${updatedCategoryId} - ${updatedClubName}${updatedGroupId !== null && updatedOrderInGroup !== null ? ' ' + updatedOrderInGroup : ''}`;
                             const newClubDocRef = doc(clubsCollectionRef, newDocumentId);


                              if (updatedClubName !== originalName) {
                                   if (updatedGroupId !== null) {
                                        const existingClubInTargetGroupQuery = query(clubsCollectionRef,
                                             where('groupId', '==', updatedGroupId),
                                             where('name', '==', updatedClubName),
                                             where('__name__', '!=', clubIdToEdit)
                                        );
                                        const existingClubInTargetGroupSnapshot = await getDocs(existingClubInTargetGroupQuery);
                                        if (!existingClubInTargetGroupSnapshot.empty) {
                                             alert(`Klub s názvom "${updatedClubName}" už v cieľovej skupine "${updatedGroupId.split(' - ').slice(1).join(' - ')}" existuje! Prosím, zvoľte iný názov.`);
                                             if (clubNameInput) clubNameInput.focus();
                                             return;
                                        }
                                   } else if (originalGroupId === null && updatedGroupId === null) {
                                         const existingUnassignedClubQuery = query(clubsCollectionRef,
                                              where('groupId', '==', null),
                                              where('name', '==', updatedClubName),
                                              where('__name__', '!=', clubIdToEdit)
                                         );
                                         const existingUnassignedClubSnapshot = await getDocs(existingUnassignedClubQuery);
                                         if (!existingUnassignedClubSnapshot.empty) {
                                             alert(`Iný nepriradený klub s názvom "${updatedClubName}" už existuje!`);
                                              if (clubNameInput) clubNameInput.focus();
                                             return;
                                         }
                                   }
                              }

                              if (updatedGroupId !== null && updatedOrderInGroup !== null) {
                                   if (updatedGroupId !== originalGroupId || updatedOrderInGroup !== originalOrder) {
                                       const existingOrderQuery = query(clubsCollectionRef,
                                            where('groupId', '==', updatedGroupId),
                                            where('orderInGroup', '==', updatedOrderInGroup),
                                            where('__name__', '!=', clubIdToEdit)
                                       );
                                       const existingOrderSnapshot = await getDocs(existingOrderQuery);
                                       if (!existingOrderSnapshot.empty) {
                                            alert(`Tím s poradovým číslom "${updatedOrderInGroup}" už v skupine "${updatedGroupId.split(' - ').slice(1).join(' - ')}" existuje! Prosím, zvoľte iné poradové číslo.`);
                                            if (orderInGroupInput) orderInGroupInput.focus();
                                            return;
                                       }
                                   }
                               }


                             if (clubIdToEdit !== newDocumentId) {
                                  const existingNewIdDoc = await getDoc(newClubDocRef);
                                   if (existingNewIdDoc.exists()) {
                                        alert(`Nemožno uložiť zmeny: Tím s finálnym názvom "${updatedClubName}" a kategóriou/skupinou/poradím už existuje (ID: ${newDocumentId}). Skontrolujte "Zoznam tímov".`);
                                        if (clubNameInput) clubNameInput.focus();
                                        return;
                                   }
                                   const batch = writeBatch(db);
                                   // Pri zmene ID tímu, súpiska sa NEKOPÍRUJE automaticky.
                                   // Ak bola súpiska dôležitá, bolo by potrebné ju presunúť manuálne.
                                   // Teraz jednoducho vymažeme starý dokument a vytvoríme nový s novým ID,
                                   // čím sa súpiska na starom ID "stratí" (zostane v databáze, ale nebude prístupná cez nové ID tímu).
                                    // TODO: Implementovať presun súpisky, ak je potrebná.
                                   batch.set(newClubDocRef, {
                                       name: updatedClubName,
                                       categoryId: updatedCategoryId,
                                       groupId: updatedGroupId,
                                       orderInGroup: updatedGroupId !== null ? updatedOrderInGroup : null
                                   });
                                   batch.delete(clubRefToEdit);
                                  await batch.commit();
                                   alert(`Klub úspešne upravený a premenovaný (ID zmenené).`);

                                   // Ak bol práve upravený tím, ktorý bol vybraný na hlavnej stránke súpisky,
                                   // jeho ID sa zmenilo. Vyčistiť zobrazenie súpisky na hlavnej stránke a obnoviť výber.
                                   if (mainRosterTeamSelect && window.location.hash === '#supiska' && selectedTeamForMainRoster === clubIdToEdit) {
                                        populateRosterTeamsSelect(); // Obnoviť výber tímov
                                        if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                                        if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                                         if (mainRosterArea) mainRosterArea.style.display = 'none';
                                        selectedTeamForMainRoster = null; // Reset vybraného tímu
                                   }
                                    // Ak je otvorený modal pridania hráča pre tento tím, zatvoriť ho
                                   if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForMainRoster === clubIdToEdit) {
                                       closeRosterModal();
                                        alert("Tím, pre ktorého ste chceli pridať hráča, bol upravený (zmenilo sa ID). Modal súpisky bol zatvorený.");
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

                                    // Ak bol práve upravený tím, ktorý bol vybraný na hlavnej stránke súpisky,
                                    // a ID sa nezmenilo, obnoviť zobrazenie súpisky na hlavnej stránke.
                                   if (mainRosterTeamSelect && window.location.hash === '#supiska' && selectedTeamForMainRoster === clubIdToEdit) {
                                        displayMainRoster(selectedTeamForMainRoster); // Obnoviť súpisku na hlavnej stránke
                                   }
                                    // Ak je otvorený modal pridania hráča pre tento tím, obnoviť info o tíme v modale
                                   if (rosterModal && rosterModal.style.display === 'block' && selectedTeamForMainRoster === clubIdToEdit) {
                                        // Potrebujeme načítať aktualizované dáta tímu, aby sme zobrazili správnu kategóriu/názov
                                        const updatedTeamDoc = await getDoc(clubRefToEdit);
                                         if (updatedTeamDoc.exists() && rosterModalTeamInfo) {
                                              const updatedTeamData = updatedTeamDoc.data();
                                              rosterModalTeamInfo.textContent = `${updatedTeamData.name || 'Bez názvu'} (${updatedTeamData.categoryId || 'Bez kategórie'})`;
                                         } else if (rosterModalTeamInfo) {
                                             rosterModalTeamInfo.textContent = 'Tím nebol nájdený.';
                                         }
                                   }
                             }

                         }
                         if (clubModal) closeModal(clubModal);
                         if (clubForm) clubForm.reset();
                         currentClubModalMode = 'add-assign';
                         editingClubId = null;
                          if (clubGroupSelect) clubGroupSelect.required = false;
                          if (orderInGroupInput) orderInGroupInput.required = false;

                          if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
                          if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
                          if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                          if (orderInputContainer) orderInputContainer.style.display = 'none';
                          if (clubCategorySelect) clubCategorySelect.disabled = true;


                          displayCreatedTeams();
                          if (window.location.hash === '#timy-do-skupin') {
                               displayClubs();
                          }
                           // Ak je otvorený roster modal, obnoviť výber tímov (vplyv na display name vo výbere)
                           if (mainRosterTeamSelect && window.location.hash === '#supiska') {
                                populateRosterTeamsSelect();
                           }

                     } catch (error) {
                         console.error('Chyba pri ukladaní alebo priradzovaní klubu: ', error);
                         alert(`Chyba pri ukladaní alebo priradzovaní klubu! Detail: ${error.message}`);
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
            }

             async function displayClubs() {
                if (!clubsContentDiv) { console.error("clubsContentDiv element not found for displayClubs."); return; }
                clubsContentDiv.innerHTML = '';

                if (!clubsFilterContainer) {
                     console.error("Filter container inside clubsContent not found!");
                     clubsContentDiv.innerHTML = '<p>Chyba: Kontajner filtrov nebol nájdený.</p>';
                     return;
                }

                clubsContentDiv.appendChild(clubsFilterContainer);
                 clubsFilterContainer.style.display = 'flex';

                try {
                    const selectedCategoryId = clubFilterCategorySelect ? clubFilterCategorySelect.value : '';
                    const selectedGroupId = clubFilterGroupSelect ? clubFilterGroupSelect.value : '';

                    let allGroupsForSelectedCategory = [];
                    if (selectedCategoryId && selectedCategoryId !== '') {
                         const groupsQueryForCategory = query(groupsCollectionRef, where('categoryId', '==', selectedCategoryId));
                         const groupsSnapshotForCategory = await getDocs(groupsQueryForCategory);
                         allGroupsForSelectedCategory = groupsSnapshotForCategory.docs.map(doc => ({ id: doc.id, data: doc.data() }));
                         allGroupsForSelectedCategory.sort((a, b) => a.id.localeCompare(b.id));
                    }

                    let clubsQuery;
                    if (selectedCategoryId && selectedCategoryId !== '') {
                        if (selectedGroupId && selectedGroupId !== '') {
                            clubsQuery = query(clubsCollectionRef, where('categoryId', '==', selectedCategoryId), where('groupId', '==', selectedGroupId));
                        } else {
                            clubsQuery = query(clubsCollectionRef, where('categoryId', '==', selectedCategoryId), where('groupId', '!=', null));
                        }
                    } else {
                        clubsQuery = query(clubsCollectionRef, where('groupId', '!=', null));
                    }

                    const clubsSnapshot = await getDocs(clubsQuery);
                    const fetchedClubs = clubsSnapshot.docs.map(clubDoc => ({ id: clubDoc.id, data: clubDoc.data() }));

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


                    const contentArea = document.createElement('div');
                    contentArea.style.display = 'flex';
                    contentArea.style.flexWrap = 'wrap';
                    contentArea.style.gap = '20px';
                    contentArea.style.justifyContent = 'center';
                    contentArea.style.padding = '0 20px 20px 20px';


                    if (selectedCategoryId && selectedCategoryId !== '') {
                        if (allGroupsForSelectedCategory.length === 0) {
                             const message = document.createElement('p');
                             message.textContent = `V kategórii "${selectedCategoryId}" zatiaľ nie sú žiadne skupiny.`;
                             contentArea.appendChild(message);
                             clubsContentDiv.appendChild(contentArea);
                             return;
                        }

                        const generatedClubSections = [];
                        allGroupsForSelectedCategory.forEach(group => {
                             if (selectedGroupId && selectedGroupId !== '' && group.id !== selectedGroupId) {
                                  return;
                             }

                            const groupClubSectionDiv = document.createElement('div');
                            groupClubSectionDiv.classList.add('section-block');
                            const groupNameParts = group.id.split(' - ');
                            const groupName = groupNameParts.length > 1 ? groupNameParts.slice(1).join(' - ') : group.id;
                            const sectionHeading = document.createElement('h2');
                             sectionHeading.textContent = `${group.data.categoryId} - ${groupName}`;
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

                            const clubsInThisGroup = clubsByGroupId[group.id] || [];

                            if (clubsInThisGroup.length === 0) {
                                 const noClubsRow = document.createElement('tr');
                                 const td = document.createElement('td');
                                 td.colSpan = 3;
                                 td.textContent = `Žiadne kluby v tejto skupine.`;
                                 td.style.textAlign = 'center';
                                 tbody.appendChild(noClubsRow);
                            } else {
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
                                                displayClubs();
                                                displayCreatedTeams();
                                                 if (manageTeamsModal && manageTeamsModal.style.display === 'block' && teamsListInModalDiv && teamsListInModalDiv.querySelector(`tr[data-club-id="${club.id}"]`)) {
                                                      closeManageTeamsModal();
                                                  }
                                                   // Ak je na hlavnej stránke súpisky vybraný tento tím, vyčistiť zobrazenie
                                                   if (mainRosterTeamSelect && window.location.hash === '#supiska' && selectedTeamForMainRoster === club.id) {
                                                        populateRosterTeamsSelect();
                                                        if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                                                        if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                                                         if (mainRosterArea) mainRosterArea.style.display = 'none';
                                                        selectedTeamForMainRoster = null;
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

                         generatedClubSections.forEach(sectionDiv => {
                             contentArea.appendChild(sectionDiv);
                         });


                    } else {
                         if (fetchedClubs.length === 0) {
                              const message = document.createElement('p');
                             message.textContent = "Žiadne kluby zatiaľ neboli priradené do skupín zodpovedajúcim filtrom.";
                             contentArea.appendChild(message);
                             clubsContentDiv.appendChild(contentArea);
                             return;
                         }

                        const clubsByCategoryAndGroup = {};
                        fetchedClubs.forEach(club => {
                            const categoryId = club.data.categoryId;
                            const groupId = club.data.groupId;
                             if (categoryId && groupId && categoryId !== 'null' && groupId !== 'null') {
                                 if (!clubsByCategoryAndGroup[categoryId]) {
                                     clubsByCategoryAndGroup[categoryId] = {};
                                 }
                                 if (!clubsByCategoryAndGroup[categoryId][groupId]) {
                                     clubsByCategoryAndGroup[categoryId][groupId] = [];
                                 }
                                  clubsByCategoryAndGroup[categoryId][groupId].push(club);
                             } else {
                             }
                        });

                        const sortedCategories = Object.keys(clubsByCategoryAndGroup).sort();

                         if (sortedCategories.length === 0 && fetchedClubs.length > 0) {
                              const message = document.createElement('p');
                               message.textContent = "Existujú priradené kluby zodpovedajúce filtru, ale žiadne nemajú konzistentne priradenú kategóriu a skupinu pre zobrazenie tu (možné chyby v dátach).";
                              contentArea.appendChild(message);
                              clubsContentDiv.appendChild(contentArea);
                              return;
                         } else if (sortedCategories.length === 0 && fetchedClubs.length === 0) {
                                return;
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

                                if (clubsInThisGroup.length === 0) {
                                     const noClubsRow = document.createElement('tr');
                                     const td = document.createElement('td');
                                     td.colSpan = 3;
                                     td.textContent = `Žiadne kluby v tejto skupine.`;
                                     td.style.textAlign = 'center';
                                     tbody.appendChild(noClubsRow);
                                } else {
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

                                          const editClubButton = document.createElement('button');
                                          editClubButton.textContent = 'Upraviť';
                                          editClubButton.classList.add('action-button');
                                          editClubButton.onclick = () => {
                                               openClubModal(club.id, club.data);
                                           };
                                          actionsTd.appendChild(editClubButton);

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
                                                    displayClubs();
                                                    displayCreatedTeams();
                                                     if (manageTeamsModal && manageTeamsModal.style.display === 'block' && teamsListInModalDiv && teamsListInModalDiv.querySelector(`tr[data-club-id="${club.id}"]`)) {
                                                         closeManageTeamsModal();
                                                     }
                                                      if (mainRosterTeamSelect && window.location.hash === '#supiska' && selectedTeamForMainRoster === club.id) {
                                                           populateRosterTeamsSelect();
                                                           if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                                                           if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                                                            if (mainRosterArea) mainRosterArea.style.display = 'none';
                                                           selectedTeamForMainRoster = null;
                                                      }
                                               } catch (error) {
                                                    console.error('Chyba pri odpriradzovaní klubu: ', error);
                                                    alert('Chyba pri odpriradzovaní klubu! Prosím, skúste znova.');
                                               }
                                           };
                                          actionsTd.appendChild(unassignClubButton);

                                         tr.appendChild(orderTd);
                                         tr.appendChild(nameTd);
                                         actionsTd.appendChild(editClubButton);
                                         actionsTd.appendChild(unassignClubButton);
                                         tr.appendChild(actionsTd);
                                         tbody.appendChild(tr);
                                     });
                                  }
                                  clubTable.appendChild(tbody);
                                  groupClubSectionDiv.appendChild(clubTable);
                                  generatedClubSections.push(groupClubSectionDiv);
                               });
                            });

                         generatedClubSections.forEach(sectionDiv => {
                              contentArea.appendChild(sectionDiv);
                         });
                      }

                    clubsContentDiv.appendChild(contentArea);


                    contentArea.querySelectorAll('.section-block').forEach(section => {
                         section.style.width = 'auto';
                          section.style.flexGrow = '0';
                          section.style.flexShrink = '0';
                          section.style.flexBasis = 'auto';
                    });
                    const sectionBlocks = contentArea.querySelectorAll('.section-block');
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
                     clubsContentDiv.appendChild(errorMessage);
                }
             }

             async function displayCreatedTeams() {
                  if (!createdTeamsTableBody || !createdTeamsTableHeader) { console.error("Created teams table elements not found for displayCreatedTeams."); return; }
                  createdTeamsTableBody.innerHTML = '';
                  createdTeamsTableHeader.innerHTML = '';
                  try {
                      const categoriesSnapshot = await getDocs(categoriesCollectionRef);
                      const categories = categoriesSnapshot.docs.map(doc => doc.id).sort((a, b) => a.localeCompare(b, 'sk-SK'));
                      const teamNameTh = document.createElement('th');
                      teamNameTh.textContent = 'Základný názov tímu';
                      createdTeamsTableHeader.appendChild(teamNameTh);
                      categories.forEach(categoryName => {
                          const categoryTh = document.createElement('th');
                          categoryTh.textContent = categoryName;
                          categoryTh.style.textAlign = 'center';
                          createdTeamsTableHeader.appendChild(categoryTh);
                      });
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
                           const nameSuffixMatch = fullTeamName.match(/^(.*)\s[A-Z]$/);
                           const baseTeamName = nameSuffixMatch ? nameSuffixMatch[1] : fullTeamName;
                          const categoryId = clubData.categoryId || 'Nepriradená';
                          if (!teamsByBaseName[baseTeamName]) {
                              teamsByBaseName[baseTeamName] = {
                                  categories: {},
                                  originalTeams: []
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
                          td.colSpan = 2 + categories.length;
                          td.textContent = "Žiadne tímy zatiaľ pridané.";
                          td.style.textAlign = 'center';
                          noDataRow.appendChild(td);
                          createdTeamsTableBody.appendChild(noDataRow);
                      } else {
                          sortedBaseNames.forEach(baseTeamName => {
                              const teamSummary = teamsByBaseName[baseTeamName];
                              const tr = document.createElement('tr');
                              const nameTd = document.createElement('td');
                              nameTd.textContent = baseTeamName;
                              tr.appendChild(nameTd);
                              categories.forEach(categoryName => {
                                  const countTd = document.createElement('td');
                                  const count = teamSummary.categories[categoryName] || 0;
                                  countTd.textContent = count > 0 ? count : '-';
                                  countTd.style.textAlign = 'center';
                                  tr.appendChild(countTd);
                              });
                              const actionsTd = document.createElement('td');
                              actionsTd.style.whiteSpace = 'nowrap';
                               const manageTeamsButton = document.createElement('button');
                               manageTeamsButton.textContent = 'Spravovať tímy';
                               manageTeamsButton.classList.add('action-button');
                               manageTeamsButton.onclick = () => {
                                   openManageTeamsModal(baseTeamName, teamSummary.originalTeams);
                               };
                               actionsTd.appendChild(manageTeamsButton);
                               const deleteAllButton = document.createElement('button');
                               deleteAllButton.textContent = 'Vymazať všetko';
                               deleteAllButton.classList.add('action-button', 'delete-button');
                               deleteAllButton.onclick = async () => {
                                   if (!confirm(`Naozaj chcete vymazať VŠETKY tímy s názvom "${baseTeamName}" (${teamSummary.originalTeams.length} ks)? Táto akcia vymaže všetky individuálne tímy priradené k tomuto základnému názvu a ich súpisky.`)) {
                                       return;
                                   }
                                   try {
                                        const batch = writeBatch(db);
                                        for (const team of teamSummary.originalTeams) {
                                             const rosterSnapshot = await getDocs(collection(clubsCollectionRef, team.id, 'roster'));
                                             rosterSnapshot.forEach(playerDoc => {
                                                  batch.delete(playerDoc.ref);
                                             });
                                            batch.delete(doc(clubsCollectionRef, team.id));
                                        }
                                       await batch.commit();
                                       displayCreatedTeams();
                                       if (window.location.hash === '#timy-do-skupin') {
                                            displayClubs();
                                       }
                                         if (teamCreationModal && teamCreationModal.style.display === 'block') {
                                              loadAllCategoriesForDynamicSelects();
                                         }
                                          if (clubModal && clubModal.style.display === 'block') {
                                              if (currentClubModalMode === 'edit-assigned' && teamSummary.originalTeams.some(t => t.id === editingClubId)) {
                                                  if (clubModal) closeModal(clubModal);
                                              }
                                              if (currentClubModalMode === 'add-assign' && unassignedClubSelect) {
                                                   populateUnassignedClubsSelect(unassignedClubSelect, null);
                                              }
                                           }
                                          if (manageTeamsModal && manageTeamsModal.style.display === 'block' && baseTeamNameInModalSpan && baseTeamNameInModalSpan.textContent === `Tímy: ${baseTeamName}`) {
                                               closeManageTeamsModal();
                                          }
                                           // Ak je na hlavnej stránke súpisky vybraný tím s týmto základným názvom, vyčistiť zobrazenie
                                          if (mainRosterTeamSelect && window.location.hash === '#supiska' && selectedTeamForMainRoster) {
                                               const selectedTeamDoc = await getDoc(doc(clubsCollectionRef, selectedTeamForMainRoster));
                                                // Ak aktuálne vybraný tím už neexistuje, alebo jeho názov začína mazaným základným názvom
                                                if (!selectedTeamDoc.exists() || (selectedTeamDoc.exists() && (selectedTeamDoc.data().name || '').startsWith(baseTeamName))) {
                                                     populateRosterTeamsSelect(); // Obnoviť výber tímov
                                                     if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                                                     if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                                                      if (mainRosterArea) mainRosterArea.style.display = 'none';
                                                     selectedTeamForMainRoster = null; // Reset vybraného tímu
                                                } else {
                                                    // Ak tím existuje, ale už nepatrí pod tento základný názov (napr. bol premenovaný), len obnoviť výber
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
                      td.colSpan = 2 + categories.length;
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
                      categoryTeamsTable.classList.add('group-clubs-table');
                      const thead = document.createElement('thead');
                      const headerRow = document.createElement('tr');
                      const teamNameTh = document.createElement('th');
                      teamNameTh.textContent = 'Názov tímu';
                       const groupTh = document.createElement('th');
                       groupTh.textContent = 'Skupina';
                        const orderTh = document.createElement('th');
                        orderTh.textContent = 'Poradie';
                        orderTh.style.textAlign = 'center';
                        orderTh.style.width = '50px';
                       const actionsTh = document.createElement('th');
                       actionsTh.textContent = '';
                       actionsTh.style.width = '150px';
                       headerRow.appendChild(teamNameTh);
                       headerRow.appendChild(groupTh);
                       headerRow.appendChild(orderTh);
                       headerRow.appendChild(actionsTh);
                       thead.appendChild(headerRow);
                       categoryTeamsTable.appendChild(thead);
                      const tbody = document.createElement('tbody');
                       teamsInThisCategory.sort((a, b) => {
                            const isAssignedA = a.data.groupId !== null;
                            const isAssignedB = b.data.groupId !== null;
                            if (isAssignedA !== isAssignedB) {
                                 return isAssignedA ? 1 : -1;
                            }
                             return (a.data.name || '').localeCompare(b.data.name || '', 'sk-SK');
                       });
                      teamsInThisCategory.forEach(team => {
                          const tr = document.createElement('tr');
                           tr.dataset.clubId = team.id;
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
                          const editIndividualTeamButton = document.createElement('button');
                          editIndividualTeamButton.textContent = 'Upraviť';
                          editIndividualTeamButton.classList.add('action-button');
                          editIndividualTeamButton.onclick = () => {
                              closeManageTeamsModal();
                              openClubModal(team.id, team.data);
                          };
                          actionsTd.appendChild(editIndividualTeamButton);
                          const deleteIndividualTeamButton = document.createElement('button');
                          deleteIndividualTeamButton.textContent = 'Vymazať';
                          deleteIndividualTeamButton.classList.add('action-button', 'delete-button');
                          deleteIndividualTeamButton.onclick = async () => {
                               if (!confirm(`Naozaj chcete vymazať tím "${team.data.name}" z kategórie "${categoryName}"? Táto akcia vymaže tím úplne z databázy a jeho súpisku.`)) {
                                   return;
                               }
                              try {
                                   const teamDocRef = doc(clubsCollectionRef, team.id);
                                   const batch = writeBatch(db);
                                    const rosterSnapshot = await getDocs(collection(teamDocRef, 'roster'));
                                    rosterSnapshot.forEach(playerDoc => {
                                         batch.delete(playerDoc.ref);
                                    });
                                   batch.delete(teamDocRef);
                                   await batch.commit();

                                   closeManageTeamsModal();
                                   displayCreatedTeams();
                                  if (window.location.hash === '#timy-do-skupin') {
                                       displayClubs();
                                  }
                                  if (mainRosterTeamSelect && window.location.hash === '#supiska' && selectedTeamForMainRoster === team.id) {
                                      populateRosterTeamsSelect();
                                      if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                                      if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                                       if (mainRosterArea) mainRosterArea.style.display = 'none';
                                      selectedTeamForMainRoster = null;
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
                     allAvailableCategories = querySnapshot.docs.map(doc => doc.id).sort((a, b) => a.localeCompare(b, 'sk-SK'));
                      if (teamCreationModal && teamCreationModal.style.display === 'block') {
                           updateDynamicCategorySelects();
                           checkIfAddCategoryCountPairButtonShouldBeVisible();
                      }
                 } catch (error) {
                     console.error('Chyba pri načítaní kategórií pre dynamické selecty: ', error);
                     allAvailableCategories = [];
                      checkIfAddCategoryCountPairButtonShouldBeVisible();
                 }
            }

            function populateDynamicCategorySelect(selectElement, currentSelectedId, allCategories, categoriesToExclude) {
                 if (!selectElement) { console.error("selectElement for dynamic category select is null."); return; }
                 selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
                 selectElement.disabled = allCategories.length === 0;

                 if (currentSelectedId && allCategories.includes(currentSelectedId)) {
                      const currentOption = document.createElement('option');
                      currentOption.value = currentSelectedId;
                      currentOption.textContent = currentSelectedId;
                      currentOption.selected = true;
                      selectElement.appendChild(currentOption);
                 }
                 allAvailableCategories.forEach(categoryName => {
                     if (categoryName !== currentSelectedId && !categoriesToExclude.includes(categoryName)) {
                         const option = document.createElement('option');
                         option.value = categoryName;
                         option.textContent = categoryName;
                         selectElement.appendChild(option);
                     }
                 });
                  if (!selectElement.value) {
                      selectElement.value = "";
                  }
            }

            function updateDynamicCategorySelects() {
                 if (!teamCategoryCountContainer) { console.error("teamCategoryCountContainer not found for updateDynamicCategorySelects."); return; }
                 const allSelectElements = teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic');
                 const currentSelections = Array.from(allSelectElements)
                     .map(select => select.value)
                     .filter(value => value !== '');
                 allSelectElements.forEach(selectElement => {
                     const currentSelectedIdInThisSelect = selectElement.value;
                     const categoriesToExcludeForThisSelect = currentSelections.filter(cat => cat !== currentSelectedIdInThisSelect);
                     populateDynamicCategorySelect(
                         selectElement,
                         currentSelectedIdInThisSelect,
                         allAvailableCategories,
                         categoriesToExcludeForThisSelect
                     );
                 });
                 checkIfAddCategoryCountPairButtonShouldBeVisible();
            }

             function updateRemoveButtonVisibility() {
                 if (!teamCategoryCountContainer) { console.error("teamCategoryCountContainer not found for updateRemoveButtonVisibility."); return; }
                  const allRemoveButtons = teamCategoryCountContainer.querySelectorAll('.category-count-pair .delete-button');
                  if (allRemoveButtons.length > 0) {
                       allRemoveButtons.forEach((button, index) => {
                            if (allRemoveButtons.length <= 1) {
                                 button.style.display = 'none';
                            } else {
                                 button.style.display = 'inline-block';
                            }
                       });
                  }
             }

             function checkIfAddCategoryCountPairButtonShouldBeVisible() {
                 if (!teamCategoryCountContainer || !addCategoryCountPairButton) { console.error("teamCategoryCountContainer or addCategoryCountPairButton not found."); return; }
                  const allSelectElements = teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic');
                  const currentSelections = Array.from(allSelectElements)
                      .map(select => select.value)
                      .filter(value => value !== '');
                  if (allAvailableCategories.length > 0 && currentSelections.length < allAvailableCategories.length) {
                       addCategoryCountPairButton.style.display = 'inline-block';
                  } else {
                       addCategoryCountPairButton.style.display = 'none';
                  }
             }

             async function addCategoryCountPair(initialCategory = null) {
                 if (!teamCategoryCountContainer || !addCategoryCountPairButton) { console.error("Missing teamCategoryCountContainer or addCategoryCountPairButton."); return; }

                 const container = teamCategoryCountContainer;
                 const pairDiv = document.createElement('div');
                 pairDiv.classList.add('category-count-pair');
                 const categorySelectLabel = document.createElement('label');
                 categorySelectLabel.textContent = 'Kategória:';
                 const categorySelect = document.createElement('select');
                 categorySelect.classList.add('team-category-select-dynamic');
                 categorySelect.name = 'category';
                 categorySelect.required = true;
                 categorySelect.addEventListener('change', () => {
                     updateDynamicCategorySelects();
                     updateRemoveButtonVisibility();
                 });
                 const teamCountLabel = document.createElement('label');
                 teamCountLabel.textContent = 'Počet tímov:';
                 const teamCountInput = document.createElement('input');
                 teamCountInput.classList.add('team-count-input-dynamic');
                 teamCountInput.type = 'number';
                 teamCountInput.name = 'count';
                 teamCountInput.min = '1';
                 teamCountInput.value = '1';
                 teamCountInput.required = true;
                 const removeButton = document.createElement('button');
                 removeButton.textContent = 'Odstrániť';
                 removeButton.classList.add('action-button', 'delete-button');
                 removeButton.type = 'button';
                 removeButton.style.marginLeft = '10px';
                  removeButton.onclick = () => {
                      pairDiv.remove();
                      updateDynamicCategorySelects();
                      updateRemoveButtonVisibility();
                  };
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
                 const allSelectElementsBeforeAdding = container.querySelectorAll('.team-category-select-dynamic');
                 const categoriesSelectedInOthers = Array.from(allSelectElementsBeforeAdding)
                     .map(select => select.value)
                     .filter(value => value !== '' && value !== initialCategory);
                 populateDynamicCategorySelect(
                    categorySelect,
                    initialCategory,
                    allAvailableCategories,
                    categoriesSelectedInOthers
                 );
                   updateDynamicCategorySelects();
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
                 teamCategoryCountContainer.innerHTML = '';
                 if (allAvailableCategories.length === 0) {
                      await loadAllCategoriesForDynamicSelects();
                 } else {
                       updateDynamicCategorySelects();
                       updateRemoveButtonVisibility();
                   }
                 await addCategoryCountPair();
                 teamNameInput.focus();
            }

            async function populateClubFilterCategories() {
                 if (!clubFilterCategorySelect) { console.error("clubFilterCategorySelect not found!"); return; }
                 const currentSelectedFilterCategory = clubFilterCategorySelect.value;
                 clubFilterCategorySelect.innerHTML = '<option value="">Všetky kategórie</option>';
                 clubFilterCategorySelect.disabled = true;
                 try {
                     const querySnapshot = await getDocs(categoriesCollectionRef);
                     if (querySnapshot.empty) {
                          const option = document.createElement('option');
                          option.value = '';
                          option.textContent = 'Žiadne kategórie';
                          option.disabled = true;
                          clubFilterCategorySelect.appendChild(option);
                     } else {
                          clubFilterCategorySelect.disabled = false;
                          const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
                          sortedDocs.forEach((doc) => {
                               const categoryName = doc.id;
                               const option = document.createElement('option');
                               option.value = categoryName;
                               option.textContent = categoryName;
                               clubFilterCategorySelect.appendChild(option);
                          });
                          if (currentSelectedFilterCategory && clubFilterCategorySelect.querySelector(`option[value="${currentSelectedFilterCategory}"]`)) {
                               clubFilterCategorySelect.value = currentSelectedFilterCategory;
                          } else {
                               clubFilterCategorySelect.value = '';
                          }
                     }
                      populateClubFilterGroups(clubFilterCategorySelect.value);
                 } catch (error) {
                     console.error('Chyba pri načítaní kategórií pre filter klubov: ', error);
                     const option = document.createElement('option');
                     option.value = '';
                     option.textContent = 'Chyba pri načítaní';
                     option.disabled = true;
                     clubFilterCategorySelect.appendChild(option);
                      clubFilterCategorySelect.disabled = true;
                 }
            }

            async function populateClubFilterGroups(categoryId) {
                 if (!clubFilterGroupSelect) { console.error("clubFilterGroupSelect not found!"); return; }
                 const currentSelectedFilterGroup = clubFilterGroupSelect.value;
                 clubFilterGroupSelect.innerHTML = '<option value="">Všetky skupiny</option>';
                 clubFilterGroupSelect.disabled = true;
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
                           clubFilterGroupSelect.disabled = true;
                     } else {
                          clubFilterGroupSelect.disabled = false;
                          const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
                          sortedDocs.forEach((doc) => {
                               const groupName = doc.id;
                               const option = document.createElement('option');
                               option.value = groupName;
                               option.textContent = groupName;
                               clubFilterGroupSelect.appendChild(option);
                          });
                          if (currentSelectedFilterGroup && clubFilterGroupSelect.querySelector(`option[value="${currentSelectedFilterGroup}"]`)) {
                               clubFilterGroupSelect.value = currentSelectedFilterGroup;
                          } else {
                               clubFilterGroupSelect.value = '';
                          }
                     }
                 } catch (error) {
                     console.error(`Chyba pri načítaní skupín pre filter klubov kategórie "${categoryId}": `, error);
                     const option = document.createElement('option');
                     option.value = '';
                     option.textContent = 'Chyba pri načítaní';
                     option.disabled = true;
                     clubFilterGroupSelect.appendChild(option);
                      clubFilterGroupSelect.disabled = true;
                 }
            }

            // Funkcia na naplnenie výberu tímov na hlavnej stránke Súpiska
             async function populateRosterTeamsSelect() {
                 if (!mainRosterTeamSelect) { console.error("mainRosterTeamSelect not found!"); return; }
                 // Zachovať aktuálne vybraný tím, ak existuje vo výsledkoch
                 const currentSelectedTeam = mainRosterTeamSelect.value;

                 mainRosterTeamSelect.innerHTML = '<option value="">-- Vyberte tím pre zobrazenie súpisky --</option>';
                 mainRosterTeamSelect.disabled = true;

                 try {
                     const querySnapshot = await getDocs(clubsCollectionRef);
                     if (querySnapshot.empty) {
                         const option = document.createElement('option');
                         option.value = '';
                         option.textContent = '-- Žiadne tímy --';
                         option.disabled = true;
                         mainRosterTeamSelect.appendChild(option);
                         mainRosterTeamSelect.disabled = true;
                     } else {
                         mainRosterTeamSelect.disabled = false;
                         const sortedDocs = querySnapshot.docs.sort((a, b) => (a.data().name || '').localeCompare(b.data().name || '', 'sk-SK'));
                         let foundCurrentSelected = false;
                         sortedDocs.forEach((doc) => {
                             const team = doc.data();
                             const option = document.createElement('option');
                             option.value = doc.id;
                              const teamDisplayName = `${team.name || 'Bez názvu'} (${team.categoryId || 'Bez kategórie'})`;
                             option.textContent = teamDisplayName;
                             mainRosterTeamSelect.appendChild(option);

                             if (doc.id === currentSelectedTeam) {
                                  option.selected = true;
                                  foundCurrentSelected = true;
                             }
                         });

                         // Ak bol predtým vybraný tím, ale už vo výbere neexistuje, resetovať výber
                         if (currentSelectedTeam && !foundCurrentSelected) {
                              mainRosterTeamSelect.value = '';
                              // Týmto sa automaticky zavolá listener na change, ktorý vyčistí súpisku
                         } else if (currentSelectedTeam && foundCurrentSelected) {
                             // Ak bol predtým vybraný tím a stále existuje, znovu zobraziť jeho súpisku
                              displayMainRoster(currentSelectedTeam);
                         }
                     }
                 } catch (error) {
                     console.error('Chyba pri načítaní tímov pre výber súpisky: ', error);
                     const option = document.createElement('option');
                     option.value = '';
                     option.textContent = '-- Chyba pri načítaní --';
                     option.disabled = true;
                     mainRosterTeamSelect.appendChild(option);
                     mainRosterTeamSelect.disabled = true;
                 }
             }

            // Funkcia na zobrazenie súpisky pre vybraný tím na hlavnej stránke
             async function displayMainRoster(teamId) {
                  // Kontrola existencie všetkých potrebných elementov
                  if (!mainRosterArea || !mainSelectedTeamInfo || !mainRosterTableBody) {
                       console.error("Missing main roster display elements.");
                       return;
                  }

                  // Vyčistiť predchádzajúce zobrazenie
                 if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: '; // Reset textu
                 if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                  if (mainRosterArea) mainRosterArea.style.display = 'none'; // Skryť oblasť kým sa nenačíta

                 // Ak nie je vybraný platný tím, stačí vyčistiť a skryť
                 if (!teamId || teamId === '' || teamId === '-- Vyberte tím pre zobrazenie súpisky --') {
                      selectedTeamForMainRoster = null;
                      return;
                 }

                 selectedTeamForMainRoster = teamId; // Uložiť ID aktuálne vybraného tímu

                 try {
                     const teamDocRef = doc(clubsCollectionRef, teamId);
                     const teamDoc = await getDoc(teamDocRef);

                     if (!teamDoc.exists()) {
                         console.error(`Tím s ID ${teamId} nebol nájdený pre zobrazenie súpisky.`);
                         if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Tím nebol nájdený.';
                         if (mainRosterTableBody) mainRosterTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Tím nebol nájdený.</td></tr>';
                          if (mainRosterArea) mainRosterArea.style.display = 'block'; // Zobraziť aspoň chybovú hlášku
                         selectedTeamForMainRoster = null;
                         // Resetovať výber tímu v selecte, ak tím neexistuje
                         if (mainRosterTeamSelect && mainRosterTeamSelect.value === teamId) {
                              mainRosterTeamSelect.value = '';
                              populateRosterTeamsSelect(); // Znova naplniť select
                         }
                         return;
                     }

                     const teamData = teamDoc.data();
                      if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = `Súpiska tímu: ${teamData.name || 'Bez názvu'} (${teamData.categoryId || 'Bez kategórie'})`;


                     const rosterCollectionRef = collection(teamDocRef, 'roster');
                     const rosterSnapshot = await getDocs(rosterCollectionRef);

                      if (mainRosterArea) mainRosterArea.style.display = 'block'; // Zobraziť oblasť súpisky po úspešnom načítaní tímu

                     if (rosterSnapshot.empty) {
                         if (mainRosterTableBody) mainRosterTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Zatiaľ žiadni hráči na súpiske.</td></tr>';
                     } else {
                         const players = rosterSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
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
                             tr.dataset.playerId = player.id;

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
                             actionsTd.style.textAlign = 'center';

                             // Tlačidlo "Vymazať" hráča
                             const deletePlayerButton = document.createElement('button');
                             deletePlayerButton.textContent = 'Vymazať';
                             deletePlayerButton.classList.add('action-button', 'delete-button');
                             // Listener je pridaný delegovaním na mainRosterTableBody nižšie

                             actionsTd.appendChild(deletePlayerButton);
                             tr.appendChild(actionsTd);
                             if (mainRosterTableBody) mainRosterTableBody.appendChild(tr);
                         });
                     }
                 } catch (error) {
                     console.error(`Chyba pri načítaní súpisky pre tím ${teamId}: `, error);
                      if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Chyba pri načítaní súpisky.';
                     if (mainRosterTableBody) mainRosterTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Chyba pri načítaní súpisky.</td></tr>';
                     if (mainRosterArea) mainRosterArea.style.display = 'block'; // Zobraziť chybovú hlášku
                      selectedTeamForMainRoster = null;
                 }
             }


            function toggleContentDisplay() {
                 const hash = window.location.hash;
                 if (addButton) addButton.style.display = 'none';
                 if (categoriesContentSection) categoriesContentSection.style.display = 'none';
                 if (groupsContentDiv) groupsContentDiv.style.display = 'none';
                 if (clubsContentDiv) clubsContentDiv.style.display = 'none';
                 if (teamCreationContentSection) teamCreationContentSection.style.display = 'none';
                 if (rosterContentSection) rosterContentSection.style.display = 'none'; // Nová sekcia súpisky skrytá

                 // Skryť aj konkrétne elementy sekcie súpisky
                 if (mainRosterTeamSelect) mainRosterTeamSelect.style.display = 'none';
                 if (mainRosterArea) mainRosterArea.style.display = 'none';


                 if (clubsFilterContainer) clubsFilterContainer.style.display = 'none';
                 if (categoryModal) closeModal(categoryModal);
                 if (groupModal) closeModal(groupModal);
                 if (clubModal) closeModal(clubModal);
                 if (teamCreationModal) closeModal(teamCreationModal);
                 if (manageTeamsModal) closeModal(manageTeamsModal);
                 if (rosterModal) closeRosterModal();

                 if (categoryTableBody) categoryTableBody.innerHTML = '';
                 if (groupsContentDiv) groupsContentDiv.innerHTML = '';
                 if (clubsContentDiv) clubsContentDiv.innerHTML = '';
                 if (createdTeamsTableBody) createdTeamsTableBody.innerHTML = '';
                 if (createdTeamsTableHeader) createdTeamsTableHeader.innerHTML = '';
                 if (teamsListInModalDiv) teamsListInModalDiv.innerHTML = '';

                 // Vyčistiť obsah elementov v sekcii súpisky
                 if (mainRosterTeamSelect) mainRosterTeamSelect.innerHTML = '<option value="">-- Vyberte tím pre zobrazenie súpisky --</option>';
                 if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                 if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';


                 if (clubFilterCategorySelect) clubFilterCategorySelect.value = '';
                 if (clubFilterGroupSelect) { clubFilterGroupSelect.value = ''; clubFilterGroupSelect.disabled = true; }

                 if (window.location.hash !== '#timy-do-skupin') {
                      capturedClubSectionWidth = null;
                 }

                  currentCategoryModalMode = 'add'; editingCategoryName = null;
                  if (categoryForm) categoryForm.reset();
                  currentGroupModalMode = 'add'; editingGroupId = null;
                  if (groupForm) groupForm.reset();
                  currentClubModalMode = 'add-assign'; editingClubId = null;
                  if (clubForm) {
                      clubForm.reset();
                      if (clubGroupSelect) clubGroupSelect.required = false;
                      if (orderInGroupInput) orderInGroupInput.required = false;
                  }
                   if (unassignedClubSelectContainer) unassignedClubSelectContainer.style.display = 'block';
                   if (clubNameInputContainer) clubNameInputContainer.style.display = 'none';
                   if (clubGroupSelect && clubGroupSelect.parentElement) clubGroupSelect.parentElement.style.display = 'block';
                   if (orderInputContainer) orderInputContainer.style.display = 'none';
                   if (clubCategorySelect) clubCategorySelect.disabled = true;

                  currentTeamCreationModalMode = 'add';
                  if (teamCreationForm) teamCreationForm.reset();
                   if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
                   if (addCategoryCountPairButton) addCategoryCountPairButton.style.display = 'none';
                   allAvailableCategories = [];

                   selectedTeamForMainRoster = null; // Reset vybraného tímu na hlavnej stránke


                 document.body.classList.remove('categories-section-active', 'groups-section-active', 'teams-list-section-active', 'clubs-section-active', 'roster-section-active');

                 if (hash === '#kategorie') {
                     if (addButton) addButton.style.display = 'block';
                     if (categoriesContentSection) categoriesContentSection.style.display = 'block';
                     loadCategoriesTable();
                     if (addButton) addButton.title = "Pridať kategóriu";
                     document.body.classList.add('categories-section-active');
                 } else if (hash === '#skupiny') {
                     if (addButton) addButton.style.display = 'block';
                     if (groupsContentDiv) groupsContentDiv.style.display = 'flex';
                     if (groupsContentDiv) groupsContentDiv.innerHTML = '';
                     displayGroupsByCategory();
                     if (addButton) addButton.title = "Pridať skupinu";
                     document.body.classList.add('groups-section-active');
                 } else if (hash === '#zoznam-timov') {
                     if (addButton) addButton.style.display = 'block';
                     if (teamCreationContentSection) teamCreationContentSection.style.display = 'block';
                     displayCreatedTeams();
                     if (addButton) addButton.title = "Vytvoriť tímy";
                      loadAllCategoriesForDynamicSelects();
                      document.body.classList.add('teams-list-section-active');
                 }
                 else if (hash === '#timy-do-skupin') {
                     if (addButton) addButton.style.display = 'block';
                     if (clubsContentDiv) clubsContentDiv.style.display = 'flex';
                     populateClubFilterCategories();
                     displayClubs();
                     if (addButton) addButton.title = "Priradiť tím do skupiny";
                     document.body.classList.add('clubs-section-active');
                 } else if (hash === '#supiska') { // Sekcia súpisky na hlavnej stránke
                      if (addButton) addButton.style.display = 'block'; // Tlačidlo "+" bude viditeľné
                      if (rosterContentSection) rosterContentSection.style.display = 'block'; // Zobraziť sekciu súpisky
                      if (mainRosterTeamSelect) mainRosterTeamSelect.style.display = 'inline-block'; // Zobraziť výber tímu
                      if (addButton) addButton.title = "Pridať hráča k vybranému tímu"; // Titulok tlačidla "+" pre pridanie hráča

                      // Načítať tímy do výberu a inicializovať zobrazenie súpisky
                      populateRosterTeamsSelect();
                       // Listener na zmenu výberu tímu je pridaný hneď po načítaní stránky/inicializácii,
                       // netreba ho pridávať tu znova, len sa spustí jeho logika pri prvej zmene hodnoty selectu.

                      document.body.classList.add('roster-section-active');
                 }
                 else {
                     if (addButton) addButton.style.display = 'none';
                     if (clubsFilterContainer) clubsFilterContainer.style.display = 'none';
                     if (addButton) addButton.title = "Pridať položku";
                 }
            }

            if (addButton) {
                addButton.addEventListener('click', async () => { // Zmenené na async kvoli checku vybraneho timu
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
                         openClubModal();
                    } else if (hash === '#supiska') { // Akcia pre súpisku na hlavnej stránke
                         // Pred otvorením modalu pridania hráča skontrolujeme, či je vybraný tím
                         if (!selectedTeamForMainRoster) {
                              alert('Prosím, najprv vyberte tím pre zobrazenie súpisky na hlavnej stránke.');
                               if (mainRosterTeamSelect) mainRosterTeamSelect.focus(); // Zameranie na výber tímu
                              return; // Nezobrazovať modal, ak nie je vybraný tím
                         }
                         // Ak je tím vybraný, otvoríme modal na pridanie hráča
                         openRosterModal(); // Voláme funkciu na otvorenie ZJEDNODUŠENÉHO modalu
                    }
                });
            } else {
                console.error("Add button not found!");
            }

            // Implementácia otvorenia Roster modalu (ZJEDNODUŠENÁ verzia len na pridanie hráča)
            async function openRosterModal() {
                 // Kontrola existencie potrebných elementov v ZJEDNODUŠENOM modale
                 if (!rosterModal || !rosterModalTitle || !playerForm || !playerNumberInput || !playerNameInput || !playerSurnameInput || !rosterModalTeamInfo) {
                      console.error("Missing required roster modal elements for adding player.");
                      if (rosterModal) closeModal(rosterModal);
                      return;
                 }

                 // Získame dáta vybraného tímu na hlavnej stránke
                 if (!selectedTeamForMainRoster) {
                      console.error("Chyba: openRosterModal bol volaný bez vybraného tímu na hlavnej stránke.");
                      alert("Vyskytla sa chyba. Prosím, obnovte stránku alebo vyberte tím znova.");
                      // Zatvoriť modal, ak sa napriek kontrole volal bez vybraného tímu
                      if (rosterModal) closeModal(rosterModal);
                      return;
                 }

                 const teamDocRef = doc(clubsCollectionRef, selectedTeamForMainRoster);
                 const teamDoc = await getDoc(teamDocRef);

                 if (!teamDoc.exists()) {
                      console.error(`Tím s ID ${selectedTeamForMainRoster} pre pridanie hráča nebol nájdený.`);
                      alert("Vybraný tím nebol nájdený. Prosím, vyberte tím znova.");
                       // Vyčistiť zobrazenie na hlavnej stránke a obnoviť výber tímov
                       if (mainRosterTeamSelect && window.location.hash === '#supiska') {
                            populateRosterTeamsSelect();
                            if (mainSelectedTeamInfo) mainSelectedTeamInfo.textContent = 'Súpiska tímu: ';
                            if (mainRosterTableBody) mainRosterTableBody.innerHTML = '';
                             if (mainRosterArea) mainRosterArea.style.display = 'none';
                            selectedTeamForMainRoster = null;
                       }
                       if (rosterModal) closeModal(rosterModal); // Zatvoriť modal
                      return;
                 }

                 const teamData = teamDoc.data();

                 openModal(rosterModal);
                 rosterModalTitle.textContent = 'Pridať hráča';
                 // Zobraziť info o tíme v modale
                 rosterModalTeamInfo.textContent = `do tímu: ${teamData.name || 'Bez názvu'} (${teamData.categoryId || 'Bez kategórie'})`;

                 playerForm.reset(); // Resetovať formulár hráča

                 // Nastaviť fokus na prvé vstupné pole formulára hráča
                 if (playerNumberInput) {
                     playerNumberInput.focus();
                 } else if (playerNameInput) {
                     playerNameInput.focus();
                 } else if (playerSurnameInput) {
                     playerSurnameInput.focus();
                 } else if (playerForm) {
                     playerForm.focus(); // Fallback focus
                 } else if (rosterModal) {
                     rosterModal.focus(); // Fallback focus na modal
                 }
            }


            // Implementácia pridania hráča do súpisky
            if (playerForm) {
                playerForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    // Získame ID vybraného tímu z hlavnej stránky
                    const selectedTeamForRoster = document.getElementById('mainRosterTeamSelect') ? document.getElementById('mainRosterTeamSelect').value : null;

                    if (!selectedTeamForRoster || selectedTeamForRoster === '') {
                         // Táto kontrola by už mala byť pri otváraní modalu, ale pre istotu aj tu
                        alert('Vyskytla sa chyba: Nebol vybraný tím pre pridanie hráča.');
                         if (rosterModal) closeModal(rosterModal); // Zatvoriť modal pri chybe
                         if (mainRosterTeamSelect && window.location.hash === '#supiska') mainRosterTeamSelect.focus();
                        return;
                    }

                    const playerNumber = playerNumberInput ? parseInt(playerNumberInput.value, 10) : NaN;
                    const playerName = playerNameInput ? playerNameInput.value.trim() : '';
                    const playerSurname = playerSurnameInput ? playerSurnameInput.value.trim() : '';

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
                                if (playerNumberInput) playerNumberInput.focus();
                               return;
                          }

                        // Pridať nového hráča do subkolekcie 'roster' vybraného tímu pomocou setDoc a vlastného ID
                        await setDoc(playerDocRef, {
                            number: playerNumber,
                            name: playerName,
                            surname: playerSurname
                        });

                        alert(`Hráč "${playerName} ${playerSurname}" úspešne pridaný na súpisku tímu.`);
                        playerForm.reset();
                         if (playerNumberInput) playerNumberInput.focus();

                        // Obnoviť zobrazenie súpisky na hlavnej stránke
                        displayMainRoster(selectedTeamForRoster);

                    } catch (error) {
                        console.error('Chyba pri pridávaní hráča na súpisku: ', error);
                        alert('Chyba pri pridávaní hráča na súpisku! Prosím, skúste znova.');
                    }
                });
            } else { console.error("Player form not found!"); }

            // Delegovanie udalostí pre tlačidlá v tabuľke súpisky na hlavnej stránke
             // ZMENENÉ: Cieľom je teraz #mainRosterTableBody
             if (mainRosterTableBody) {
                 mainRosterTableBody.addEventListener('click', async (e) => {
                     // Kontrola, či bolo kliknuté na tlačidlo "Vymazať"
                     if (e.target && e.target.classList.contains('delete-button') && e.target.textContent === 'Vymazať') {
                         const row = e.target.closest('tr');
                         const playerId = row ? row.dataset.playerId : null;
                          // Získame ID tímu z aktuálne vybraného tímu na hlavnej stránke
                         const teamId = document.getElementById('mainRosterTeamSelect') ? document.getElementById('mainRosterTeamSelect').value : null;


                         if (playerId && teamId) {
                              const playerName = row.cells[1] ? row.cells[1].textContent : 'Neznáme meno';
                              const playerSurname = row.cells[2] ? row.cells[2].textContent : 'Neznáme priezvisko';

                              if (!confirm(`Naozaj chcete vymazať hráča "${playerName} ${playerSurname}" zo súpisky?`)) {
                                  return;
                              }

                              try {
                                   const playerDocRef = doc(collection(clubsCollectionRef, teamId, 'roster'), playerId);
                                   await deleteDoc(playerDocRef);
                                   // Obnoviť zobrazenie súpisky na hlavnej stránke
                                   displayMainRoster(teamId);
                                   alert(`Hráč "${playerName} ${playerSurname}" úspešne vymazaný.`);
                              } catch (error) {
                                   console.error(`Chyba pri mazaní hráča (ID: ${playerId}) z tímu (ID: ${teamId}): `, error);
                                   alert('Chyba pri mazaní hráča!');
                              }
                         } else {
                              console.warn("Nepodarilo sa získať ID hráča alebo tímu pre mazanie z hlavnej súpisky.");
                         }
                     }
                     // TODO: Implementovať logiku pre kliknutie na tlačidlo "Upraviť" (ak bude implementované)
                 });
             } else { console.error("mainRosterTableBody not found for event delegation."); }


            // Listeners pre zatvorenie modálnych okien
            if (categoryModalCloseBtn) {
                categoryModalCloseBtn.addEventListener('click', () => {
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
                        // Ak je aktívna sekcia súpisky, obnoviť výber tímov
                       if (window.location.hash === '#supiska') {
                            populateRosterTeamsSelect();
                            // Ak bol vybraný tím, jeho súpiska by sa mala obnoviť automaticky po zmene selectu
                       }
                });
            }

            if (groupModalCloseBtn) {
                groupModalCloseBtn.addEventListener('click', () => {
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
                       // Ak je aktívna sekcia súpisky, obnoviť výber tímov
                       if (window.location.hash === '#supiska') {
                            populateRosterTeamsSelect();
                             // Ak bol vybraný tím, jeho súpiska by sa mala obnoviť automaticky po zmene selectu
                       }
                });
            }

            if (clubModalCloseBtn) {
                 clubModalCloseBtn.addEventListener('click', () => {
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

                       // Ak je aktívna sekcia súpisky, obnoviť výber tímov a prípadne aj zobrazenú súpisku
                       if (window.location.hash === '#supiska') {
                            populateRosterTeamsSelect(); // Obnoviť výber tímov
                            if (selectedTeamForMainRoster) {
                                displayMainRoster(selectedTeamForMainRoster); // Obnoviť súpisku aktuálneho tímu
                            }
                       }
                 });
            }

             if (teamCreationModalCloseBtn) {
                 teamCreationModalCloseBtn.addEventListener('click', () => {
                     if (teamCreationModal) closeModal(teamCreationModal);
                     currentTeamCreationModalMode = 'add';
                     if (teamCreationForm) teamCreationForm.reset();
                      if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
                       if (addCategoryCountPairButton) addCategoryCountPairButton.style.display = 'none';

                       displayCreatedTeams();
                        // Ak je aktívna sekcia súpisky, obnoviť výber tímov
                       if (window.location.hash === '#supiska') {
                            populateRosterTeamsSelect();
                       }
                 });
             }

            if (manageTeamsModalCloseBtn) {
                manageTeamsModalCloseBtn.addEventListener('click', closeManageTeamsModal);
            }

            // Poslucháč pre zatvorenie Roster modalu (pridanie hráča)
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
                       if (window.location.hash === '#supiska') {
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
                        if (window.location.hash === '#supiska') {
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
                       if (window.location.hash === '#supiska') {
                            populateRosterTeamsSelect();
                             if (selectedTeamForMainRoster) {
                                 displayMainRoster(selectedTeamForMainRoster);
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
                        if (window.location.hash === '#supiska') {
                            populateRosterTeamsSelect();
                       }
                 }
                 if (e.target === manageTeamsModal) {
                      closeManageTeamsModal();
                       if (window.location.hash === '#supiska') {
                           populateRosterTeamsSelect();
                           if (selectedTeamForMainRoster) {
                               displayMainRoster(selectedTeamForMainRoster);
                           }
                       }
                 }
                 // Poslucháč pre kliknutie mimo Roster modalu
                 if (rosterModal && e.target === rosterModal) {
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
                 // Pridanie poslucháča na zmenu výberu tímu na hlavnej stránke súpisky
                 if (mainRosterTeamSelect) {
                      mainRosterTeamSelect.addEventListener('change', () => {
                           const selectedTeamId = mainRosterTeamSelect.value;
                           // Keď sa zmení výber, zobrazíme súpisku pre nový tím alebo vyčistíme, ak nič nie je vybrané
                           displayMainRoster(selectedTeamId);
                      });
                 } else {
                     console.error("mainRosterTeamSelect not found on load for adding event listener.");
                 }
            });

            // Filter change listeners
            if (clubFilterCategorySelect) {
                 clubFilterCategorySelect.addEventListener('change', () => {
                      const selectedCategoryId = clubFilterCategorySelect.value;
                      populateClubFilterGroups(selectedCategoryId);
                      displayClubs();
                 });
            } else { console.error("Club filter category select not found!"); }

            if (clubFilterGroupSelect) {
                 clubFilterGroupSelect.addEventListener('change', () => {
                      displayClubs();
                 });
            } else { console.error("Club filter group select not found!"); }


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
                              await setDoc(categoryDocRef, { });

                              alert(`Kategória "${categoryName}" úspešne pridaná.`);
                              if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset();
                              currentCategoryModalMode = 'add'; editingCategoryName = null;
                              loadCategoriesTable();
                              if (window.location.hash === '#skupiny') {
                                  if (groupsContentDiv) groupsContentDiv.innerHTML = '';
                                  displayGroupsByCategory();
                              }
                              displayCreatedTeams();
                              if (window.location.hash === '#timy-do-skupin') {
                                  populateClubFilterCategories();
                              }
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
                               if (window.location.hash === '#supiska') { // Ak je aktívna sekcia súpisky, obnoviť výber tímov
                                   populateRosterTeamsSelect();
                               }


                         } catch (error) {
                              console.error('Chyba pri pridávaní kategórie: ', error);
                              alert('Chyba pri pridávaní kategórie! Prosím, skúste znova.');
                              if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset();
                              currentCategoryModalMode = 'add'; editingCategoryName = null;
                         }
                    } else if (currentCategoryModalMode === 'edit') {
                         const oldCategoryName = editingCategoryName;
                         const newCategoryName = categoryName;

                         if (!oldCategoryName) { console.error("Chyba: Chýba pôvodný názov kategórie pri úprave."); alert("Chyba pri úprave kategórie."); if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset(); currentCategoryModalMode = 'add'; editingCategoryName = null; return; }
                         if (newCategoryName === oldCategoryName) { if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset(); currentCategoryModalMode = 'add'; editingCategoryName = null; return; }

                         const newCategoryDocRef = doc(categoriesCollectionRef, newCategoryName);
                         try {
                              const existingDoc = await getDoc(newCategoryDocRef);
                              if (existingDoc.exists()) { alert(`Kategória s názvom "${newCategoryName}" už existuje!`); return; }

                              const oldCategoryDocRef = doc(categoriesCollectionRef, oldCategoryName);
                              const oldDocSnapshot = await getDoc(oldCategoryDocRef);
                              if (!oldDocSnapshot.exists()) { console.error(`Chyba: Pôvodný dokument kategórie ${oldCategoryName} nenájdený na úpravu.`); alert("Pôvodná kategória na úpravu nebola nájdena."); if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset(); currentCategoryModalMode = 'add'; editingCategoryName = null; loadCategoriesTable(); return; }

                              const oldDocData = oldDocSnapshot.data();
                              const batch = writeBatch(db);

                              batch.set(newCategoryDocRef, oldDocData);

                              const groupsQuery = query(groupsCollectionRef, where('categoryId', '==', oldCategoryName));
                              const groupsSnapshot = await getDocs(groupsQuery);
                              for (const groupDoc of groupsSnapshot.docs) {
                                  const oldGroupId = groupDoc.id;
                                  const groupData = groupDoc.data();
                                  const newGroupId = `${newCategoryName} - ${groupData.name}`;
                                  const newGroupDocRef = doc(groupsCollectionRef, newGroupId);

                                   batch.set(newGroupDocRef, { name: groupData.name, categoryId: newCategoryName });

                                  const clubsInGroupQuery = query(clubsCollectionRef, where('groupId', '==', oldGroupId));
                                  const clubsSnapshot = await getDocs(clubsInGroupQuery);
                                  clubsSnapshot.forEach(clubDoc => {
                                       batch.update(clubDoc.ref, { groupId: newGroupId, categoryId: newCategoryName });
                                  });

                                   batch.delete(groupDoc.ref);
                              }

                               const unassignedClubsQuery = query(clubsCollectionRef, where('categoryId', '==', oldCategoryName), where('groupId', '==', null));
                               const unassignedClubsSnapshot = await getDocs(unassignedClubsQuery);
                               unassignedClubsSnapshot.forEach(doc => {
                                  batch.update(doc.ref, { categoryId: newCategoryName });
                               });


                              batch.delete(oldCategoryDocRef);

                              await batch.commit();

                              alert(`Kategória "${oldCategoryName}" úspešne premenovaná na "${newCategoryName}".`);
                              currentCategoryModalMode = 'add'; editingCategoryName = null;
                              if (categoryModal) closeModal(categoryModal); if (categoryForm) categoryForm.reset();

                              loadCategoriesTable();
                              if (window.location.hash === '#skupiny') {
                                  displayGroupsByCategory();
                              }
                              displayCreatedTeams();
                              if (window.location.hash === '#timy-do-skupin') {
                                   populateClubFilterCategories();
                                   displayClubs();
                              }
                               if (teamCreationModal && teamCreationModal.style.display === 'block') {
                                    loadAllCategoriesForDynamicSelects();
                               }
                                 if (clubModal && clubModal.style.display === 'block') {
                                      const originalSelectedCategoryId = clubCategorySelect ? clubCategorySelect.value : '';
                                     populateCategorySelect(clubCategorySelect, originalSelectedCategoryId);
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
                                  // Ak je aktívna sekcia súpisky, obnoviť výber tímov a prípadne zobrazenú súpisku
                                 if (window.location.hash === '#supiska') {
                                     populateRosterTeamsSelect(); // Obnoviť výber tímov (názov tímu vo výbere sa môže zmeniť)
                                      // Ak bol vybraný tím, jeho kategória sa mohla zmeniť, obnoviť zobrazenie súpisky
                                      if (selectedTeamForMainRoster) {
                                           displayMainRoster(selectedTeamForMainRoster);
                                      }
                                 }


                           } catch (error) {
                                console.error('Chyba pri premenovaní kategórie a aktualizácii referencií: ', error);
                                alert('Chyba pri premenovaní kategórie! Prosím, skúste znova.');
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
                             if (existingDoc.exists()) {
                                  alert(`Skupina s názvom "${groupName}" už v kategórii "${selectedCategoryId}" existuje! Názvy skupín musia byť unikátne v rámci kategórie.`);
                                   if (groupNameInput) groupNameInput.focus();
                                  return;
                             }
                             await setDoc(groupDocRef, { name: groupName, categoryId: selectedCategoryId });
                              alert(`Skupina "${groupName}" v kategórii "${selectedCategoryId}" úspešne pridaná.`);

                         } else if (currentGroupModalMode === 'edit') {
                             const oldGroupId = editingGroupId;
                             if (!oldGroupId) { console.error("Chyba: Režim úpravy skupiny bez platného editingGroupId."); alert("Chyba pri úprave skupiny. Prosím, obnovte stránku."); if (groupModal) closeModal(groupModal); if (groupForm) groupForm.reset(); currentGroupModalMode = 'add'; editingGroupId = null; return; }

                             const oldGroupDocRef = doc(groupsCollectionRef, oldGroupId);
                             const oldDocSnapshot = await getDoc(oldGroupDocRef);
                             if (!oldDocSnapshot.exists()) { console.error(`Chyba: Pôvodný dokument skupiny ${oldGroupId} nenájdený.`); alert("Pôvodná skupina na úpravu nebola nájdená."); if (groupModal) closeModal(groupModal); if (groupForm) groupForm.reset(); currentGroupModalMode = 'add'; editingGroupId = null; displayGroupsByCategory(); return; }

                             const oldGroupData = oldDocSnapshot.data();

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
                                  clubsSnapshot.forEach(clubDoc => {
                                       batch.update(clubDoc.ref, { groupId: compositeGroupId, categoryId: selectedCategoryId });
                                  });

                                   batch.delete(groupDoc.ref);
                                  await batch.commit();
                                   alert(`Skupina "${oldGroupData.name}" úspešne premenovaná/presunutá na "${groupName}" v kategórii "${selectedCategoryId}".`);

                                   // Ak je aktívna sekcia súpisky, obnoviť výber tímov a prípadne zobrazenú súpisku
                                  if (window.location.hash === '#supiska') {
                                      populateRosterTeamsSelect();
                                       // Ak bol vybraný tím, jeho súpiska by sa mala obnoviť
                                      if (selectedTeamForMainRoster) {
                                          displayMainRoster(selectedTeamForMainRoster);
                                      }
                                  }

                              } else {
                                   await updateDoc(groupDocRef, {
                                      name: groupName,
                                  });
                                   alert(`Skupina "${oldGroupData.name}" v kategórii "${selectedCategoryId}" úspešne upravená.`);
                                    // Ak je aktívna sekcia súpisky, a bol vybraný tím z tejto skupiny, obnoviť zobrazenú súpisku
                                    if (window.location.hash === '#supiska' && selectedTeamForMainRoster) {
                                        displayMainRoster(selectedTeamForMainRoster);
                                    }
                              }
                         }

                         if (groupModal) closeModal(groupModal); if (groupForm) groupForm.reset();
                         currentGroupModalMode = 'add'; editingGroupId = null;

                         if (window.location.hash === '#skupiny') displayGroupsByCategory();
                         displayCreatedTeams();
                         if (window.location.hash === '#timy-do-skupin') {
                             populateClubFilterGroups(clubFilterCategorySelect ? clubFilterCategorySelect.value : '');
                             displayClubs();
                         }
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
                          if (window.location.hash === '#supiska') {
                              populateRosterTeamsSelect();
                          }

                      } catch (error) {
                          console.error('Chyba pri ukladaní skupiny: ', error);
                          alert(`Chyba pri ukladaní skupiny! Detail: ${error.message}`);
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
                    if (!teamNameInput || teamNameBase === '') {
                        alert('Základný názov tímu nemôže byť prázdny.');
                         if (teamNameInput) teamNameInput.focus();
                        return;
                    }

                    const categoryCountPairsContainer = document.getElementById('teamCategoryCountContainer');
                    const categoryCountPairs = categoryCountPairsContainer ? categoryCountPairsContainer.querySelectorAll('.category-count-pair') : [];

                    if (!categoryCountPairs || categoryCountPairs.length === 0) {
                        alert('Pridajte aspoň jednu kategóriu a počet tímov.');
                         if (addCategoryCountPairButton) addCategoryCountPairButton.focus();
                        return;
                    }

                    const teamsToProcess = [];
                    const seenCategories = new Set();

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
                           if (seenCategories.has(categoryId)) {
                               alert(`Kategória "${categoryId}" bola vybraná viackrát. Pre každú kategóriu môžete zadať iba jeden počet.`);
                                const firstDuplicateSelect = categoryCountPairsContainer.querySelector(`.team-category-select-dynamic[value="${categoryId}"]`);
                                if (firstDuplicateSelect) firstDuplicateSelect.focus();
                               return;
                           }
                           seenCategories.add(categoryId);

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
                        for (const teamPlan of teamsToProcess) {
                             const categoryId = teamPlan.categoryId;
                             const teamCount = teamPlan.count;

                             for (let i = 1; i <= teamCount; i++) {
                                  let teamName;
                                  let teamSuffixForId = '';
                                  if (teamCount > 1) {
                                       const letter = String.fromCharCode(65 + (i - 1));
                                       teamName = `${teamNameBase} ${letter}`;
                                       teamSuffixForId = ` ${letter}`;
                                  } else {
                                       teamName = teamNameBase;
                                  }
                                  const documentId = `${categoryId} - ${teamNameBase}${teamSuffixForId}`;
                                  const teamDocRef = doc(clubsCollectionRef, documentId);

                                  const existingDoc = await getDoc(teamDocRef);
                                   if (existingDoc.exists()) {
                                       failedCreations.push({ id: documentId, name: teamName, reason: 'Už existuje dokument s rovnakým ID.' });
                                        console.warn(`Preskočené vytvorenie tímu "${teamName}" (${documentId}) - dokument už existuje.`);
                                       continue;
                                   }

                                  batch.set(teamDocRef, {
                                      name: teamName,
                                      categoryId: categoryId,
                                      groupId: null,
                                      orderInGroup: null
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

                        displayCreatedTeams();

                         if (window.location.hash === '#supiska') { // Ak je aktívna sekcia súpisky, obnoviť výber tímov
                             populateRosterTeamsSelect();
                         }

                    } catch (error) {
                        console.error('Chyba pri vytváraní tímov: ', error);
                        alert(`Chyba pri vytváraní tímov! Prosím, skúste znova. Detail: ${error.message}`);
                         if (teamCreationModal && teamCreationModal.style.display === 'block') {
                             loadAllCategoriesForDynamicSelects();
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
