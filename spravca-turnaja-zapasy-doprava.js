import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, populateTeamNumberSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc } from './spravca-turnaja-common.js';
// ^^^^^^^^^^ UISTITE SA, ŽE deleteDoc JE TIEŽ IMPORTED

document.addEventListener('DOMContentLoaded', async () => { // Pridané 'async'
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // TENTO RIADOK JE PRÍČINOU PROBLÉMOV. MUSÍ BYŤ ODSTRÁNENÝ!
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
    const matchesContainer = document.getElementById('matchesContainer'); // Nová referencia

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

    // --- Funkcia na načítanie a zobrazenie zápasov ---
    async function displayMatches() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '<p>Načítavam zápasy...</p>';
        try {
            const q = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("time", "asc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                matchesContainer.innerHTML = '<p>Žiadne zápasy ani informácie o doprave zatiaľ.</p>';
                return;
            }

            let matchesHtml = '<table><thead><tr><th>Dátum</th><th>Čas</th><th>Miesto</th><th>Kategória/Skupina</th><th>Tím 1</th><th>Tím 2</th><th>Akcie</th></tr></thead><tbody>';

            querySnapshot.docs.forEach(doc => {
                const match = doc.data();
                const matchId = doc.id;

                const formattedDate = match.date || 'N/A';
                const formattedTime = match.time || 'N/A';

                const team1Display = match.team1DisplayName || `Tím ${match.team1Number || '?'}`; // Použijeme display name
                const team1ClubName = match.team1ClubName || ''; // Skutočný názov tímu
                
                const team2Display = match.team2DisplayName || `Tím ${match.team2Number || '?'}`;
                const team2ClubName = match.team2ClubName || ''; 

                matchesHtml += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${formattedTime}</td>
                        <td>${match.location || 'N/A'}</td>
                        <td>${match.categoryName || 'N/A'} ${match.groupName ? ` (${match.groupName})` : ''}</td>
                        <td>
                            ${team1Display}<br>
                            ${team1ClubName ? `<small>(${team1ClubName})</small>` : ''}
                        </td>
                        <td>
                            ${team2Display}<br>
                            ${team2ClubName ? `<small>(${team2ClubName})</small>` : ''}
                        </td>
                        <td>
                            <button class="edit-btn" data-id="${matchId}">Upraviť</button>
                            <button class="delete-btn" data-id="${matchId}">Vymazať</button>
                        </td>
                    </tr>
                `;
            });
            
            matchesHtml += '</tbody></table>';
            matchesContainer.innerHTML = matchesHtml;

            matchesContainer.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (event) => editMatch(event.target.dataset.id));
            });
            matchesContainer.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (event) => deleteMatch(event.target.dataset.id));
            });

        } catch (error) {
            console.error("Chyba pri načítaní zápasov: ", error);
            matchesContainer.innerHTML = '<p>Chyba pri načítaní zápasov.</p>';
        }
    }

    async function editMatch(matchId) {
        try {
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDoc = await getDoc(matchDocRef);

            if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                matchIdInput.value = matchId;
                matchModalTitle.textContent = 'Upraviť zápas / dopravu';

                matchDateInput.value = matchData.date || '';
                matchTimeInput.value = matchData.time || '';
                matchLocationInput.value = matchData.location || '';

                await populateCategorySelect(matchCategorySelect, matchData.categoryId);
                if (matchData.categoryId) {
                    await populateGroupSelect(matchData.categoryId, matchGroupSelect, matchData.groupId);
                    matchGroupSelect.disabled = false;
                } else {
                    matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    matchGroupSelect.disabled = true;
                }

                // Dôležité: Načítajte poradové čísla tímov, nie ich názvy pre formulár
                team1NumberInput.value = matchData.team1Number || '';
                team2NumberInput.value = matchData.team2Number || '';

                openModal(matchModal);
            } else {
                alert("Zápas sa nenašiel.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát zápasu pre úpravu: ", error);
            alert("Vyskytla sa chyba pri načítavaní dát zápasu. Skúste to znova.");
        }
    }

    async function deleteMatch(matchId) {
        if (confirm('Naozaj chcete vymazať tento zápas?')) {
            try {
                await deleteDoc(doc(matchesCollectionRef, matchId));
                alert('Zápas úspešne vymazaný!');
                displayMatches(); // Obnovíme zoznam zápasov
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        }
    }


    // --- Inicializácia po načítaní stránky ---
    await displayMatches(); 


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

    // Event listener pre zatvorenie modálneho okna
    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatches(); 
    });

// Funkcia na získanie názvu tímu na základe ID (poradového čísla) a metadát
    const getTeamName = async (categoryId, groupId, teamNumber) => {
        if (!categoryId || !groupId || !teamNumber) {
            return { fullDisplayName: null, clubName: null };
        }

        try {
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? (categoryDoc.data().name || categoryId) : categoryId;

            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            const groupData = groupDoc.exists() ? groupDoc.data() : null;
            const groupName = groupData ? (groupData.name || groupId) : groupId;

            // --- KĽÚČOVÁ ČASŤ PRE ZÍSKANIE SKUTOČNÉHO NÁZVU TÍMU ---
            let clubName = `Tím ${teamNumber}`; // Defaultná hodnota, ak sa klub nenájde

            // Dotaz na kolekciu 'clubs'
            const clubsQuery = query(
                clubsCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId),
                // UISTITE SA, ŽE "orderNumber" JE SPRÁVNE POLE VO VAŠEJ KOLEKCII CLUBS A JEHO TYP JE NUMBER
                where("orderNumber", "==", parseInt(teamNumber)) // Použite parseInt pre číslo
            );
            const clubsSnapshot = await getDocs(clubsQuery);

            if (!clubsSnapshot.empty) {
                // Našli sme aspoň jeden tím zodpovedajúci kritériám
                const teamDocData = clubsSnapshot.docs[0].data(); // Vezmeme prvý nájdený tím
                if (teamDocData.name) {
                    clubName = teamDocData.name; // Nastavíme skutočný názov tímu
                }
            } else {
                console.warn(`Tím s číslom ${teamNumber} v kategórii ${categoryId} a skupine ${groupId} sa nenašiel. Používam fallback: "${clubName}"`);
            }
            // --- KONIEC KĽÚČOVEJ ČASTI ---


            // Spracovanie názvu kategórie (napr. "U12 CH" -> "U12CH")
            let shortCategoryName = categoryName;
            if (shortCategoryName) {
                shortCategoryName = shortCategoryName.replace(/U(\d+)\s*([CHZ])/i, 'U$1$2').toUpperCase();
            }

            // Spracovanie názvu skupiny (napr. "skupina A" -> "A")
            let shortGroupName = '';
            if (groupName) {
                const match = groupName.match(/(?:skupina\s*)?([A-Z])/i);
                if (match && match[1]) {
                    shortGroupName = match[1].toUpperCase();
                }
            }
            
            const fullDisplayName = `${shortCategoryName} ${shortGroupName}${teamNumber}`;
            
            return {
                fullDisplayName: fullDisplayName, // Názov ako "U12CH A1"
                clubName: clubName // Skutočný názov klubu ako "TJ Jednota Žilina"
            };
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu: ", error);
            return { fullDisplayName: `Chyba`, clubName: `Chyba` };
        }
    };    
    
// Event listener pre odoslanie formulára
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        
        const team1Number = team1NumberInput.value;
        const team2Number = team2NumberInput.value;

        if (!matchCategory || !matchGroup || !team1Number || !team2Number) {
            alert('Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2).');
            return;
        }

                let team1Result = null;
        let team2Result = null;

        // Získanie názvov tímov
        try {
            team1Result = await getTeamName(matchCategory, matchGroup, team1Number);
            team2Result = await getTeamName(matchCategory, matchGroup, team2Number);
        } catch (error) {
            console.error("Chyba pri získavaní názvov tímov:", error);
            alert("Vyskytla sa chyba pri získavaní názvov tímov. Skúste to znova.");
            return;
        }
        
        // Voliteľná validácia: Ak sa názov tímu nezískal (tím neexistuje)
        if (!team1Result || !team1Result.fullDisplayName || !team2Result || !team2Result.fullDisplayName) {
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
            team1DisplayName: team1Result.fullDisplayName, // Použijeme nový názov
            team1ClubName: team1Result.clubName, // Nové pole pre skutočný názov klubu
            
            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: parseInt(team2Number),
            team2DisplayName: team2Result.fullDisplayName, // Použijeme nový názov
            team2ClubName: team2Result.clubName, // Nové pole pre skutočný názov klubu

            createdAt: new Date()
        };
        
        console.log('Dáta zápasu na uloženie:', matchData);

        try {
            if (matchIdInput.value) {
                await setDoc(doc(matchesCollectionRef, matchIdInput.value), matchData, { merge: true });
                alert('Zápas úspešne aktualizovaný!');
            } else {
                await addDoc(matchesCollectionRef, matchData);
                alert('Nový zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatches(); 
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });
});
