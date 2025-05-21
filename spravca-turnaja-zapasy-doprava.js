import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, populateTeamNumberSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateInput = document.getElementById('matchDate');
    const matchStartTimeInput = document.getElementById('matchStartTime'); // Zmenené ID z matchTime
    const matchDurationInput = document.getElementById('matchDuration'); // Nový input
    const matchLocationInput = document.getElementById('matchLocation');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput'); // Opravené ID

    // Funkcia na získanie kompletného názvu tímu (s klubom)
    async function getTeamName(categoryId, groupId, teamNumber) {
        if (!categoryId || !groupId || !teamNumber) {
            return { fullDisplayName: `Neznámy tím`, clubName: `Neznámy klub` };
        }
        try {
            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            if (!groupDoc.exists()) {
                console.warn(`Skupina s ID ${groupId} nebola nájdená.`);
                return { fullDisplayName: `Tím ${teamNumber} (neznáma skupina)`, clubName: `Neznámy klub` };
            }
            const groupData = groupDoc.data();
            const team = groupData.teams.find(t => t.teamNumber === parseInt(teamNumber));

            if (team) {
                const clubDoc = await getDoc(doc(clubsCollectionRef, team.clubId));
                const clubName = clubDoc.exists() ? clubDoc.data().name : `Neznámy klub (ID: ${team.clubId})`;
                return {
                    fullDisplayName: `Tím ${teamNumber} (${clubName})`,
                    clubName: clubName // Vraciam aj názov klubu
                };
            } else {
                return { fullDisplayName: `Tím ${teamNumber} (nie je v skupine)`, clubName: `Neznámy klub` };
            }
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu:", error);
            return { fullDisplayName: `Chyba načítania tímu`, clubName: `Neznámy klub` };
        }
    }

    // Funkcia na zobrazenie rozvrhu zápasov
    async function displayMatchesAsSchedule() {
        const matchesContainer = document.getElementById('matchesContainer');
        matchesContainer.innerHTML = 'Načítavam zápasy...';

        try {
            const q = query(matchesCollectionRef, orderBy('date'), orderBy('location'), orderBy('startTime'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                matchesContainer.innerHTML = '<p>Žiadne zápasy nie sú naplánované.</p>';
                return;
            }

            const matches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const locations = [...new Set(matches.map(m => m.location))].sort();
            const dates = [...new Set(matches.map(m => m.date))].sort(); // Zoraď dátumy

            // Nájdite najskorší začiatok a najneskorší koniec pre určenie časového rozsahu
            let minHour = 24;
            let maxHour = 0;
            matches.forEach(match => {
                const startTimeParts = match.startTime.split(':').map(Number);
                const startHour = startTimeParts[0];
                const startMinute = startTimeParts[1];
                const durationHours = Math.floor(match.duration / 60);
                const durationMinutes = match.duration % 60;

                const endTime = new Date();
                endTime.setHours(startHour, startMinute + durationMinutes, 0, 0); // Použijeme pôvodné minúty + trvanie
                endTime.setHours(endTime.getHours() + durationHours);

                minHour = Math.min(minHour, startHour);
                maxHour = Math.max(maxHour, endTime.getHours() + (endTime.getMinutes() > 0 ? 1 : 0)); // Ak sú minúty, zaokrúhli hore
            });

            // Ak nie sú zápasy, ale chceme zobraziť prázdny rozvrh, nastavte predvolený rozsah
            if (minHour === 24) minHour = 8;
            if (maxHour === 0) maxHour = 20;

            const timeSlots = [];
            for (let h = minHour; h <= maxHour; h++) {
                timeSlots.push(`${String(h).padStart(2, '0')}:00`);
            }

            let html = `
                <div class="schedule-table-wrapper">
                    <table class="match-schedule-table">
                        <thead>
                            <tr>
                                <th class="sticky-column">Miesto / Čas</th>
                                ${dates.map(date => `<th colspan="${timeSlots.length}">${date}</th>`).join('')}
                            </tr>
                            <tr>
                                <th class="sticky-column"></th>
                                ${dates.map(() => timeSlots.map(ts => `<th>${ts}</th>`).join('')).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;

            locations.forEach(location => {
                html += `<tr><td class="sticky-column">${location}</td>`;
                dates.forEach(date => {
                    timeSlots.forEach(timeSlot => {
                        html += `<td class="schedule-cell" data-location="${location}" data-date="${date}" data-timeslot="${timeSlot}">`;
                        // Nájdeme všetky zápasy pre túto bunku (miesto, dátum, časový slot)
                        const relevantMatches = matches.filter(m =>
                            m.location === location &&
                            m.date === date &&
                            m.startTime.substring(0, 2) === timeSlot.substring(0, 2) // Len hodiny
                        );

                        // Skontrolujeme, či zápasy v tomto slote neprekrývajú iné.
                        // Pre jednoduchosť budeme ukladať pozície zápasov do dočasného poľa.
                        const placedMatches = [];

                        relevantMatches.forEach(match => {
                            const startTimeParts = match.startTime.split(':').map(Number);
                            const startHour = startTimeParts[0];
                            const startMinute = startTimeParts[1];
                            const durationMinutes = match.duration;

                            // Vypočítame pozíciu a výšku zápasu v rámci hodinového slotu (alebo celej bunky)
                            // Šírka jednej hodiny v percentách (pre 15-minútové intervaly, ak by boli)
                            // Aktuálne bunky sú hodinové, takže šírka zápasu bude relatívna k celej bunke
                            const totalMinutesInHour = 60;
                            const startOffsetMinutes = startMinute; // Offset v minútach od začiatku hodiny
                            const leftPercentage = (startOffsetMinutes / totalMinutesInHour) * 100;
                            const widthPercentage = (durationMinutes / totalMinutesInHour) * 100;

                            // Pre zabránenie prekrývaniu môžeme rozdeliť bunku na "dráhy"
                            let track = 0;
                            let conflict = true;
                            while (conflict) {
                                conflict = false;
                                for (const pMatch of placedMatches) {
                                    // Kontrola prekrývania v čase a na rovnakej dráhe
                                    const pStart = pMatch.startMinute;
                                    const pEnd = pMatch.startMinute + pMatch.duration;
                                    const currentStart = startMinute;
                                    const currentEnd = startMinute + durationMinutes;

                                    if (track === pMatch.track && !(pEnd <= currentStart || currentEnd <= pStart)) {
                                        conflict = true;
                                        track++;
                                        break;
                                    }
                                }
                            }
                            placedMatches.push({
                                startMinute: startMinute,
                                duration: durationMinutes,
                                track: track,
                                match: match
                            });

                            const maxTracks = Math.max(...placedMatches.map(pm => pm.track)) + 1;
                            const topPercentage = (track / maxTracks) * 100; // Rozdelenie vertikálne
                            const heightPercentage = (1 / maxTracks) * 100;

                            html += `
                                <div class="schedule-cell-match"
                                    style="left: ${leftPercentage}%; width: ${widthPercentage}%;
                                           top: ${topPercentage}%; height: ${heightPercentage}%;
                                           position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
                                    <div class="schedule-cell-content">
                                        <div class="schedule-cell-time">${match.startTime} - ${new Date(new Date().setHours(startHour, startMinute + durationMinutes)).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div class="schedule-cell-category">${match.categoryName}</div>
                                        <div class="schedule-cell-teams">${match.team1DisplayName} vs ${match.team2DisplayName}</div>
                                        <div class="schedule-cell-club-names">${match.team1ClubName} vs ${match.team2ClubName}</div>
                                    </div>
                                    <div class="schedule-cell-actions">
                                        <button class="action-button edit-button" data-id="${match.id}">Upraviť</button>
                                        <button class="action-button delete-button" data-id="${match.id}">Vymazať</button>
                                    </div>
                                </div>
                            `;
                        });
                        html += `</td>`;
                    });
                });
                html += `</tr>`;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
            matchesContainer.innerHTML = html;

            document.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    editMatch(event.target.dataset.id);
                });
            });

            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    deleteMatch(event.target.dataset.id);
                });
            });

        } catch (error) {
            console.error("Chyba pri načítavaní zápasov: ", error);
            matchesContainer.innerHTML = '<p>Nastala chyba pri načítavaní zápasov.</p>';
        }
    }


    // Funkcia na úpravu zápasu
    async function editMatch(id) {
        try {
            const matchDoc = await getDoc(doc(matchesCollectionRef, id));
            if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                matchIdInput.value = id;
                matchDateInput.value = matchData.date;
                matchStartTimeInput.value = matchData.startTime;
                matchDurationInput.value = matchData.duration;
                matchLocationInput.value = matchData.location;

                // Vyplnenie kategórie a následne skupiny
                await populateCategorySelect(matchCategorySelect, matchData.categoryId);
                await populateGroupSelect(matchGroupSelect, matchData.categoryId, matchData.groupId);

                team1NumberInput.value = matchData.team1Number;
                team2NumberInput.value = matchData.team2Number;

                matchModalTitle.textContent = 'Upraviť zápas';
                openModal(matchModal);
            } else {
                alert('Zápas nebol nájdený.');
            }
        } catch (error) {
            console.error("Chyba pri načítaní zápasu na úpravu: ", error);
            alert("Chyba pri načítaní dát zápasu.");
        }
    }

    // Funkcia na vymazanie zápasu
    async function deleteMatch(id) {
        if (confirm('Naozaj chcete vymazať tento zápas?')) {
            try {
                await deleteDoc(doc(matchesCollectionRef, id));
                alert('Zápas úspešne vymazaný!');
                await displayMatchesAsSchedule(); // Znovu načítame rozvrh
            } catch (error) {
                console.error("Chyba pri vymazávaní zápasu: ", error);
                alert("Chyba pri vymazávaní zápasu.");
            }
        }
    }

    // Inicializácia filtrov a načítanie dát pri štarte
    await populateCategorySelect(matchCategorySelect);
    await populateGroupSelect(matchGroupSelect, matchCategorySelect.value); // Načíta skupiny pre vybranú kategóriu

    matchCategorySelect.addEventListener('change', async () => {
        await populateGroupSelect(matchGroupSelect, matchCategorySelect.value);
    });

    addButton.addEventListener('click', () => {
        // Resetovanie formulára
        matchIdInput.value = '';
        matchDateInput.value = '';
        matchStartTimeInput.value = '';
        matchDurationInput.value = '60';
        matchLocationInput.value = '';
        matchCategorySelect.value = ''; // Resetovať kategóriu
        matchGroupSelect.innerHTML = '<option value="">Vyberte skupinu</option>'; // Vyprázdniť skupiny
        team1NumberInput.value = '';
        team2NumberInput.value = '';

        matchModalTitle.textContent = 'Pridať nový zápas';
        openModal(matchModal);
    });

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
    });

    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchId = matchIdInput.value;
        const matchDate = matchDateInput.value;
        const matchStartTime = matchStartTimeInput.value;
        const matchDuration = matchDurationInput.value;
        const matchLocation = matchLocationInput.value;
        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        const team1Number = team1NumberInput.value;
        const team2Number = team2NumberInput.value; // Opravené ID

        if (!matchDate || !matchStartTime || !matchDuration || !matchLocation || !matchCategory || !matchGroup || !team1Number || !team2Number) {
            alert('Prosím, vyplňte všetky polia.');
            return;
        }

        // Kontrola, či sa tímy nelíšia len poradím
        if (parseInt(team1Number) === parseInt(team2Number)) {
            alert('Tím nemôže hrať sám proti sebe. Prosím, vyberte rôzne tímy.');
            return;
        }

        const team1Result = await getTeamName(matchCategory, matchGroup, team1Number);
        const team2Result = await getTeamName(matchCategory, matchGroup, team2Number);

        // Kontrola, či sa načítali názvy klubov
        if (!team1Result.clubName || !team2Result.clubName) {
            alert('Nepodarilo sa načítať názvy klubov pre jeden alebo oba tímy. Skontrolujte kategóriu, skupinu a čísla tímov.');
            return;
        }

        // AK SEM PRIDÁVAME NOVÚ KONTROLU
        // Skontrolujeme, či kluby už proti sebe hrali v rovnakej kategórii
        const club1Name = team1Result.clubName;
        const club2Name = team2Result.clubName;

        // Nemôžu hrať rovnaké kluby
        if (club1Name === club2Name) {
             alert('Tím nemôže hrať sám proti sebe. Prosím, vyberte rôzne tímy.');
             return;
        }

        // Vyhľadanie existujúcich zápasov v rovnakej kategórii
        const q = query(
            matchesCollectionRef,
            where('categoryId', '==', matchCategory) // Zápasy v rovnakej kategórii
        );
        const querySnapshot = await getDocs(q);

        let alreadyPlayed = false;
        querySnapshot.forEach(docSnap => {
            const existingMatch = docSnap.data();
            // Preskočíme aktuálny upravovaný zápas, aby sa neblokoval sám sebou
            if (matchId && docSnap.id === matchId) {
                return;
            }

            // Skontrolujeme obe možné kombinácie (A vs B alebo B vs A)
            // Získame názvy klubov z existujúceho zápasu
            const existingClub1Name = existingMatch.team1ClubName;
            const existingClub2Name = existingMatch.team2ClubName;

            // Vytvoríme zoradené polia pre porovnanie
            const clubsInExistingMatch = [existingClub1Name, existingClub2Name].sort();
            const clubsInNewMatch = [club1Name, club2Name].sort();

            if (clubsInExistingMatch[0] === clubsInNewMatch[0] && clubsInExistingMatch[1] === clubsInNewMatch[1]) {
                alreadyPlayed = true;
            }
        });

        if (alreadyPlayed) {
            alert(`Kluby "${club1Name}" a "${club2Name}" už proti sebe v tejto kategórii hrali.`);
            return; // Zastavíme ukladanie
        }
        // KONIEC NOVEJ KONTROLY

        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: parseInt(matchDuration),
            location: matchLocation,
            categoryId: matchCategory, // Toto je ID kategórie
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,

            groupId: matchGroup || null,
            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text.replace(/skupina /gi, '').trim() : null,

            team1Category: matchCategory, // Toto sú duplicitné dáta pre jednoduchšie filtrovanie
            team1Group: matchGroup,
            team1Number: parseInt(team1Number),
            team1DisplayName: team1Result.fullDisplayName,
            team1ClubName: team1Result.clubName,

            team2Category: matchCategory, // Toto sú duplicitné dáta pre jednoduchšie filtrovanie
            team2Group: matchGroup,
            team2Number: parseInt(team2Number),
            team2DisplayName: team2Result.fullDisplayName,
            team2ClubName: team2Result.clubName,

            createdAt: new Date()
        };

        console.log('Dáta zápasu na uloženie:', matchData);

        try {
            if (matchIdInput.value) {
                // Ak ID existuje, aktualizujeme existujúci dokument
                await setDoc(doc(matchesCollectionRef, matchIdInput.value), matchData, { merge: true });
                alert('Zápas úspešne aktualizovaný!');
            } else {
                // Ak ID neexistuje, pridáme nový dokument
                await addDoc(matchesCollectionRef, matchData);
                alert('Nový zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule(); // Znovu načítame rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });

    await displayMatchesAsSchedule(); // Načíta zápasy pri štarte stránky
});
