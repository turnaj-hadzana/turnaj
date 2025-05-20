import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, populateTeamNumberSelect, getDocs, doc, setDoc, addDoc, getDoc } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Referencie na HTML elementy
    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDescriptionInput = document.getElementById('matchDescription');
    const matchDateInput = document.getElementById('matchDate');
    const matchTimeInput = document.getElementById('matchTime');
    const matchLocationInput = document.getElementById('matchLocation');
    const matchCategorySelect = document.getElementById('matchCategory'); // Pre hlavnú kategóriu zápasu
    const matchGroupSelect = document.getElementById('matchGroup');     // Pre hlavnú skupinu zápasu
    const matchModalTitle = document.getElementById('matchModalTitle');

    // NOVÉ REFERENCIE PRE TÍMY
    const team1CategorySelect = document.getElementById('team1CategorySelect');
    const team1GroupSelect = document.getElementById('team1GroupSelect');
    const team1NumberSelect = document.getElementById('team1NumberSelect');
    const team2CategorySelect = document.getElementById('team2CategorySelect');
    const team2GroupSelect = document.getElementById('team2GroupSelect');
    const team2NumberSelect = document.getElementById('team2NumberSelect');


    // Zobrazenie správnej sekcie po načítaní
    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // Funkcia na resetovanie a inicializáciu selectov pre tím
    const resetAndPopulateTeamSelects = (categorySelect, groupSelect, numberSelect) => {
        populateCategorySelect(categorySelect);
        groupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        groupSelect.disabled = true;
        numberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
        numberSelect.disabled = true;
    };

    // Event listener pre tlačidlo "Pridať"
    addButton.addEventListener('click', () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas / dopravu';

        // Inicializácia selectov pre hlavnú kategóriu/skupinu zápasu
        populateCategorySelect(matchCategorySelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (voliteľné) --</option>';
        matchGroupSelect.disabled = true;

        // Inicializácia selectov pre Tím 1
        resetAndPopulateTeamSelects(team1CategorySelect, team1GroupSelect, team1NumberSelect);
        // Inicializácia selectov pre Tím 2
        resetAndPopulateTeamSelects(team2CategorySelect, team2GroupSelect, team2NumberSelect);
        
        openModal(matchModal);
    });

    // Event listener pre zmenu hlavnej kategórie zápasu
    matchCategorySelect.addEventListener('change', () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            populateGroupSelect(selectedCategoryId, matchGroupSelect);
            matchGroupSelect.disabled = false;
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (voliteľné) --</option>';
            matchGroupSelect.disabled = true;
        }
    });

    // Funkcia pre pridanie event listenerov pre dynamické plnenie selectov tímu
    const setupTeamSelectListeners = (categorySelect, groupSelect, numberSelect) => {
        categorySelect.addEventListener('change', () => {
            const selectedCategoryId = categorySelect.value;
            if (selectedCategoryId) {
                populateGroupSelect(selectedCategoryId, groupSelect);
                groupSelect.disabled = false;
                numberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
                numberSelect.disabled = true; // Zablokuj číslo, kým sa nevyberie skupina
            } else {
                groupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                groupSelect.disabled = true;
                numberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
                numberSelect.disabled = true;
            }
        });

        groupSelect.addEventListener('change', () => {
            const selectedCategoryId = categorySelect.value;
            const selectedGroupId = groupSelect.value;
            if (selectedCategoryId && selectedGroupId) {
                populateTeamNumberSelect(selectedCategoryId, selectedGroupId, numberSelect);
                numberSelect.disabled = false;
            } else {
                numberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
                numberSelect.disabled = true;
            }
        });
    };

    // Nastavenie listenerov pre Tím 1
    setupTeamSelectListeners(team1CategorySelect, team1GroupSelect, team1NumberSelect);
    // Nastavenie listenerov pre Tím 2
    setupTeamSelectListeners(team2CategorySelect, team2GroupSelect, team2NumberSelect);


    // Event listener pre zatvorenie modálneho okna
    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
    });

    // Funkcia na získanie názvu tímu na základe ID (poradového čísla) a metadát
    const getTeamName = async (categoryId, groupId, teamNumber) => {
        if (!categoryId || !groupId || !teamNumber) {
            return null; // Alebo nejaký predvolený názov
        }

        try {
            // Nájdeme kategóriu
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? (categoryDoc.data().name || categoryId) : categoryId;

            // Nájdeme skupinu
            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            const groupName = groupDoc.exists() ? (groupDoc.data().name || groupId) : groupId;

            // Nájdeme tím (club) podľa čísla, predpokladáme 'orderNumber' alebo 'teamNumber'
            // Mohlo by to byť aj ID dokumentu, ale to by sa nezobrazilo ako "Tím 1"
            const q = query(
                clubsCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId),
                where("orderNumber", "==", parseInt(teamNumber)) // Používame orderNumber ako číslo
            );
            const querySnapshot = await getDocs(q);
            let teamName = `Tím ${teamNumber}`; // Predvolený názov ak nenájdeme konkrétny názov tímu

            if (!querySnapshot.empty) {
                // Ak nájdeme tím, môžeme použiť jeho názov, ak existuje
                const teamDoc = querySnapshot.docs[0].data();
                if (teamDoc.name) {
                    teamName = teamDoc.name; // Ak má tím vlastný názov
                }
            }
            
            // Konštruujeme výsledný názov tímu
            // Napr. "Kategória_NázovSkupiny_Tím_PoradovéČíslo" alebo len "NázovKlubu"
            // Použijeme formát "Kategória: [NázovKategórie] Skupina: [NázovSkupiny] Tím: [NázovTímu/PoradovéČíslo]"
            return `${categoryName} - ${groupName} - ${teamName}`;
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu: ", error);
            return `Chyba Tímu ${teamNumber}`;
        }
    };


    // Event listener pre odoslanie formulára
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const team1Category = team1CategorySelect.value;
        const team1Group = team1GroupSelect.value;
        const team1Number = team1NumberSelect.value;

        const team2Category = team2CategorySelect.value;
        const team2Group = team2GroupSelect.value;
        const team2Number = team2NumberSelect.value;

        let team1Name = null;
        let team2Name = null;

        // Získanie názvov tímov na základe vybraných ID
        if (team1Category && team1Group && team1Number) {
            team1Name = await getTeamName(team1Category, team1Group, team1Number);
        }
        if (team2Category && team2Group && team2Number) {
            team2Name = await getTeamName(team2Category, team2Group, team2Number);
        }

        const matchData = {
            description: matchDescriptionInput.value,
            date: matchDateInput.value,
            time: matchTimeInput.value,
            location: matchLocationInput.value,
            categoryId: matchCategorySelect.value, // Hlavná kategória zápasu
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroupSelect.value || null, // Hlavná skupina zápasu
            groupName: matchGroupSelect.value ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text : null,
            
            team1Category: team1Category,
            team1Group: team1Group,
            team1Number: team1Number,
            team1Name: team1Name, // Dynamicky generovaný názov tímu
            
            team2Category: team2Category,
            team2Group: team2Group,
            team2Number: team2Number,
            team2Name: team2Name, // Dynamicky generovaný názov tímu

            createdAt: new Date()
        };

        console.log('Dáta zápasu/dopravy na uloženie:', matchData);

        closeModal(matchModal);
        alert("Zápas/doprava by sa uložila! (Pozri konzolu)");
    });
});
