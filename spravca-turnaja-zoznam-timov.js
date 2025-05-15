import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef,
         openModal, closeModal,
         populateCategorySelect,
         doc, getDocs, query, where, getDoc, setDoc, deleteDoc, updateDoc, writeBatch } from './spravca-turnaja-common.js';
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
let allAvailableCategories = [];
let allAvailableGroups = [];
let allTeams = [];
let editingClubId = null;
let currentClubModalMode = null;
let currentFilter = { type: null, value: null };
function parseTeamName(fullTeamName) {
    if (!fullTeamName || typeof fullTeamName !== 'string') {
        return { categoryPrefix: 'N/A', baseName: fullTeamName || 'Neznámy názov' };
    }
    const parts = fullTeamName.split(' - ');
    if (parts.length >= 2 && allAvailableCategories.some(cat => cat.name === parts[0].trim())) {
        const categoryPrefix = parts[0].trim();
        const baseName = parts.slice(1).join(' - ').trim();
        return { categoryPrefix, baseName };
    }
    return { categoryPrefix: null, baseName: fullTeamName.trim() };
}
function buildFullTeamName(categoryName, baseName, suffix = '') {
    const name = `${categoryName} - ${baseName}${suffix ? ' ' + suffix : ''}`;
    return name.replace(/\s\s+/g, ' ').trim();
}
function getUniqueBaseTeamNames(teams) {
    const baseNames = teams.map(team => team.createdFromBase || parseTeamName(team.id).baseName);
    return [...new Set(baseNames)].sort((a, b) => a.localeCompare(b, 'sk-SK'));
}
function getUniqueTeamCategories(teams, categories) {
    const categoryIds = [...new Set(teams.map(team => team.categoryId).filter(id => id !== null))];
    const categoryNames = categoryIds.map(id => {
        const category = categories.find(cat => cat.id === id);
        return category ? category.name : id;
    });
    return categoryNames.sort((a, b) => a.localeCompare(b, 'sk-SK'));
}
function getUniqueTeamGroups(teams, groups) {
    const groupIds = [...new Set(teams.map(team => team.groupId).filter(id => id !== null))];
    const groupNames = groupIds.map(id => {
        const group = groups.find(g => g.id === id);
        if (group) {
            return group.name || group.id;
        }
        const parts = id.split(' - ');
        if (parts.length > 1) {
            return parts.slice(1).join(' - ');
        }
        return id;
    });
    return groupNames.sort((a, b) => a.localeCompare(b, 'sk-SK'));
}
async function loadAllCategoriesForDynamicSelects() {
    console.log("Načítavam kategórie pre dynamické selecty...");
    allAvailableCategories = [];
    try {
        const querySnapshot = await getDocs(categoriesCollectionRef);
        querySnapshot.forEach((doc) => {
            const categoryData = doc.data();
            if (categoryData && typeof categoryData.name === 'string' && categoryData.name.trim() !== '') {
                allAvailableCategories.push({ id: doc.id, name: categoryData.name.trim() });
            } else {
                allAvailableCategories.push({ id: doc.id, name: doc.id });
                console.warn("Kategória dokument s ID", doc.id, "má chýbajúce, neplatné alebo prázdne 'name' pole. Používam ID ako názov.");
            }
        });
        allAvailableCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
        console.log("Načítané kategórie (allAvailableCategories):", allAvailableCategories);
    } catch (e) {
        console.error("Chyba pri načítaní kategórií: ", e);
        alert("Nepodarilo sa načítať kategórie.");
    }
}
async function loadAllGroups() {
    console.log("Načítavam skupiny...");
    allAvailableGroups = [];
    try {
        const querySnapshot = await getDocs(groupsCollectionRef);
        querySnapshot.forEach((doc) => {
            const groupData = doc.data();
            if (groupData) {
                allAvailableGroups.push({ id: doc.id, ...groupData });
            } else {
                console.warn("Skupina dokument s ID", doc.id, "má prázdne dáta.");
            }
        });
        allAvailableGroups.sort((a, b) => {
            const nameA = (a.name || a.id) || '';
            const nameB = (b.name || b.id) || '';
            return nameA.localeCompare(nameB, 'sk-SK');
        });
        console.log("Načítané skupiny (allAvailableGroups):", allAvailableGroups);
    } catch (e) {
        console.error("Chyba pri načítaní skupín:", e);
        if (clubGroupSelect) {
            clubGroupSelect.innerHTML = '<option value="">-- Chyba pri načítaní skupín --</option>';
            clubGroupSelect.disabled = true;
        }
    }
}
function populateGroupSelectForClubModal(selectElement, selectedId = '', availableGroups, categoryId = null) {
    console.log("Napĺňam select skupín v modále klubu.", { selectedId, categoryId, availableGroupsCount: availableGroups.length });
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
    const filteredGroups = categoryId
        ? availableGroups.filter(group => group.categoryId === categoryId)
        : availableGroups;
    console.log(`Filtrované skupiny pre select v modále (kategória: ${categoryId}):`, filteredGroups);
    if (filteredGroups.length === 0 && categoryId && !categoryId.startsWith('--')) {
        const category = allAvailableCategories.find(cat => cat.id === categoryId);
        const categoryName = category ? category.name : categoryId;
        const option = document.createElement('option');
        option.value = "";
        option.textContent = ` -- Žiadne skupiny v kategórii "${categoryName}" --`;
        option.disabled = true;
        selectElement.appendChild(option);
    } else if (filteredGroups.length === 0 && !categoryId) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = `-- Najprv vyberte kategóriu (v režime assign vyberte tím) --`;
        option.disabled = true;
        selectElement.appendChild(option);
    }
    else {
        filteredGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            const displayedGroupName = group.name || group.id;
            option.textContent = displayedGroupName;
            selectElement.appendChild(option);
        });
    }
    if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
        selectElement.value = selectedId;
    } else {
        selectElement.value = "";
    }
    console.log("Naplnenie selectu skupín v modále dokončené.");
}
async function populateUnassignedClubsSelect() {
    console.log("Načítavam nepriradené tímy/kluby...");
    if (!unassignedClubSelect) { console.error("Unassigned club select not found!"); return; }
    unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
    unassignedClubSelect.disabled = false;
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
            console.log("Žiadne nepriradené tímy nájdené.");
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
            console.log("Nepriradené tímy načítané a spracované:", unassignedTeams.length);
        }
    } catch (e) {
        console.error("Chyba pri načítaní nepriradených tímov:", e);
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Chyba pri načítaní tímov";
        option.disabled = true;
        unassignedClubSelect.appendChild(option);
        unassignedClubSelect.disabled = true;
    }
}
function resetClubModal() {
    console.log("Resetujem modál klubu (vrátane filtrov).");
    editingClubId = null;
    currentClubModalMode = null;
    if (clubForm) clubForm.reset();
    if (clubCategorySelect) {
        clubCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
        clubCategorySelect.disabled = true;
        clubCategorySelect.onchange = null;
    }
    if (clubGroupSelect) {
        clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        if (clubGroupSelect) clubGroupSelect.disabled = true;
        if (clubGroupSelect) clubGroupSelect.onchange = null;
    }
    if (clubNameField) clubNameField.style.display = 'block';
    if (unassignedClubField) unassignedClubField.style.display = 'none';
    if (unassignedClubSelect) {
        unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
        unassignedClubSelect.disabled = true;
        unassignedClubSelect.onchange = null;
    }
    if (clubAssignmentFields) clubAssignmentFields.style.display = 'block';
    if (clubModalTitle) clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
    if (clubForm) {
        const submitButton = clubForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Uložiť zmeny / Priradiť';
    }
    if (clubGroupSelect) clubGroupSelect.removeAttribute('required');
    if (orderInGroupInput) {
        orderInGroupInput.value = '';
        orderInGroupInput.disabled = true;
        orderInGroupInput.removeAttribute('required');
    }
    if (clubFilterContent) clubFilterContent.style.display = 'none';
    if (filterModalTitle) filterModalTitle.textContent = 'Filter';
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">-- Zobraziť všetko --</option>';
        filterSelect.onchange = null;
    }
    if (clubFormContent) clubFormContent.style.display = 'block';
    currentFilter = { type: null, value: null };
}
async function openClubModal(clubId = null, mode = 'assign') {
    console.log(`Otváram modál Klub v režime: ${mode}, ID: ${clubId}`);
    if (!clubModal || !clubModalTitle || !clubFormContent || !clubFilterContent || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect || !filterModalTitle || !filterSelect) {
        console.error("Elementy modálu Klub/Filter nenájdené!");
        alert("Nastala chyba pri otváraní modálu.");
        return;
    }
    resetClubModal();
    editingClubId = clubId;
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
            clubNameField.style.display = 'none';
            clubAssignmentFields.style.display = 'block';
            unassignedClubField.style.display = 'block';
            if (unassignedClubSelect) unassignedClubSelect.disabled = false;
            if (clubCategorySelect) clubCategorySelect.disabled = true;
            if (clubGroupSelect) clubGroupSelect.disabled = true;
            if (orderInGroupInput) orderInGroupInput.disabled = true;
            clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
            populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);
            await populateUnassignedClubsSelect();
            unassignedClubSelect.onchange = () => {
                const selectedId = unassignedClubSelect.value;
                const selectedOption = unassignedClubSelect.options[unassignedClubSelect.selectedIndex];
                const categoryId = selectedOption ? selectedOption.dataset.categoryId : null;
                console.log("Zmenený výber nepriradeného tímu.", { selectedId, categoryId });
                if (selectedId && categoryId) {
                    const category = allAvailableCategories.find(cat => cat.id === categoryId);
                    const categoryName = category ? category.name : 'Neznáma kategória';
                    clubCategorySelect.innerHTML = `<option value="${categoryId}">${categoryName}</option>`;
                    if (clubGroupSelect) clubGroupSelect.disabled = false;
                    populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, categoryId);
                    if (orderInGroupInput) {
                        orderInGroupInput.disabled = true;
                        orderInGroupInput.value = '';
                    }
                } else {
                    clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
                    if (clubGroupSelect) clubGroupSelect.disabled = true;
                    populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);
                    if (orderInGroupInput) {
                        orderInGroupInput.disabled = true;
                        orderInGroupInput.value = '';
                    }
                }
            };
            if (clubGroupSelect) {
                clubGroupSelect.onchange = () => {
                    const selectedGroupId = clubGroupSelect.value;
                    console.log("Zmenená skupina v assign mode modále klubu:", selectedGroupId);
                    if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = false;
                            orderInGroupInput.focus();
                        }
                    } else {
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                        }
                    }
                };
            }
        }
        else if (mode === 'edit' && clubId) {
            clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
            clubNameField.style.display = 'block';
            clubAssignmentFields.style.display = 'block';
            unassignedClubField.style.display = 'none';
            if (unassignedClubSelect) unassignedClubSelect.disabled = true;
            if (clubCategorySelect) clubCategorySelect.disabled = false;
            if (clubGroupSelect) clubGroupSelect.disabled = false;
            const submitButton = clubForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.textContent = 'Uložiť zmeny';
            if (unassignedClubSelect) unassignedClubSelect.onchange = null;
            if (clubCategorySelect) clubCategorySelect.onchange = null;
            if (clubGroupSelect) clubGroupSelect.onchange = null;
            try {
                const clubDocRef = doc(clubsCollectionRef, clubId);
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
                        orderInGroupInput.disabled = !(clubData.groupId && typeof clubData.groupId === 'string' && !clubData.groupId.startsWith('--'));
                    }
                    clubCategorySelect.onchange = () => {
                        const selectedCategoryId = clubCategorySelect.value;
                        console.log("Zmenená kategória v edit mode modále klubu:", selectedCategoryId);
                        if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                            if (clubGroupSelect) clubGroupSelect.disabled = false;
                            populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
                            if (orderInGroupInput) {
                                orderInGroupInput.disabled = true;
                                orderInGroupInput.value = '';
                            }
                        } else {
                            if (clubGroupSelect) clubGroupSelect.disabled = true;
                            clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                            if (orderInGroupInput) {
                                orderInGroupInput.disabled = true;
                                orderInGroupInput.value = '';
                            }
                        }
                    };
                    if (clubGroupSelect) {
                        clubGroupSelect.onchange = () => {
                            const selectedGroupId = clubGroupSelect.value;
                            console.log("Zmenená skupina v edit mode modále klubu:", selectedGroupId);
                            if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                                if (orderInGroupInput) {
                                    orderInGroupInput.disabled = false;
                                    orderInGroupInput.focus();
                                }
                            } else {
                                if (orderInGroupInput) {
                                    orderInGroupInput.disabled = true;
                                    orderInGroupInput.value = '';
                                }
                            }
                        };
                    }
                } else {
                    console.error("Tím s ID", clubId, "sa nenašiel.");
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
        }
        else if (mode === 'create') {
            clubModalTitle.textContent = 'Vytvoriť nový tím';
            clubNameField.style.display = 'block';
            clubAssignmentFields.style.display = 'block';
            unassignedClubField.style.display = 'none';
            if (unassignedClubSelect) unassignedClubSelect.disabled = true;
            if (clubCategorySelect) clubCategorySelect.disabled = false;
            if (clubGroupSelect) clubGroupSelect.disabled = true;
            if (orderInGroupInput) orderInGroupInput.disabled = true;
            const submitButton = clubForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.textContent = 'Vytvoriť tím';
            if (unassignedClubSelect) unassignedClubSelect.onchange = null;
            if (clubGroupSelect) clubGroupSelect.onchange = null;
            if (clubCategorySelect) clubCategorySelect.onchange = null;
            if (allAvailableCategories.length > 0) {
                populateCategorySelect(clubCategorySelect, null);
            } else {
                clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
                clubCategorySelect.disabled = true;
            }
            clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            clubCategorySelect.onchange = () => {
                const selectedCategoryId = clubCategorySelect.value;
                console.log("Zmenená kategória v create mode modále klubu:", selectedCategoryId);
                if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                    if (clubGroupSelect) clubGroupSelect.disabled = false;
                    populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
                    if (orderInGroupInput) {
                        orderInGroupInput.disabled = true;
                        orderInGroupInput.value = '';
                    }
                } else {
                    if (clubGroupSelect) clubGroupSelect.disabled = true;
                    clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    if (orderInGroupInput) {
                        orderInGroupInput.disabled = true;
                        orderInGroupInput.value = '';
                    }
                }
            };
            if (clubGroupSelect) {
                clubGroupSelect.onchange = () => {
                    const selectedGroupId = clubGroupSelect.value;
                    console.log("Zmenená skupina v create mode modále klubu:", selectedGroupId);
                    if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = false;
                            orderInGroupInput.focus();
                        }
                    } else {
                        if (orderInGroupInput) {
                            orderInGroupInput.disabled = true;
                            orderInGroupInput.value = '';
                        }
                    }
                };
            }
            if (clubGroupSelect) clubGroupSelect.removeAttribute('required');
            if (orderInGroupInput) orderInGroupInput.removeAttribute('required');
            setTimeout(() => {
                if (clubNameInput) clubNameInput.focus();
            }, 0);
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
    }
    else if (mode === 'filter') {
        clubFormContent.style.display = 'none';
        clubFilterContent.style.display = 'block';
        const filterType = clubId;
        let filterTitle = 'Filter';
        if (filterType === 'teamName') filterTitle = 'Filter podľa názvu tímu';
        else if (filterType === 'category') filterTitle = 'Filter podľa kategórie';
        else if (filterType === 'group') filterTitle = 'Filter podľa skupiny';
        filterModalTitle.textContent = filterTitle;
        let filterOptions = [];
        if (filterType === 'teamName') {
            filterOptions = getUniqueBaseTeamNames(allTeams);
        } else if (filterType === 'category') {
            filterOptions = getUniqueTeamCategories(allTeams, allAvailableCategories);
        } else if (filterType === 'group') {
            filterOptions = getUniqueTeamGroups(allTeams, allAvailableGroups);
        }
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">-- Zobraziť všetko --</option>';
            filterOptions.forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                filterSelect.appendChild(option);
            });
            if (currentFilter.type === filterType && currentFilter.value !== null) {
                filterSelect.value = currentFilter.value;
            } else {
                filterSelect.value = "";
            }
            filterSelect.onchange = () => {
                const selectedValue = filterSelect.value === "" ? null : filterSelect.value;
                console.log(`Filter zmenený: Typ=${filterType}, Hodnota=${selectedValue}`);
                currentFilter = { type: filterType, value: selectedValue };
                closeModal(clubModal);
                displayCreatedTeams();
            };
            setTimeout(() => {
                filterSelect.focus();
            }, 0);
        }
    }
    else {
        console.error("Neplatný režim modálu klubu/filtra.");
        alert("Vyskytla sa chyba pri otváraní modálu.");
        closeModal(clubModal);
        displayCreatedTeams();
        return;
    }
    openModal(clubModal);
}
if (clubForm) {
    clubForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("Odosielam formulár Klub v režime:", currentClubModalMode);
        if (!['assign', 'edit', 'create'].includes(currentClubModalMode)) {
            console.warn("Formulár Klub bol odoslaný v neformulárovom režime modálu:", currentClubModalMode);
            return;
        }
        const clubName = clubNameInput.value.trim();
        const selectedCategoryIdInModal = clubCategorySelect ? clubCategorySelect.value : null;
        const selectedGroupIdInModal = clubGroupSelect ? clubGroupSelect.value : null;
        let orderInGroup = orderInGroupInput ? parseInt(orderInGroupInput.value, 10) : null;
        let clubIdToProcess = editingClubId;
        let dataToSave = {};
        let operationType = currentClubModalMode;
        try {
            if (operationType === 'create') {
                console.log("Spracovávam formulár v režime: create");
                if (!clubName) { alert("Zadajte názov tímu."); if (clubNameInput) clubNameInput.focus(); return; }
                if (!selectedCategoryIdInModal || selectedCategoryIdInModal.startsWith('--')) { alert("Vyberte platnú kategóriu."); if (clubCategorySelect) clubCategorySelect.focus(); return; }
                const selectedCategory = allAvailableCategories.find(cat => cat.id === selectedCategoryIdInModal);
                const categoryName = selectedCategory ? selectedCategory.name : selectedCategoryIdInModal;
                const newDocumentId = `${categoryName} - ${clubName}`;
                const existingDoc = await getDoc(doc(clubsCollectionRef, newDocumentId));
                if (existingDoc.exists()) {
                    alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov.`);
                    if (clubNameInput) clubNameInput.focus();
                    return;
                }
                dataToSave = {
                    name: clubName,
                    categoryId: selectedCategoryIdInModal,
                    groupId: selectedGroupIdInModal || null,
                    orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
                    createdFromBase: clubName
                };
                clubIdToProcess = newDocumentId;
            }
            else if (operationType === 'assign') {
                console.log("Spracovávam formulár v režime: assign");
                if (!unassignedClubSelect || !unassignedClubSelect.value || unassignedClubSelect.value.startsWith('--')) {
                    alert("Prosím, vyberte nepriradený tím k priradeniu.");
                    return;
                }
                clubIdToProcess = unassignedClubSelect.value;
                const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                if (!clubDoc.exists()) {
                    console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre priradenie.");
                    alert("Tím na priradenie sa nenašiel. Prosím, skúste znova.");
                    return;
                }
                const clubData = clubDoc.data();
                dataToSave = {
                    name: clubData.name || clubData.id,
                    categoryId: clubData.categoryId || null,
                    groupId: selectedGroupIdInModal || null,
                    orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
                    createdFromBase: clubData.createdFromBase || clubData.name || clubData.id
                };
                if (dataToSave.groupId === null) {
                    dataToSave.orderInGroup = null;
                }
            }
            else if (operationType === 'edit' && editingClubId) {
                console.log("Spracovávam formulár v režime: edit");
                clubIdToProcess = editingClubId;
                const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                if (!clubDoc.exists()) {
                    console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre úpravu.");
                    alert("Tím na úpravu sa nenašiel. Prosím, skúste znova.");
                    return;
                }
                const clubData = clubDoc.data();
                const originalClubId = clubDoc.id;
                const originalCategoryId = clubData.categoryId;
                const originalName = clubData.name || clubData.id;
                const newClubNameForId = clubName;
                let newDocumentId = originalClubId;
                let nameFieldToSave = clubName;
                const newSelectedCategoryId = selectedCategoryIdInModal;
                const nameChanged = newClubNameForId !== originalName;
                const categoryChanged = newSelectedCategoryId !== originalCategoryId;
                if (nameChanged || categoryChanged) {
                    console.log(`Názov zmenený: ${nameChanged}, Kategória zmenená: ${categoryChanged}`);
                    const selectedCategoryForNewId = allAvailableCategories.find(cat => cat.id === newSelectedCategoryId);
                    const categoryNameForNewId = selectedCategoryForNewId ? selectedCategoryForNewId.name : newSelectedCategoryId;
                    if (newSelectedCategoryId && !newSelectedCategoryId.startsWith('--')) {
                        newDocumentId = `${categoryNameForNewId} - ${newClubNameForId}`;
                    } else {
                        newDocumentId = newClubNameForId;
                    }
                    nameFieldToSave = newClubNameForId;
                    if (newDocumentId !== originalClubId) {
                        console.log(`ID dokumentu sa mení z "${originalClubId}" na "${newDocumentId}"`);
                        const existingDocWithNewId = await getDoc(doc(clubsCollectionRef, newDocumentId));
                        if (existingDocWithNewId.exists()) {
                            alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov alebo kategóriu.`);
                            if (clubNameInput) clubNameInput.focus();
                            return;
                        }
                        operationType = 'replace';
                        clubIdToProcess = newDocumentId;
                    } else {
                        console.log("Aktualizujem existujúci tím s ID (názov alebo kategória sa zmenila, ale ID zostáva rovnaké):", clubIdToProcess);
                        operationType = 'update';
                    }
                } else {
                    console.log("Aktualizujem existujúci tím s ID (žiadna zmena názvu ani kategórie):", clubIdToProcess);
                    nameFieldToSave = clubName;
                    operationType = 'update';
                    newDocumentId = originalClubId;
                }
                dataToSave = {
                    name: nameFieldToSave,
                    categoryId: newSelectedCategoryId || null,
                    groupId: selectedGroupIdInModal || null,
                    orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
                    createdFromBase: clubData.createdFromBase || clubData.name || clubData.id
                };
                if (dataToSave.groupId === null) {
                    dataToSave.orderInGroup = null;
                }
            }
            else {
                console.error("Neplatný režim modálu pri odosielaní formulára.");
                alert("Nastala chyba pri spracovaní formulára. Neplatný režim.");
                return;
            }
            if (!clubIdToProcess) {
                console.error("Chýba ID tímu na spracovanie.");
                alert("Vyskytla sa chyba pri určovaní ID tímu.");
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
                    alert("Vyskytla sa chyba pri premenovaní tímu.");
                    return;
                }
                const originalClubDocRef = doc(clubsCollectionRef, editingClubId);
                const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess);
                const batch = writeBatch(db);
                batch.delete(originalClubDocRef);
                batch.set(newClubDocRef, dataToSave);
                await batch.commit();
                alert(`Tím bol úspešne premenovaný/presunutý na "${clubIdToProcess}".`);
            } else {
                console.error("Neznámy typ operácie po spracovaní dát:", operationType);
                alert("Vyskytla sa chyba pri ukladaní dát.");
                return;
            }
            if (clubModal) closeModal(clubModal);
            resetClubModal();
            displayCreatedTeams();
        } catch (error) {
            console.error('Chyba pri ukladaní dát tímu: ', error);
            alert(`Chyba pri ukladaní dát! Prosím, skúste znova. Detail: ${error.message}`);
        }
    });
} else { console.error("Club form not found!"); }
async function displayCreatedTeams() {
    console.log("Zobrazujem vytvorené tímy...");
    if (!createdTeamsTableBody || !createdTeamsTableHeader) {
        console.error("Tabuľka pre vytvorené tímy nenájdená!");
        return;
    }
    createdTeamsTableBody.innerHTML = '';
    if (createdTeamsTableHeader.innerHTML.trim() === '') {
        createdTeamsTableHeader.innerHTML = `
            <th data-filter-type="teamName">Názov tímu</th>
            <th data-filter-type="category">Kategória</th>
            <th data-filter-type="group">Skupina</th>
            <th>Poradie v skupine</th>
            <th>Akcie</th>
        `;
        addHeaderFilterListeners();
    } else {
    }
    try {
        const querySnapshot = await getDocs(clubsCollectionRef);
        console.log("Načítané dokumenty tímov (clubs) z DB:", querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
        allTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Spracované tímy (allTeams array):", allTeams);
        if (allAvailableCategories.length === 0) {
            await loadAllCategoriesForDynamicSelects();
        }
        console.log("Aktuálne dostupné kategórie (allAvailableCategories):", allAvailableCategories);
        if (allAvailableGroups.length === 0) {
            await loadAllGroups();
        }
        console.log("Aktuálne dostupné skupiny (allAvailableGroups):", allAvailableGroups);
        if (allTeams.length === 0) {
            if (createdTeamsTableHeader.innerHTML.trim() === '') {
                createdTeamsTableHeader.innerHTML = `
                    <th data-filter-type="teamName">Názov tímu</th>
                    <th data-filter-type="category">Kategória</th>
                    <th data-filter-type="group">Skupina</th>
                    <th>Poradie v skupine</th>
                    <th>Akcie</th>
                `;
            }
            createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Zatiaľ nie sú vytvorené žiadne tímy.</td></tr>';
            allTeams = [];
            return;
        }
        if (createdTeamsTableHeader.innerHTML.trim() === '') {
            createdTeamsTableHeader.innerHTML = `
                <th data-filter-type="teamName">Názov tímu</th>
                <th data-filter-type="category">Kategória</th>
                <th data-filter-type="group">Skupina</th>
                <th>Poradie v skupine</th>
                <th>Akcie</th>
            `;
        }
        allTeams.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));
        let teamsToDisplay = allTeams;
        if (currentFilter.type && currentFilter.value !== null) {
            console.log(`Aplikujem filter: Typ=${currentFilter.type}, Hodnota=${currentFilter.value}`);
            teamsToDisplay = allTeams.filter(team => {
                if (currentFilter.type === 'teamName') {
                    const baseName = team.createdFromBase || parseTeamName(team.id).baseName;
                    return baseName === currentFilter.value;
                } else if (currentFilter.type === 'category') {
                    const categoryName = allAvailableCategories.find(cat => cat.id === team.categoryId)?.name || team.categoryId;
                    return categoryName === currentFilter.value;
                } else if (currentFilter.type === 'group') {
                    let teamGroupName = 'Nepriradené';
                    if (team.groupId && typeof team.groupId === 'string') {
                        const group = allAvailableGroups.find(g => g.id === team.groupId);
                        if (group) {
                            teamGroupName = group.name || group.id;
                        } else {
                            const parts = team.groupId.split(' - ');
                            if (parts.length > 1) {
                                teamGroupName = parts.slice(1).join(' - ');
                            } else {
                                teamGroupName = team.groupId;
                            }
                        }
                    } else if (team.groupId) {
                        teamGroupName = 'Neznáma skupina (neplatný formát ID)';
                        console.warn(`Tím ID: ${team.id} má groupId s neplatným formátom (nie reťazec):`, team.groupId);
                    }
                    return teamGroupName === currentFilter.value;
                }
                return true;
            });
            console.log(`Počet tímov po filtrovaní (${currentFilter.type} = ${currentFilter.value}):`, teamsToDisplay.length);
        } else {
            console.log("Žiadny aktívny filter, zobrazujem všetky tímy:", allTeams.length);
        }
        if (teamsToDisplay.length === 0) {
            createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Žiadne tímy zodpovedajúce filtru.</td></tr>';
            return;
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
            if (team.groupId && typeof team.groupId === 'string') {
                const group = allAvailableGroups.find(g => g.id === team.groupId);
                if (group) {
                    displayedGroupName = group.name || group.id;
                } else {
                    const parts = team.groupId.split(' - ');
                    if (parts.length > 1) {
                        displayedGroupName = parts.slice(1).join(' - ');
                    } else {
                        displayedGroupName = team.groupId;
                    }
                }
            } else if (team.groupId) {
                displayedGroupName = 'Neznáma skupina (neplatný formát ID)';
                console.warn(`Tím ID: ${team.id} má groupId s neplatným formátom (nie reťazec):`, team.groupId);
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
                    console.error("Funkcia openClubModal nie je dostupná.");
                    alert("Funkcia na úpravu tímu nie je dostupná.");
                }
            };
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Vymazať';
            deleteButton.classList.add('action-button', 'delete-button');
            deleteButton.onclick = async () => {
                if (confirm(`Naozaj chcete vymazať tím "${team.name || team.id}"?`)) {
                    await deleteTeam(team.id);
                }
            };
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
            row.appendChild(teamNameCell);
            row.appendChild(categoryCell);
            row.appendChild(groupCell);
            row.appendChild(orderCell);
            row.appendChild(actionsCell);
            createdTeamsTableBody.appendChild(row);
        });
    } catch (e) {
        console.error("Chyba pri zobrazovaní tímov: ", e);
        if (createdTeamsTableHeader.innerHTML.trim() === '') {
            createdTeamsTableHeader.innerHTML = `
                <th data-filter-type="teamName">Názov tímu</th>
                <th data-filter-type="category">Kategória</th>
                <th data-filter-type="group">Skupina</th>
                <th>Poradie v skupine</th>
                <th>Akcie</th>
            `;
        }
        createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Nepodarilo sa načítať tímy.</td></tr>';
        allTeams = [];
    }
}
function addHeaderFilterListeners() {
    if (!createdTeamsTableHeader) {
        console.error("Header element pre pridanie filtrovacích poslucháčov nenájdený!");
        return;
    }
    const headerCells = createdTeamsTableHeader.querySelectorAll('th');
    headerCells.forEach(headerCell => {
        const filterType = headerCell.dataset.filterType;
        if (filterType) {
            headerCell.style.cursor = 'pointer';
            headerCell.onclick = () => {
                console.log(`Kliknuté na hlavičku filtra: ${filterType}`);
                openClubModal(filterType, 'filter');
            };
        }
    });
    console.log("Poslucháči filtrov na hlavičky tabuľky pridaní.");
}
async function deleteTeam(teamId) {
    console.log("Mažem tím s ID:", teamId);
    try {
        const teamDocRef = doc(clubsCollectionRef, teamId);
        await deleteDoc(teamDocRef);
        console.log("Tím bol úspešne vymazaný.");
        displayCreatedTeams();
    } catch (e) {
        console.error("Chyba pri mazaní tímu:", e);
        alert("Nepodarilo sa vymazať tím.");
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM plne načítaný pre zoznam tímov.");
    await loadAllCategoriesForDynamicSelects();
    await loadAllGroups();
    await displayCreatedTeams();
    addHeaderFilterListeners();
    const addButton = document.getElementById('addButton');
    if (addButton) {
        addButton.style.display = 'block';
        addButton.title = "Vytvoriť nový tím";
        addButton.onclick = () => {
            openClubModal(null, 'create');
        };
    } else {
        console.error("Add button not found on teams list page!");
    }
    if (clubModalClose) {
        clubModalClose.addEventListener('click', () => {
            closeModal(clubModal);
            resetClubModal();
        });
    }
    if (clubModal) {
        window.addEventListener('click', (event) => {
            if (event.target === clubModal) {
                closeModal(clubModal);
                resetClubModal();
            }
        });
    }
});
export { openClubModal, displayCreatedTeams };
