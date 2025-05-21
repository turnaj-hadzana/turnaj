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
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
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
            const q = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
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

            const dailyTimeRanges = new Map();
            allMatches.forEach(match => {
                const date = match.date;
                const [startH, startM] = match.startTime.split(':').map(Number);
                const duration = match.duration;

                const startTimeInMinutes = startH * 60 + startM;
                const endTimeInMinutes = startTimeInMinutes + duration;

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
                    scheduleHtml += `<th colspan="${colspan}">`;
                    scheduleHtml += `<div class="schedule-date-header">${formattedDisplayDate}</div>`;
                    scheduleHtml += '<div class="schedule-times-row">';
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                    });
                    scheduleHtml += '</div>';
                    scheduleHtml += '</th>';
                } else {
                    scheduleHtml += `<th><div class="schedule-date-header">${formattedDisplayDate}</div><div class="schedule-times-row"><span></span></div></th>`;
                }
            });
            scheduleHtml += '</tr></thead><tbody>';

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

                    scheduleHtml += `<td colspan="${colspan}" style="position: relative; background-color: #f7f7f7;">`;

                    const matchesForLocationAndDate = allMatches.filter(match =>
                        match.location === location && match.date === date
                    );

                    const CELL_WIDTH_PX = 260;
                    const MINUTES_PER_CELL = 60;
                    const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_CELL;
                    const CELL_HEIGHT_PX = 170; // Pre referenciu, ak by sa to malo dynamicky riadiť

                    matchesForLocationAndDate.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    // Objekt na sledovanie obsadených vertikálnych "dráh" (tracks) v rámci bunky
                    const tracks = []; // Pole objektov { startMin, endMin, topPx }

                    matchesForLocationAndDate.forEach(match => {
                        const [startH, startM] = match.startTime.split(':').map(Number);
                        const durationInMinutes = match.duration;

                        const absoluteStartMin = startH * 60 + startM;
                        const absoluteEndMin = absoluteStartMin + durationInMinutes;

                        const firstHourInDay = range.minHour;
                        const relativeStartMin = absoluteStartMin - (firstHourInDay * 60);

                        const leftPx = relativeStartMin * PIXELS_PER_MINUTE;
                        const widthPx = durationInMinutes * PIXELS_PER_MINUTE;

                        let topPx = 0;
                        const ITEM_HEIGHT_PX = 160; // Približná výška zápasu (140px bunka + padding/margin)

                        // Nájdenie prvej voľnej "dráhy" (track)
                        let foundTrack = false;
                        for (let i = 0; i < tracks.length; i++) {
                            const track = tracks[i];
                            // Ak sa aktuálny zápas neprekrýva s žiadnym zápasom v tejto "dráhe"
                            if (absoluteStartMin >= track.endMin || absoluteEndMin <= track.startMin) {
                                topPx = track.topPx;
                                track.startMin = Math.min(track.startMin, absoluteStartMin);
                                track.endMin = Math.max(track.endMin, absoluteEndMin);
                                foundTrack = true;
                                break;
                            }
                        }

                        if (!foundTrack) {
                            // Ak nebola nájdená voľná "dráha", vytvoríme novú
                            topPx = tracks.length * ITEM_HEIGHT_PX;
                            tracks.push({ startMin: absoluteStartMin, endMin: absoluteEndMin, topPx: topPx });
                        }


                        const matchEndTime = new Date();
                        matchEndTime.setHours(startH, startM + durationInMinutes, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        scheduleHtml += `
                            <div class="schedule-cell-match"
                                data-id="${match.id}"
                                style="left: ${leftPx}px; width: ${widthPx}px; top: ${topPx}px; height: ${ITEM_HEIGHT_PX}px;">
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
                matchDurationInput.value = matchData.duration || 60;
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

    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        const team1Number = parseInt(team1NumberInput.value);
        const team2Number = parseInt(team2NumberInput.value);

        const currentMatchId = matchIdInput.value;

        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number)) {
            alert('Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2).');
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

        // Kontrola, či tímy z rovnakého klubu nemôžu hrať proti sebe v rovnakej skupine
        if (team1Result.clubId && team2Result.clubId && team1Result.clubId === team2Result.clubId) {
            alert('Tímy z rovnakého klubu nemôžu hrať proti sebe v rovnakej skupine. Prosím, vyberte tímy z rôznych klubov.');
            return;
        }

        // --- KONTROLA 1: Či už tímy hrali proti sebe v rámci KATEGÓRIE (bez ohľadu na skupinu) ---
        try {
            const q1_category = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("team1Number", "==", team1Number),
                where("team2Number", "==", team2Number)
            );
            const q2_category = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("team1Number", "==", team2Number),
                where("team2Number", "==", team1Number)
            );

            const snapshot1_category = await getDocs(q1_category);
            const snapshot2_category = await getDocs(q2_category);

            let alreadyPlayedInCategory = false;
            if (snapshot1_category.docs.some(doc => doc.id !== currentMatchId) || snapshot2_category.docs.some(doc => doc.id !== currentMatchId)) {
                alreadyPlayedInCategory = true;
            }

            if (alreadyPlayedInCategory) {
                alert('Tieto dva tímy už proti sebe hrali v tejto kategórii (v inej alebo rovnakej skupine). Nemôžu hrať znova.');
                return;
            }

        } catch (error) {
            console.error("Chyba pri kontrole predchádzajúcich zápasov v kategórii:", error);
            alert("Vyskytla sa chyba pri kontrole predchádzajúcich zápasov v kategórii. Skúste to znova.");
            return;
        }
        // --- KONIEC KONTROLY 1 ---


        // --- KONTROLA 2: Či už tímy hrali proti sebe v KONKRÉTNEJ SKUPINE (len ak neprešla kontrola kategórie) ---
        // Táto kontrola sa vykoná LEN AK tímy EŠTE nehrali proti sebe v rámci CELEJ kategórie.
        // Ak chceme, aby sa tímy mohli v rámci kategórie stretnúť viackrát (napr. skupina + play-off),
        // ale v rámci jednej skupiny LEN RAZ, tak predchádzajúca kontrola by mala byť zrušená.
        // AK ale platí, že v rámci kategórie môžu hrať len raz, tak táto druhá kontrola je nadbytočná.

        // Pre jasnosť scenára: ak chcete, aby sa tímy mohli stretnúť viackrát v kategórii,
        // ale len raz v *rovnakej* skupine, potom by sa KONTROLA 1 mala úplne odstrániť
        // a ponechať len KONTROLU 2 (ktorá je vaša predošlá verzia).

        // AK je vaša požiadavka "najskôr pre kategoriu, potom pre skupinu" myslená ako:
        // 1. Ak už hrali v KATEGÓRII (akákoľvek skupina) -> stop
        // 2. Ak neprešli 1. bodom, ale už hrali v TEJTO KONKRÉTNEJ SKUPINE -> stop (toto by nemalo nastať ak bod 1. prešiel, lebo ak hrali v skupine, tak hrali aj v kategórii).
        // Ak je to takto, potom KONTROLA 2 nižšie už nemá zmysel.

        // Ak myslíte:
        // 1. Skontroluj, či už hrali v TEJTO SKUPINE (ak áno, stop).
        // 2. Ak nie, skontroluj, či už hrali v TEJTO KATEGÓRII (ak áno, stop).

        // Ak je scenár 2, potom potrebujeme najprv kontrolu pre skupinu a AŽ POTOM pre kategóriu.
        // Váš popis "najskôr pre kategóriu, potom pre skupinu" je trochu nejednoznačný v kontexte toho, čo chcete dovoliť.

        // Predpokladajme, že chcete:
        // A) Tímy nemôžu hrať sami proti sebe.
        // B) Tímy z rovnakého klubu nemôžu hrať proti sebe v rovnakej SKUPINE.
        // C) Dva konkrétne tímy (podľa čísla) môžu hrať proti sebe v DANEJ KATEGÓRII len raz (bez ohľadu na skupinu).
        // Ak platí C), potom kontrola, či hrali v konkrétnej skupine, je zbytočná, lebo KONTROLA 1 už to pokryla.

        // AK ALEBO chceme:
        // A) Tímy nemôžu hrať sami proti sebe.
        // B) Tímy z rovnakého klubu nemôžu hrať proti sebe v rovnakej SKUPINE.
        // C) Dva konkrétne tímy (podľa čísla) môžu hrať proti sebe v DANEJ SKUPINE len raz.
        // D) A ak prešli C), ale už hrali v TEJ ISTEJ KATEGÓRII (ale v inej skupine) -> to je OK.

        // Ak je požiadavka (C) a (D), tak potom by kontrola pre skupinu mala byť prvá a až potom by prišla kontrola pre kategóriu,
        // ALEBO by ste ju chceli mať nezávisle a rozhodnúť sa, ktorú chcete použiť.

        // Na základe "najskôr pre kategoriu, potom pre skupinu" budem interpretovať, že ak už hrali v rámci kategórie, tak nová hra je zakázaná.
        // KONTROLA 2 (pre skupinu) by potom bola relevantná len ak by KONTROLA 1 (kategória) bola zrušená.
        // ALEBO, ak chcete, aby sa tímy stretli len raz V KATEGÓRII (spolu), ale zároveň, aby sa nemohli stretnúť dvakrát V TEJ ISTEJ SKUPINE.
        // To by bol scenár, kde "kategória" je striktnejšia než "skupina".

        // Ak chceme, aby kontrola pre skupinu bola stále aktívna a zobrazovala iné hlásenie:
        // Musíme spraviť druhý query.

        // Pre ilustráciu scenára, kde "najprv pre kategoriu, potom pre skupinu" má zmysel:
        // Predstavme si, že tímy môžu hrať proti sebe viackrát v tej istej kategórii (napr. rôzne fázy turnaja),
        // ale v rámci jednej skupiny (napr. základnej skupiny) len raz.
        // A potom napríklad v play-off sa už môžu stretnúť znova.

        // AK JE CIEĽOM:
        // 1. Zisti, či už hrali v tejto KATEGÓRII a TEJTO SKUPINE (striktne v rovnakej skupine)
        // 2. Ak nie, zisti, či už hrali v tejto KATEGÓRII (v akejkoľvek skupine)
        // Toto by však dávalo zmysel, ak by ste mali v úmysle povoliť viac zápasov medzi rovnakými tímami V RÁMCI KATEGÓRIE,
        // ale zakázať duplicitné zápasy v rámci TEJ ISTEJ SKUPINY.
        // V takom prípade by kontrola 1 (kategória) mala byť menej prísna alebo sa úplne odstrániť.

        // Vzhľadom na formuláciu "najskôr pre kategóriu, potom pre skupinu", predpokladám, že ak už hrali v kategórii (kdekoľvek),
        // tak ďalší zápas je zakázaný. Tým pádom je kontrola pre konkrétnu skupinu nadbytočná.

        // Ak však "najskôr pre kategóriu, potom pre skupinu" znamená, že prioritou je kontrola v rámci kategórie,
        // ale ak prejdú touto kontrolou, tak ešte dodatočne skontrolujeme, či už nehrali v tej ISTEJ skupine.
        // To by ale vyžadovalo, aby sa kontrola na kategóriu zjemnila (napr. aby povolila viac zápasov v kategórii,
        // ak sú v iných skupinách).
        // Ak to má byť ako "hlavná kontrola je kategória, a len ak neprejde, tak pozri skupinu", je to redundantné.

        // Pravdepodobne to myslíte takto:
        // 1. Kontrola, či dva tímy už hrali proti sebe v TEJTO KATEGÓRII A TEJTO SKUPINE.
        // 2. Ak nie, tak kontrola, či dva tímy už hrali proti sebe v TEJTO KATEGÓRII (v inej skupine).
        // A ak zistím niektorý z nich, tak stopnem.
        // To by bola tá istá logika, akú som mal predtým, ale s pridaním druhého dopytu na skupinu.

        // Najprv vykonám kontrolu pre KATEGÓRIU A SKUPINU (ako to bolo predtým, čo ste vrátili), a až potom kontrolu len pre KATEGÓRIU.
        // Ak sa nájde zhoda v KATEGÓRII A SKUPINE, zobrazí sa špecifické hlásenie.
        // Ak sa nájde zhoda len v KATEGÓRII (ale nie v tejto skupine), zobrazí sa iné hlásenie.

        // --- KONTROLA 1: Či už tímy hrali proti sebe v konkrétnej kategórii A skupine ---
        try {
            const q1_group = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup),
                where("team1Number", "==", team1Number),
                where("team2Number", "==", team2Number)
            );
            const q2_group = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup),
                where("team1Number", "==", team2Number),
                where("team2Number", "==", team1Number)
            );

            const snapshot1_group = await getDocs(q1_group);
            const snapshot2_group = await getDocs(q2_group);

            let alreadyPlayedInGroup = false;
            if (snapshot1_group.docs.some(doc => doc.id !== currentMatchId) || snapshot2_group.docs.some(doc => doc.id !== currentMatchId)) {
                alreadyPlayedInGroup = true;
            }

            if (alreadyPlayedInGroup) {
                alert('Tieto dva tímy už proti sebe hrali v tejto kategórii a skupine. Nemôžu hrať znova v rovnakej skupine.');
                return;
            }

        } catch (error) {
            console.error("Chyba pri kontrole predchádzajúcich zápasov v skupine:", error);
            alert("Vyskytla sa chyba pri kontrole predchádzajúcich zápasov v skupine. Skúste to znova.");
            return;
        }

        // --- KONTROLA 2: Či už tímy hrali proti sebe v rámci KATEGÓRIE (bez ohľadu na skupinu) ---
        // Táto kontrola sa vykoná AŽ POTOM, čo prejde kontrola pre konkrétnu skupinu.
        // Ak už hrali v akejkoľvek inej skupine v tej istej kategórii, upozorníme.
        try {
            const q1_category_overall = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("team1Number", "==", team1Number),
                where("team2Number", "==", team2Number)
            );
            const q2_category_overall = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("team1Number", "==", team2Number),
                where("team2Number", "==", team1Number)
            );

            const snapshot1_category_overall = await getDocs(q1_category_overall);
            const snapshot2_category_overall = await getDocs(q2_category_overall);

            let alreadyPlayedInCategoryOverall = false;
            // Filter pre existujúce zápasy, aby sa vylúčil aktuálny upravovaný zápas
            if (snapshot1_category_overall.docs.some(doc => doc.id !== currentMatchId) || snapshot2_category_overall.docs.some(doc => doc.id !== currentMatchId)) {
                alreadyPlayedInCategoryOverall = true;
            }

            if (alreadyPlayedInCategoryOverall) {
                alert('Tieto dva tímy už proti sebe hrali v tejto kategórii (v inej skupine). Nemôžu hrať znova v rámci tejto kategórie.');
                return;
            }

        } catch (error) {
            console.error("Chyba pri kontrole predchádzajúcich zápasov v kategórii (celkovo):", error);
            alert("Vyskytla sa chyba pri kontrole predchádzajúcich zápasov v kategórii (celkovo). Skúste to znova.");
            return;
        }
        // --- KONIEC KONTROLY 2 ---


        const matchData = {
            date: matchDateInput.value,
            startTime: matchStartTimeInput.value,
            duration: parseInt(matchDurationInput.value),
            location: matchLocationInput.value,
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
});
