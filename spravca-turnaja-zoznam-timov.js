import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Referencie na HTML elementy pre správu tímov
    const teamCreationContentSection = document.getElementById('teamCreationContentSection');
    const addButton = document.getElementById('addButton');
    const clubModal = document.getElementById('clubModal');
    const closeClubModalButton = document.querySelector('.club-modal-close'); // Používame selektor triedy pre tlačidlo zatvorenia
    const clubModalTitle = document.getElementById('clubModalTitle');
    const clubForm = document.getElementById('clubForm');
    const clubNameField = document.getElementById('clubNameField');
    const clubNameInput = document.getElementById('clubName');
    const clubAssignmentFields = document.getElementById('clubAssignmentFields');
    const clubCategorySelect = document.getElementById('clubCategorySelect');
    const clubGroupSelect = document.getElementById('clubGroupSelect');
    const orderInGroupInput = document.getElementById('orderInGroup');
    const unassignedClubField = document.getElementById('unassignedClubField');
    const unassignedClubSelect = document.getElementById('unassignedClubSelect');
    const createdTeamsTableBody = document.getElementById('createdTeamsTableBody');
    const createdTeamsTableHeader = document.getElementById('createdTeamsTableHeader');
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    const clubFilterContent = document.getElementById('clubFilterContent');
    const filterModalTitle = document.getElementById('filterModalTitle');
    const filterSelect = document.getElementById('filterSelect');

    // Zabezpečíme zobrazenie správnej sekcie pri načítaní stránky
    if (teamCreationContentSection) {
        teamCreationContentSection.style.display = 'block';
        // Skryjeme ostatné sekcie, ak by nejaké boli (aj keď v tomto HTML súbore nie sú)
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'teamCreationContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- Funkcie pre plnenie select boxov ---
    async function populateUnassignedClubsSelect() {
        unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
        try {
            const q = query(clubsCollectionRef, where("categoryId", "==", ""), where("groupId", "==", ""));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const club = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = club.name;
                unassignedClubSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní nepriradených klubov: ", error);
        }
    }

    async function populateClubsForTable(categoryId = null, groupId = null) {
        createdTeamsTableBody.innerHTML = ''; // Vyčisti tabuľku pred načítaním

        let q = query(clubsCollectionRef);

        // Aplikuj filtre, ak sú zadané
        if (categoryId) {
            q = query(q, where("categoryId", "==", categoryId));
        }
        if (groupId) {
            q = query(q, where("groupId", "==", groupId));
        }

        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Žiadne tímy na zobrazenie.</td></tr>';
                return;
            }

            const clubs = [];
            for (const docSnapshot of querySnapshot.docs) {
                const club = { id: docSnapshot.id, ...docSnapshot.data() };
                
                // Načítaj názov kategórie
                let categoryName = club.categoryId;
                if (club.categoryId) {
                    const categoryDoc = await getDoc(doc(categoriesCollectionRef, club.categoryId));
                    if (categoryDoc.exists()) {
                        categoryName = categoryDoc.data().name;
                    }
                }

                // Načítaj názov skupiny
                let groupName = club.groupId;
                if (club.groupId) {
                    const groupDoc = await getDoc(doc(groupsCollectionRef, club.groupId));
                    if (groupDoc.exists()) {
                        groupName = groupDoc.data().name;
                    }
                }

                clubs.push({ ...club, categoryName, groupName });
            }

            // Zoradenie tímov: najprv podľa kategórie, potom skupiny, potom poradia
            clubs.sort((a, b) => {
                const categoryCompare = (a.categoryName || '').localeCompare(b.categoryName || '');
                if (categoryCompare !== 0) return categoryCompare;

                const groupCompare = (a.groupName || '').localeCompare(b.groupName || '');
                if (groupCompare !== 0) return groupCompare;

                return (a.orderInGroup || 0) - (b.orderInGroup || 0);
            });

            clubs.forEach(club => {
                const row = createdTeamsTableBody.insertRow();
                row.dataset.clubId = club.id; // Ulož ID klubu pre ľahšiu manipuláciu
                row.innerHTML = `
                    <td>${club.name}</td>
                    <td>${club.categoryName || 'Nepriradené'}</td>
                    <td>${club.groupName || 'Nepriradené'}</td>
                    <td>${club.orderInGroup || ''}</td>
                    <td class="schedule-cell-actions">
                        <button class="edit-btn" data-id="${club.id}">Upraviť</button>
                        <button class="delete-btn" data-id="${club.id}">Vymazať</button>
                    </td>
                `;
            });

            // Pridanie event listenerov pre tlačidlá Upraviť a Vymazať
            createdTeamsTableBody.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (e) => editClub(e.target.dataset.id));
            });
            createdTeamsTableBody.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => deleteClub(e.target.dataset.id));
            });

        } catch (error) {
            console.error("Chyba pri načítaní klubov pre tabuľku: ", error);
            createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Chyba pri načítaní tímov.</td></tr>';
        }
    }

    // --- Funkcie pre pridanie/úpravu/vymazanie klubu ---
    addButton.addEventListener('click', () => {
        clubForm.reset();
        clubModalTitle.textContent = 'Vytvoriť nový tím';
        clubNameField.style.display = 'block'; // Zobraziť pole pre názov tímu
        clubAssignmentFields.style.display = 'block'; // Zobraziť polia pre priradenie
        unassignedClubField.style.display = 'none'; // Skryť pole pre nepriradený tím
        clubCategorySelect.disabled = false; // Povoliť výber kategórie
        clubCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>'; // Vyčistiť a naplniť kategórie
        clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>'; // Vyčistiť skupiny
        clubGroupSelect.disabled = true; // Zakázať výber skupiny
        orderInGroupInput.value = ''; // Vyčistiť poradie
        populateCategorySelect(clubCategorySelect); // Naplniť kategórie
        openModal(clubModal);
    });

    // Event listener pre zmenu kategórie v modálnom okne klubu
    clubCategorySelect.addEventListener('change', async () => {
        const selectedCategoryId = clubCategorySelect.value;
        if (selectedCategoryId) {
            await populateGroupSelect(selectedCategoryId, clubGroupSelect);
            clubGroupSelect.disabled = false;
        } else {
            clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            clubGroupSelect.disabled = true;
        }
    });

    async function editClub(clubId) {
        try {
            const clubDoc = await getDoc(doc(clubsCollectionRef, clubId));
            if (clubDoc.exists()) {
                const clubData = clubDoc.data();
                clubModalTitle.textContent = 'Upraviť tím';
                clubNameField.style.display = 'block';
                clubAssignmentFields.style.display = 'block';
                unassignedClubField.style.display = 'none';

                clubNameInput.value = clubData.name || '';
                clubCategorySelect.disabled = false; // Povoliť výber kategórie
                await populateCategorySelect(clubCategorySelect, clubData.categoryId);
                
                if (clubData.categoryId) {
                    await populateGroupSelect(clubData.categoryId, clubGroupSelect, clubData.groupId);
                    clubGroupSelect.disabled = false;
                } else {
                    clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    clubGroupSelect.disabled = true;
                }
                orderInGroupInput.value = clubData.orderInGroup || '';

                clubForm.dataset.editingId = clubId; // Ulož ID upravovaného klubu
                openModal(clubModal);
            } else {
                alert("Tím sa nenašiel.");
            }
        } catch (error) {
            console.error("Chyba pri načítaní dát tímu pre úpravu: ", error);
            alert("Vyskytla sa chyba pri načítaní dát tímu. Skúste to znova.");
        }
    }

    async function deleteClub(clubId) {
        if (confirm('Naozaj chcete vymazať tento tím?')) {
            try {
                await deleteDoc(doc(clubsCollectionRef, clubId));
                alert('Tím úspešne vymazaný!');
                await populateClubsForTable(); // Aktualizovať tabuľku
            } catch (error) {
                console.error("Chyba pri mazaní tímu: ", error);
                alert("Chyba pri mazaní tímu. Pozrite konzolu pre detaily.");
            }
        }
    }

    // --- Event listener pre odoslanie formulára klubu ---
    clubForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const editingId = clubForm.dataset.editingId;
        const clubName = clubNameInput.value.trim();
        const categoryId = clubCategorySelect.value;
        const groupId = clubGroupSelect.value;
        const orderInGroup = orderInGroupInput.value ? parseInt(orderInGroupInput.value) : null;

        if (!clubName || !categoryId || !groupId || orderInGroup === null) {
            alert('Prosím, vyplňte všetky polia (Názov tímu/klubu, Kategória, Skupina, Poradie v skupine).');
            return;
        }

        const clubData = {
            name: clubName,
            categoryId: categoryId,
            groupId: groupId,
            orderInGroup: orderInGroup,
            updatedAt: new Date()
        };

        try {
            if (editingId) {
                await setDoc(doc(clubsCollectionRef, editingId), clubData, { merge: true });
                alert('Tím úspešne aktualizovaný!');
            } else {
                clubData.createdAt = new Date();
                await addDoc(clubsCollectionRef, clubData);
                alert('Nový tím úspešne pridaný!');
            }
            closeModal(clubModal);
            await populateClubsForTable(); // Aktualizovať tabuľku
            populateUnassignedClubsSelect(); // Aktualizovať zoznam nepriradených klubov
        } catch (error) {
            console.error("Chyba pri ukladaní tímu: ", error);
            alert("Chyba pri ukladaní tímu. Pozrite konzolu pre detaily.");
        }
    });

    // --- Zatváranie modálneho okna klubu ---
    closeClubModalButton.addEventListener('click', () => {
        closeModal(clubModal);
        clubForm.dataset.editingId = ''; // Vyčisti ID upravovaného klubu
    });

    // --- Filtrovanie a triedenie tabuľky ---
    let currentFilterType = null;
    let currentFilterValue = null;

    createdTeamsTableHeader.querySelectorAll('th[data-filter-type]').forEach(header => {
        header.addEventListener('click', async (e) => {
            const filterType = e.target.dataset.filterType;
            if (filterType) {
                currentFilterType = filterType;
                filterModalTitle.textContent = `Filter podľa ${filterType === 'teamName' ? 'názvu tímu' : filterType === 'category' ? 'kategórie' : 'skupiny'}`;
                clubNameField.style.display = 'none';
                clubAssignmentFields.style.display = 'none';
                unassignedClubField.style.display = 'none';
                clubFilterContent.style.display = 'block';

                filterSelect.innerHTML = '<option value="">-- Zobraziť všetko --</option>';

                let options = new Set();
                if (filterType === 'teamName') {
                    const snapshot = await getDocs(clubsCollectionRef);
                    snapshot.forEach(doc => options.add(doc.data().name));
                } else if (filterType === 'category') {
                    const snapshot = await getDocs(categoriesCollectionRef);
                    snapshot.forEach(doc => options.add(doc.data().name));
                } else if (filterType === 'group') {
                    const snapshot = await getDocs(groupsCollectionRef);
                    snapshot.forEach(doc => options.add(doc.data().name));
                }

                Array.from(options).sort().forEach(optionValue => {
                    const option = document.createElement('option');
                    option.value = optionValue;
                    option.textContent = optionValue;
                    filterSelect.appendChild(option);
                });

                openModal(clubModal); // Používame rovnaký modal, ale s iným obsahom
            }
        });
    });

    filterSelect.addEventListener('change', async () => {
        currentFilterValue = filterSelect.value;
        if (currentFilterType === 'category') {
            await populateClubsForTable(currentFilterValue, null);
        } else if (currentFilterType === 'group') {
            // Pre filtrovanie podľa skupiny by sme potrebovali aj kategóriu,
            // čo je tu zložitejšie bez globálneho stavu.
            // Zatiaľ budeme filtrovať len podľa skupiny, ak je to možné.
            await populateClubsForTable(null, currentFilterValue);
        } else if (currentFilterType === 'teamName') {
            // Filtrovanie podľa názvu tímu je trochu zložitejšie,
            // pretože Firestore nepodporuje "contains" na začiatku.
            // Buď načítame všetko a filtrujeme na klientovi, alebo použijeme presnú zhodu.
            // Pre jednoduchosť zatiaľ filtrujeme presnou zhodou.
            const q = query(clubsCollectionRef, where("name", "==", currentFilterValue));
            const snapshot = await getDocs(q);
            createdTeamsTableBody.innerHTML = '';
            if (snapshot.empty) {
                createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Žiadne tímy na zobrazenie.</td></tr>';
            } else {
                const club = snapshot.docs[0].data();
                const row = createdTeamsTableBody.insertRow();
                row.innerHTML = `
                    <td>${club.name}</td>
                    <td>${club.categoryId || 'Nepriradené'}</td>
                    <td>${club.groupId || 'Nepriradené'}</td>
                    <td>${club.orderInGroup || ''}</td>
                    <td class="schedule-cell-actions">
                        <button class="edit-btn" data-id="${snapshot.docs[0].id}">Upraviť</button>
                        <button class="delete-btn" data-id="${snapshot.docs[0].id}">Vymazať</button>
                    </td>
                `;
            }
        }
        closeModal(clubModal); // Zatvorí modal po výbere filtra
    });

    clearFiltersButton.addEventListener('click', async () => {
        currentFilterType = null;
        currentFilterValue = null;
        await populateClubsForTable(); // Znova načítaj všetky tímy
    });


    // Inicializácia zobrazenia tímov pri načítaní stránky
    await populateClubsForTable();
    await populateUnassignedClubsSelect(); // Načítaj nepriradené kluby pri štarte
});
