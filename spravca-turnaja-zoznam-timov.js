// spravca-turnaja-zoznam-timov.js (Naplnenie filtra názvu tímu a filtrovacia logika upravená o suffixy A, B, C)

import {db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, openModal, closeModal, populateCategorySelect, doc, getDocs, query, where, getDoc, setDoc, deleteDoc, updateDoc, writeBatch} from './spravca-turnaja-common.js';

const teamCreationModal = document.getElementById('teamCreationModal');
const teamCreationModalClose = teamCreationModal ? teamCreationModal.querySelector('.close') : null;
const teamCreationForm = document.getElementById('teamCreationForm');
const createdTeamsTableBody = document.getElementById('createdTeamsTableBody');
const createdTeamsTableHeader = document.getElementById('createdTeamsTableHeader');
const clubModal = document.getElementById('clubModal');
const clubModalClose = clubModal ? clubModal.querySelector('.close') : null;
const clubModalTitle = document.getElementById('clubModalTitle');
const clubFormContent = document.getElementById('clubFormContent');
const clubFilterContent = document.getElementById('clubFilterContent');
const clubForm = document.getElementById('clubForm');
const clubNameField = document.getElementById('clubNameField');
const clubNameInput = document.getElementById('clubName');
const clubAssignmentFields = document.getElementById('clubAssignmentFields');
const clubCategorySelect = document.getElementById('clubCategorySelect');
const clubGroupSelect = document.getElementById('clubGroupSelect');
const orderInGroupInput = document.getElementById('orderInGroup');
const unassignedClubField = document.getElementById('unassignedClubField');
const unassignedClubSelect = document.getElementById('unassignedClubSelect');
const filterModalTitle = document.getElementById('filterModalTitle');
const filterSelect = document.getElementById('filterSelect');

const addButton = document.getElementById('addButton');

const clearFiltersButton = document.getElementById('clearFiltersButton');

let allAvailableCategories = [];
let allAvailableGroups = [];
let allTeams = [];
let teamsToDisplay = [];

let editingClubId = null;
let currentClubModalMode = null;

let currentFilters = {
    teamName: null, // Filter teamName bude ukladať "čistý" názov bez A, B, C
    category: null,
    group: null
};

let currentSort = {
    column: null,
    direction: 'asc'
};

function parseTeamName(fullTeamName) {
    if (!fullTeamName || typeof fullTeamName !== 'string') {
        return { categoryPrefix: null, baseName: fullTeamName || '' };
    }
    const parts = fullTeamName.split(' - ');
    if (parts.length >= 2) {
        const categoryPrefix = parts[0].trim();
        const category = allAvailableCategories.find(cat => (cat.name || cat.id).trim().toLowerCase() === categoryPrefix.toLowerCase());
        if (category) {
            const baseName = parts.slice(1).join(' - ').trim();
            return { categoryPrefix: category.name || category.id, baseName };
        }
    }
    return { categoryPrefix: null, baseName: fullTeamName.trim() };
}

// Nová pomocná funkcia na odstránenie suffixov " A", " B", " C" pre účely filtrovania
function getCleanedTeamNameForFilter(teamName) {
    if (!teamName || typeof teamName !== 'string') {
        return '';
    }
    let cleanedName = teamName.trim();
    // Regulárny výraz na kontrolu, či sa reťazec končí medzerou a jedným písmenom A, B alebo C
    const suffixRegex = /\s[ABC]$/i;
    if (suffixRegex.test(cleanedName)) {
        // Odstrániť posledné dva znaky (" A", " B", alebo " C")
        cleanedName = cleanedName.slice(0, -2);
    }
    return cleanedName;
}

// Funkcia pre získanie unikátnych názvov tímov pre filter
// Teraz odstraňuje suffixy A, B, C
function getUniqueBaseTeamNames(teams) {
    const baseNames = teams.map(team => {
        // Získame základný názov tímu a aplikujeme čistenie pre filter
        const rawBaseName = team.createdFromBase || parseTeamName(team.id).baseName || '';
        return getCleanedTeamNameForFilter(rawBaseName); // Použijeme novú funkciu
    }).filter(name => name !== '');
    return [...new Set(baseNames)].sort((a, b) => a.localeCompare(b, 'sk-SK'));
}

function getUniqueTeamCategories(teams, categories) {
    const categoryIds = [...new Set(teams.map(team => team.categoryId).filter(id => id !== null && typeof id !== 'undefined' && id !== ''))];
    const categoryNames = categoryIds.map(id => {
        const category = categories.find(cat => cat.id === id);
        return category ? category.name : (id || 'Neznáma kategória');
    });
     const hasUnknownCategoryInTeams = teams.some(team => !team.categoryId || (typeof team.categoryId === 'string' && team.categoryId.trim() === ''));
     if (hasUnknownCategoryInTeams && !categoryNames.includes('Neznáma kategória')) {
         categoryNames.push('Neznáma kategória');
     }
    return [...new Set(categoryNames.filter(name => name && name.trim() !== '' || name === 'Neznáma kategória'))]
        .sort((a, b) => a.localeCompare(b, 'sk-SK'));
}

function getUniqueTeamGroups(teams, groups) {
    const groupNames = new Set();

    teams.forEach(team => {
        if (team.groupId === null || typeof team.groupId === 'undefined' || (typeof team.groupId === 'string' && team.groupId.trim() === '')) {
            groupNames.add('Nepriradené');
        } else {
            const group = groups.find(g => g.id === team.groupId);
            if (group) {
                groupNames.add(group.name || group.id);
            } else {
                 const parts = team.groupId.split(' - ');
                 if (parts.length > 1) {
                      const parsedGroupName = parts.slice(1).join(' - ').trim();
                      if (parsedGroupName !== '') {
                           groupNames.add(parsedGroupName);
                      } else {
                           groupNames.add(team.groupId);
                      }
                 } else {
                      groupNames.add(team.groupId);
                 }
            }
        }
    });

    return [...groupNames].filter(name => name && name.trim() !== '' || name === 'Nepriradené')
        .sort((a, b) => a.localeCompare(b, 'sk-SK'));
}


async function loadAllCategoriesForDynamicSelects() {
    allAvailableCategories = [];
    try {
        const querySnapshot = await getDocs(categoriesCollectionRef);
        querySnapshot.forEach((doc) => {
            const categoryData = doc.data();
            if (categoryData && typeof categoryData.name === 'string' && categoryData.name.trim() !== '') {
                allAvailableCategories.push({ id: doc.id, name: categoryData.name.trim() });
            } else {
                allAvailableCategories.push({ id: doc.id, name: doc.id });
            }
        });
        allAvailableCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
    } catch (e) {
        console.error("Chyba pri načítaní kategórií: ", e);
        alert("Nepodarilo sa načítať kategórie.");
        allAvailableCategories = [];
    }
}

async function loadAllGroups() {
    allAvailableGroups = [];
    try {
        const querySnapshot = await getDocs(groupsCollectionRef);
        querySnapshot.forEach((doc) => {
            const groupData = doc.data();
            if (groupData) {
                allAvailableGroups.push({ id: doc.id, ...groupData });
            }
        });
        allAvailableGroups.sort((a, b) => {
            const nameA = (a.name || a.id) || '';
            const nameB = (b.name || b.id) || '';
            return nameA.localeCompare(nameB, 'sk-SK');
        });
    } catch (e) {
        console.error("Chyba pri načítaní skupín:", e);
        alert("Nepodarilo sa načítať skupiny.");
        allAvailableGroups = [];
        if (clubGroupSelect) {
            clubGroupSelect.innerHTML = '<option value="">-- Chyba pri načítaní skupín --</option>';
            clubGroupSelect.disabled = true;
        }
    }
}

function populateGroupSelectForClubModal(selectElement, selectedId = '', availableGroups, categoryId = null) {
    if (!selectElement) {
        console.error("Select element pre skupiny nenájdený!");
        return;
    }
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
    const filteredGroups = categoryId
        ? availableGroups.filter(group => group.categoryId === categoryId)
        : availableGroups;

    const sortedFilteredGroups = filteredGroups.sort((a, b) => {
        const nameA = (a.name || a.id) || '';
        const nameB = (b.name || b.id) || '';
        return nameA.localeCompare(nameB, 'sk-SK');
    });


    if (sortedFilteredGroups.length === 0) {
        const category = allAvailableCategories.find(cat => cat.id === categoryId);
        const categoryName = category ? category.name : categoryId;
        const option = document.createElement('option');
        option.value = "";
        option.textContent = categoryId && !categoryId.startsWith('--') ? ` -- Žiadne skupiny v kategórii "${categoryName}" --` : `-- Vyberte skupinu --`;
        option.disabled = true;
        selectElement.appendChild(option);
        selectElement.disabled = true;
    } else {
        sortedFilteredGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            const displayedGroupName = group.name || group.id;
            option.textContent = displayedGroupName;
            selectElement.appendChild(option);
        });
        selectElement.disabled = false;
        if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
            selectElement.value = selectedId;
        } else {
            selectElement.value = "";
        }
    }
}

async function populateUnassignedClubsSelect() {
    if (!unassignedClubSelect) {
        console.error("Unassigned club select not found!");
        return;
    }
    unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
    unassignedClubSelect.disabled = true;
    try {
        const q = query(clubsCollectionRef, where("groupId", "==", null));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Žiadne nepriradené tímy";
            option.disabled = true;
            unassignedClubSelect.appendChild(option);
            unassignedClubSelect.disabled = true;
        } else {
            const unassignedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            unassignedTeams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
            unassignedTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name || team.id;
                option.dataset.categoryId = team.categoryId;
                unassignedClubSelect.appendChild(option);
            });
            unassignedClubSelect.disabled = false;
        }
    } catch (e) {
        console.error("Chyba pri načítaní nepriradených tímov:", e);
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "-- Chyba pri načítaní --";
        option.disabled = true;
        unassignedClubSelect.appendChild(option);
        unassignedClubSelect.disabled = true;
    }
}


function resetClubModal() {
    editingClubId = null;
    currentClubModalMode = null;
    if (clubForm) clubForm.reset();
    if (clubNameField) clubNameField.style.display = 'block';
    if (unassignedClubField) unassignedClubField.style.display = 'none';
    if (clubCategorySelect) {
        clubCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
        clubCategorySelect.disabled = true;
    }
    if (clubGroupSelect) {
        clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        if (clubGroupSelect) clubGroupSelect.disabled = true;
    }
    if (orderInGroupInput) {
        orderInGroupInput.value = '';
        orderInGroupInput.disabled = true;
        orderInGroupInput.removeAttribute('required');
    }
    if (unassignedClubSelect) {
        unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
        unassignedClubSelect.disabled = true;
    }
    if (clubModalTitle) clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
    if (clubForm) {
        const submitButton = clubForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Uložiť zmeny / Priradiť';
    }
    if (clubFilterContent) clubFilterContent.style.display = 'none';
    if (clubFormContent) clubFormContent.style.display = 'block';
    if (filterModalTitle) filterModalTitle.textContent = 'Filter';
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">-- Zobraziť všetko --</option>';
        filterSelect.value = "";
    }
}

async function openClubModal(identifier = null, mode = 'assign') {
    console.log(`INFO: Spustená funkcia openClubModal v režime: "${mode}", Identifier: ${identifier}`);

    if (!clubModal || !clubModalTitle || !clubFormContent || !clubFilterContent || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect || !filterModalTitle || !filterSelect) {
        console.error("Elementy modálu Klub/Filter nenájdene! Skontrolujte spravca-turnaja-zoznam-timov.html.");
        alert("Nastala chyba pri otváraní modálu. Niektoré elementy používateľského rozhrania chýbajú.");
        return;
    }
    resetClubModal();
    if (unassignedClubSelect) unassignedClubSelect.onchange = null;
    if (clubCategorySelect) clubCategorySelect.onchange = null;
    if (clubGroupSelect) clubGroupSelect.onchange = null;
    if (filterSelect) filterSelect.onchange = null;

    editingClubId = (mode === 'edit') ? identifier : null;
    currentClubModalMode = mode;

    if (allAvailableCategories.length === 0) {
        await loadAllCategoriesForDynamicSelects();
    }
    if (allAvailableGroups.length === 0) {
        await loadAllGroups();
    }

    if (['assign', 'edit', 'create'].includes(mode)) {
        clubFormContent.style.display = 'block';
        clubFilterContent.style.display = 'none';
        if (mode === 'assign') {
            clubModalTitle.textContent = 'Priradiť nepriradený tím';
        } else if (mode === 'create') {
            clubModalTitle.textContent = 'Vytvoriť nový tím';
             if (clubForm) {
                  const submitButton = clubForm.querySelector('button[type="submit"]');
                  if (submitButton) submitButton.textContent = 'Vytvoriť tím';
             }
        } else if (mode === 'edit') {
            clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
             if (clubForm) {
                 const submitButton = clubForm.querySelector('button[type="submit"]');
                 if (submitButton) submitButton.textContent = 'Uložiť zmeny';
             }
        }

        if (mode === 'assign') {
            clubNameField.style.display = 'none';
            clubAssignmentFields.style.display = 'block';
            unassignedClubField.style.display = 'block';

            if (clubCategorySelect) clubCategorySelect.disabled = true;
            if (clubGroupSelect) clubGroupSelect.disabled = true;
            if (orderInGroupInput) orderInGroupInput.disabled = true;

            clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
            populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);
            await populateUnassignedClubsSelect();

            if (unassignedClubSelect) {
                unassignedClubSelect.onchange = () => {
                    const selectedId = unassignedClubSelect.value;
                    const selectedOption = unassignedClubSelect.options[unassignedClubSelect.selectedIndex];
                    const categoryId = selectedOption ? selectedOption.dataset.categoryId : null;
                    if (selectedId && categoryId && !categoryId.startsWith('--')) {
                        const category = allAvailableCategories.find(cat => cat.id === categoryId);
                        const categoryName = category ? category.name : 'Neznáma kategória';
                        clubCategorySelect.innerHTML = `<option value="${categoryId}">${categoryName}</option>`;
                        if (clubCategorySelect) clubCategorySelect.disabled = true;
                        if (clubGroupSelect) clubGroupSelect.disabled = false;
                        populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, categoryId);
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                            orderInGroupInput.removeAttribute('required');
                        }
                    } else {
                        clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
                        if (clubCategorySelect) clubCategorySelect.disabled = true;
                        if (clubGroupSelect) clubGroupSelect.disabled = true;
                        clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                            orderInGroupInput.removeAttribute('required');
                        }
                    }
                };
            }
            if (clubGroupSelect) {
                clubGroupSelect.onchange = () => {
                    const selectedGroupId = clubGroupSelect.value;
                    if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = false;
                            orderInGroupInput.focus();
                            orderInGroupInput.setAttribute('required', 'required');
                        }
                    } else {
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                            orderInGroupInput.removeAttribute('required');
                        }
                    }
                };
            }
        } else if (mode === 'edit' && identifier) {
            editingClubId = identifier;
            clubNameField.style.display = 'block';
            clubAssignmentFields.style.display = 'block';
            unassignedClubField.style.display = 'none';

            if (unassignedClubSelect) unassignedClubSelect.disabled = true;
            if (clubCategorySelect) clubCategorySelect.disabled = false;
            if (clubGroupSelect) clubGroupSelect.disabled = false;

            try {
                const clubDocRef = doc(clubsCollectionRef, editingClubId);
                const clubDoc = await getDoc(clubDocRef);
                if (clubDoc.exists()) {
                    const clubData = clubDoc.data();
                    clubNameInput.value = clubData.name || clubData.id || '';
                    clubNameInput.focus();
                    if (allAvailableCategories.length > 0) {
                        populateCategorySelect(clubCategorySelect, clubData.categoryId);
                    } else {
                        clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
                        clubCategorySelect.disabled = true;
                    }
                    populateGroupSelectForClubModal(clubGroupSelect, clubData.groupId, allAvailableGroups, clubData.categoryId);
                    orderInGroupInput.value = (typeof clubData.orderInGroup === 'number' && clubData.orderInGroup > 0) ? clubData.orderInGroup : '';
                    if (orderInGroupInput) orderInGroupInput.removeAttribute('required');
                    if (orderInGroupInput) {
                        orderInGroupInput.disabled = !(clubData.groupId && typeof clubData.groupId === 'string' && clubData.groupId.trim() !== '');
                         if (!orderInGroupInput.disabled) {
                              orderInGroupInput.setAttribute('required', 'required');
                         }
                    }
                    if (clubCategorySelect) {
                        clubCategorySelect.onchange = () => {
                            const selectedCategoryId = clubCategorySelect.value;
                            if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                                if (clubGroupSelect) clubGroupSelect.disabled = false;
                                populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
                                if (orderInGroupInput) {
                                    orderInGroupInput.disabled = true;
                                    orderInGroupInput.value = '';
                                    orderInGroupInput.removeAttribute('required');
                                }
                            } else {
                                if (clubGroupSelect) clubGroupSelect.disabled = true;
                                clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                                if (orderInGroupInput) {
                                    orderInGroupInput.disabled = true;
                                    orderInGroupInput.value = '';
                                    orderInGroupInput.removeAttribute('required');
                                }
                            }
                        };
                    }
                    if (clubGroupSelect) {
                        clubGroupSelect.onchange = () => {
                            const selectedGroupId = clubGroupSelect.value;
                            if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                                if (orderInGroupInput) {
                                    orderInGroupInput.disabled = false;
                                    orderInGroupInput.focus();
                                    orderInGroupInput.setAttribute('required', 'required');
                                }
                            } else {
                                if (orderInGroupInput) {
                                    orderInGroupInput.disabled = true;
                                    orderInGroupInput.value = '';
                                    orderInGroupInput.removeAttribute('required');
                                }
                            }
                        };
                    }
                } else {
                    console.error("Tím s ID", editingClubId, "sa nenašiel v databáze pre úpravu.");
                    alert("Tím na úpravu sa nenašiel.");
                    closeModal(clubModal);
                    displayCreatedTeams();
                    return;
                }
            } catch (e) {
                console.error("Chyba pri načítaní údajov tímu na úpravu:", e);
                alert("Nepodarilo sa načítať údaje tímu na úpravu.");
                closeModal(clubModal);
                displayCreatedTeams();
                return;
            }
        } else if (mode === 'create') {
            clubNameField.style.display = 'block';
            clubAssignmentFields.style.display = 'block';
            unassignedClubField.style.display = 'none';

            if (unassignedClubSelect) unassignedClubSelect.disabled = true;
            if (clubCategorySelect) clubCategorySelect.disabled = false;
            if (clubGroupSelect) clubGroupSelect.disabled = true;
            if (orderInGroupInput) orderInGroupInput.disabled = true;

            if (allAvailableCategories.length > 0) {
                populateCategorySelect(clubCategorySelect, null);
            } else {
                clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
                clubCategorySelect.disabled = true;
            }
            clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';

            if (clubCategorySelect) {
                clubCategorySelect.onchange = () => {
                    const selectedCategoryId = clubCategorySelect.value;
                    if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                        if (clubGroupSelect) clubGroupSelect.disabled = false;
                        populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                            orderInGroupInput.removeAttribute('required');
                        }
                    } else {
                        if (clubGroupSelect) clubGroupSelect.disabled = true;
                        clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                            orderInGroupInput.removeAttribute('required');
                        }
                    }
                };
            }
            if (clubGroupSelect) {
                clubGroupSelect.onchange = () => {
                    const selectedGroupId = clubGroupSelect.value;
                    if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = false;
                            orderInGroupInput.focus();
                            orderInGroupInput.setAttribute('required', 'required');
                        }
                    } else {
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                            orderInGroupInput.removeAttribute('required');
                        }
                    }
                };
            }
            if (clubGroupSelect) clubGroupSelect.removeAttribute('required');
            if (orderInGroupInput) orderInGroupInput.removeAttribute('required');
            setTimeout(() => {
                if (clubNameInput) clubNameInput.focus();
            }, 0);
        } else {
            console.error(`Neplatný režim modálu klubu: "${mode}"`);
            alert("Vyskytla sa chyba pri otváraní modálu. Neplatný režim.");
            closeModal(clubModal);
            return;
        }
        setTimeout(() => {
            if (mode === 'assign' && unassignedClubSelect && !unassignedClubSelect.disabled) {
                unassignedClubSelect.focus();
            } else if (mode === 'edit' && clubNameInput) {
                clubNameInput.focus();
            } else if (mode === 'create' && clubNameInput) {
                clubNameInput.focus();
            }
        }, 100);
    } else if (mode === 'filter') {
        clubFormContent.style.display = 'none';
        clubFilterContent.style.display = 'block';
        const filterType = identifier;
        if (filterType === 'teamName') clubModalTitle.textContent = 'Filter podľa názvu tímu';
        else if (filterType === 'category') clubModalTitle.textContent = 'Filter podľa kategórie';
        else if (filterType === 'group') clubModalTitle.textContent = 'Filter podľa skupiny';
        else clubModalTitle.textContent = 'Filter';
        filterModalTitle.textContent = 'Vyberte hodnotu filtra';
        let filterOptions = [];

        if (filterType === 'teamName') {
            // Pre Názov tímu vždy zobraz všetky unikátne "očistené" názvy zo všetkých tímov
            filterOptions = getUniqueBaseTeamNames(allTeams); // Používa getCleanedTeamNameForFilter vo vnútri
        } else if (filterType === 'category') {
            filterOptions = getUniqueTeamCategories(allTeams, allAvailableCategories);
        } else if (filterType === 'group') {
             const currentCategoryFilter = currentFilters.category;

             if (currentCategoryFilter && typeof currentCategoryFilter === 'string' && currentCategoryFilter.trim() !== '') {
                 const teamsMatchingCategoryFilter = allTeams.filter(team => {
                      const teamCategoryId = team.categoryId;
                      if (currentCategoryFilter.toLowerCase() === 'neznáma kategória') {
                           return !teamCategoryId || (typeof teamCategoryId === 'string' && teamCategoryId.trim() === '');
                      } else {
                           // Aby sme porovnávali s ID kategórie uloženej v currentFilters
                           const category = allAvailableCategories.find(cat => (cat.name || cat.id).trim().toLowerCase() === currentCategoryFilter.toLowerCase());
                           const categoryIdToMatch = category ? category.id : currentCategoryFilter; // Použiť ID ak sa nájde, inak pôvodnú hodnotu

                           return teamCategoryId === categoryIdToMatch;
                       }
                  });


                 let optionsFromTeams = getUniqueTeamGroups(teamsMatchingCategoryFilter, allAvailableGroups);

                  const category = allAvailableCategories.find(cat => (cat.name || cat.id).trim().toLowerCase() === currentCategoryFilter.toLowerCase());
                  const categoryIdForGroups = category ? category.id : null;

                 let groupOptionsFromDB = [];
                 if(categoryIdForGroups) {
                      const groupsInCategory = allAvailableGroups.filter(group => group.categoryId === categoryIdForGroups);
                       groupOptionsFromDB = groupsInCategory.map(group => group.name || group.id);
                 }


                  filterOptions = [...new Set([...optionsFromTeams, ...groupOptionsFromDB])];


                  const hasUnassignedInCategory = teamsMatchingCategoryFilter.some(team =>
                       !team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')
                  );
                  if (hasUnassignedInCategory && !filterOptions.includes('Nepriradené')) {
                       filterOptions.push('Nepriradené');
                  }

                 filterOptions.sort((a, b) => a.localeCompare(b, 'sk-SK'));

             } else {
                 filterOptions = getUniqueTeamGroups(allTeams, allAvailableGroups);
             }
        }

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">-- Zobraziť všetko --</option>';
            filterOptions.forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                filterSelect.appendChild(option);
            });
            if (currentFilters[filterType] !== null && filterSelect.querySelector(`option[value="${currentFilters[filterType]}"]`)) {
                filterSelect.value = currentFilters[filterType];
            } else {
                filterSelect.value = "";
            }

            filterSelect.onchange = () => {
                const selectedValue = filterSelect.value === "" ? null : filterSelect.value;

                 if (filterType === 'category') {
                      // Pri zmene filtra kategórie uložiť ID kategórie, ak sa nájde podľa mena
                     const selectedCategory = allAvailableCategories.find(cat => (cat.name || cat.id).trim().toLowerCase() === selectedValue?.toLowerCase());
                     const categoryIdToStore = selectedCategory ? selectedCategory.id : selectedValue; // Uložiť ID alebo pôvodnú hodnotu

                     if (currentFilters.category !== categoryIdToStore) {
                          currentFilters.group = null; // Resetovať filter skupiny pri zmene kategórie
                          console.log("INFO: Filter kategórie zmenený, filter skupiny resetovaný.");
                     }
                      // Uložiť ID kategórie alebo "Neznáma kategória" alebo null
                      currentFilters.category = (selectedValue !== null && selectedValue.toLowerCase() === 'neznáma kategória')
                           ? 'Neznáma kategória' // Uložiť špeciálnu hodnotu pre neznámu kategóriu
                           : categoryIdToStore; // Uložiť ID alebo null/pôvodnú hodnotu

                 } else {
                      currentFilters[filterType] = selectedValue;
                 }

                console.log(`INFO: Filter zmenený (v modále): Typ="${filterType}", Hodnota="${selectedValue}"`);
                console.log("INFO: Aktuálne filtre:", currentFilters);

                closeModal(clubModal);
                displayCreatedTeams();
            };
            setTimeout(() => {
                filterSelect.focus();
            }, 0);
        }
    } else {
        console.error(`Neplatný režim modálu klubu: "${mode}"`);
        alert("Vyskytla sa chyba pri otváraní modálu. Neplatný režim.");
        closeModal(clubModal);
        return;
    }
    openModal(clubModal);
}

if (clubForm) {
    clubForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!['assign', 'edit', 'create'].includes(currentClubModalMode)) {
            console.warn("Formulár Klub bol odoslaný v neformulárovom režime modálu:", currentClubModalMode);
            return;
        }
        const clubName = clubNameInput.value.trim();
        const selectedCategoryIdInModal = currentClubModalMode === 'assign' && unassignedClubSelect && unassignedClubSelect.value !== '' && !unassignedClubSelect.value.startsWith('--') && unassignedClubSelect.options[unassignedClubSelect.selectedIndex] ? unassignedClubSelect.options[unassignedClubSelect.selectedIndex].dataset.categoryId : (clubCategorySelect && clubCategorySelect.value !== '' && !clubCategorySelect.value.startsWith('--') ? clubCategorySelect.value : null);
        const selectedGroupIdInModal = clubGroupSelect && clubGroupSelect.value !== '' && !clubGroupSelect.value.startsWith('--') ? clubGroupSelect.value : null;
        let orderInGroup = (orderInGroupInput && orderInGroupInput.value !== '' && selectedGroupIdInModal) ? parseInt(orderInGroupInput.value, 10) : null;
        if (typeof orderInGroup !== 'number' || orderInGroup <= 0) {
            orderInGroup = null;
        }

        let clubIdToProcess = editingClubId;
        let dataToSave = {};
        let operationType = currentClubModalMode;
        let newDocumentId; // Deklarácia newDocumentId na úrovni handlera

        try {
            if (operationType === 'create') {
                if (!clubName) {
                    alert("Zadajte názov tímu.");
                    if (clubNameInput) clubNameInput.focus();
                    return;
                }
                const selectedCategory = allAvailableCategories.find(cat => cat.id === selectedCategoryIdInModal);
                const categoryNameForId = selectedCategory ? selectedCategory.name || selectedCategory.id : (selectedCategoryIdInModal || null);

                if (categoryNameForId && typeof categoryNameForId === 'string' && categoryNameForId.trim() !== '') {
                    newDocumentId = `${categoryNameForId} - ${clubName}`;
                } else {
                    newDocumentId = clubName;
                }

                const existingDoc = await getDoc(doc(clubsCollectionRef, newDocumentId));

                if (existingDoc.exists()) {
                    alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov alebo kategóriu.`);
                    if (clubNameInput) clubNameInput.focus();
                    return;
                }
                dataToSave = {
                    name: clubName,
                    categoryId: selectedCategoryIdInModal,
                    groupId: selectedGroupIdInModal,
                    orderInGroup: orderInGroup,
                    createdFromBase: clubName // Vytvorený z tohto základu
                };
                clubIdToProcess = newDocumentId;

            } else if (operationType === 'assign') {
                if (!unassignedClubSelect || !unassignedClubSelect.value || unassignedClubSelect.value.startsWith('--')) {
                    alert("Prosím, vyberte nepriradený tím k priradeniu.");
                    return;
                }
                if (!selectedGroupIdInModal) {
                    alert("Prosím, vyberte skupinu, do ktorej chcete tím priradiť.");
                    if (clubGroupSelect) clubGroupSelect.focus();
                    return;
                }
                if (typeof orderInGroup !== 'number' || orderInGroup <= 0) {
                    alert("Zadajte platné poradie tímu v skupine (číslo väčšie ako 0).");
                    if (orderInGroupInput) orderInGroupInput.focus();
                    return;
                }
                clubIdToProcess = unassignedClubSelect.value;
                const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                if (!clubDoc.exists()) {
                    console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre priradenie.");
                    alert("Tím na priradenie sa nenašiel. Prosím, skúste znova.");
                    if (clubModal) closeModal(clubModal);
                    resetClubModal();
                    displayCreatedTeams();
                    return;
                }
                const clubData = clubDoc.data();
                dataToSave = {
                    name: clubData.name || clubData.id,
                    categoryId: clubData.categoryId || selectedCategoryIdInModal || null, // Zachovať pôvodnú kategóriu, ak existuje
                    groupId: selectedGroupIdInModal,
                    orderInGroup: orderInGroup,
                    createdFromBase: clubData.createdFromBase || clubData.name || clubData.id // Zachovať pôvodné createdFromBase
                };
                if (dataToSave.groupId === null) {
                    dataToSave.orderInGroup = null;
                }
                operationType = 'update';
            } else if (operationType === 'edit' && editingClubId) {
                if (!clubName) {
                    alert("Zadajte názov tímu.");
                    if (clubNameInput) clubNameInput.focus();
                    return;
                }
                clubIdToProcess = editingClubId;
                const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                if (!clubDoc.exists()) {
                    console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre úpravu.");
                    alert("Tím na úpravu sa nenašiel. Prosím, skúste znova.");
                    if (clubModal) closeModal(clubModal);
                    resetClubModal();
                    displayCreatedTeams();
                    return;
                }
                const clubData = clubDoc.data();
                const originalClubId = clubDoc.id;
                const newClubNameValue = clubName;
                const newSelectedCategoryId = selectedCategoryIdInModal;
                const newSelectedGroupId = selectedGroupIdInModal;
                const newOrderInGroup = (newSelectedGroupId && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null;

                const categoryForNewId = allAvailableCategories.find(cat => cat.id === newSelectedCategoryId);
                const categoryNameForNewId = categoryForNewId ? categoryForNewId.name || categoryForNewId.id : (newSelectedCategoryId || null);

                let potentialNewDocumentId;
                 // Konštruovať potenciálne nové ID dokumentu
                if (categoryNameForNewId && typeof categoryNameForNewId === 'string' && categoryNameForNewId.trim() !== '') {
                    potentialNewDocumentId = `${categoryNameForNewId} - ${newClubNameValue}`;
                } else {
                    potentialNewDocumentId = newClubNameValue;
                }

                const idChanged = potentialNewDocumentId !== originalClubId;

                if (idChanged) {
                    const existingDocWithNewId = await getDoc(doc(clubsCollectionRef, potentialNewDocumentId));
                    if (existingDocWithNewId.exists()) {
                        alert(`Tím s názvom "${potentialNewDocumentId}" (nové ID) už existuje. Prosím, zvoľte iný názov alebo kategóriu.`);
                        if (clubNameInput) clubNameInput.focus();
                        return;
                    }
                    newDocumentId = potentialNewDocumentId; // newDocumentId je definované v tomto bloku
                    operationType = 'replace';
                    clubIdToProcess = newDocumentId;
                } else {
                    operationType = 'update';
                    // clubIdToProcess si ponechá pôvodné editingClubId
                }

                dataToSave = {
                    name: newClubNameValue,
                    categoryId: newSelectedCategoryId,
                    groupId: newSelectedGroupId,
                    orderInGroup: newOrderInGroup,
                    createdFromBase: clubData.createdFromBase || clubData.name || clubData.id
                };
                if (dataToSave.groupId === null) {
                    dataToSave.orderInGroup = null;
                }

            } else {
                console.error("Neplatný režim modálu pri odosielaní formulára.");
                alert("Nastala chyba pri spracovaní formulára. Neplatný režim.");
                if (clubModal) closeModal(clubModal);
                resetClubModal();
                return;
            }

            if (!clubIdToProcess) {
                console.error("Chýba ID tímu na spracovanie po spracovaní formulára.");
                alert("Vyskytla sa chyba pri určovaní ID tímu na uloženie.");
                if (clubModal) closeModal(clubModal);
                resetClubModal();
                return;
            }

            if (operationType === 'create') {
                const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess);
                await setDoc(newClubDocRef, dataToSave);
                alert(`Tím "${clubIdToProcess}" bol úspešne vytvorený.`);
            } else if (operationType === 'assign' || operationType === 'update') {
                const clubDocRef = doc(clubsCollectionRef, clubIdToProcess);
                await updateDoc(clubDocRef, dataToSave);
                if (operationType === 'assign') {
                    alert("Tím bol úspešne priradený.");
                } else {
                    alert("Zmeny boli úspešne uložené.");
                }
            } else if (operationType === 'replace') {
                if (!editingClubId) {
                    console.error("Chýba pôvodné ID tímu pre operáciu replace.");
                    alert("Vyskytla sa chyba pri premenovaní/presune tímu.");
                    if (clubModal) closeModal(clubModal);
                    resetClubModal();
                    return;
                }
                const originalClubDocRef = doc(clubsCollectionRef, editingClubId);
                const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess);
                const batch = writeBatch(db);
                batch.delete(originalClubDocRef);
                batch.set(newClubDocRef, dataToSave);
                await batch.commit();

                alert(`Tím bol úspešne premenovaný/presunutý na "${clubIdToProcess}".`);
                editingClubId = clubIdToProcess;
            } else {
                console.error("Neznámy typ operácie po spracovaní dát:", operationType);
                alert("Vyskytla sa chyba pri ukladaní dát. Neznámy typ operácie.");
                if (clubModal) closeModal(clubModal);
                resetClubModal();
                return;
            }

            if (clubModal) closeModal(clubModal);
            resetClubModal();
            displayCreatedTeams();

        } catch (error) {
            console.error('Chyba pri ukladaní dát tímu: ', error);
            alert(`Chyba pri ukladaní dát! Prosím, skúste znova. Detail: ${error.message}`);
            if (clubModal) closeModal(clubModal);
            resetClubModal();
            displayCreatedTeams();
        }
    });
} else {
    console.error("Club form not found!");
}

async function displayCreatedTeams() {
    if (!createdTeamsTableBody || !createdTeamsTableHeader) {
        console.error("Tabuľka pre vytvorené tímy (tbody alebo thead) nenájdene v HTML!");
        return;
    }
    createdTeamsTableBody.innerHTML = '';

    createdTeamsTableHeader.innerHTML = `
        <th data-filter-type="teamName">Názov tímu</th>
        <th data-filter-type="category">Kategória</th>
        <th data-filter-type="group">Skupina</th>
        <th data-sort-type="orderInGroup">Poradie v skupine</th>
        <th>Akcie</th>
        <th><button id="clearFiltersButton" class="action-button">Vymazať filtre</button></th>
    `;

    const headerCells = createdTeamsTableHeader.querySelectorAll('th');

    addHeaderFilterListeners();

    const clearFiltersButtonElement = document.getElementById('clearFiltersButton');
    if (clearFiltersButtonElement) {
         const oldListener = clearFiltersButtonElement._clickListener;
         if(oldListener) {
              clearFiltersButtonElement.removeEventListener('click', oldListener);
         }
         const newListener = () => {
             console.log("INFO: Kliknuté na tlačidlo 'Vymazať filtre'.");
             currentFilters = {
                 teamName: null,
                 category: null,
                 group: null
             };
             currentSort = {
                 column: null,
                 direction: 'asc'
             };
             console.log("INFO: Filtre a zoraďovanie resetované.", {currentFilters, currentSort});
             displayCreatedTeams();
         };
         clearFiltersButtonElement.addEventListener('click', newListener);
         clearFiltersButtonElement._clickListener = newListener;
         console.log("INFO: Listener na tlačidlo 'Vymazať filtre' pridaný/aktualizovaný.");
    } else {
        console.error("Clear Filters button not found after header update!");
    }


    try {
        const querySnapshot = await getDocs(clubsCollectionRef);
        allTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (allAvailableCategories.length === 0) {
            await loadAllCategoriesForDynamicSelects();
        }
        if (allAvailableGroups.length === 0) {
            await loadAllGroups();
        }
        if (allTeams.length === 0) {
            createdTeamsTableBody.innerHTML = '<tr><td colspan="6">Zatiaľ nie sú vytvorené žiadne tímy.</td></tr>';
            teamsToDisplay = [];
            displayAppliedFiltersInHeader();
            return;
        }

        allTeams.sort((a, b) => {
            const nameA = (a.name || a.id || '').trim().toLowerCase();
            const nameB = (b.name || b.id || '').trim().toLowerCase();
            return nameA.localeCompare(nameB, 'sk-SK');
        });

        let filteredTeams = allTeams;
        Object.keys(currentFilters).forEach(filterType => {
            const filterValue = currentFilters[filterType]; // FilterValue je "čistý" názov pre teamName
            if (filterValue !== null) {
                const filterValueLowerTrimmed = typeof filterValue === 'string' ? filterValue.trim().toLowerCase() : filterValue;
                filteredTeams = filteredTeams.filter(team => {
                    const teamCategoryId = team.categoryId;
                    const teamGroupId = team.groupId;

                    if (filterType === 'teamName') {
                        // Pre teamName filter porovnať čistý názov tímu s uloženou hodnotou filtra
                        const teamBaseName = team.createdFromBase || parseTeamName(team.id).baseName || '';
                        const cleanedTeamName = getCleanedTeamNameForFilter(teamBaseName); // Získať čistý názov tímu
                        return cleanedTeamName.toLowerCase() === filterValueLowerTrimmed; // Porovnať s čistou hodnotou filtra
                    } else if (filterType === 'category') {
                        let teamCategoryNameLowerTrimmed = null;
                        if (teamCategoryId) {
                            const category = allAvailableCategories.find(cat => cat.id === teamCategoryId);
                            teamCategoryNameLowerTrimmed = (category ? category.name || category.id : teamCategoryId || '').trim().toLowerCase();
                        }
                        if (filterValueLowerTrimmed === 'neznáma kategória') {
                            return !teamCategoryId || (typeof teamCategoryId === 'string' && teamCategoryId.trim() === '');
                        } else {
                            const category = allAvailableCategories.find(cat => (cat.name || cat.id).trim().toLowerCase() === filterValueLowerTrimmed);
                            const categoryIdToMatch = category ? category.id : filterValue; // Použiť ID ak sa nájde, inak pôvodnú hodnotu

                             return teamCategoryId === categoryIdToMatch;
                        }
                    } else if (filterType === 'group') {
                        if (filterValueLowerTrimmed === 'nepriradené') {
                            return !teamGroupId || (typeof teamGroupId === 'string' && teamGroupId.trim() === '');
                        } else {
                            let teamGroupNameLowerTrimmed = null;
                            if (teamGroupId) {
                                const group = allAvailableGroups.find(g => g.id === teamGroupId);
                                if (group) {
                                    teamGroupNameLowerTrimmed = (group.name || group.id || '').trim().toLowerCase();
                                } else {
                                    teamGroupNameLowerTrimmed = (teamGroupId || '').trim().toLowerCase();
                                }
                            }
                            return teamGroupNameLowerTrimmed === filterValueLowerTrimmed;
                        }
                    }
                    return false; // Malo by byť pokryté všetkými filterTypes, ale pre istotu
                });
            }
        });
        teamsToDisplay = filteredTeams;
        if (currentSort.column === 'orderInGroup') {
            teamsToDisplay.sort((a, b) => {
                const orderA = a.orderInGroup;
                const orderB = b.orderInGroup;
                const isANumber = typeof orderA === 'number' && orderA > 0;
                const isBNumber = typeof orderB === 'number' && orderB > 0;
                if (!isANumber && !isBNumber) return 0;
                if (!isANumber) return 1;
                if (!isBNumber) return -1;
                if (currentSort.direction === 'asc') {
                    return orderA - orderB;
                } else {
                    return orderB - orderA;
                }
            });
        }
        if (teamsToDisplay.length === 0) {
            createdTeamsTableBody.innerHTML = '<tr><td colspan="6">Žiadne tímy zodpovedajúce filtru.</td></tr>';
            displayAppliedFiltersInHeader();
            return;
        }

        const headerCellsForSortingIndicator = createdTeamsTableHeader.querySelectorAll('th');
        headerCellsForSortingIndicator.forEach(cell => {
            cell.classList.remove('sort-asc', 'sort-desc');
        });
        if (currentSort.column) {
            const sortHeader = createdTeamsTableHeader.querySelector(`th[data-sort-type="${currentSort.column}"]`);
            if (sortHeader) {
                sortHeader.classList.add(`sort-${currentSort.direction}`);
            }
        }

        teamsToDisplay.forEach(team => {
            const row = createdTeamsTableBody.insertRow();
            row.dataset.teamId = team.id;
            const teamNameCell = row.insertCell();
            teamNameCell.textContent = team.name || 'Neznámy názov';
            const categoryCell = row.insertCell();
            const category = allAvailableCategories.find(cat => cat.id === team.categoryId);
            categoryCell.textContent = category ? category.name : (team.categoryId || 'Neznáma kategória');
            const groupCell = row.insertCell();
            let displayedGroupName = 'Nepriradené';
            if (team.groupId && typeof team.groupId === 'string' && team.groupId.trim() !== '') {
                const group = allAvailableGroups.find(g => g.id === team.groupId);
                if (group) {
                    displayedGroupName = group.name || group.id;
                } else {
                    displayedGroupName = team.groupId;
                }
            } else if (team.groupId) {
                displayedGroupName = 'Neznáma skupina (neplatný formát ID)';
            }
            groupCell.textContent = displayedGroupName;
            const orderCell = row.insertCell();
            orderCell.textContent = (team.groupId && typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-';
            orderCell.style.textAlign = 'center';
            const actionsCell = row.insertCell();
            actionsCell.classList.add('actions-cell');
            actionsCell.style.textAlign = 'center';
            actionsCell.style.display = 'flex';
            actionsCell.style.justifyContent = 'center';
            actionsCell.style.alignItems = 'center';
            actionsCell.style.gap = '5px';
            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť / Priradiť';
            editButton.classList.add('action-button');
            editButton.onclick = () => {
                if (typeof openClubModal === 'function') {
                    openClubModal(team.id, 'edit');
                } else {
                    console.error("Funkcia openClubModal nie je dostupná. Skontrolujte importy.");
                    alert("Funkcia na úpravu tímu nie je dostupná.");
                }
            };
            actionsCell.appendChild(editButton);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Vymazať';
            deleteButton.classList.add('action-button', 'delete-button');
            deleteButton.onclick = async () => {
                if (confirm(`Naozaj chcete vymazať tím "${team.id}"? Táto akcia je nezvratná!`)) {
                    await deleteTeam(team.id);
                }
            };
            actionsCell.appendChild(deleteButton);
        });

         const clearFiltersCell = createdTeamsTableBody.querySelector('td:last-child');
         if (clearFiltersCell) {
              clearFiltersCell.colSpan = 1;
         }
          const noTeamsRow = createdTeamsTableBody.querySelector('tr td[colspan="6"]');
          if (noTeamsRow) {
              noTeamsRow.colSpan = 6;
          }

         displayAppliedFiltersInHeader();


    } catch (e) {
        console.error("Chyba pri zobrazovaní tímov: ", e);

        createdTeamsTableBody.innerHTML = '<tr><td colspan="6">Nepodarilo sa načítať tímy.</td></tr>';
        allTeams = [];
        teamsToDisplay = [];
        displayAppliedFiltersInHeader();
    }
}

function displayAppliedFiltersInHeader() {
     console.log("INFO: Zobrazujem aplikované filtre v hlavičke.");
     const headerCells = createdTeamsTableHeader.querySelectorAll('th');

     headerCells.forEach(headerCell => {
         const filterType = headerCell.dataset.filterType;
         const existingFilterDisplay = headerCell.querySelector('.applied-filter-value');
         if (existingFilterDisplay) {
             existingFilterDisplay.remove();
         }

         if (filterType && currentFilters[filterType] !== null) {
             const filterValue = currentFilters[filterType]; // Uložená hodnota filtra (čistý názov pre teamName)

             const filterValueSpan = document.createElement('span');
             filterValueSpan.classList.add('applied-filter-value');

              // Pre filter typu 'teamName' zobrazujeme čistú hodnotu filtra
              // Pre kategóriu a skupinu zobrazujeme uloženú hodnotu (môže byť ID alebo názov)
              let displayedFilterValue = filterValue;
              if (filterType === 'category') {
                   // Zobraziť názov kategórie, ak je uložené ID
                   const category = allAvailableCategories.find(cat => cat.id === filterValue);
                   displayedFilterValue = category ? category.name : filterValue; // Ak sa ID nájde, zobraz názov, inak ID/pôvodnú hodnotu
                    if (filterValue.toLowerCase() === 'neznáma kategória') {
                       displayedFilterValue = 'Neznáma kategória';
                    }
              } else if (filterType === 'group') {
                  // Zobraziť názov skupiny, ak je uložené ID
                   const group = allAvailableGroups.find(g => g.id === filterValue);
                   displayedFilterValue = group ? group.name : filterValue; // Ak sa ID nájde, zobraz názov, inak ID/pôvodnú hodnotu
                   if (filterValue.toLowerCase() === 'nepriradené') {
                       displayedFilterValue = 'Nepriradené';
                   }
              }


             filterValueSpan.textContent = `(Filter: ${displayedFilterValue})`;

             headerCell.appendChild(filterValueSpan);
             console.log(`INFO: Zobrazený filter "${filterType}" s hodnotou "${displayedFilterValue}" v hlavičke.`);
         }
     });
}


function addHeaderFilterListeners() {
    if (!createdTeamsTableHeader) {
        console.error("Header element pre pridanie poslucháčov nenájdene!");
        return;
    }
    const headerCells = createdTeamsTableHeader.querySelectorAll('th');
    headerCells.forEach(headerCell => {
        const filterType = headerCell.dataset.filterType;
        const sortType = headerCell.dataset.sortType;
        headerCell.removeEventListener('click', handleHeaderClick);
        if (filterType || sortType === 'orderInGroup') {
            headerCell.style.cursor = 'pointer';
            headerCell.addEventListener('click', handleHeaderClick);
        } else {
             headerCell.style.cursor = 'default';
        }
    });
}

function handleHeaderClick() {
    const filterType = this.dataset.filterType;
    const sortType = this.dataset.sortType;
    if (filterType) {
        openClubModal(filterType, 'filter');
    } else if (sortType === 'orderInGroup') {
        if (currentSort.column === sortType) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = sortType;
            currentSort.direction = 'asc';
        }
        displayCreatedTeams();
    }
}

async function deleteTeam(teamId) {
    try {
        const teamDocRef = doc(clubsCollectionRef, teamId);
        await deleteDoc(teamDocRef);
        displayCreatedTeams();
        if (clubModal && clubModal.style.display !== 'none') {
            if (currentClubModalMode === 'assign') {
                populateUnassignedClubsSelect();
            }
            if (editingClubId === teamId) {
                closeModal(clubModal);
                resetClubModal();
            }
        }
    } catch (e) {
        console.error(`Chyba pri mazaní tímu s ID ${teamId}:`, e);
        alert("Nepodarilo sa vymazať tím. Prosím, skúste znova.");
    }
}

const handleAddButtonClick = () => {
     console.log("INFO: Kliknuté na tlačidlo '+', spúšťam handler...");
     console.log("INFO: Volám openClubModal(null, 'create').");
     openClubModal(null, 'create');
     console.log("INFO: Volanie openClubModal dokončené.");
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zoznam tímov.");

    await loadAllCategoriesForDynamicSelects();
    await loadAllGroups();

    await displayCreatedTeams();

    // Listenery sú teraz pridané/aktualizované V displayCreatedTeams()
    // addHeaderFilterListeners();

    const addButtonElement = document.getElementById('addButton');
    if (addButtonElement) {
        addButtonElement.style.display = 'block';
        addButtonElement.title = "Vytvoriť nový tím";
        addButtonElement.removeEventListener('click', handleAddButtonClick);
        addButtonElement.addEventListener('click', handleAddButtonClick);
        console.log("INFO: Listener na tlačidlo '+' pridaný.");
    } else {
        console.error("Add button not found on teams list page! ID 'addButton' nebolo nájdené.");
    }


    if (clubModalClose) {
        clubModalClose.addEventListener('click', () => {
            console.log("INFO: Kliknuté na X modálu klubu. Zatváram a resetujem modál.");
            closeModal(clubModal);
            resetClubModal();
            displayCreatedTeams();
        });
    }

    if (clubModal) {
        window.addEventListener('click', (event) => {
            const modalContent = clubModal.querySelector('.modal-content');
            if (event.target === clubModal && modalContent && !modalContent.contains(event.target)) {
                console.log("INFO: Kliknuté mimo obsahu modálu klubu. Zatváram a resetujem modál.");
                closeModal(clubModal);
                resetClubModal();
                 displayCreatedTeams();
            }
        });
    }
});

export { openClubModal, displayCreatedTeams };
