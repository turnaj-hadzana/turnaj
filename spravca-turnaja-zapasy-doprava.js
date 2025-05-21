import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, sportHallsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const addOptions = document.getElementById('addOptions'); // Správne získanie odkazu na dropdown
    const addPlayingDayButton = document.getElementById('addPlayingDayButton');
    const addSportHallButton = document.getElementById('addSportHallButton');
    const addMatchButton = document.getElementById('addMatchButton');

    // Modálne okno pre zápas
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime'); // NOVÉ: Input pre ochranné pásmo
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchesContainer = document.getElementById('matchesContainer');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');

    // Modálne okno pre hrací deň
    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayDateInput = document.getElementById('playingDayDate');

    // Modálne okno pre športovú halu
    const sportHallModal = document.getElementById('sportHallModal');
    const closeSportHallModalButton = document.getElementById('closeSportHallModal');
    const sportHallForm = document.getElementById('sportHallForm');
    const hallNameInput = document.getElementById('hallName');
    const hallAddressInput = document.getElementById('hallAddress');
    const hallGoogleMapsUrlInput = document.getElementById('hallGoogleMapsUrl');


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- NOVÉ FUNKCIE PRE PLNENIE SELECT BODOV ---
    async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
        try {
            const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            querySnapshot.forEach((doc) => {
                const day = doc.data();
                const option = document.createElement('option');
                option.value = day.date; // Uložíme dátum ako hodnotu
                option.textContent = day.date; // Zobrazíme dátum
                selectElement.appendChild(option);
            });
            if (selectedDate) {
                selectElement.value = selectedDate;
            }
        } catch (error) {
            console.error("Chyba pri načítaní hracích dní: ", error);
        }
    }

    async function populateSportHallsSelect(selectElement, selectedHallName = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto (halu) --</option>';
        try {
            const querySnapshot = await getDocs(query(sportHallsCollectionRef, orderBy("name", "asc")));
            querySnapshot.forEach((doc) => {
                const hall = doc.data();
                const option = document.createElement('option');
                option.value = hall.name; // Uložíme názov haly ako hodnotu
                option.textContent = hall.name; // Zobrazíme názov haly
                selectElement.appendChild(option);
            });
            if (selectedHallName) {
                selectElement.value = selectedHallName;
            }
        } catch (error) {
            console.error("Chyba pri načítaní športových hál: ", error);
        }
    }
    // --- KONIEC NOVÝCH FUNKCIÍ ---


    // --- Funkcia na načítanie a zobrazenie zápasov ako rozvrh (miesto vs. čas/deň) ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '<p>Načítavam rozvrh zápasov...</p>';
        try {
            const q = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
            const querySnapshot = await getDocs(q);

            // Získame aj hracie dni a športové haly pre hlavičky tabuľky
            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const sportHallsSnapshot = await getDocs(query(sportHallsCollectionRef, orderBy("name", "asc")));

            const allMatches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const existingPlayingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);
            const existingSportHalls = sportHallsSnapshot.docs.map(doc => doc.data().name);

            // Spojíme existujúce entity s tými, ktoré sú v zápasoch, aby sme nič neprehliadli
            const uniqueLocations = new Set([...existingSportHalls]);
            const uniqueDates = new Set([...existingPlayingDays]);

            allMatches.forEach(match => {
                uniqueLocations.add(match.location);
                uniqueDates.add(match.date);
            });

            const sortedLocations = Array.from(uniqueLocations).sort();
            const sortedDates = Array.from(uniqueDates).sort();

            const dailyTimeRanges = new Map();
            allMatches.forEach(match => {
                const date = match.date;
                const [startH, startM] = match.startTime.split(':').map(Number);
                // Pri výpočte rozsahu pre zobrazenie zohľadníme aj ochranné pásmo
                const durationWithBuffer = (match.duration || 0) + (match.bufferTime || 0);

                const startTimeInMinutes = startH * 60 + startM;
                const endTimeInMinutes = startTimeInMinutes + durationWithBuffer;

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

            sortedDates.forEach(date => {
                const range = dailyTimeRanges.get(date);
                let hoursForDate = [];
                if (range) {
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
                    scheduleHtml += `<th colspan="${colspan}" class="delete-date-header" data-date="${date}" title="Kliknutím vymažete hrací deň ${formattedDisplayDate} a všetky jeho zápasy">`;
                    scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div>`;
                    scheduleHtml += '<div class="schedule-times-row">';
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                    });
                    scheduleHtml += '</div>';
                    scheduleHtml += '</th>';
                } else {
                    scheduleHtml += `<th class="delete-date-header" data-date="${date}" title="Kliknutím vymažete hrací deň ${formattedDisplayDate}">`;
                    scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div><div class="schedule-times-row"><span></span></div></th>`;
                }
            });
            scheduleHtml += '</tr></thead><tbody>';

            sortedLocations.forEach(location => {
                scheduleHtml += '<tr>';
                scheduleHtml += `<th class="fixed-column schedule-location-header delete-location-header" data-location="${location}" title="Kliknutím vymažete športovú halu ${location} a všetky jej zápasy">${location}</th>`;

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

                    scheduleHtml += `<td colspan="${colspan}" style="position: relative; background-color: #f7f7f7;">`;

                    const matchesForLocationAndDate = allMatches.filter(match =>
                        match.location === location && match.date === date
                    );

                    const CELL_WIDTH_PX = 260;
                    const MINUTES_PER_HOUR = 60; // Upravený názov pre jasnosť
                    const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_HOUR;
                    const ITEM_HEIGHT_PX = 160;

                    matchesForLocationAndDate.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    const tracks = [];

                    matchesForLocationAndDate.forEach(match => {
                        const [startH, startM] = match.startTime.split(':').map(Number);
                        const durationInMinutes = match.duration;
                        const bufferInMinutes = match.bufferTime || 0; // Získanie ochranného pásma

                        const absoluteStartMin = startH * 60 + startM;
                        // Dôležité: Pre výpočet prekrývania pre stopy (tracks) použijeme celkovú dĺžku vrátane bufferu
                        const absoluteEndMinForTracks = absoluteStartMin + durationInMinutes + bufferInMinutes; 

                        const firstHourInDay = range.minHour;
                        const relativeStartMin = absoluteStartMin - (firstHourInDay * 60);

                        const matchBlockLeftPx = relativeStartMin * PIXELS_PER_MINUTE;
                        // Šírka hlavného bloku zápasu teraz zahŕňa aj ochranné pásmo
                        const matchBlockTotalWidthPx = (durationInMinutes + bufferInMinutes) * PIXELS_PER_MINUTE; 

                        // Pozícia a šírka vnútorného bloku pre ochranné pásmo
                        const bufferInternalLeftPx = durationInMinutes * PIXELS_PER_MINUTE;
                        const bufferInternalWidthPx = bufferInMinutes * PIXELS_PER_MINUTE;


                        let topPx = 0;

                        let foundTrack = false;
                        for (let i = 0; i < tracks.length; i++) {
                            const track = tracks[i];
                            // Kontrola prekrývania pre stopy musí zohľadňovať aj ochranné pásmo
                            const doesOverlap = (absoluteStartMin < track.endMin && absoluteEndMinForTracks > track.startMin);
                            
                            if (!doesOverlap) {
                                topPx = track.topPx;
                                track.startMin = Math.min(track.startMin, absoluteStartMin);
                                track.endMin = Math.max(track.endMin, absoluteEndMinForTracks); // Aktualizujeme endMin s bufferom
                                foundTrack = true;
                                break;
                            }
                        }

                        if (!foundTrack) {
                            topPx = tracks.length * ITEM_HEIGHT_PX;
                            tracks.push({ startMin: absoluteStartMin, endMin: absoluteEndMinForTracks, topPx: topPx }); // Uložíme endMin s bufferom
                        }

                        const matchEndTime = new Date();
                        matchEndTime.setHours(startH, startM + durationInMinutes, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        scheduleHtml += `
                            <div class="schedule-cell-match"
                                data-id="${match.id}"
                                style="left: ${matchBlockLeftPx}px; width: ${matchBlockTotalWidthPx}px; top: ${topPx}px; height: ${ITEM_HEIGHT_PX}px; position: absolute; z-index: 5;">
                                
                                ${bufferInMinutes > 0 ? `
                                    <div class="schedule-cell-buffer-internal"
                                        style="position: absolute; left: ${bufferInternalLeftPx}px; width: ${bufferInternalWidthPx}px; top: 0; height: 100%; background-color: #ffcccc; border-left: 1px dashed #ff9999; box-sizing: border-box; z-index: 6;">
                                    </div>
                                ` : ''}

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

            matchesContainer.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (event) => editMatch(event.target.dataset.id));
            });
            matchesContainer.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (event) => deleteMatch(event.target.dataset.id));
            });
            matchesContainer.querySelectorAll('.delete-date-header').forEach(header => {
                header.addEventListener('click', (event) => {
                    if (event.target === header || event.target.closest('.delete-date-header') === header) {
                        if (!event.target.classList.contains('edit-btn') && !event.target.classList.contains('delete-btn')) {
                            const dateToDelete = header.dataset.date;
                            deletePlayingDay(dateToDelete);
                        }
                    }
                });
            });
            matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
                header.addEventListener('click', (event) => {
                    if (event.target === header || event.target.closest('.delete-location-header') === header) {
                        if (!event.target.classList.contains('edit-btn') && !event.target.classList.contains('delete-btn')) {
                            const locationToDelete = header.dataset.location;
                            deleteSportHall(locationToDelete);
                        }
                        
                    }
                });
            });

        } catch (error) {
            console.error("Chyba pri načítaní rozvrhu zápasov: ", error);
            matchesContainer.innerHTML = '<p>Chyba pri načítaní rozvrhu zápasov. Skontrolujte konzolu pre detaily a uistite sa, že máte vytvorené potrebné indexy vo Firestore.</p>';
        }
    }

    async function deletePlayingDay(dateToDelete) {
        if (confirm(`Naozaj chcete vymazať hrací deň ${dateToDelete} a VŠETKY zápasy, ktoré sa konajú v tento deň?`)) {
            try {
                const batch = writeBatch(db);

                const playingDayQuery = query(playingDaysCollectionRef, where("date", "==", dateToDelete));
                const playingDaySnapshot = await getDocs(playingDayQuery);
                if (!playingDaySnapshot.empty) {
                    playingDaySnapshot.docs.forEach(docToDelete => {
                        batch.delete(doc(playingDaysCollectionRef, docToDelete.id));
                    });
                } else {
                    console.warn(`Hrací deň ${dateToDelete} sa nenašiel, ale pokračujem v mazaní zápasov.`);
                }

                const matchesQuery = query(matchesCollectionRef, where("date", "==", dateToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                await batch.commit();
                alert(`Hrací deň ${dateToDelete} a všetky súvisiace zápasy boli úspešne vymazané!`);
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Chyba pri mazaní hracieho dňa ${dateToDelete}: `, error);
                alert(`Chyba pri mazaní hracieho dňa ${dateToDelete}. Pozrite konzolu pre detaily.`);
            }
        }
    }

    async function deleteSportHall(hallNameToDelete) {
        if (confirm(`Naozaj chcete vymazať športovú halu ${hallNameToDelete} a VŠETKY zápasy, ktoré sa konajú v tejto hale?`)) {
            try {
                const batch = writeBatch(db);

                const sportHallQuery = query(sportHallsCollectionRef, where("name", "==", hallNameToDelete));
                const sportHallSnapshot = await getDocs(sportHallQuery);
                if (!sportHallSnapshot.empty) {
                    sportHallSnapshot.docs.forEach(docToDelete => {
                        batch.delete(doc(sportHallsCollectionRef, docToDelete.id));
                    });
                } else {
                    console.warn(`Športová hala ${hallNameToDelete} sa nenašla, ale pokračujem v mazaní zápasov.`);
                }

                const matchesQuery = query(matchesCollectionRef, where("location", "==", hallNameToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                await batch.commit();
                alert(`Športová hala ${hallNameToDelete} a všetky súvisiace zápasy boli úspešne vymazané!`);
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Chyba pri mazaní športovej haly ${hallNameToDelete}: `, error);
                alert(`Chyba pri mazaní športovej haly ${hallNameToDelete}. Pozrite konzolu pre detaily.`);
            }
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

                await populatePlayingDaysSelect(matchDateSelect, matchData.date);
                await populateSportHallsSelect(matchLocationSelect, matchData.location);

                matchStartTimeInput.value = matchData.startTime || '';
                matchDurationInput.value = matchData.duration || 60;
                matchBufferTimeInput.value = matchData.bufferTime || 5; // NOVÉ: Načítanie ochranného pásma

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


    // --- Logika pre tlačidlo '+' a dropdown ---
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Zabráni okamžitému zatvoreniu dropdownu kliknutím na tlačidlo
        addOptions.classList.toggle('show'); // Prepne triedu 'show'
    });

    // Skryť dropdown, ak kliknem mimo neho alebo jeho možností
    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        openModal(playingDayModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    addSportHallButton.addEventListener('click', () => {
        sportHallForm.reset();
        openModal(sportHallModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas / dopravu';
        await populateCategorySelect(matchCategorySelect);
        await populatePlayingDaysSelect(matchDateSelect);
        await populateSportHallsSelect(matchLocationSelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;
        team1NumberInput.value = '';
        team2NumberInput.value = '';
        matchDurationInput.value = '';
        matchBufferTimeInput.value = 5; // NOVÉ: Predvolená hodnota 5 minút pre ochranné pásmo
        openModal(matchModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    // --- Zatváranie modálnych okien ---
    closePlayingDayModalButton.addEventListener('click', () => {
        closeModal(playingDayModal);
        displayMatchesAsSchedule();
    });

    closeSportHallModalButton.addEventListener('click', () => {
        closeModal(sportHallModal);
        displayMatchesAsSchedule();
    });

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule();
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

    const getTeamName = async (categoryId, groupId, teamNumber) => {
        if (!categoryId || !groupId || !teamNumber) {
            return { fullDisplayName: null, clubName: null, clubId: null };
        }

        try {
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? (categoryDoc.data().name || categoryId) : categoryId;

            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            const groupData = groupDoc.exists() ? groupDoc.data() : null;
            const groupName = groupData ? (groupData.name || groupId) : groupId;

            let clubName = `Tím ${teamNumber}`;
            let clubId = null; 

            const clubsQuery = query(
                clubsCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId),
                where("orderInGroup", "==", parseInt(teamNumber))
            );
            const clubsSnapshot = await getDocs(clubsQuery);

            if (!clubsSnapshot.empty) {
                const teamDocData = clubsSnapshot.docs[0].data();
                clubId = clubsSnapshot.docs[0].id;
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
                clubName: clubName,
                clubId: clubId
            };
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu: ", error);
            return { fullDisplayName: `Chyba`, clubName: `Chyba`, clubId: null };
        }
    };

    // --- Event Listener pre formulár ZÁPASU ---
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        const team1Number = parseInt(team1NumberInput.value);
        const team2Number = parseInt(team2NumberInput.value);

        const matchDate = matchDateSelect.value;
        const matchLocation = matchLocationSelect.value;
        const matchStartTime = matchStartTimeInput.value;
        const matchDuration = parseInt(matchDurationInput.value);
        const matchBufferTime = parseInt(matchBufferTimeInput.value); // NOVÉ: Získanie hodnoty ochranného pásma


        const currentMatchId = matchIdInput.value;

        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number) || !matchDate || !matchLocation || !matchStartTime || isNaN(matchDuration) || isNaN(matchBufferTime)) {
            alert('Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2, Dátum, Miesto, Čas začiatku, Trvanie, Ochranné pásmo).');
            return;
        }

        if (team1Number === team2Number) {
            alert('Tímy nemôžu hrať sami proti sebe. Prosím, zadajte rôzne poradové čísla tímov.');
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

        // --- KONTROLA: Prekrývanie časov v rovnakej hale a deň (vrátane ochranného pásma) ---
        const [newStartHour, newStartMinute] = matchStartTime.split(':').map(Number);
        const newMatchStartInMinutes = newStartHour * 60 + newStartMinute;
        // NOVÉ: Koniec zápasu vrátane jeho trvania a ochranného pásma
        const newMatchEndInMinutesWithBuffer = newMatchStartInMinutes + matchDuration + matchBufferTime; 

        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocation)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let overlapFound = false;
            let overlappingMatchDetails = null;

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                // Ak upravujeme existujúci zápas, preskočíme ho pri kontrole prekrývania
                if (currentMatchId && existingMatchId === currentMatchId) {
                    return;
                }

                const [existingStartHour, existingStartMinute] = existingMatch.startTime.split(':').map(Number);
                const existingMatchStartInMinutes = existingStartHour * 60 + existingStartMinute;
                // NOVÉ: Koniec existujúceho zápasu vrátane jeho trvania a ochranného pásma
                const existingMatchEndInMinutesWithBuffer = existingMatchStartInMinutes + (existingMatch.duration || 0) + (existingMatch.bufferTime || 0);

                // Kontrola prekrývania: (nový začína pred existujúcim koncom A nový končí po existujúcom začiatku)
                if (newMatchStartInMinutes < existingMatchEndInMinutesWithBuffer && newMatchEndInMinutesWithBuffer > existingMatchStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = existingMatch;
                    return; // Nájdené prekrývanie, nie je potrebné ďalej kontrolovať
                }
            });

            if (overlapFound) {
                // Formátovanie koncového času pre existujúci zápas v správe (len samotný zápas, nie s bufferom)
                const [existingStartHour, existingStartMinute] = overlappingMatchDetails.startTime.split(':').map(Number);
                const existingMatchEndTimeObj = new Date(); // Použijeme aktuálny dátum, len pre čas
                existingMatchEndTimeObj.setHours(existingStartHour, existingStartMinute + (overlappingMatchDetails.duration || 0), 0, 0);
                const formattedExistingEndTime = existingMatchEndTimeObj.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit'});

                alert(`Zápas sa prekrýva s existujúcim zápasom v hale "${matchLocation}" dňa ${matchDate}:\n\n` +
                      `Existujúci zápas: ${overlappingMatchDetails.startTime} - ${formattedExistingEndTime}\n` +
                      `Tímy: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n` +
                      `Prosím, upravte čas začiatku alebo trvanie nového zápasu, alebo ochranné pásmo.`);
                return; // Zastaviť vykonávanie, neuložiť zápas
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania zápasov: ", error);
            alert("Vyskytla sa chyba pri kontrole prekrývania zápasov. Skúste to znova.");
            return;
        }
        // --- KONIEC KONTROLY PREKRÝVANIA ---


        // --- KONTROLA: Tímy v rovnakej kategórii a skupine nemôžu hrať proti sebe viackrát ---
        // (Tento blok kódu bol už vo vašom pôvodnom súbore)
        let existingMatchIdForTeams = null; // Zmenený názov pre jasnosť
        try {
            const q1 = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup),
                where("team1Number", "==", team1Number),
                where("team2Number", "==", team2Number)
            );
            const q2 = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup),
                where("team1Number", "==", team2Number),
                where("team2Number", "==", team1Number)
            );

            const snapshot1 = await getDocs(q1);
            const snapshot2 = await getDocs(q2);

            const foundDoc1 = snapshot1.docs.find(doc => doc.id !== currentMatchId);
            const foundDoc2 = snapshot2.docs.find(doc => doc.id !== currentMatchId);

            if (foundDoc1) {
                existingMatchIdForTeams = foundDoc1.id;
            } else if (foundDoc2) {
                existingMatchIdForTeams = foundDoc2.id;
            }

            if (existingMatchIdForTeams) {
                const confirmDelete = confirm(
                    `Zápas medzi tímami ${team1Result.fullDisplayName} a ${team2Result.fullDisplayName} už existuje v tejto kategórii a skupine. ` +
                    `Chcete existujúci zápas odstrániť a nahradiť ho novým?`
                );
                if (confirmDelete) {
                    await deleteDoc(doc(matchesCollectionRef, existingMatchIdForTeams));
                    console.log(`Existujúci zápas ${existingMatchIdForTeams} bol odstránený.`);
                } else {
                    alert('Operácia zrušená. Zápas nebol pridaný ani odstránený.');
                    closeModal(matchModal);
                    return;
                }
            }

        } catch (error) {
            console.error("Chyba pri kontrole alebo mazaní existujúceho zápasu (tímov):", error);
            alert("Vyskytla sa chyba pri kontrole alebo mazaní existujúceho zápasu (tímov). Skúste to znova.");
            return;
        }
        // --- KONIEC KONTROLY TÍMOV ---


        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime, // NOVÉ: Uloženie ochranného pásma
            location: matchLocation,
            categoryId: matchCategory,
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroup || null,
            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text.replace(/skupina /gi, '').trim() : null,

            team1Category: matchCategory,
            team1Group: matchGroup,
            team1Number: team1Number,
            team1DisplayName: team1Result.fullDisplayName,
            team1ClubName: team1Result.clubName,
            team1ClubId: team1Result.clubId,

            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: team2Number,
            team2DisplayName: team2Result.fullDisplayName,
            team2ClubName: team2Result.clubName,
            team2ClubId: team2Result.clubId,

            createdAt: new Date()
        };

        console.log('Dáta zápasu na uloženie:', matchData);

        try {
            if (currentMatchId) {
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
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


    // --- Event Listener pre formulár HRACIEHO DŇA ---
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = playingDayDateInput.value;

        if (!date) {
            alert('Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert('Hrací deň s týmto dátumom už existuje!');
                return;
            }

            await addDoc(playingDaysCollectionRef, {
                date: date,
                createdAt: new Date()
            });
            alert('Hrací deň úspešne pridaný!');
            closeModal(playingDayModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            alert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    // --- Event Listener pre formulár ŠPORTOVEJ HALY ---
    sportHallForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = hallNameInput.value.trim();
        const address = hallAddressInput.value.trim();
        const googleMapsUrl = hallGoogleMapsUrlInput.trim(); // Trimmed here

        if (!name || !address || !googleMapsUrl) {
            alert('Prosím, vyplňte všetky polia (Názov haly, Adresa, Odkaz na Google Maps).');
            return;
        }

        try {
            new URL(googleMapsUrl); // Validate URL format
        } catch (_) {
            alert('Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            const q = query(sportHallsCollectionRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert('Športová hala s týmto názvom už existuje!');
                return;
            }

            await addDoc(sportHallsCollectionRef, {
                name: name,
                address: address,
                googleMapsUrl: googleMapsUrl,
                createdAt: new Date()
            });
            alert('Športová hala úspešne pridaná!');
            closeModal(sportHallModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní športovej haly: ", error);
            alert("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
        }
    });
});
