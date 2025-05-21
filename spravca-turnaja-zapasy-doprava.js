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
    const matchCategorySelect = document.getElementById('matchCategory'); // Zmenené z matchCategory na matchCategorySelect pre konzistenciu
    const matchGroupSelect = document.getElementById('matchGroup'); // Zmenené z matchGroup na matchGroupSelect pre konzistenciu
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');
    const matchesContainer = document.getElementById('matchesContainer');

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

    // --- Načítanie a zobrazenie rozvrhu zápasov po načítaní stránky ---
    await displayMatchesAsSchedule();

    // --- PRIDAŤ TÚTO ČASŤ: Volanie funkcií na naplnenie SELECT boxov pri načítaní stránky ---
    // Toto zabezpečí, že ak modálne okno otvoríte ihneď, budú dáta pripravené
    await populatePlayingDaySelect(matchDateSelect);
    await populateSportHallSelect(matchLocationSelect);
    await populateCategorySelect(matchCategorySelect);
    // populateGroupSelect je často závislé od vybranej kategórie, takže nemusí byť volané hneď
    // ale až pri zmene kategórie alebo pri otvorení modálu pre editáciu existujúceho zápasu.

    // Ak chcete naplniť skupiny hneď, môžete, ale zvyčajne sa filtrujú podľa kategórie
    // await populateGroupSelect(matchGroupSelect, matchCategorySelect.value); // Ak máš predvolenú kategóriu

    // --- FUNKCIE PRE MODÁLNE OKNÁ ---

    // Ovládanie tlačidla "+" a dropdownu
    addButton.addEventListener('click', () => {
        addOptions.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    // Otváranie modálnych okien z dropdownu
    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        closeModal(addOptions); // Zatvor dropdown
        openModal(playingDayModal);
    });

    addSportHallButton.addEventListener('click', () => {
        sportHallForm.reset();
        closeModal(addOptions); // Zatvor dropdown
        openModal(sportHallModal);
    });

    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        document.getElementById('matchModalTitle').textContent = 'Pridať nový zápas / dopravu';
        closeModal(addOptions); // Zatvor dropdown

        // --- ZNOVU NAPLNENIE SELECT BOXOV PRI OTVORENÍ MODÁLU ---
        // Toto je dôležité, aby si mal vždy najnovšie dáta
        await populatePlayingDaySelect(matchDateSelect);
        await populateSportHallSelect(matchLocationSelect);
        await populateCategorySelect(matchCategorySelect);

        // Ak sa kategória zmení, mali by sa aktualizovať skupiny
        matchCategorySelect.addEventListener('change', async () => {
            const categoryId = matchCategorySelect.value;
            await populateGroupSelect(matchGroupSelect, categoryId);
        });

        // Ak už je vybraná kategória (napr. pri editácii), naplň skupiny podľa nej
        if (matchCategorySelect.value) {
            await populateGroupSelect(matchGroupSelect, matchCategorySelect.value);
        } else {
            // Ak nie je vybraná žiadna kategória, vyčisti skupiny
            matchGroupSelect.innerHTML = '<option value="">Vyberte skupinu</option>';
        }


        openModal(matchModal);
    });


    // Zatváranie modálnych okien
    closeMatchModalButton.addEventListener('click', () => closeModal(matchModal));
    closePlayingDayModalButton.addEventListener('click', () => closeModal(playingDayModal));
    closeSportHallModalButton.addEventListener('click', () => closeModal(sportHallModal));

    // Zatvorenie modálov pri kliknutí mimo obsahu
    window.addEventListener('click', (event) => {
        if (event.target == matchModal) {
            closeModal(matchModal);
        }
        if (event.target == playingDayModal) {
            closeModal(playingDayModal);
        }
        if (event.target == sportHallModal) {
            closeModal(sportHallModal);
        }
    });

    // --- Spracovanie formulára pre ZÁPAS ---
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchId = matchIdInput.value;
        const playingDayId = matchDateSelect.value;
        const startTime = matchStartTimeInput.value;
        const duration = parseInt(matchDurationInput.value);
        const sportHallId = matchLocationSelect.value;
        const categoryId = matchCategorySelect.value;
        const groupId = matchGroupSelect.value;
        const team1Number = parseInt(team1NumberInput.value);
        const team2Number = parseInt(team2NumberInput.value);

        if (!playingDayId || !startTime || isNaN(duration) || duration < 1 || !sportHallId || !categoryId || !groupId || isNaN(team1Number) || team1Number < 1 || isNaN(team2Number) || team2Number < 1) {
            alert('Prosím, vyplňte všetky polia a uistite sa, že čísla tímov sú platné.');
            return;
        }

        // Získanie referencií na dokumenty
        const playingDayRef = doc(db, 'playingDays', playingDayId);
        const sportHallRef = doc(db, 'sportHalls', sportHallId);
        const categoryRef = doc(db, 'categories', categoryId);
        const groupRef = doc(db, 'groups', groupId);

        try {
            // Získanie informácií o tímoch
            const groupDoc = await getDoc(groupRef);
            if (!groupDoc.exists()) {
                alert('Vybraná skupina neexistuje!');
                return;
            }
            const groupData = groupDoc.data();
            const teamsInGroup = groupData.teams || [];

            // Nájdite tímy podľa poradových čísel
            const team1 = teamsInGroup.find(team => team.teamNumber === team1Number);
            const team2 = teamsInGroup.find(team => team.teamNumber === team2Number);

            if (!team1) {
                alert(`Tím s poradovým číslom ${team1Number} nebol nájdený v skupine ${groupData.name}.`);
                return;
            }
            if (!team2) {
                alert(`Tím s poradovým číslom ${team2Number} nebol nájdený v skupine ${groupData.name}.`);
                return;
            }
            if (team1.id === team2.id) {
                alert('Tímy musia byť rôzne.');
                return;
            }

            const matchData = {
                playingDayRef: playingDayRef,
                startTime: startTime,
                duration: duration,
                sportHallRef: sportHallRef,
                categoryRef: categoryRef,
                groupRef: groupRef,
                team1: {
                    id: team1.id,
                    name: team1.name,
                    clubName: team1.clubName || 'N/A' // Pridajte clubName
                },
                team2: {
                    id: team2.id,
                    name: team2.name,
                    clubName: team2.clubName || 'N/A' // Pridajte clubName
                },
                createdAt: new Date()
            };

            if (matchId) {
                // Editácia existujúceho zápasu
                const matchDocRef = doc(db, 'matches', matchId);
                await setDoc(matchDocRef, matchData);
                alert('Zápas úspešne aktualizovaný!');
            } else {
                // Pridanie nového zápasu
                await addDoc(matchesCollectionRef, matchData);
                alert('Zápas úspešne pridaný!');
            }

            closeModal(matchModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh po zmene
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });

    // -- Spracovanie formulára pre HRACÍ DEŇ --
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = playingDayDateInput.value;

        if (!date) {
            alert('Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            // Kontrola, či už hrací deň s týmto dátumom neexistuje
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
            await populatePlayingDaySelect(matchDateSelect); // Aktualizovať select box
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            alert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    // -- Spracovanie formulára pre ŠPORTOVÚ HALU --
    sportHallForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = hallNameInput.value.trim();
        const address = hallAddressInput.value.trim();
        const googleMapsUrl = hallGoogleMapsUrlInput.value.trim();

        if (!name || !address || !googleMapsUrl) {
            alert('Prosím, vyplňte všetky polia (Názov haly, Adresa, Odkaz na Google Maps).');
            return;
        }

        try {
            new URL(googleMapsUrl); // Skúška validácie URL
        } catch (_) {
            alert('Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            // Kontrola, či už hala s týmto názvom neexistuje
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
            await populateSportHallSelect(matchLocationSelect); // Aktualizovať select box
        } catch (error) {
            console.error("Chyba pri ukladaní športovej haly: ", error);
            alert("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
        }
    });


    // --- Zobrazenie zápasov ako rozvrhu ---
    async function displayMatchesAsSchedule() {
        matchesContainer.innerHTML = 'Načítavam zápasy...';
        try {
            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy('date')));
            const sportHallsSnapshot = await getDocs(query(sportHallsCollectionRef, orderBy('name')));
            const matchesSnapshot = await getDocs(query(matchesCollectionRef, orderBy('playingDayRef'), orderBy('startTime')));

            const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sportHalls = sportHallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (playingDays.length === 0 || sportHalls.length === 0) {
                matchesContainer.innerHTML = '<p>Pre zobrazenie rozvrhu pridajte aspoň jeden hrací deň a jednu športovú halu.</p>';
                return;
            }

            let html = '';
            playingDays.forEach(day => {
                html += `
                    <div class="schedule-table-container">
                        <table class="match-schedule-table">
                            <thead>
                                <tr>
                                    <th class="fixed-column">
                                        <div class="schedule-location-header">Miesto / Čas</div>
                                        <div class="schedule-date-header">${day.date}</div>
                                    </th>
                                    ${sportHalls.map(hall => `
                                        <th>
                                            <div class="schedule-location-header">${hall.name}</div>
                                            <div class="schedule-times-row">
                                                </div>
                                        </th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody>`;

                // Generovanie riadkov pre časové sloty (napr. každých 30 minút od 8:00 do 22:00)
                const startHour = 8;
                const endHour = 22;
                const intervalMinutes = 30; // Napr. každých 30 minút

                for (let hour = startHour; hour < endHour; hour++) {
                    for (let minute = 0; minute < 60; minute += intervalMinutes) {
                        const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                        const nextTimeSlot = `${String(hour + (minute + intervalMinutes >= 60 ? 1 : 0)).padStart(2, '0')}:${String((minute + intervalMinutes) % 60).padStart(2, '0')}`;

                        html += `<tr>
                                    <td class="fixed-column">${timeSlot} - ${nextTimeSlot}</td>`;

                        sportHalls.forEach(hall => {
                            const relevantMatches = matches.filter(m =>
                                m.playingDayRef.id === day.id &&
                                m.sportHallRef.id === hall.id &&
                                m.startTime === timeSlot
                            );

                            html += `<td>`;
                            if (relevantMatches.length > 0) {
                                relevantMatches.forEach(match => {
                                    // Calculate left and width for overlay based on the intervalMinutes and duration
                                    // This is a simplified example, actual positioning might need more complex logic
                                    // based on the total width of the cell if it's not fixed width.
                                    // For fixed width cells, 'left' can be 0 and 'width' 100%.
                                    // 'top' will be 0, height based on duration.

                                    const matchStartMinutes = parseInt(match.startTime.split(':')[0]) * 60 + parseInt(match.startTime.split(':')[1]);
                                    const slotStartMinutes = hour * 60 + minute;
                                    const slotEndMinutes = hour * 60 + minute + intervalMinutes;

                                    if (matchStartMinutes >= slotStartMinutes && matchStartMinutes < slotEndMinutes) {
                                        // This match starts in this time slot
                                        // Calculate height based on duration (e.g., 160px per hour, 80px per 30min)
                                        const pixelsPerMinute = 160 / 30; // If cell height is 160 for 30 minutes
                                        const matchHeight = match.duration * pixelsPerMinute;
                                        const topOffset = (matchStartMinutes - slotStartMinutes) * pixelsPerMinute;


                                        html += `
                                            <div class="schedule-cell-match" style="top: ${topOffset}px; height: ${matchHeight}px; left: 0; width: 100%;">
                                                <div class="schedule-cell-content">
                                                    <p class="schedule-cell-time">${match.startTime} (${match.duration} min)</p>
                                                    <p class="schedule-cell-category">${match.categoryRef.id}</p> <p class="schedule-cell-teams">${match.team1.name} vs ${match.team2.name}</p>
                                                    <p class="schedule-cell-club-names">${match.team1.clubName} vs ${match.team2.clubName}</p>
                                                </div>
                                                <div class="schedule-cell-actions">
                                                    <button class="edit-btn" data-id="${match.id}">Upraviť</button>
                                                    <button class="delete-btn" data-id="${match.id}">Zmazať</button>
                                                </div>
                                            </div>`;
                                    }
                                });
                            }
                            html += `</td>`;
                        });
                        html += `</tr>`;
                    }
                }

                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            });

            matchesContainer.innerHTML = html;
            attachMatchActionListeners(); // Pridá poslucháčov na nové tlačidlá
            await resolveReferencesInSchedule(); // Načíta detaily kategórií, skupín, atď.
        } catch (error) {
            console.error("Chyba pri načítaní a zobrazení zápasov: ", error);
            matchesContainer.innerHTML = '<p>Chyba pri načítaní rozvrhu zápasov.</p>';
        }
    }

    // Funkcia pre načítanie referencií (napr. názvy kategórií, skupín)
    async function resolveReferencesInSchedule() {
        const batch = writeBatch(db); // Používame batch na hromadné čítanie

        const categoryRefs = new Map();
        const groupRefs = new Map();

        // Zbierame všetky referencie
        document.querySelectorAll('.schedule-cell-category').forEach(el => {
            const categoryId = el.textContent; // ID je aktuálne textContent
            if (!categoryRefs.has(categoryId)) {
                categoryRefs.set(categoryId, doc(db, 'categories', categoryId));
            }
        });

        // Ak nemáš priamy text skupiny v `schedule-cell-match`, ale odkazuješ sa naň cez match.groupRef.id
        // budeš musieť upraviť túto časť na základe tvojej štruktúry zápasu.
        // Pre zjednodušenie predpokladajme, že groupId sa tiež zobrazí.
        // Ak máš groupId v `match.groupRef.id` ako referenciu, bude potrebné získať to z objektu match.
        // Momentálne v schedule-cell-match vypisuješ len team names, nie group.
        // Príklad ako by si mohol získať referencie skupín, ak by boli vypísané
        // document.querySelectorAll('.schedule-cell-group').forEach(el => {
        //     const groupId = el.textContent;
        //     if (!groupRefs.has(groupId)) {
        //         groupRefs.set(groupId, doc(db, 'groups', groupId));
        //     }
        // });


        const categoryPromises = Array.from(categoryRefs.values()).map(ref => getDoc(ref));
        const categoryDocs = await Promise.all(categoryPromises);

        const categoriesMap = new Map();
        categoryDocs.forEach(docSnap => {
            if (docSnap.exists()) {
                categoriesMap.set(docSnap.id, docSnap.data().name);
            }
        });

        // Aktualizujeme texty v HTML
        document.querySelectorAll('.schedule-cell-category').forEach(el => {
            const categoryId = el.textContent;
            if (categoriesMap.has(categoryId)) {
                el.textContent = categoriesMap.get(categoryId);
            } else {
                el.textContent = 'Neznáma kategória';
            }
        });
        // Podobne pre skupiny, ak by boli zobrazené
        // document.querySelectorAll('.schedule-cell-group').forEach(el => {
        //     const groupId = el.textContent;
        //     if (groupsMap.has(groupId)) {
        //         el.textContent = groupsMap.get(groupId);
        //     } else {
        //         el.textContent = 'Neznáma skupina';
        //     }
        // });
    }


    // Funkcia pre pridanie poslucháčov na akčné tlačidlá zápasov
    function attachMatchActionListeners() {
        document.querySelectorAll('.schedule-cell-actions .edit-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const matchId = e.target.dataset.id;
                await editMatch(matchId);
            });
        });

        document.querySelectorAll('.schedule-cell-actions .delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const matchId = e.target.dataset.id;
                if (confirm('Naozaj chcete zmazať tento zápas?')) {
                    await deleteMatch(matchId);
                }
            });
        });
    }

    async function editMatch(matchId) {
        try {
            const matchDoc = await getDoc(doc(db, 'matches', matchId));
            if (!matchDoc.exists()) {
                alert('Zápas nebol nájdený!');
                return;
            }
            const matchData = matchDoc.data();

            matchIdInput.value = matchId;
            document.getElementById('matchModalTitle').textContent = 'Upraviť zápas / dopravu';

            // Naplnenie formulára dátami
            await populatePlayingDaySelect(matchDateSelect, matchData.playingDayRef.id);
            matchStartTimeInput.value = matchData.startTime;
            matchDurationInput.value = matchData.duration;
            await populateSportHallSelect(matchLocationSelect, matchData.sportHallRef.id);
            await populateCategorySelect(matchCategorySelect, matchData.categoryRef.id);

            // Po naplnení kategórie, naplniť aj skupiny podľa vybranej kategórie
            await populateGroupSelect(matchGroupSelect, matchData.categoryRef.id, matchData.groupRef.id);

            team1NumberInput.value = matchData.team1.teamNumber; // Predpokladám, že teamNumber je uložené priamo v team1/team2 objekte
            team2NumberInput.value = matchData.team2.teamNumber; // Ak nie, treba ho získať z groupData.teams

            openModal(matchModal);
        } catch (error) {
            console.error("Chyba pri načítaní zápasu na editáciu: ", error);
            alert("Chyba pri načítaní zápasu na editáciu. Pozrite konzolu pre detaily.");
        }
    }

    async function deleteMatch(matchId) {
        try {
            await deleteDoc(doc(db, 'matches', matchId));
            alert('Zápas úspešne zmazaný!');
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri mazaní zápasu: ", error);
            alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
        }
    }

}); // Koniec DOMContentLoaded
