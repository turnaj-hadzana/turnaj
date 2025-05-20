import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, populateTeamNumberSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // TENTO RIADOK ODSTRÁŇTE ALEBO ZAKOMENTUJTE!
    // loadCategoriesTable(); 

    // Referencie na HTML elementy
    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateInput = document.getElementById('matchDate');
    const matchTimeInput = document.getElementById('matchTime');
    const matchLocationInput = document.getElementById('matchLocation');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');

    // Referencie pre inputy poradových čísiel tímov
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');


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

        populateCategorySelect(matchCategorySelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;

        team1NumberInput.value = '';
        team2NumberInput.value = '';
        
        openModal(matchModal);
    });

    // Event listener pre zmenu hlavnej kategórie zápasu
    matchCategorySelect.addEventListener('change', () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            populateGroupSelect(selectedCategoryId, matchGroupSelect);
            matchGroupSelect.disabled = false;
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
            team1NumberInput.value = '';
            team2NumberInput.value = '';
        }
    });

    // Event listener pre zmenu hlavnej skupiny zápasu
    matchGroupSelect.addEventListener('change', () => {
        // Logika tu už nemusí volať populateTeamNumberSelect
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
                where("orderNumber", "==", parseInt(teamNumber))
            );
            const querySnapshot = await getDocs(q);
            let teamName = `Tím ${teamNumber}`;

            if (!querySnapshot.empty) {
                const teamDoc = querySnapshot.docs[0].data();
                if (teamDoc.name) {
                    teamName = teamDoc.name;
                }
            }
            
            return `${categoryName} - ${groupName} - ${teamName}`;
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu: ", error);
            return `Chyba Tímu ${teamNumber}`;
        }
    };


    // Event listener pre odoslanie formulára
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        
        const team1Number = team1NumberInput.value;
        const team2Number = team2NumberInput.value;

        // Základná validácia
        if (!matchCategory || !matchGroup || !team1Number || !team2Number) {
            alert('Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2).');
            return;
        }

        let team1Name = null;
        let team2Name = null;

        // Získanie názvov tímov
        try {
            team1Name = await getTeamName(matchCategory, matchGroup, team1Number);
            team2Name = await getTeamName(matchCategory, matchGroup, team2Number);
        } catch (error) {
            console.error("Chyba pri získavaní názvov tímov:", error);
            alert("Vyskytla sa chyba pri získavaní názvov tímov. Skúste to znova.");
            return;
        }
        
        // Voliteľná validácia: Ak sa názov tímu nezískal (tím neexistuje)
        if (!team1Name || !team2Name) {
            alert('Jeden alebo oba tímy sa nenašli. Skontrolujte poradové čísla v danej kategórii a skupine.');
            return;
        }

        const matchData = {
            date: matchDateInput.value,
            time: matchTimeInput.value,
            location: matchLocationInput.value,
            categoryId: matchCategory,
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroup || null,
            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text : null,
            
            team1Category: matchCategory,
            team1Group: matchGroup,
            team1Number: parseInt(team1Number),
            team1Name: team1Name,
            
            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: parseInt(team2Number),
            team2Name: team2Name,

            createdAt: new Date()
        };

        console.log('Dáta zápasu na uloženie:', matchData);

        // --- Ukladanie do Firebase ---
        try {
            if (matchIdInput.value) {
                // Ak existuje matchId, ide o úpravu existujúceho zápasu
                await setDoc(doc(matchesCollectionRef, matchIdInput.value), matchData, { merge: true });
                alert('Zápas úspešne aktualizovaný!');
            } else {
                // Ak matchId neexistuje, ide o pridanie nového zápasu
                await addDoc(matchesCollectionRef, matchData);
                alert('Nový zápas úspešne pridaný!');
            }
            closeModal(matchModal);
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });
});
