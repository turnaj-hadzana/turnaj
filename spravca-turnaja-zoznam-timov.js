import {db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, openModal, closeModal, populateCategorySelect, doc, getDocs, query, where, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, showMessage, showConfirmation} from './spravca-turnaja-common.js';

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
    teamName: null,
    category: null,
    group: null
};
let currentSort = {
    column: null,
    direction: 'asc'
};

/**
 * Parsuje plný názov tímu a extrahuje prefix kategórie a základný názov.
 * @param {string} fullTeamName - Plný názov tímu.
 * @returns {{categoryPrefix: string|null, baseName: string}} Objekt s prefixom kategórie a základným názvom.
 */
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

/**
 * Vyčistí názov tímu pre účely filtrovania (odstráni suffixy ako A, B, C).
 * @param {string} teamName - Názov tímu.
 * @returns {string} Vyčistený názov tímu.
 */
function getCleanedTeamNameForFilter(teamName) {
    if (!teamName || typeof teamName !== 'string') {
        return '';
    }
    let cleanedName = teamName.trim();
    const suffixRegex = /\s[ABC]$/i;
    if (suffixRegex.test(cleanedName)) {
        cleanedName = cleanedName.slice(0, -2);
    }
    return cleanedName;
}

/**
 * Získa unikátne základné názvy tímov pre filter.
 * @param {Array<object>} teams - Pole objektov tímov.
 * @returns {Array<string>} Pole unikátnych základných názvov tímov.
 */
function getUniqueBaseTeamNames(teams) {
    const baseNames = teams.map(team => {
        const rawBaseName = team.createdFromBase || parseTeamName(team.id).baseName || '';
        return getCleanedTeamNameForFilter(rawBaseName);
    }).filter(name => name !== '');
    return [...new Set(baseNames)].sort((a, b) => a.localeCompare(b, 'sk-SK'));
}

/**
 * Získa unikátne názvy kategórií tímov pre filter.
 * @param {Array<object>} teams - Pole objektov tímov.
 * @param {Array<object>} categories - Pole objektov kategórií.
 * @returns {Array<object>} Pole objektov {id, name} unikátnych kategórií.
 */
function getUniqueTeamCategories(teams, categories) {
    const categoryMap = new Map(); // Použijeme Map pre unikátne ID
    teams.forEach(team => {
        if (team.categoryId === null || typeof team.categoryId === 'undefined' || (typeof team.categoryId === 'string' && team.categoryId.trim() === '')) {
            categoryMap.set(null, 'Neznáma kategória'); // Použijeme null ako ID pre neznámu kategóriu
        } else {
            const category = categories.find(cat => cat.id === team.categoryId);
            if (category) {
                categoryMap.set(category.id, category.name);
            } else {
                categoryMap.set(null, 'Neznáma kategória'); // Ak sa ID kategórie nenašlo medzi dostupnými
            }
        }
    });
    const result = Array.from(categoryMap, ([id, name]) => ({ id, name }));
    return result.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
}

/**
 * Získa unikátne názvy skupín tímov pre filter.
 * @param {Array<object>} teams - Pole objektov tímov.
 * @param {Array<object>} groups - Pole objektov skupín.
 * @returns {Array<object>} Pole objektov {id, name} unikátnych skupín.
 */
function getUniqueTeamGroups(teams, groups) {
    const groupMap = new Map(); // Použijeme Map pre unikátne ID
    teams.forEach(team => {
        if (team.groupId === null || typeof team.groupId === 'undefined' || (typeof team.groupId === 'string' && team.groupId.trim() === '')) {
            groupMap.set(null, 'Nepriradené'); // Použijeme null ako ID pre nepriradené skupiny
        } else {
            const group = groups.find(g => g.id === team.groupId);
            if (group) {
                groupMap.set(group.id, group.name);
            } else {
                // Ak sa ID skupiny nenašlo, pokúsime sa parsovať názov z ID, ak je v tvare "kategoria - nazov"
                const parts = team.groupId.split(' - ');
                if (parts.length > 1) {
                    const parsedGroupName = parts.slice(1).join(' - ').trim();
                    if (parsedGroupName !== '') {
                        groupMap.set(team.groupId, parsedGroupName); // Použijeme pôvodné ID, ale parsovaný názov
                    } else {
                        groupMap.set(team.groupId, team.groupId);
                    }
                } else {
                    groupMap.set(team.groupId, team.groupId);
                }
            }
        }
    });
    const result = Array.from(groupMap, ([id, name]) => ({ id, name }));
    return result.filter(obj => obj.name && obj.name.trim() !== '' || obj.id === null)
        .sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
}

/**
 * Načíta všetky kategórie z Firestore a uloží ich do allAvailableCategories.
 */
async function loadAllCategoriesForDynamicSelects() {
    allAvailableCategories = [];
    try {
        const querySnapshot = await getDocs(categoriesCollectionRef);
        querySnapshot.forEach((doc) => {
            const categoryData = doc.data();
            if (categoryData && typeof categoryData.name === 'string' && categoryData.name.trim() !== '') {
                allAvailableCategories.push({ id: doc.id, name: categoryData.name.trim() });
            } else {
                // Ak názov chýba, použijeme ID ako názov
                allAvailableCategories.push({ id: doc.id, name: doc.id });
            }
        });
        allAvailableCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
    } catch (e) {
        await showMessage('Chyba', "Nepodarilo sa načítať kategórie.");
        allAvailableCategories = [];
    }
}

/**
 * Načíta všetky skupiny z Firestore a uloží ich do allAvailableGroups.
 */
async function loadAllGroups() {
    allAvailableGroups = [];
    try {
        const querySnapshot = await getDocs(groupsCollectionRef);
        querySnapshot.forEach((doc) => {
            const groupData = doc.data();
            if (groupData && typeof groupData.name === 'string' && groupData.name.trim() !== '') {
                allAvailableGroups.push({ id: doc.id, name: groupData.name.trim(), categoryId: groupData.categoryId });
            } else {
                // Ak názov chýba, použijeme ID ako názov
                allAvailableGroups.push({ id: doc.id, name: doc.id, categoryId: groupData.categoryId });
            }
        });
        allAvailableGroups.sort((a, b) => {
            const nameA = (a.name || a.id) || '';
            const nameB = (b.name || b.id) || '';
            return nameA.localeCompare(nameB, 'sk-SK');
        });
    } catch (e) {
        await showMessage('Chyba', "Nepodarilo sa načítať skupiny.");
        allAvailableGroups = [];
        if (clubGroupSelect) {
            clubGroupSelect.innerHTML = '<option value="">-- Chyba pri načítaní skupín --</option>';
            clubGroupSelect.disabled = true;
        }
    }
}

/**
 * Naplní select element skupinami, voliteľne filtrovanými podľa kategórie.
 * @param {HTMLSelectElement} selectElement - Select element, ktorý sa má naplniť.
 * @param {string} selectedId - ID aktuálne vybranej skupiny.
 * @param {Array<object>} availableGroups - Pole všetkých dostupných skupín.
 * @param {string|null} categoryId - ID kategórie, podľa ktorej sa majú skupiny filtrovať.
 */
function populateGroupSelectForClubModal(selectElement, selectedId = '', availableGroups, categoryId = null) {
    if (!selectElement) {
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
        const categoryName = category ? category.name : categoryId; // Používame názov kategórie
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
            const displayedGroupName = group.name || group.id; // Zobrazujeme name, ak existuje
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

/**
 * Naplní select element nepriradenými klubmi.
 */
async function populateUnassignedClubsSelect() {
    if (!unassignedClubSelect) {
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
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "-- Chyba pri načítaní --";
        option.disabled = true;
        unassignedClubSelect.appendChild(option);
        unassignedClubSelect.disabled = true;
    }
}

/**
 * Resetuje stav modálneho okna klubu.
 */
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
        clubGroupSelect.disabled = true; // Vždy disabled na začiatku
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

/**
 * Otvorí modálne okno klubu v rôznych režimoch (priradenie, úprava, vytvorenie, filter).
 * @param {string|null} identifier - ID tímu (pre edit) alebo typ filtra (pre filter).
 * @param {string} mode - Režim modálneho okna ('assign', 'edit', 'create', 'filter').
 */
async function openClubModal(identifier = null, mode = 'assign') {
    if (!clubModal || !clubModalTitle || !clubFormContent || !clubFilterContent || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect || !filterModalTitle || !filterSelect) {
        await showMessage('Chyba', "Nastala chyba pri otváraní modálu. Niektoré elementy používateľského rozhrania chýbajú.");
        return;
    }
    resetClubModal();
    if (unassignedClubSelect) unassignedClubSelect.onchange = null;
    if (clubCategorySelect) clubCategorySelect.onchange = null;
    if (clubGroupSelect) clubGroupSelect.onchange = null;
    if (filterSelect) filterSelect.onchange = null;

    editingClubId = (mode === 'edit') ? identifier : null;
    currentClubModalMode = mode;

    // Načítanie kategórií a skupín, ak ešte nie sú načítané
    if (allAvailableCategories.length === 0) {
        await loadAllCategoriesForDynamicSelects();
    }
    if (allAvailableGroups.length === 0) {
        await loadAllGroups();
    }

    // Pridanie listenera pre automatickú zmenu '/' na '⁄'
    if (clubNameInput) {
        clubNameInput.removeEventListener('input', handleClubNameInput); // Odstrániť starý listener pre istotu
        clubNameInput.addEventListener('input', handleClubNameInput);
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
            clubModalTitle.textContent = 'Upraviť tím';
             if (clubForm) {
                 const submitButton = clubForm.querySelector('button[type="submit"]')
                 if (submitButton) submitButton.textContent = 'Uložiť zmeny';
             }
        }

        if (mode === 'assign') {
            clubNameField.style.display = 'none';
            clubAssignmentFields.style.display = 'block';
            unassignedClubField.style.display = 'block';

            if (clubCategorySelect) clubCategorySelect.disabled = true;
            if (clubGroupSelect) clubGroupSelect.disabled = true; // Vždy disabled na začiatku
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
                        if (clubGroupSelect) clubGroupSelect.disabled = false; // Enable group select
                        populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, categoryId);
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                            orderInGroupInput.removeAttribute('required');
                        }
                    } else {
                        clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
                        if (clubCategorySelect) clubCategorySelect.disabled = true;
                        if (clubGroupSelect) clubGroupSelect.disabled = true; // Disable group select
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
            if (clubGroupSelect) clubGroupSelect.disabled = true; // Disabled by default for edit mode too
            
            try {
                const clubDocRef = doc(clubsCollectionRef, editingClubId);
                const clubDoc = await getDoc(clubDocRef);
                if (clubDoc.exists()) {
                    const clubData = clubDoc.data();
                    clubNameInput.value = clubData.name || ''; // Zobrazujeme name
                    clubNameInput.focus();

                    // Naplníme kategóriu
                    if (allAvailableCategories.length > 0) {
                        populateCategorySelect(clubCategorySelect, clubData.categoryId);
                    } else {
                        clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
                        clubCategorySelect.disabled = true;
                    }

                    // Ak je vybratá kategória, povolíme a naplníme skupinu
                    if (clubData.categoryId && clubData.categoryId !== '' && !clubData.categoryId.startsWith('--')) {
                        if (clubGroupSelect) clubGroupSelect.disabled = false; // Enable group select if category is valid
                        populateGroupSelectForClubModal(clubGroupSelect, clubData.groupId, allAvailableGroups, clubData.categoryId);
                    } else {
                        if (clubGroupSelect) clubGroupSelect.disabled = true; // Keep disabled if no category
                        clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    }

                    orderInGroupInput.value = (typeof clubData.orderInGroup === 'number' && clubData.orderInGroup > 0) ? clubData.orderInGroup : '';
                    if (orderInGroupInput) orderInGroupInput.removeAttribute('required');
                    if (orderInGroupInput) {
                        orderInGroupInput.disabled = !(clubData.groupId && typeof clubData.groupId === 'string' && clubData.groupId.trim() !== '');
                         if (!orderInGroupInput.disabled) {
                              orderInGroupInput.setAttribute('required', 'required');
                         }
                    }

                    // Listenery pre zmenu kategórie a skupiny
                    if (clubCategorySelect) {
                        clubCategorySelect.onchange = () => {
                            const selectedCategoryId = clubCategorySelect.value;
                            if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                                if (clubGroupSelect) clubGroupSelect.disabled = false; // Enables
                                populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
                                if (orderInGroupInput) {
                                    orderInGroupInput.disabled = true;
                                    orderInGroupInput.value = '';
                                    orderInGroupInput.removeAttribute('required');
                                }
                            } else {
                                if (clubGroupSelect) clubGroupSelect.disabled = true; // Disables
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
                    await showMessage('Chyba', "Tím na úpravu sa nenašiel.");
                    closeModal(clubModal);
                    displayCreatedTeams();
                    return;
                }
            } catch (e) {
                console.error("Chyba pri načítaní údajov tímu na úpravu:", e);
                await showMessage('Chyba', "Nepodarilo sa načítať údaje tímu na úpravu.");
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
            if (clubGroupSelect) clubGroupSelect.disabled = true; // Always disabled on start
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
                        if (clubGroupSelect) clubGroupSelect.disabled = false; // Enables
                        populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                            orderInGroupInput.removeAttribute('required');
                        }
                    } else {
                        if (clubGroupSelect) clubGroupSelect.disabled = true; // Disables
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
            await showMessage('Chyba', "Vyskytla sa chyba pri otváraní modálu. Neplatný režim.");
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
            filterOptions = getUniqueBaseTeamNames(allTeams);
        } else if (filterType === 'category') {
            filterOptions = getUniqueTeamCategories(allTeams, allAvailableCategories);
        } else if (filterType === 'group') {
             const currentCategoryFilter = currentFilters.category;
             if (currentCategoryFilter !== null) {
                 const teamsMatchingCategoryFilter = allTeams.filter(team => {
                      const teamCategoryId = team.categoryId;
                      if (currentCategoryFilter === null) { // Check for null ID (Neznáma kategória)
                           return !teamCategoryId || (typeof teamCategoryId === 'string' && teamCategoryId.trim() === '');
                      } else {
                           return teamCategoryId === currentCategoryFilter; // Compare IDs
                       }
                  });
                 let optionsFromTeams = getUniqueTeamGroups(teamsMatchingCategoryFilter, allAvailableGroups);
                 const categoryIdForGroups = currentCategoryFilter; // Already the ID
                 let groupOptionsFromDB = [];
                 if(categoryIdForGroups) {
                      const groupsInCategory = allAvailableGroups.filter(group => group.categoryId === categoryIdForGroups);
                       groupOptionsFromDB = groupsInCategory.map(group => ({id: group.id, name: group.name || group.id}));
                 }
                  // Combine and deduplicate by ID, then sort by name
                  const combinedGroupOptionsMap = new Map();
                  [...optionsFromTeams, ...groupOptionsFromDB].forEach(item => {
                      combinedGroupOptionsMap.set(item.id, item);
                  });
                  filterOptions = Array.from(combinedGroupOptionsMap.values());
                  filterOptions.sort((a,b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

                  const hasUnassignedInCategory = teamsMatchingCategoryFilter.some(team =>
                       !team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')
                  );
                  if (hasUnassignedInCategory && !filterOptions.some(opt => opt.id === null)) {
                       filterOptions.push({id: null, name: 'Nepriradené'});
                  }
                 filterOptions.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
             } else {
                 filterOptions = getUniqueTeamGroups(allTeams, allAvailableGroups);
             }
        }

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">-- Zobraziť všetko --</option>';
            filterOptions.forEach(optionObject => { // Iterate over objects {id, name}
                const option = document.createElement('option');
                option.value = optionObject.id === null ? '' : optionObject.id; // Use ID for value, empty string for null
                option.textContent = optionObject.name;
                filterSelect.appendChild(option);
            });

            // Nastavenie vybranej hodnoty filtra
            let selectedFilterValueForDisplay = currentFilters[filterType]; // This is the ID (or null)
            let selectedOptionValue = ''; // The value to set on the select element

            if (filterType === 'teamName') {
                selectedOptionValue = selectedFilterValueForDisplay || '';
            } else if (filterType === 'category') {
                if (selectedFilterValueForDisplay === null) {
                    selectedOptionValue = ''; // For "Neznáma kategória"
                } else {
                    selectedOptionValue = selectedFilterValueForDisplay; // This is the ID
                }
            } else if (filterType === 'group') {
                if (selectedFilterValueForDisplay === null) {
                    selectedOptionValue = ''; // For "Nepriradené"
                } else {
                    selectedOptionValue = selectedFilterValueForDisplay; // This is the ID
                }
            }
            
            if (filterSelect.querySelector(`option[value="${selectedOptionValue}"]`)) {
                filterSelect.value = selectedOptionValue;
            } else {
                filterSelect.value = "";
            }

            filterSelect.onchange = () => {
                const selectedValue = filterSelect.value; // This is the ID (or empty string for "Zobraziť všetko" / null)
                let valueToStore = null;

                if (selectedValue === '') {
                    valueToStore = null; // Represents "Zobraziť všetko" or "Neznáma kategória" / "Nepriradené"
                } else {
                    valueToStore = selectedValue; // This is the ID
                }

                if (filterType === 'category') {
                     if (currentFilters.category !== valueToStore) {
                          currentFilters.group = null; // Resetujeme filter skupiny, ak sa zmení kategória
                     }
                     currentFilters.category = valueToStore;
                } else if (filterType === 'group') {
                     currentFilters.group = valueToStore;
                } else {
                      currentFilters[filterType] = valueToStore;
                }
                closeModal(clubModal);
                displayCreatedTeams();
            };
            setTimeout(() => {
                filterSelect.focus();
            }, 0);
        }
    } else {
        await showMessage('Chyba', "Vyskytla sa chyba pri otváraní modálu. Neplatný režim.");
        closeModal(clubModal);
        return;
    }
    openModal(clubModal);
}

/**
 * Handler pre input event na clubNameInput. Nahradí '/' znakom '⁄'.
 * @param {Event} event - Objekt udalosti.
 */
function handleClubNameInput(event) {
    const input = event.target;
    if (input.value.includes('/')) {
        input.value = input.value.replace(/\//g, '⁄');
    }
}

if (clubForm) {
    clubForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!['assign', 'edit', 'create'].includes(currentClubModalMode)) {
            return;
        }

        const clubName = clubNameInput.value.trim();
        // Získame ID kategórie z vybranej hodnoty (value) selectu
        const selectedCategoryIdInModal = currentClubModalMode === 'assign' && unassignedClubSelect && unassignedClubSelect.value !== '' && !unassignedClubSelect.value.startsWith('--') && unassignedClubSelect.options[unassignedClubSelect.selectedIndex] ? unassignedClubSelect.options[unassignedClubSelect.selectedIndex].dataset.categoryId : (clubCategorySelect && clubCategorySelect.value !== '' && !clubCategorySelect.value.startsWith('--') ? clubCategorySelect.value : null);
        // Získame ID skupiny z vybranej hodnoty (value) selectu
        const selectedGroupIdInModal = clubGroupSelect && clubGroupSelect.value !== '' && !clubGroupSelect.value.startsWith('--') ? clubGroupSelect.value : null;

        let orderInGroup = (orderInGroupInput && orderInGroupInput.value !== '' && selectedGroupIdInModal) ? parseInt(orderInGroupInput.value, 10) : null;
        if (typeof orderInGroup !== 'number' || orderInGroup <= 0) {
            orderInGroup = null;
        }

        let clubIdToProcess = editingClubId;
        let dataToSave = {};
        let operationType = currentClubModalMode;
        let newDocumentId;

        try {
            if (operationType === 'create') {
                if (!clubName) {
                    await showMessage('Chyba', "Zadajte názov tímu.");
                    if (clubNameInput) clubNameInput.focus();
                    return;
                }

                // Skontrolujeme unikátnosť názvu tímu v rámci kategórie
                const qExistingName = query(clubsCollectionRef, where('name', '==', clubName), where('categoryId', '==', selectedCategoryIdInModal));
                const existingNameSnapshot = await getDocs(qExistingName);
                if (!existingNameSnapshot.empty) {
                    const category = allAvailableCategories.find(cat => cat.id === selectedCategoryIdInModal);
                    const categoryDisplayName = category ? category.name : selectedCategoryIdInModal;
                    await showMessage('Upozornenie', `Tím s názvom "${clubName}" už v kategórii "${categoryDisplayName}" existuje. Prosím, zvoľte iný názov.`);
                    if (clubNameInput) clubNameInput.focus();
                    return;
                }

                // Generujeme náhodné ID pre nový dokument
                const newClubDocRef = doc(clubsCollectionRef);
                clubIdToProcess = newClubDocRef.id; // Získame vygenerované ID

                dataToSave = {
                    name: clubName,
                    categoryId: selectedCategoryIdInModal,
                    groupId: selectedGroupIdInModal,
                    orderInGroup: orderInGroup,
                    createdFromBase: clubName // Uložíme pôvodný názov pre filter
                };
            } else if (operationType === 'assign') {
                if (!unassignedClubSelect || !unassignedClubSelect.value || unassignedClubSelect.value.startsWith('--')) {
                    await showMessage('Chyba', "Prosím, vyberte nepriradený tím k priradeniu.");
                    return;
                }
                if (!selectedGroupIdInModal) {
                    await showMessage('Chyba', "Prosím, vyberte skupinu, do ktorej chcete tím priradiť.");
                    if (clubGroupSelect) clubGroupSelect.focus();
                    return;
                }
                if (typeof orderInGroup !== 'number' || orderInGroup <= 0) {
                    await showMessage('Chyba', "Zadajte platné poradie tímu v skupine (číslo väčšie ako 0).");
                    if (orderInGroupInput) orderInGroupInput.focus();
                    return;
                }

                clubIdToProcess = unassignedClubSelect.value;
                const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                if (!clubDoc.exists()) {
                    await showMessage('Chyba', "Tím na priradenie sa nenašiel. Prosím, skúste znova.");
                    if (clubModal) closeModal(clubModal);
                    resetClubModal();
                    displayCreatedTeams();
                    return;
                }
                const clubData = clubDoc.data();
                dataToSave = {
                    name: clubData.name || clubData.id, // Používame existujúci názov
                    categoryId: clubData.categoryId || selectedCategoryIdInModal || null,
                    groupId: selectedGroupIdInModal,
                    orderInGroup: orderInGroup,
                    createdFromBase: clubData.createdFromBase || clubData.name || clubData.id
                };
                if (dataToSave.groupId === null) {
                    dataToSave.orderInGroup = null;
                }
                operationType = 'update'; // Priradenie je vlastne aktualizácia existujúceho tímu
            } else if (operationType === 'edit' && editingClubId) {
                if (!clubName) {
                    await showMessage('Chyba', "Zadajte názov tímu.");
                    if (clubNameInput) clubNameInput.focus();
                    return;
                }

                clubIdToProcess = editingClubId; // ID dokumentu zostáva rovnaké
                const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                if (!clubDoc.exists()) {
                    await showMessage('Chyba', "Tím na úpravu sa nenašiel. Prosím, skúste znova.");
                    if (clubModal) closeModal(clubModal);
                    resetClubModal();
                    displayCreatedTeams();
                    return;
                }
                const clubData = clubDoc.data();

                // Skontrolujeme, či sa zmenil názov, kategória alebo skupina
                const nameChanged = (clubName !== clubData.name);
                const categoryChanged = (selectedCategoryIdInModal !== clubData.categoryId);
                const groupChanged = (selectedGroupIdInModal !== clubData.groupId);
                const orderChanged = (orderInGroup !== clubData.orderInGroup);

                if (!nameChanged && !categoryChanged && !groupChanged && !orderChanged) {
                    await showMessage('Informácia', 'Žiadne zmeny neboli vykonané.');
                    if (clubModal) closeModal(clubModal);
                    resetClubModal();
                    displayCreatedTeams();
                    return;
                }

                // Ak sa zmenil názov alebo kategória, skontrolujeme unikátnosť nového kombina
                if (nameChanged || categoryChanged) {
                    const qExistingName = query(clubsCollectionRef, where('name', '==', clubName), where('categoryId', '==', selectedCategoryIdInModal));
                    const existingNameSnapshot = await getDocs(qExistingName);
                    // Ak existuje iný dokument s rovnakým názvom a kategóriou
                    if (!existingNameSnapshot.empty && existingNameSnapshot.docs.some(doc => doc.id !== clubIdToProcess)) {
                        const category = allAvailableCategories.find(cat => cat.id === selectedCategoryIdInModal);
                        const categoryDisplayName = category ? category.name : selectedCategoryIdInModal;
                        await showMessage('Upozornenie', `Tím s názvom "${clubName}" už v kategórii "${categoryDisplayName}" existuje. Prosím, zvoľte iný názov.`);
                        if (clubNameInput) clubNameInput.focus();
                        return;
                    }
                }

                // Aktualizujeme existujúci dokument
                dataToSave = {
                    name: clubName,
                    categoryId: selectedCategoryIdInModal,
                    groupId: selectedGroupIdInModal,
                    orderInGroup: orderInGroup,
                    createdFromBase: clubData.createdFromBase || clubData.name || clubData.id
                };
                if (dataToSave.groupId === null) {
                    dataToSave.orderInGroup = null;
                }
                operationType = 'update';
            } else {
                await showMessage('Chyba', "Nastala chyba pri spracovaní formulára. Neplatný režim.");
                if (clubModal) closeModal(clubModal);
                resetClubModal();
                return;
            }

            // Vykonanie operácie na Firestore
            if (operationType === 'create') {
                const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess); // Použijeme vygenerované ID
                await setDoc(newClubDocRef, dataToSave);
                await showMessage('Úspech', `Tím "${clubName}" bol úspešne vytvorený.`);
            } else if (operationType === 'update') {
                const clubDocRef = doc(clubsCollectionRef, clubIdToProcess);
                await updateDoc(clubDocRef, dataToSave);
                if (currentClubModalMode === 'assign') {
                    await showMessage('Úspech', "Tím bol úspešne priradený.");
                } else {
                    await showMessage('Úspech', "Zmeny boli úspešne uložené.");
                }
            } else {
                await showMessage('Chyba', "Vyskytla sa chyba pri ukladaní dát. Neznámy typ operácie.");
                if (clubModal) closeModal(clubModal);
                resetClubModal();
                return;
            }

            if (clubModal) closeModal(clubModal);
            resetClubModal();
            displayCreatedTeams();
        } catch (error) {
            console.error('Chyba pri ukladaní dát tímu:', error);
            await showMessage('Chyba', `Chyba pri ukladaní dát! Prosím, skúste znova. Detail: ${error.message}`);
            if (clubModal) closeModal(clubModal);
            resetClubModal();
            displayCreatedTeams();
        }
    });
}

/**
 * Zobrazí vytvorené tímy v tabuľke, aplikuje filtre a zoradenie.
 */
async function displayCreatedTeams() {
    if (!createdTeamsTableBody || !createdTeamsTableHeader) {
        return;
    }
    createdTeamsTableBody.innerHTML = '';
    createdTeamsTableHeader.innerHTML = `
        <th data-filter-type="teamName">Názov tímu</th>
        <th data-filter-type="category">Kategória</th>
        <th data-filter-type="group">Skupina</th>
        <th data-sort-type="orderInGroup">Poradie v skupine</th>
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
             currentFilters = {
                 teamName: null,
                 category: null,
                 group: null
             };
             currentSort = {
                 column: null,
                 direction: 'asc'
             };
             displayCreatedTeams();
         };
         clearFiltersButtonElement.addEventListener('click', newListener);
         clearFiltersButtonElement._clickListener = newListener;
    }

    try {
        const querySnapshot = await getDocs(clubsCollectionRef);
        allTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Načítanie kategórií a skupín, ak ešte nie sú načítané
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

        // Predvolené zoradenie podľa názvu tímu
        allTeams.sort((a, b) => {
            const nameA = (a.name || a.id || '').trim().toLowerCase();
            const nameB = (b.name || b.id || '').trim().toLowerCase();
            return nameA.localeCompare(nameB, 'sk-SK');
        });

        let filteredTeams = allTeams;

        // Aplikácia filtrov
        Object.keys(currentFilters).forEach(filterType => {
            const filterValue = currentFilters[filterType]; // This is the ID or null
            if (filterValue !== null) {
                filteredTeams = filteredTeams.filter(team => {
                    const teamCategoryId = team.categoryId;
                    const teamGroupId = team.groupId;

                    if (filterType === 'teamName') {
                        const teamBaseName = team.createdFromBase || parseTeamName(team.id).baseName || '';
                        const cleanedTeamName = getCleanedTeamNameForFilter(teamBaseName);
                        return cleanedTeamName.toLowerCase() === filterValue.toLowerCase(); // filterValue is already the cleaned name
                    } else if (filterType === 'category') {
                        if (filterValue === null) { // Filter for "Neznáma kategória" (ID is null)
                            return !teamCategoryId || (typeof teamCategoryId === 'string' && teamCategoryId.trim() === '');
                        } else {
                            return teamCategoryId === filterValue; // Compare IDs
                        }
                    } else if (filterType === 'group') {
                        if (filterValue === null) { // Filter for "Nepriradené" (ID is null)
                            return !teamGroupId || (typeof teamGroupId === 'string' && teamGroupId.trim() === '');
                        } else {
                            return teamGroupId === filterValue; // Compare IDs
                        }
                    }
                    return false;
                });
            }
        });

        teamsToDisplay = filteredTeams;

        // Aplikácia zoradenia
        if (currentSort.column === 'orderInGroup') {
            teamsToDisplay.sort((a, b) => {
                const orderA = a.orderInGroup;
                const orderB = b.orderInGroup;
                const isANumber = typeof orderA === 'number' && orderA > 0;
                const isBNumber = typeof orderB === 'number' && orderB > 0;

                if (!isANumber && !isBNumber) return 0;
                if (!isANumber) return 1; // Nepriradené alebo neplatné idú na koniec
                if (!isBNumber) return -1; // Nepriradené alebo neplatné idú na koniec

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

        // Zobrazenie indikátora zoradenia v hlavičke
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

        // Vykreslenie riadkov tabuľky
        teamsToDisplay.forEach(team => {
            const row = createdTeamsTableBody.insertRow();
            row.dataset.teamId = team.id;

            const teamNameCell = row.insertCell();
            teamNameCell.textContent = team.name || 'Neznámy názov'; // Zobrazujeme name

            const categoryCell = row.insertCell();
            const category = allAvailableCategories.find(cat => cat.id === team.categoryId);
            categoryCell.textContent = category ? category.name : (team.categoryId || 'Neznáma kategória'); // Zobrazujeme name

            const groupCell = row.insertCell();
            let displayedGroupName = 'Nepriradené';
            if (team.groupId && typeof team.groupId === 'string' && team.groupId.trim() !== '') {
                const group = allAvailableGroups.find(g => g.id === team.groupId);
                if (group) {
                    displayedGroupName = group.name; // Zobrazujeme name
                } else {
                    // Ak sa ID skupiny nenašlo, pokúsime sa parsovať názov z ID, ak je v tvare "kategoria - nazov"
                    const parts = team.groupId.split(' - ');
                    if (parts.length > 1) {
                        const parsedGroupName = parts.slice(1).join(' - ').trim();
                        if (parsedGroupName !== '') {
                            displayedGroupName = parsedGroupName;
                        } else {
                            displayedGroupName = team.groupId;
                        }
                    } else {
                        displayedGroupName = team.groupId;
                    }
                }
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
            editButton.textContent = 'Upraviť';
            editButton.classList.add('action-button');
            editButton.onclick = () => {
                if (typeof openClubModal === 'function') {
                    openClubModal(team.id, 'edit');
                } else {
                    showMessage('Chyba', "Funkcia na úpravu tímu nie je dostupná.");
                }
            };
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Vymazať';
            deleteButton.classList.add('action-button', 'delete-button');
            deleteButton.onclick = async () => {
                const confirmed = await showConfirmation('Potvrdenie vymazania', `Naozaj chcete vymazať tím "${team.name}"? Táto akcia je nezvratná!`);
                if (confirmed) {
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
        console.error('Chyba pri načítaní a zobrazení tímov:', e);
        createdTeamsTableBody.innerHTML = '<tr><td colspan="6">Nepodarilo sa načítať tímy.</td></tr>';
        allTeams = [];
        teamsToDisplay = [];
        displayAppliedFiltersInHeader();
    }
}

/**
 * Zobrazí aplikované filtre v hlavičke tabuľky.
 */
function displayAppliedFiltersInHeader() {
     const headerCells = createdTeamsTableHeader.querySelectorAll('th');
     headerCells.forEach(headerCell => {
         const filterType = headerCell.dataset.filterType;
         const existingFilterDisplay = headerCell.querySelector('.applied-filter-value');
         if (existingFilterDisplay) {
             existingFilterDisplay.remove();
         }

         if (filterType && currentFilters[filterType] !== null) {
             const filterValue = currentFilters[filterType]; // This is the ID or null
             const filterValueSpan = document.createElement('span');
             filterValueSpan.classList.add('applied-filter-value');

              let displayedFilterValue = filterValue;
              if (filterType === 'category') {
                   if (filterValue === null) {
                       displayedFilterValue = 'Neznáma kategória';
                   } else {
                       const category = allAvailableCategories.find(cat => cat.id === filterValue);
                       displayedFilterValue = category ? category.name : filterValue;
                   }
              } else if (filterType === 'group') {
                   if (filterValue === null) {
                       displayedFilterValue = 'Nepriradené';
                   } else {
                       const group = allAvailableGroups.find(g => g.id === filterValue);
                       displayedFilterValue = group ? group.name : filterValue;
                   }
              }
             filterValueSpan.textContent = `${displayedFilterValue}`;
             headerCell.appendChild(filterValueSpan);
         }
     });
}

/**
 * Pridá listenery pre kliknutie na hlavičky tabuľky pre filtrovanie a zoradenie.
 */
function addHeaderFilterListeners() {
    if (!createdTeamsTableHeader) {
        return;
    }
    const headerCells = createdTeamsTableHeader.querySelectorAll('th');
    headerCells.forEach(headerCell => {
        const filterType = headerCell.dataset.filterType;
        const sortType = headerCell.dataset.sortType;

        // Odstránime predchádzajúce listenery, aby sa predišlo duplicitám
        headerCell.removeEventListener('click', handleHeaderClick);

        if (filterType || sortType === 'orderInGroup') {
            headerCell.style.cursor = 'pointer';
            headerCell.addEventListener('click', handleHeaderClick);
        } else {
             headerCell.style.cursor = 'default';
        }
    });
}

/**
 * Handler pre kliknutie na hlavičku tabuľky (pre filtrovanie/zoradenie).
 */
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

/**
 * Vymaže tím z Firestore.
 * @param {string} teamId - ID tímu, ktorý sa má vymazať.
 */
async function deleteTeam(teamId) {
    try {
        const teamDocRef = doc(clubsCollectionRef, teamId);
        await deleteDoc(teamDocRef);
        await showMessage('Úspech', `Tím bol úspešne vymazaný.`);
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
        console.error('Chyba pri mazaní tímu:', e);
        await showMessage('Chyba', "Nepodarilo sa vymazať tím. Prosím, skúste znova.");
    }
}

const handleAddButtonClick = () => {
     openClubModal(null, 'create');
};

// Spustí sa po načítaní DOM obsahu
document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html'; // Presmerovanie na prihlasovaciu stránku, ak nie je admin
        return;
    }

    // Načítanie všetkých kategórií a skupín na začiatku
    await loadAllCategoriesForDynamicSelects();
    await loadAllGroups();
    await displayCreatedTeams(); // Zobrazí tímy po načítaní dát

    const addButtonElement = document.getElementById('addButton');
    if (addButtonElement) {
        addButtonElement.style.display = 'block';
        addButtonElement.title = "Vytvoriť nový tím";
        // Odstránime starý listener, ak existuje, aby sme predišli duplicitám
        addButtonElement.removeEventListener('click', handleAddButtonClick);
        addButtonElement.addEventListener('click', handleAddButtonClick);
    }

    // Listenery pre zatvorenie modálneho okna klubu
    if (clubModalClose) {
        clubModalClose.addEventListener('click', () => {
            closeModal(clubModal);
            resetClubModal();
            displayCreatedTeams();
        });
    }

    // Zatvorenie modálu kliknutím mimo obsah
     if (clubModal) {
         window.addEventListener('click', (event) => {
              const modalContent = clubModal.querySelector('.modal-content');
              if (event.target === clubModal && modalContent && !modalContent.contains(event.target)) {
                   closeModal(clubModal);
                   resetClubModal();
                    displayCreatedTeams();
              }
         });
     }
});

export { openClubModal, displayCreatedTeams };
