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
    const matchesContainer = document.getElementById('matchesContainer');

    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- Funkcia na načítanie a zobrazenie zápasov ako rozvrh (miesto vs. čas/deň) ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '<p>Načítavam rozvrh zápasov...</p>';
        try {
            // Použite túto query ak ste vytvorili index:
            const q = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
            // Ak stále máte problémy s indexom, skúste na testovanie najprv načítavať len podľa dátumu:
            // const q = query(matchesCollectionRef, orderBy("date", "asc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                matchesContainer.innerHTML = '<p>Žiadne zápasy ani informácie o doprave zatiaľ.</p>';
                return;
            }

            const allMatches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const uniqueLocations = new Set();
            const uniqueDates = new Set();
            allMatches.forEach(match => {
                uniqueLocations.add(match.location);
                uniqueDates.add(match.date);
            });

            const sortedLocations = Array.from(uniqueLocations).sort();
            const sortedDates = Array.from(uniqueDates).sort();

            // Získame všetky unikátne celé hodiny pre každý deň (od najskoršieho začiatku do najneskoršieho konca)
            const dailyTimeRanges = new Map(); // Map<date, {minHour, maxHour}>
            allMatches.forEach(match => {
                const date = match.date;
                const [startH, startM] = match.startTime.split(':').map(Number);
                const duration = match.duration;

                const startTimeInMinutes = startH * 60 + startM;
                const endTimeInMinutes = startTimeInMinutes + duration;

                // maxHour by mala byť najbližšia celá hodina PRED koncom zápasu.
                // Ak zápas končí 8:00, maxHour by mala byť 8.
                // Ak zápas končí 8:01, maxHour by mala byť 9.
                let actualEndHour = Math.ceil(endTimeInMinutes / 60);

                if (!dailyTimeRanges.has(date)) {
                    dailyTimeRanges.set(date, { minHour: startH, maxHour: actualEndHour });
                } else {
                    const range = dailyTimeRanges.get(date);
                    range.minHour = Math.min(range.minHour, startH);
                    range.maxHour = Math.max(range.maxHour, actualEndHour);
                }
            });

            let scheduleHtml = '<div class="schedule-table-container">';
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
            scheduleHtml += '<th class="fixed-column">Miesto / Čas</th>';

            // Hlavičky pre dni a ich unikátne časy (iba celé hodiny)
            sortedDates.forEach(date => {
                const range = dailyTimeRanges.get(date);
                let hoursForDate = [];
                if (range) {
                    // ZMENA: Používame < range.maxHour pre správny počet hodinových slotov
                    for (let h = range.minHour; h < range.maxHour; h++) { 
                        hoursForDate.push(h);
                    }
                }

                const displayDateObj = new Date(date);
                const displayDay = String(displayDateObj.getDate()).padStart(2, '0');
                const displayMonth = String(displayDateObj.getMonth() + 1).padStart(2, '0');
                const displayYear = String(displayDateObj.getFullYear());
                const formattedDisplayDate = `${displayDay}. ${displayMonth}. ${displayYear}`;
                
                const colspan = hoursForDate.length;
                if (colspan > 0) {
                    scheduleHtml += `<th colspan="${colspan}">`;
                    scheduleHtml += `<div class="schedule-date-header">${formattedDisplayDate}</div>`;
//                    scheduleHtml += `<div class="schedule-date-header">${date}</div>`;
                    scheduleHtml += '<div class="schedule-times-row">';
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                    });
                    scheduleHtml += '</div>';
                    scheduleHtml += '</th>';
                } else {
                    scheduleHtml += `<th><div class="schedule-date-header">${formattedDisplayDate}</div><div class="schedule-times-row"><span></span></div></th>`;
//                    scheduleHtml += `<th><div class="schedule-date-header">${date}</div><div class="schedule-times-row"><span></span></div></th>`;
                }
            });
            scheduleHtml += '</tr></thead><tbody>';

            // Generovanie riadkov tabuľky (pre každé miesto)
            sortedLocations.forEach(location => {
                scheduleHtml += '<tr>';
                scheduleHtml += `<th class="fixed-column schedule-location-header">${location}</th>`;

                sortedDates.forEach(date => {
                    const range = dailyTimeRanges.get(date);
                    let hoursForDate = [];
                    if (range) {
                        for (let h = range.minHour; h < range.maxHour; h++) {
                            hoursForDate.push(h);
                        }
                    }
                    const colspan = hoursForDate.length;

                    if (colspan === 0) {
                        scheduleHtml += `<td><span class="no-match-placeholder"></span></td>`;
                        return;
                    }

                    // Vytvoríme jednu veľkú TD bunku pre každý deň a miesto
                    // Nastavíme overflow: visible, aby sa absolútne pozicionované prvky mohli vykresliť aj mimo hraníc, ak by to bolo potrebné pri ladení.
                    // Ale pre správne fungovanie scrollbaru by sme mali zabezpečiť, aby sa zmestili, alebo sa o ne postará JavaScript.
                    scheduleHtml += `<td colspan="${colspan}" style="position: relative; background-color: #f7f7f7;">`; // Removed overflow: hidden here for now

                    const matchesForLocationAndDate = allMatches.filter(match =>
                        match.location === location && match.date === date
                    );

                    // Nová logika pre správne umiestnenie zápasov
                    // Vytvoríme "sloty" pre každý hodinový segment v rámci dňa, každý slot je 260px široký
                    // a 170px vysoký (z CSS).
                    const CELL_WIDTH_PX = 260; // Šírka jednej TD bunky pre 1 hodinu
                    const CELL_HEIGHT_PX = 170; // Výška jednej TD bunky
                    const MINUTES_PER_CELL = 60; // Jedna bunka reprezentuje 60 minút
                    const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_CELL;

                    // Ukladáme informácie o obsadenosti pre každý slot (hodina_začiatku_dňa, pozícia_v_slote)
                    const occupiedSlots = new Map(); // Kľúč: hodina_index_v_dni, Hodnota: [ { startMin, endMin, top } ]

                    matchesForLocationAndDate.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    matchesForLocationAndDate.forEach(match => {
                        const [startH, startM] = match.startTime.split(':').map(Number);
                        const durationInMinutes = match.duration;

                        // Absolútny začiatok a koniec zápasu v minútach od polnoci
                        const absoluteStartMin = startH * 60 + startM;
                        const absoluteEndMin = absoluteStartMin + durationInMinutes;

                        // Nájdeme prvú hodinu v rámci tohto dňa
                        const firstHourInDay = range.minHour;

                        // Relatívny začiatok a koniec zápasu v minútach od začiatku prvého slotu v rámci daného dňa
                        const relativeStartMin = absoluteStartMin - (firstHourInDay * 60);
                        const relativeEndMin = absoluteEndMin - (firstHourInDay * 60);

                        // Spočítame pozície v pixeloch
                        const leftPx = relativeStartMin * PIXELS_PER_MINUTE;
                        const widthPx = durationInMinutes * PIXELS_PER_MINUTE;

                        // -------- Nová logika pre umiestnenie v rámci TD bunky (vertikálne prekrývanie) --------
                        let topOffset = 0; // Začiatočná pozícia zhora
                        let collisionDetected = true;
                        let maxAttempts = 5; // Obmedzenie pre pokusy zabrániť nekonečnej slučke
                        let currentAttempt = 0;

                        // Dynamicky určujeme "riadok" pre zápas, ak sa časovo prekrýva s iným zápasom
                        // Využijeme jednoduchý algoritmus pre umiestnenie:
                        // Skúšame nájsť voľné miesto odhora (topOffset) pre zápas
                        // Zatiaľ to bude jednoduché, zápasy sa budú skladať pod seba
                        let currentMatchesInCell = [];
                        matchesForLocationAndDate.forEach(m => {
                            if (m.id !== match.id) { // Nezrovnávame zápas sám so sebou
                                const [mStartH, mStartM] = m.startTime.split(':').map(Number);
                                const mAbsoluteStartMin = mStartH * 60 + mStartM;
                                const mAbsoluteEndMin = mAbsoluteStartMin + m.duration;

                                // Ak sa časové rozsahy prekrývajú
                                if ((absoluteStartMin < mAbsoluteEndMin && absoluteEndMin > mAbsoluteStartMin)) {
                                    currentMatchesInCell.push(m);
                                }
                            }
                        });

                        // Toto je veľmi zjednodušená detekcia kolízií pre top pozíciu.
                        // Pre plne funkčný rozvrh by ste potrebovali komplexnejší algoritmus,
                        // ktorý by spravoval "dráhy" (tracks) alebo stĺpce v rámci bunky,
                        // aby sa zápasy mohli efektívne skladať vedľa seba alebo pod seba.
                        // Pre úvodný fix prekrývania stačí, aby každý prekrývajúci sa zápas mal iný 'top'.
                        // Tu je nápad: ak sa prekrýva, daj ho nižšie. Ak je to viac zápasov, potrebujeme komplexnejší výpočet riadku.

                        // Pre jednoduchosť, zatiaľ každý zápas v bunke bude mať len nejaký fixný top
                        // Tento prístup nezabráni prekrývaniu, ak sú dva zápasy v rovnakom čase.
                        // Potrebujeme inteligentnejší algoritmus na určenie `top` a `height`.

                        // **PRVÁ VERZIA RIEŠENIA PREKRÝVANIA (Vertikálne):**
                        // Zistíme, koľko zápasov sa prekrýva s týmto zápasom, a na základe toho určíme top.
                        let overlappingCount = 0;
                        matchesForLocationAndDate.forEach(otherMatch => {
                            if (otherMatch.id !== match.id) {
                                const [otherStartH, otherStartM] = otherMatch.startTime.split(':').map(Number);
                                const otherAbsoluteStartMin = otherStartH * 60 + otherStartM;
                                const otherAbsoluteEndMin = otherAbsoluteStartMin + otherMatch.duration;

                                // Ak sa tento zápas prekrýva s iným
                                if (
                                    (absoluteStartMin < otherAbsoluteEndMin && absoluteEndMin > otherAbsoluteStartMin) &&
                                    (otherAbsoluteStartMin < absoluteEndMin && otherAbsoluteEndMin > absoluteStartMin)
                                ) {
                                    // A je umiestnený pred aktuálnym zápasom (aby sa zabránilo rekurzívnemu počítaniu)
                                    // Zjednodušená kontrola, ak chceme zápasy skladať pod seba
                                    if (otherAbsoluteStartMin < absoluteStartMin || (otherAbsoluteStartMin === absoluteStartMin && otherMatch.id < match.id)) {
                                         // len ak ide o match, ktorý už bol spracovaný (predchadzajuci v poli)
                                         // toto nie je robustne. Potrebovali by sme trackovať riadky.
                                    }
                                }
                            }
                        });


                        // Kód, ktorý ste mali predtým, vypočítaval left a width v percentách z celého rozsahu dňa.
                        // To je v poriadku, pokiaľ ide o horizontálne umiestnenie v rámci celkovej šírky zlúčenej TD.
                        // Problém je, že všetky zápasy majú `top: 0; height: 100%;` čo ich núti prekrývať sa.

                        // Pre vertikálne usporiadanie prekrývajúcich sa zápasov
                        // Potrebujeme dynamicky určiť `top` a `height` pre každý zápas.
                        // Najjednoduchšie je rozdeliť výšku bunky a umiestniť ich pod seba.
                        // Získame všetky zápasy, ktoré časovo spadajú do rovnakej bunky (TD).
                        const matchesInThisCell = matchesForLocationAndDate.filter(m => {
                            const [mStartH, mStartM] = m.startTime.split(':').map(Number);
                            const mAbsoluteStartMin = mStartH * 60 + mStartM;
                            const mAbsoluteEndMin = mAbsoluteStartMin + m.duration;
                            return (absoluteStartMin < mAbsoluteEndMin && absoluteEndMin > mAbsoluteStartMin); // Check for temporal overlap
                        });

                        // Toto je len na ukážku - pre robustnejší plánovač potrebujete "track" systém.
                        // Ak sa prekrývajú, rozdelíme výšku bunky na rovnaké časti.
                        let currentTop = 0;
                        let currentHeight = CELL_HEIGHT_PX;

                        // Tento prístup je stále veľmi zjednodušený a bude viesť k vertikálnemu stlačeniu,
                        // ak bude veľa prekrývajúcich sa zápasov.
                        // Skutočné riešenie vyžaduje "algoritmus rozvrhovania" na strane klienta.
                        // Pre testovanie: ak sú zápasy, ktoré začínajú v rovnakom čase, umiestnite ich vertikálne:
                        let verticalOverlapCount = 0;
                        matchesForLocationAndDate.filter(m => m.startTime === match.startTime).forEach((m, index) => {
                            if (m.id !== match.id) { // Počítaj len tie, ktoré začínajú v rovnakom čase, ale nie sú rovnaký zápas
                                // ak má current match nižšie ID, tak by mal byť umiestnený nižšie
                                if (match.id > m.id) { // Zjednodušené pravidlo na rozlíšenie
                                    verticalOverlapCount++;
                                }
                            }
                        });
                        const TOP_OFFSET_PER_OVERLAP = 40; // Napríklad 40px odsadenie pre každý prekrývajúci sa zápas
                        const topPx = verticalOverlapCount * TOP_OFFSET_PER_OVERLAP;

                        // Váš `totalDayMinutes` je stále správny na to, aby sa `left` a `width` počítali ako percentá z celkovej šírky TD.
                        // Ak je však `totalDayMinutes` veľmi malý (napr. len jedna hodina), percentá budú priveľké.
                        // CELL_WIDTH_PX = 260; // šírka jednej hodiny

                        const left = leftPx; // V pixeloch, nie percentách
                        const width = widthPx; // V pixeloch, nie percentách

                        const matchEndTime = new Date();
                        matchEndTime.setHours(startH, startM + durationInMinutes, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        scheduleHtml += `
                            <div class="schedule-cell-match"
                                data-id="${match.id}"
                                style="left: ${left}px; width: ${width}px; top: ${topPx}px;">
                                <p class="schedule-cell-time">${match.startTime} - ${formattedEndTime}</p>
                                <p class="schedule-cell-category">${match.categoryName || 'N/A'}${match.groupName ? ` ${match.groupName}` : ''}</p>
                                <p class="schedule-cell-teams">${match.team1DisplayName}<br>${match.team2DisplayName}</p>
                                <p class="schedule-cell-club-names">${match.team1ClubName}<br>${match.team2ClubName}</p>
                                <div class="schedule-cell-actions">
                                    <button class="edit-btn" data-id="${match.id}">Upraviť</button>
                                    <button class="delete-btn" data-id="${match.id}">Vymazať</button>
                                </div>
                            </div>
                        `;
                    });
                    scheduleHtml += '</td>';
                });
                scheduleHtml += '</tr>';
            });
            
            scheduleHtml += '</tbody></table>';
            scheduleHtml += '</div>';
            matchesContainer.innerHTML = scheduleHtml;

            // Priradenie event listenerov po vložení HTML
            matchesContainer.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (event) => editMatch(event.target.dataset.id));
            });
            matchesContainer.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (event) => deleteMatch(event.target.dataset.id));
            });

        } catch (error) {
            console.error("Chyba pri načítaní rozvrhu zápasov: ", error);
            matchesContainer.innerHTML = '<p>Chyba pri načítaní rozvrhu zápasov. Skontrolujte konzolu pre detaily a uistite sa, že máte vytvorené potrebné indexy vo Firestore.</p>';
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
                matchStartTimeInput.value = matchData.startTime || '';
                matchDurationInput.value = matchData.duration || 60; // Načítanie duration
                matchLocationInput.value = matchData.location || '';

                await populateCategorySelect(matchCategorySelect, matchData.categoryId);
                if (matchData.categoryId) {
                    await populateGroupSelect(matchData.categoryId, matchGroupSelect, matchData.groupId);
                    matchGroupSelect.disabled = false;
                } else {
                    matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    matchGroupSelect.disabled = true;
                }

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
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        }
    }

    await displayMatchesAsSchedule();

    addButton.addEventListener('click', () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas / dopravu';

        populateCategorySelect(matchCategorySelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;

        team1NumberInput.value = '';
        team2NumberInput.value = '';
        matchDurationInput.value = '';

        openModal(matchModal);
    });

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

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule();
    });

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

            let clubName = `Tím ${teamNumber}`;

            const clubsQuery = query(
                clubsCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId),
                where("orderInGroup", "==", parseInt(teamNumber))
            );
            const clubsSnapshot = await getDocs(clubsQuery);

            if (!clubsSnapshot.empty) {
                const teamDocData = clubsSnapshot.docs[0].data();
                if (teamDocData.name) {
                    clubName = teamDocData.name;
                }
            } else {
                console.warn(`Tím s číslom ${teamNumber} v kategórii ${categoryId} a skupine ${groupId} sa nenašiel. Používam fallback: "${clubName}"`);
            }

            let shortCategoryName = categoryName;
            if (shortCategoryName) {
                shortCategoryName = shortCategoryName.replace(/U(\d+)\s*([CHZ])/i, 'U$1$2').toUpperCase();
            }

            let shortGroupName = '';
            if (groupName) {
                const match = groupName.match(/(?:skupina\s*)?([A-Z])/i);
                if (match && match[1]) {
                    shortGroupName = match[1].toUpperCase();
                }
            }

            const fullDisplayName = `${shortCategoryName} ${shortGroupName}${teamNumber}`;

            return {
                fullDisplayName: fullDisplayName,
                clubName: clubName
            };
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu: ", error);
            return { fullDisplayName: `Chyba`, clubName: `Chyba` };
        }
    };

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

        try {
            team1Result = await getTeamName(matchCategory, matchGroup, team1Number);
            team2Result = await getTeamName(matchCategory, matchGroup, team2Number);
        } catch (error) {
            console.error("Chyba pri získavaní názvov tímov:", error);
            alert("Vyskytla sa chyba pri získavaní názvov tímov. Skúste to znova.");
            return;
        }

        if (!team1Result || !team1Result.fullDisplayName || !team2Result || !team2Result.fullDisplayName) {
            alert('Jeden alebo oba tímy sa nenašli. Skontrolujte poradové čísla v danej kategórii a skupine.');
            return;
        }

        const matchData = {
            date: matchDateInput.value,
            startTime: matchStartTimeInput.value,
            duration: parseInt(matchDurationInput.value), // UISTITE SA, ŽE SA TOTO UKLADÁ!
            location: matchLocationInput.value,
            categoryId: matchCategory,
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroup || null,
            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text.replace(/skupina /gi, '').trim() : null,
//            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text : null,

            team1Category: matchCategory,
            team1Group: matchGroup,
            team1Number: parseInt(team1Number),
            team1DisplayName: team1Result.fullDisplayName,
            team1ClubName: team1Result.clubName,

            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: parseInt(team2Number),
            team2DisplayName: team2Result.fullDisplayName,
            team2ClubName: team2Result.clubName,

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
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });
});
