import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, populateTeamNumberSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where } from './spravca-turnaja-common.js';

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

    // NOVÉ REFERENCIE PRE TÍMY (len poradové čísla)
    const team1NumberSelect = document.getElementById('team1NumberSelect');
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

    // Event listener pre tlačidlo "Pridať"
    addButton.addEventListener('click', () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas / dopravu';

        // Inicializácia selectov pre hlavnú kategóriu/skupinu zápasu
        populateCategorySelect(matchCategorySelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (voliteľné) --</option>';
        matchGroupSelect.disabled = true;

        // Vyčisti a zablokuj selecty pre poradové čísla tímov
        team1NumberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
        team1NumberSelect.disabled = true;
        team2NumberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
        team2NumberSelect.disabled = true;
        
        openModal(matchModal);
    });

    // Event listener pre zmenu hlavnej kategórie zápasu
    // Táto zmena bude plniť aj skupinu a následne čísla tímov
    matchCategorySelect.addEventListener('change', () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            populateGroupSelect(selectedCategoryId, matchGroupSelect);
            matchGroupSelect.disabled = false;
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (voliteľné) --</option>';
            matchGroupSelect.disabled = true;
            // Ak sa zruší kategória, vyčisti aj poradové čísla tímov
            team1NumberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
            team1NumberSelect.disabled = true;
            team2NumberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
            team2NumberSelect.disabled = true;
        }
    });

    // Event listener pre zmenu hlavnej skupiny zápasu
    // Táto zmena bude plniť selecty pre poradové čísla tímov
    matchGroupSelect.addEventListener('change', () => {
        const selectedCategoryId = matchCategorySelect.value;
        const selectedGroupId = matchGroupSelect.value;

        if (selectedCategoryId && selectedGroupId) {
            populateTeamNumberSelect(selectedCategoryId, selectedGroupId, team1NumberSelect);
            populateTeamNumberSelect(selectedCategoryId, selectedGroupId, team2NumberSelect);
            team1NumberSelect.disabled = false;
            team2NumberSelect.disabled = false;
        } else {
            team1NumberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
            team1NumberSelect.disabled = true;
            team2NumberSelect.innerHTML = '<option value="">-- Vyberte poradové číslo --</option>';
            team2NumberSelect.disabled = true;
        }
    });

    // Event listener pre zatvorenie modálneho okna
    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
    });

    // Funkcia na získanie názvu tímu na základe ID (poradového čísla) a metadát
    const getTeamName = async (categoryId, groupId, teamNumber) => {
        if (!categoryId || !groupId || !teamNumber) {
            return null;
        }

        try {
            // Nájdeme kategóriu
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? (categoryDoc.data().name || categoryId) : categoryId;

            // Nájdeme skupinu
            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            const groupName = groupDoc.exists() ? (groupDoc.data().name || groupId) : groupId;

            // Nájdeme tím (club) podľa čísla v danej skupine
            const q = query(
                clubsCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId),
                where("orderNumber", "==", parseInt(teamNumber)) // Používame orderNumber ako číslo
            );
            const querySnapshot = await getDocs(q);
            let teamName = `Tím ${teamNumber}`; // Predvolený názov ak nenájdeme konkrétny názov tímu

            if (!querySnapshot.empty) {
                const teamDoc = querySnapshot.docs[0].data();
                if (teamDoc.name) {
                    teamName = teamDoc.name;
                }
            }
            
            // Konštruujeme výsledný názov tímu
            return `${categoryName} - ${groupName} - ${teamName}`;
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu: ", error);
            return `Chyba Tímu ${teamNumber}`;
        }
    };


    // Event listener pre odoslanie formulára
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Kategória a skupina sa berú z hlavných selectov zápasu
        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        
        const team1Number = team1NumberSelect.value;
        const team2Number = team2NumberSelect.value;

        let team1Name = null;
        let team2Name = null;

        // Získanie názvov tímov na základe vybraných ID z hlavnej kategórie/skupiny
        if (matchCategory && matchGroup && team1Number) {
            team1Name = await getTeamName(matchCategory, matchGroup, team1Number);
        }
        if (matchCategory && matchGroup && team2Number) {
            team2Name = await getTeamName(matchCategory, matchGroup, team2Number);
        }

        const matchData = {
            description: matchDescriptionInput.value,
            date: matchDateInput.value,
            time: matchTimeInput.value,
            location: matchLocationInput.value,
            categoryId: matchCategory, // Hlavná kategória zápasu
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroup || null, // Hlavná skupina zápasu
            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text : null,
            
            // Ukladáme ID hlavnej kategórie/skupiny pre oba tímy
            team1Category: matchCategory,
            team1Group: matchGroup,
            team1Number: team1Number,
            team1Name: team1Name,
            
            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: team2Number,
            team2Name: team2Name,

            createdAt: new Date()
        };

        console.log('Dáta zápasu/dopravy na uloženie:', matchData);

        closeModal(matchModal);
        alert("Zápas/doprava by sa uložila! (Pozri konzolu)");
    });
});
