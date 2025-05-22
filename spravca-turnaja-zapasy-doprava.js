import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, busesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef } from './spravca-turnaja-common.js'; // ZMENENÉ: sportHallsCollectionRef na placesCollectionRef

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
    const addPlaceButton = document.getElementById('addPlaceButton'); // ZMENENÉ: Pôvodne addSportHallButton
    const addMatchButton = document.getElementById('addMatchButton');
    const addBusButton = document.getElementById('addBusButton');

    // Modálne okno pre zápas
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect'); // ZMENENÉ: Pôvodne matchSportHallSelect
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime'); // Opravené: bolo 'document ='
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchesContainer = document.getElementById('matchesContainer');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

    // Modálne okno pre hrací deň
    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayIdInput = document.getElementById('playingDayId'); // NOVÉ
    const playingDayDateInput = document.getElementById('playingDayDate');
    const playingDayModalTitle = document.getElementById('playingDayModalTitle'); // NOVÉ
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal'); // NOVÉ

    // Modálne okno pre miesto (pôvodne športová hala)
    const placeModal = document.getElementById('placeModal'); // ZMENENÉ: Pôvodne sportHallModal
    const closePlaceModalButton = document.getElementById('closePlaceModal'); // ZMENENÉ
    const placeForm = document.getElementById('placeForm'); // ZMENENÉ
    const placeIdInput = document.getElementById('placeId'); // ZMENENÉ
    const placeTypeSelect = document.getElementById('placeTypeSelect'); // NOVÉ
    const placeNameInput = document.getElementById('placeName'); // ZMENENÉ
    const placeAddressInput = document.getElementById('placeAddress'); // ZMENENÉ
    const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl'); // ZMENENÉ
    const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal'); // NOVÉ: Tlačidlo Vymazať v modale

    // Modálne okno pre autobus
    const busModal = document.getElementById('busModal');
    const closeBusModalButton = document.getElementById('closeBusModal');
    const busForm = document.getElementById('busForm');
    const busIdInput = document.getElementById('busId');
    const busModalTitle = document.getElementById('busModalTitle');
    const busNameInput = document.getElementById('busNameInput');
    const busDateSelect = document.getElementById('busDateSelect');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect');
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');

    // Konštantné ID dokumentu pre nastavenia (musí byť rovnaké ako v spravca-turnaja-nastavenia.js)
    const SETTINGS_DOC_ID = 'matchTimeSettings';


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- Funkcie pre plnenie select boxov ---
    async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
        try {
            const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            querySnapshot.forEach((doc) => {
                const day = doc.data();
                const option = document.createElement('option');
                option.value = day.date; // Uložíme dátum ako hodnotu
                
                const dateObj = new Date(day.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                option.textContent = formattedDate; // Zobrazíme naformátovaný dátum
                
                selectElement.appendChild(option);
            });
            if (selectedDate) {
                selectElement.value = selectedDate; 
            }
        } catch (error) {
            console.error("Error loading playing days: ", error);
        }
    }

    // NOVÁ Funkcia: Plní select boxy iba športovými halami (pre zápasy)
    async function populateSportHallSelects(selectElement, selectedPlaceName = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto (športovú halu) --</option>';
        try {
            const querySnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Športová hala"), orderBy("name", "asc")));
            if (querySnapshot.empty) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Žiadne športové haly nenájdené --';
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn("No sport halls found in Firestore.");
            } else {
                querySnapshot.forEach((doc) => {
                    const place = { id: doc.id, ...doc.data() };
                    const option = document.createElement('option');
                    option.value = place.name; // Pre zápasy ukladáme len názov haly
                    option.textContent = `${place.name}`; // Zobrazíme len názov
                    selectElement.appendChild(option);
                });
            }
            if (selectedPlaceName) {
                selectElement.value = selectedPlaceName;
            }
        } catch (error) {
            console.error("Error loading sport halls: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní hál --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }

    // NOVÁ Funkcia: Plní select boxy všetkými typmi miest (pre autobusy)
    async function populateAllPlaceSelects(selectElement, selectedPlaceCombined = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto --</option>';
        try {
            const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
            if (querySnapshot.empty) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Žiadne miesta nenájdené --';
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn("No places found in Firestore.");
            } else {
                querySnapshot.forEach((doc) => {
                    const place = { id: doc.id, ...doc.data() };
                    const option = document.createElement('option');
                    option.value = `${place.name}:::${place.type}`; // Uložíme kombináciu názvu a typu ako hodnotu
                    option.textContent = `${place.name} (${place.type})`; // Zobrazíme názov miesta a jeho typ
                    selectElement.appendChild(option);
                });
            }
            if (selectedPlaceCombined) {
                selectElement.value = selectedPlaceCombined;
            }
        } catch (error) {
            console.error("Error loading places: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní miest --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }
    // --- Koniec funkcií pre plnenie select boxov ---

    /**
     * Načíta nastavenia zápasu pre vybranú kategóriu z Firestore.
     * Ak nastavenia neexistujú, vráti predvolené hodnoty.
     * @param {string} categoryId ID vybranej kategórie.
     * @returns {Promise<{duration: number, bufferTime: number}>} Objekt s trvaním a ochranným pásmom.
     */
    async function getCategoryMatchSettings(categoryId) {
        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                const categorySettings = data.categoryMatchSettings && data.categoryMatchSettings[categoryId];
                if (categorySettings) {
                    return {
                        duration: categorySettings.duration || 60,
                        bufferTime: categorySettings.bufferTime || 5
                    };
                }
            }
        } catch (error) {
            console.error("Chyba pri načítaní nastavení kategórie: ", error);
        }
        // Predvolené hodnoty, ak nastavenia pre kategóriu neexistujú alebo sa vyskytla chyba
        return { duration: 60, bufferTime: 5 };
    }

    /**
     * Aktualizuje inputy pre trvanie a ochranné pásmo na základe vybranej kategórie.
     */
    async function updateMatchDurationAndBuffer() {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            const settings = await getCategoryMatchSettings(selectedCategoryId);
            matchDurationInput.value = settings.duration;
            matchBufferTimeInput.value = settings.bufferTime;
        } else {
            // Ak nie je vybraná kategória, nastav predvolené hodnoty
            matchDurationInput.value = 60;
            matchBufferTimeInput.value = 5;
        }
        // Po aktualizácii trvania/bufferu, skús nájsť prvý dostupný čas
        findFirstAvailableTime();
    }


    /**
     * Nájsť prvý dostupný časový slot pre zápas na základe vybraného dátumu, miesta, trvania a ochranného pásma.
     * Nastaví nájdený čas do inputu matchStartTimeInput.
     */
    async function findFirstAvailableTime() {
        const selectedDate = matchDateSelect.value;
        const selectedLocationName = matchLocationSelect.value; // Pre zápasy je to len názov haly
        const duration = parseInt(matchDurationInput.value) || 60; // Použije aktuálnu hodnotu inputu
        const bufferTime = parseInt(matchBufferTimeInput.value) || 5; // Použije aktuálnu hodnotu inputu

        // Ak nie sú vybrané dátum alebo miesto, nemôžeme hľadať voľný slot
        if (!selectedDate || !selectedLocationName) {
            matchStartTimeInput.value = ''; 
            return;
        }

        try {
            // Načítame nastavenia časov začiatku hracích dní
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            let firstDayStartTime = '08:00'; // Predvolené hodnoty
            let otherDaysStartTime = '08:00';

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                firstDayStartTime = data.firstDayStartTime || '08:00';
                otherDaysStartTime = data.otherDaysStartTime || '08:00';
            }

            // Zistíme, či je vybraný dátum prvým hracím dňom
            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
            const isFirstPlayingDay = sortedPlayingDays.length > 0 && selectedDate === sortedPlayingDays[0];

            let [startH, startM] = (isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime).split(':').map(Number);
            const endSearchHour = 22; // Končíme hľadať o 22:00
            const intervalMinutes = 1; // Kontrolujeme každú minútu

            // Načítame všetky existujúce zápasy pre vybraný dátum a miesto
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", selectedDate),
                where("location", "==", selectedLocationName) // Používame len názov miesta
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
            const existingEvents = existingMatchesSnapshot.docs.map(doc => {
                const data = doc.data();
                const [eventStartH, eventStartM] = data.startTime.split(':').map(Number);
                const startInMinutes = eventStartH * 60 + eventStartM;
                // Koniec existujúceho zápasu vrátane jeho trvania a ochranného pásma
                const endInMinutes = startInMinutes + (data.duration || 0) + (data.bufferTime || 0);
                return { start: startInMinutes, end: endInMinutes };
            });

            // Zotriedime existujúce udalosti podľa času začiatku pre efektívnejšiu kontrolu prekrývania
            existingEvents.sort((a, b) => a.start - b.start);

            // Prechádzame potenciálnymi časovými slotmi
            for (let hour = startH; hour <= endSearchHour; hour++) {
                // Ak je to prvá hodina, začíname od minúty definovanej v nastaveniach, inak od 0
                const currentMinuteStart = (hour === startH) ? startM : 0; 
                for (let minute = currentMinuteStart; minute < 60; minute += intervalMinutes) {
                    const potentialStartInMinutes = hour * 60 + minute;
                    // Vypočítame koniec potenciálneho slotu vrátane trvania a ochranného pásma
                    const potentialEndInMinutes = potentialStartInMinutes + duration + bufferTime;

                    let overlap = false;
                    // Skontrolujeme, či sa potenciálny slot prekrýva s nejakým existujúcim zápasom
                    for (const existingEvent of existingEvents) {
                        // Podmienka prekrývania: (začiatok nového < koniec existujúceho && koniec nového > začiatku existujúceho)
                        if (potentialStartInMinutes < existingEvent.end && potentialEndInMinutes > existingEvent.start) {
                            overlap = true;
                            break; // Prekrývanie nájdené, prejdeme na ďalší potenciálny slot
                        }
                    }

                    // Ak sa nenašlo prekrývanie, našli sme voľný slot
                    if (!overlap) {
                        const formattedHour = String(hour).padStart(2, '0');
                        const formattedMinute = String(minute).padStart(2, '0');
                        matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
                        return; // Ukončíme funkciu po nastavení času
                    }
                }
            }

            // Ak sa nenašiel žiadny voľný slot v definovanom rozsahu
            matchStartTimeInput.value = ''; 
            console.warn("Nenašiel sa žiadny voľný časový slot pre zápas v daný deň a hale v rozsahu 08:00 - 22:00.");

        } catch (error) {
            console.error("Chyba pri hľadaní prvého dostupného času: ", error);
            matchStartTimeInput.value = '';
        }
    }

    // --- Funkcia na načítanie a zobrazenie zápasov a autobusov ako rozvrh ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        // Vymažeme matchesContainer pred opätovným vykreslením
        matchesContainer.innerHTML = ''; // Vymaže existujúci obsah vrátane starého busOverlayContainer

        matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam logistiku turnaja...</p>');
        
        // Definície konštánt pre výpočet pozícií a rozmerov
        const CELL_WIDTH_PX = 350;
        const MINUTES_PER_HOUR = 60;
        const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_HOUR;
        const ITEM_HEIGHT_PX = 140; 

        try {
            // Načítame zápasy
            const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
            const matchesSnapshot = await getDocs(matchesQuery);
            const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));

            // Načítame autobusy
            const busesQuery = query(busesCollectionRef, orderBy("date", "asc"), orderBy("busName", "asc"), orderBy("startTime", "asc"));
            const busesSnapshot = await getDocs(busesQuery);
            const allBuses = busesSnapshot.docs.map(doc => ({ id: doc.id, type: 'bus', ...doc.data() }));

            // Spojíme všetky udalosti (zápasy a autobusy)
            const allEvents = [...allMatches, ...allBuses];

            // Získame aj hracie dni a miesta pre hlavičky tabuľky
            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc"))); 

            const existingPlayingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);
            // Získame kompletné dáta o miestach pre zobrazenie adresy a URL
            const existingPlacesData = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 

            // NOVÉ: Vytvoríme unikátne kombinácie názvu a typu pre zobrazenie riadkov
            const uniquePlacesForRows = [];
            const addedPlaceKeys = new Set(); // Sledujeme unikátne kombinácie "názov:::typ"

            existingPlacesData.forEach(place => {
                const placeKey = `${place.name}:::${place.type}`;
                if (!addedPlaceKeys.has(placeKey)) {
                    uniquePlacesForRows.push(place);
                    addedPlaceKeys.add(placeKey);
                }
            });

            uniquePlacesForRows.sort((a, b) => {
                // Zotriedime najprv podľa typu, potom podľa názvu
                if (a.type < b.type) return -1;
                if (a.type > b.type) return 1;
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            });

            // Spojíme unikátne miesta a dátumy zo všetkých udalostí
            const uniqueLocations = new Set(); // Toto bude obsahovať kombinácie "názov:::typ" pre všetky miesta
            uniquePlacesForRows.forEach(place => uniqueLocations.add(`${place.name}:::${place.type}`));

            const uniqueDates = new Set([...existingPlayingDays]);

            allEvents.forEach(event => {
                uniqueDates.add(event.date);
                // Pre autobusy pridáme aj ich konkrétne začiatky a konce do uniqueLocations
                if (event.type === 'bus') {
                    uniqueLocations.add(event.startLocation); // Očakáva sa "názov:::typ"
                    uniqueLocations.add(event.endLocation);   // Očakáva sa "názov:::typ"
                } else {
                    // Pre zápasy, ktoré ukladajú len názov miesta, musíme nájsť typ
                    const matchPlaceData = existingPlacesData.find(p => p.name === event.location && p.type === 'Športová hala');
                    if (matchPlaceData) {
                        uniqueLocations.add(`${matchPlaceData.name}:::${matchPlaceData.type}`);
                    }
                }
            });

            const sortedLocations = Array.from(uniqueLocations).sort();
            const sortedDates = Array.from(uniqueDates).sort();

            const dailyTimeRanges = new Map();
            allEvents.forEach(event => {
                const date = event.date;
                let startTimeInMinutes, endTimeInMinutes;

                if (event.type === 'match') {
                    const [startH, startM] = event.startTime.split(':').map(Number);
                    const durationWithBuffer = (event.duration || 0) + (event.bufferTime || 0);
                    startTimeInMinutes = startH * 60 + startM;
                    endTimeInMinutes = startTimeInMinutes + durationWithBuffer;
                } else if (event.type === 'bus') {
                    const [startH, startM] = event.startTime.split(':').map(Number);
                    const [endH, endM] = event.endTime.split(':').map(Number);
                    startTimeInMinutes = startH * 60 + startM;
                    endTimeInMinutes = endH * 60 + endM;
                    if (endTimeInMinutes < startTimeInMinutes) {
                        endTimeInMinutes += 24 * 60; // Prechod cez polnoc
                    }
                }

                let actualEndHour = Math.ceil(endTimeInMinutes / 60);

                if (!dailyTimeRanges.has(date)) {
                    dailyTimeRanges.set(date, { minHour: Math.floor(startTimeInMinutes / 60), maxHour: actualEndHour });
                } else {
                    const range = dailyTimeRanges.get(date);
                    range.minHour = Math.min(range.minHour, Math.floor(startTimeInMinutes / 60));
                    range.maxHour = Math.max(range.maxHour, actualEndHour);
                }
            });

            // Odstránime "Načítavam logistiku turnaja..."
            matchesContainer.innerHTML = ''; 

            // Vytvoríme schedule-table-container s position:relative a overflow:auto
            // To je kľúčové pre správne posúvanie SVG elementov vo vnútri
            let scheduleHtml = '<div class="schedule-table-container" style="position: relative; overflow: auto;">'; 
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
            // Top-left corner cell: sticky both horizontally and vertically
            scheduleHtml += `<th class="fixed-column" style="position: sticky; top: 0; left: 0; z-index: 101; background-color: #d0d0d0;">Miesto / Čas</th>`;

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

                const colspan = hoursForDate.length > 0 ? hoursForDate.length : 1;

                // Date headers: sticky horizontally
                scheduleHtml += `<th colspan="${colspan}" class="date-header-clickable" data-date="${date}" title="Kliknutím upravíte hrací deň ${formattedDisplayDate}" style="position: sticky; top: 0; z-index: 100; background-color: #d0d0d0;">`; 
                scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div>`;
                scheduleHtml += '<div class="schedule-times-row">';
                if (hoursForDate.length > 0) {
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                    });
                } else {
                    scheduleHtml += `<span></span>`; // Placeholder for empty day
                }
                scheduleHtml += '</div>';

                scheduleHtml += '</th>';
            });
            scheduleHtml += '</tr></thead><tbody>';

            // NOVÉ: Iterujeme cez všetky unikátne kombinácie názvu a typu pre zobrazenie riadkov
            uniquePlacesForRows.forEach(placeData => { 
                const locationName = placeData.name;
                const placeAddress = placeData.address;
                const placeGoogleMapsUrl = placeData.googleMapsUrl;
                const placeType = placeData.type; 

                let typeClass = '';
                let specificBackgroundColor = ''; // Stores the type-specific background color
                switch (placeType) {
                    case 'Športová hala':
                        typeClass = 'place-type-sport-hall';
                        specificBackgroundColor = 'background-color: #007bff;'; // Modrá farba pre športovú halu
                        break;
                    case 'Stravovacie zariadenie':
                        typeClass = 'place-type-catering';
                        specificBackgroundColor = 'background-color: #ffc107;'; // Oranžová farba pre stravovacie zariadenie
                        break;
                    case 'Ubytovanie':
                        typeClass = 'place-type-accommodation';
                        specificBackgroundColor = 'background-color: #4CAF50;'; // Zelená farba pre ubytovanie
                        break;
                    default:
                        typeClass = ''; 
                }

                // Base sticky styles for the first column.
                // The specificBackgroundColor will override the default background if present.
                const stickyColumnStyles = `position: sticky; left: 0; z-index: 100; background-color: #e0e0e0;`; 
                const finalColumnStyle = `${stickyColumnStyles} ${specificBackgroundColor}`;

                scheduleHtml += '<tr>';
                // Pridaný data-type atribút a inline štýl pre sticky stĺpec
                scheduleHtml += `<th class="fixed-column schedule-location-header delete-location-header ${typeClass}" data-location="${locationName}" data-type="${placeType}" title="Kliknutím upravíte miesto ${locationName} (${placeType})" style="${finalColumnStyle}">
                    <div class="hall-name">${locationName} (${placeType})</div> <div class="hall-address">
                        <a href="${placeGoogleMapsUrl}" target="_blank" rel="noopener noreferrer">${placeAddress}</a>
                    </div>
                </th>`;

                sortedDates.forEach(date => {
                    const range = dailyTimeRanges.get(date);
                    const hoursForDateCount = range ? (range.maxHour - range.minHour) : 0;
                    const colspan = hoursForDateCount > 0 ? hoursForDateCount : 1;

                    scheduleHtml += `<td colspan="${colspan}" style="position: relative; background-color: #f7f7f7;">`;

                    // Filter zápasov: Zobrazovať len ak je riadok typu 'Športová hala'
                    const matchesForCell = allEvents.filter(event =>
                        event.type === 'match' && event.location === locationName && event.date === date && placeType === 'Športová hala'
                    );

                    matchesForCell.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    matchesForCell.forEach(match => {
                        const [startH, startM] = match.startTime.split(':').map(Number);
                        const absoluteStartMin = startH * 60 + startM;
                        
                        const relativeStartMinInCell = absoluteStartMin - (range.minHour * 60);

                        const matchBlockLeftPx = relativeStartMinInCell * PIXELS_PER_MINUTE;
                        const matchBlockWidthPx = match.duration * PIXELS_PER_MINUTE;
                        const bufferBlockLeftPx = matchBlockLeftPx + matchBlockWidthPx;
                        const bufferBlockWidthPx = match.bufferTime * PIXELS_PER_MINUTE;

                        const matchEndTime = new Date();
                        matchEndTime.setHours(startH, startM + match.duration, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        // Logika pre zobrazenie názvov tímov
                        let team1ClubNameDisplay = match.team1ClubName ? `${match.team1ClubName}` : '';
                        let team2ClubNameDisplay = match.team2ClubName ? `${match.team2ClubName}` : '';

                        let clubNamesHtml = '';
                        if (team1ClubNameDisplay) {
                            clubNamesHtml += `${team1ClubNameDisplay}`;
                        }
                        if (team2ClubNameDisplay) {
                            if (clubNamesHtml) clubNamesHtml += `<br>`; // Pridáme <br> len ak už je niečo v clubNamesHtml
                            clubNamesHtml += `${team2ClubNameDisplay}`;
                        }

                        // Wrap clubNamesHtml in a span with inline style to ensure it's not bold
                        const finalClubNamesHtml = clubNamesHtml ? `<span style="font-weight: normal;">${clubNamesHtml}</span>` : '';

                        scheduleHtml += `
                            <div class="schedule-cell-match"
                                data-id="${match.id}" data-type="${match.type}"
                                style="left: ${matchBlockLeftPx}px; width: ${matchBlockWidthPx}px; top: 0; height: 100%;">
                                <div class="schedule-cell-content">
                                    <p class="schedule-cell-time">${match.startTime} - ${formattedEndTime}</p>
                                    <p class="schedule-cell-category">${match.categoryName || 'N/A'}${match.groupName ? ` ${match.groupName}` : ''}</p>
                                    <p class="schedule-cell-teams">
                                        ${match.team1DisplayName}<br>
                                        ${match.team2DisplayName}<br>
                                        ${finalClubNamesHtml}
                                    </p>
                                </div>
                            </div>
                        `;
                        if (match.bufferTime > 0) {
                            scheduleHtml += `
                                <div class="schedule-cell-buffer"
                                    style="left: ${bufferBlockLeftPx}px; width: ${bufferBlockWidthPx}px; top: 0; height: 100%;">
                                </div>
                            `;
                        }
                    });
                    scheduleHtml += '</td>';
                });
                scheduleHtml += '</tr>';
            });
            scheduleHtml += '</tbody></table>';
            scheduleHtml += '</div>'; // Close schedule-table-container

            // Pridáme štruktúru tabuľky do DOM
            matchesContainer.insertAdjacentHTML('beforeend', scheduleHtml);

            // Získame referencie na tabuľku a jej kontajner po tom, čo sú v DOM
            const scheduleTableContainer = matchesContainer.querySelector('.schedule-table-container');
            const scheduleTable = matchesContainer.querySelector('.match-schedule-table');
            
            // NOVÉ: Kontrola existencie elementov pred ich použitím
            if (!scheduleTableContainer || !scheduleTable) {
                console.error("Schedule table container or table not found. Cannot render buses or calculate offsets.");
                matchesContainer.innerHTML = '<p>Chyba pri zobrazení rozvrhu. Chýbajú komponenty tabuľky.</p>';
                return; // Ukončíme funkciu, ak elementy chýbajú
            }

            const scheduleTableContainerRect = scheduleTableContainer.getBoundingClientRect();

            // Vytvoríme a pridáme busOverlayContainer teraz, keď je tabuľka v DOM
            const busOverlayContainer = document.createElement('div');
            busOverlayContainer.id = 'busOverlayContainer';
            // Nastavíme pozíciu na absolute v rámci scheduleTableContainer (ktorý je relative a scrollable)
            // Nastavíme šírku a výšku na 100% rodiča a pointer-events na none predvolene
            busOverlayContainer.style.cssText = `
                    position: absolute; 
                    top: 0; 
                    left: 0; 
                    width: ${scheduleTable.offsetWidth}px; /* Nastavíme šírku na šírku tabuľky */
                    height: ${scheduleTable.offsetHeight}px; /* Nastavíme výšku na výšku tabuľku */
                    pointer-events: none;
                `; 
            scheduleTableContainer.appendChild(busOverlayContainer); // Pridáme do scheduleTableContainer

            // Výpočet globálnych pixelových offsetov pre miesta a časy
            // Tieto offsety sú teraz relatívne k scheduleTableContainer, ktorý je kontextom pozícií pre busOverlayContainer
            const locationRowTopOffsets = new Map(); // "názov:::typ" -> globálny top pixelový offset relatívny k scheduleTableContainer
            scheduleTable.querySelectorAll('tbody tr').forEach(row => {
                const locationHeader = row.querySelector('th.fixed-column');
                if (locationHeader) {
                    const locationName = locationHeader.dataset.location;
                    const locationType = locationHeader.dataset.type;
                    // Používame kombináciu názvu a typu ako kľúč
                    locationRowTopOffsets.set(`${locationName}:::${locationType}`, locationHeader.getBoundingClientRect().top - scheduleTableContainerRect.top); 
                }
            });

            const timeColumnLeftOffsets = new Map(); // date -> pole {hour, leftOffset relatívny k scheduleTableContainer}
            const firstTimeHeader = scheduleTable.querySelector('thead th:not(.fixed-column)');
            if (firstTimeHeader) {
                sortedDates.forEach(date => {
                    const dateHeader = scheduleTable.querySelector(`th[data-date="${date}"]`);
                    if (dateHeader) {
                        const timeSpans = dateHeader.querySelectorAll('.schedule-times-row span');
                        const hourOffsets = [];
                        const range = dailyTimeRanges.get(date);
                        const firstHourInDay = range ? range.minHour : 0;

                        timeSpans.forEach((span, index) => {
                            const hour = firstHourInDay + index; // Hodina na základe jej pozície v zozname spanov
                            hourOffsets.push({
                                hour: hour,
                                // Vypočítame ľavú pozíciu relatívnu k left scheduleTableContainer
                                left: (dateHeader.getBoundingClientRect().left - scheduleTableContainerRect.left) + (index * CELL_WIDTH_PX)
                            });
                        });
                        timeColumnLeftOffsets.set(date, hourOffsets);
                    }
                });
            }

            // Vykreslíme autobusy ako globálne SVG
            allBuses.forEach(bus => {
                // Očakávame, že startLocation a endLocation v dátach autobusu sú už vo formáte "názov:::typ"
                const startLocationKey = bus.startLocation; 
                const endLocationKey = bus.endLocation;     
                const date = bus.date;

                let busStartY, busEndY;
                const startLocationTop = locationRowTopOffsets.get(startLocationKey);
                const endLocationTop = locationRowTopOffsets.get(endLocationKey);

                if (startLocationTop === undefined || endLocationTop === undefined) {
                    console.warn(`Nenašiel som pozíciu pre začiatok alebo koniec trasy autobusu: ${bus.busName} (${startLocationKey} -> ${endLocationKey}). Možno chýba typ miesta v uložených dátach autobusu.`);
                    return;
                }

                // Logika pre smer vykresľovania autobusu (zostáva rovnaká)
                if (startLocationTop <= endLocationTop) {
                    busStartY = startLocationTop;
                    busEndY = endLocationTop + ITEM_HEIGHT_PX;
                } else {
                    busStartY = startLocationTop + ITEM_HEIGHT_PX;
                    busEndY = endLocationTop;
                }

                const [startH, startM] = bus.startTime.split(':').map(Number);
                const [endH, endM] = bus.endTime.split(':').map(Number);

                const startTimeInMinutes = startH * 60 + startM;
                let endTimeInMinutes = endH * 60 + endM;
                if (endTimeInMinutes < startTimeInMinutes) {
                    endTimeInMinutes += 24 * 60; // Spracovanie prechodu cez polnoc
                }

                const durationInMinutes = endTimeInMinutes - startTimeInMinutes;

                const dateHours = timeColumnLeftOffsets.get(date);
                if (!dateHours || dateHours.length === 0) {
                    console.warn(`Nenašiel som časové stĺpce pre dátum: ${date}`);
                    return;
                }

                let busLeftPx = 0;
                const range = dailyTimeRanges.get(date);
                const firstHourOfDate = range ? range.minHour : 0;
                
                const firstHourDataForDate = dateHours.find(h => h.hour === firstHourOfDate);
                if (firstHourDataForDate) {
                    busLeftPx = firstHourDataForDate.left + ((startTimeInMinutes - (firstHourOfDate * 60)) * PIXELS_PER_MINUTE);
                } else {
                    console.warn(`Nepodarilo sa nájsť špecifické údaje o hodine pre dátum ${date} a hodinu ${firstHourOfDate}. Používam prvé dostupné.`);
                    busLeftPx = dateHours[0].left + ((startTimeInMinutes - (dateHours[0].hour * 60)) * PIXELS_PER_MINUTE);
                }

                // Zmenšená šírka autobusu o polovicu
                const busWidthPx = (durationInMinutes * PIXELS_PER_MINUTE) / 4; 
                const slantOffset = 30; 

                const svgWidth = busWidthPx + Math.abs(slantOffset);
                const svgHeight = Math.abs(busEndY - busStartY);

                let points;
                let svgLeftOffset = 0;

                if (startLocationTop <= endLocationTop) {
                    points = `0,0 ${busWidthPx},0 ${svgWidth},${svgHeight} ${slantOffset},${svgHeight}`.trim();
                    svgLeftOffset = 0;
                } else {
                    points = `${slantOffset},0 ${svgWidth},0 ${busWidthPx},${svgHeight} 0,${svgHeight}`.trim();
                    svgLeftOffset = slantOffset;
                }

                const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svgElement.setAttribute("class", "bus-svg");
                svgElement.setAttribute("width", svgWidth);
                svgElement.setAttribute("height", svgHeight);
                svgElement.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
                svgElement.style.cssText = `
                    position: absolute;
                    left: ${busLeftPx - svgLeftOffset}px;
                    top: ${Math.min(busStartY, busEndY)}px;
                    pointer-events: all;
                `;
                svgElement.dataset.id = bus.id;
                svgElement.dataset.type = bus.type;

                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("class", "schedule-bus-polygon");
                polygon.setAttribute("points", points);
                svgElement.appendChild(polygon);

                const textYBase = svgHeight / 2; 
                const textXBase = svgWidth / 2; 

                const busNameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busNameText.setAttribute("class", "schedule-bus-text");
                busNameText.setAttribute("x", textXBase);
                busNameText.setAttribute("y", textYBase - 20);
                busNameText.setAttribute("text-anchor", "middle");
                busNameText.setAttribute("dominant-baseline", "middle");
                busNameText.textContent = bus.busName;
                svgElement.appendChild(busNameText);

                const busRouteText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busRouteText.setAttribute("class", "schedule-bus-route-text");
                busRouteText.setAttribute("x", textXBase);
                busRouteText.setAttribute("y", textYBase);
                busRouteText.setAttribute("text-anchor", "middle");
                busRouteText.setAttribute("dominant-baseline", "middle");
                busRouteText.textContent = `${bus.startLocation.split(':::')[0]} → ${bus.endLocation.split(':::')[0]}`; // Zobrazíme len názov
                svgElement.appendChild(busRouteText);

                const busTimeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busTimeText.setAttribute("class", "schedule-bus-time-text");
                busTimeText.setAttribute("x", textXBase);
                busTimeText.setAttribute("y", textYBase + 20);
                busTimeText.setAttribute("text-anchor", "middle");
                busTimeText.setAttribute("dominant-baseline", "middle");
                busTimeText.textContent = `${bus.startTime} - ${bus.endTime}`;
                svgElement.appendChild(busTimeText);

                if (bus.notes) {
                    const busNotesText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    busNotesText.setAttribute("class", "schedule-bus-notes-text");
                    busNotesText.setAttribute("x", textXBase);
                    busNotesText.setAttribute("y", textYBase + 40);
                    busNotesText.setAttribute("text-anchor", "middle");
                    busNotesText.setAttribute("dominant-baseline", "middle");
                    busNotesText.textContent = bus.notes;
                    svgElement.appendChild(busNotesText);
                }

                busOverlayContainer.appendChild(svgElement);
            });

            // Pridanie event listenerov pre kliknutie na zápas/autobus pre úpravu
            matchesContainer.querySelectorAll('.schedule-cell-match').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; // Použiť currentTarget pre div
                    editMatch(id);
                });
            });

            // Event listener pre autobusy je teraz na SVG elemente
            busOverlayContainer.querySelectorAll('.bus-svg').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; // Použiť currentTarget pre SVG
                    editBus(id);
                });
            });

            // Event listener pre hlavičky dátumov
            matchesContainer.querySelectorAll('.date-header-clickable').forEach(header => { 
                header.addEventListener('click', (event) => {
                    // Skontrolujte, či kliknutý element je odkaz alebo je vo vnútri odkazu
                    if (event.target.tagName === 'A' || event.target.closest('.hall-address')) { 
                        return; 
                    }
                    // Ak to nie je odkaz a kliknutie je na samotnej hlavičke dátumu, pokračujte s úpravou
                    if (event.target === header || event.target.closest('.schedule-date-header-content')) { 
                        const dateToEdit = header.dataset.date;
                        editPlayingDay(dateToEdit); 
                    }
                });
            });
            matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
                header.addEventListener('click', (event) => {
                    // Skontrolujte, či kliknutý element je odkaz alebo je vo vnútri odkazu
                    if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                        return; // Nerobte nič, ak bol kliknutý odkaz
                    }
                    // Ak to nie je odkaz a kliknutie je na samotnej hlavičke alebo div s názvom haly, pokračujte s úpravou
                    if (event.target === header || event.target.closest('.hall-name')) { 
                        const locationToEdit = header.dataset.location; 
                        const locationTypeToEdit = header.dataset.type; 
                        editPlace(locationToEdit, locationTypeToEdit); 
                    }
                });
            });

        } catch (error) {
            console.error("Chyba pri načítaní rozvrhu zápasov: ", error);
            matchesContainer.innerHTML = '<p>Chyba pri načítaní rozvrhu zápasov. Skontrolujte konzolu pre detaily a uistite sa, že máte vytvorené potrebné indexy vo Firestore.</p>';
        }
    }

    async function deletePlayingDay(dateToDelete) {
        if (confirm(`Naozaj chcete vymazať hrací deň ${dateToDelete} a VŠETKY zápasy a autobusové linky, ktoré sa konajú v tento deň?`)) {
            try {
                const batch = writeBatch(db);

                const playingDayQuery = query(playingDaysCollectionRef, where("date", "==", dateToDelete));
                const playingDaySnapshot = await getDocs(playingDayQuery);
                if (!playingDaySnapshot.empty) {
                    playingDaySnapshot.docs.forEach(docToDelete => {
                        batch.delete(doc(playingDaysCollectionRef, docToDelete.id));
                    });
                } else {
                    console.warn(`Hrací deň ${dateToDelete} sa nenašiel, ale pokračujem v mazaní zápasov a autobusov.`);
                }

                // Vymazanie súvisiacich zápasov
                const matchesQuery = query(matchesCollectionRef, where("date", "==", dateToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                // Vymazanie súvisiacich autobusov
                const busesQuery = query(busesCollectionRef, where("date", "==", dateToDelete));
                const busesSnapshot = await getDocs(busesQuery);
                busesSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                await batch.commit();
                alert(`Hrací deň ${dateToDelete} a všetky súvisiace zápasy a autobusové linky boli úspešne vymazané!`);
                closeModal(playingDayModal); // NOVÉ: Zatvoríme modal po vymazaní
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Chyba pri mazaní hracieho dňa ${dateToDelete}: `, error);
                alert(`Chyba pri mazaní hracieho dňa ${dateToDelete}. Pozrite konzolu pre detaily.`);
            }
        }
    }

    // Funkcia na mazanie miesta (teraz prijíma aj typ miesta pre presné mazanie)
    async function deletePlace(placeNameToDelete, placeTypeToDelete) { 
        if (confirm(`Naozaj chcete vymazať miesto ${placeNameToDelete} (${placeTypeToDelete}) a VŠETKY zápasy a autobusové linky, ktoré sa viažu na toto miesto?`)) { 
            try {
                const batch = writeBatch(db);

                // Kontrola na základe názvu a typu, aby sa vymazalo správne miesto
                const placeQuery = query(placesCollectionRef, where("name", "==", placeNameToDelete), where("type", "==", placeTypeToDelete));
                const placeSnapshot = await getDocs(placeQuery); 
                if (!placeSnapshot.empty) {
                    placeSnapshot.docs.forEach(docToDelete => {
                        batch.delete(doc(placesCollectionRef, docToDelete.id)); 
                    });
                } else {
                    console.warn(`Miesto ${placeNameToDelete} (${placeTypeToDelete}) sa nenašlo, ale pokračujem v mazaní súvisiacich zápasov a autobusov.`); 
                }

                // Vymazanie súvisiacich zápasov (teraz filtruje aj podľa typu miesta)
                const matchesQuery = query(matchesCollectionRef, where("location", "==", placeNameToDelete), where("locationType", "==", placeTypeToDelete)); 
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                // Vymazanie súvisiacich autobusov (teraz filtruje podľa kombinovaného reťazca "názov:::typ")
                const combinedPlaceKey = `${placeNameToDelete}:::${placeTypeToDelete}`;
                const busesStartQuery = query(busesCollectionRef, where("startLocation", "==", combinedPlaceKey)); 
                const busesStartSnapshot = await getDocs(busesStartQuery);
                busesStartSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                const busesEndQuery = query(busesCollectionRef, where("endLocation", "==", combinedPlaceKey)); 
                const busesEndSnapshot = await getDocs(busesEndQuery);
                busesEndSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                await batch.commit();
                alert(`Miesto ${placeNameToDelete} (${placeTypeToDelete}) a všetky súvisiace zápasy a autobusové linky boli úspešne vymazané!`); 
                closeModal(placeModal); 
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Chyba pri mazaní miesta ${placeNameToDelete} (${placeTypeToDelete}): `, error); 
                alert(`Chyba pri mazaní miesta ${placeNameToDelete} (${placeTypeToDelete}). Pozrite konzolu pre detaily.`); 
            }
        }
    }

    // Funkcia na úpravu hracieho dňa
    async function editPlayingDay(dateToEdit) {
        try {
            const q = query(playingDaysCollectionRef, where("date", "==", dateToEdit));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const playingDayDoc = querySnapshot.docs[0];
                const playingDayData = playingDayDoc.data();
                const playingDayId = playingDayDoc.id;

                playingDayIdInput.value = playingDayId;
                playingDayDateInput.value = playingDayData.date || '';
                playingDayModalTitle.textContent = 'Upraviť hrací deň'; 

                // Zobrazenie tlačidla Vymazať v modale
                deletePlayingDayButtonModal.style.display = 'inline-block';
                deletePlayingDayButtonModal.onclick = () => deletePlayingDay(playingDayData.date); 

                openModal(playingDayModal);
            } else {
                alert("Hrací deň sa nenašiel.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát hracieho dňa pre úpravu: ", error);
            alert("Vyskytla sa chyba pri načítavaní dát hracieho dňa. Skúste to znova.");
        }
    }

    // Funkcia na úpravu miesta (prijíma názov a typ)
    async function editPlace(placeName, placeType) {
        try {
            // Nájdeme miesto podľa názvu A TYPU
            const q = query(placesCollectionRef, where("name", "==", placeName), where("type", "==", placeType));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const placeDoc = querySnapshot.docs[0];
                const placeData = placeDoc.data();
                const placeId = placeDoc.id;

                placeIdInput.value = placeId;
                placeTypeSelect.value = placeData.type || '';
                placeNameInput.value = placeData.name || '';
                placeAddressInput.value = placeData.address || '';
                placeGoogleMapsUrlInput.value = placeData.googleMapsUrl || '';

                // Zobrazenie tlačidla Vymazať v modale
                deletePlaceButtonModal.style.display = 'inline-block';
                deletePlaceButtonModal.onclick = () => deletePlace(placeData.name, placeData.type); // Odovzdávame aj typ miesta

                openModal(placeModal);
            } else {
                alert("Miesto sa nenašlo.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát miesta pre úpravu: ", error);
            alert("Vyskytla sa chyba pri načítavaní dát miesta. Skúste to znova.");
        }
    }


    async function editMatch(matchId) {
        try {
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDoc = await getDoc(matchDocRef);

            if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                matchIdInput.value = matchId;
                matchModalTitle.textContent = 'Upraviť zápas';

                await populatePlayingDaysSelect(matchDateSelect, matchData.date);
                await populateSportHallSelects(matchLocationSelect, matchData.location); // Používame len športové haly pre zápasy

                matchStartTimeInput.value = matchData.startTime || '';
                matchDurationInput.value = matchData.duration || '';
                matchBufferTimeInput.value = matchData.bufferTime || '';

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

                // Zobrazenie tlačidla Vymazať v modale
                deleteMatchButtonModal.style.display = 'inline-block';
                deleteMatchButtonModal.onclick = () => deleteMatch(matchId);

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
                closeModal(matchModal); // Zatvorí modal po vymazaní
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        }
    }

    // Funkcie pre úpravu a mazanie autobusu
    async function editBus(busId) {
        try {
            const busDocRef = doc(busesCollectionRef, busId);
            const busDoc = await getDoc(busDocRef);

            if (busDoc.exists()) {
                const busData = busDoc.data();
                busIdInput.value = busId;
                busModalTitle.textContent = 'Upraviť autobusovú linku';

                busNameInput.value = busData.busName || '';
                await populatePlayingDaysSelect(busDateSelect, busData.date);
                await populateAllPlaceSelects(busStartLocationSelect, busData.startLocation); // Používame všetky typy miest
                busStartTimeInput.value = busData.startTime || '';
                await populateAllPlaceSelects(busEndLocationSelect, busData.endLocation); // Používame všetky typy miest
                busEndTimeInput.value = busData.endTime || '';
                busNotesInput.value = busData.notes || '';

                // Zobrazenie tlačidla Vymazať v modale
                deleteBusButtonModal.style.display = 'inline-block';
                deleteBusButtonModal.onclick = () => deleteBus(busId);

                openModal(busModal);
            } else {
                alert("Autobusová linka sa nenašla.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát autobusu pre úpravu: ", error);
            alert("Vyskytla sa chyba pri načítavaní dát autobusu. Skúste to znova.");
        }
    }

    async function deleteBus(busId) {
        if (confirm('Naozaj chcete vymazať túto autobusovú linku?')) {
            try {
                await deleteDoc(doc(busesCollectionRef, busId));
                alert('Autobusová linka úspešne vymazaná!');
                closeModal(busModal); // Zatvorí modal po vymazaní
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní autobusovej linky: ", error);
                alert("Chyba pri mazaní autobusovej linky. Pozrite konzolu pre detaily.");
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
        playingDayIdInput.value = ''; // NOVÉ: Vyčistí ID
        playingDayModalTitle.textContent = 'Pridať hrací deň'; // NOVÉ
        deletePlayingDayButtonModal.style.display = 'none'; // NOVÉ: Skryť tlačidlo Vymazať
        openModal(playingDayModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    addPlaceButton.addEventListener('click', () => { 
        placeForm.reset(); 
        placeIdInput.value = ''; 
        placeTypeSelect.value = ''; 
        placeNameInput.value = ''; 
        placeAddressInput.value = ''; 
        placeGoogleMapsUrlInput.value = ''; 
        deletePlaceButtonModal.style.display = 'none'; // Skryť tlačidlo Vymazať pri pridávaní
        openModal(placeModal); 
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas';
        await populateCategorySelect(matchCategorySelect);
        await populatePlayingDaysSelect(matchDateSelect);
        await populateSportHallSelects(matchLocationSelect); // Používame len športové haly pre zápasy
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;
        team1NumberInput.value = '';
        team2NumberInput.value = '';
        // Nastavíme predvolené hodnoty pre trvanie a ochranné pásmo, ktoré sa prepočítajú po výbere kategórie
        matchDurationInput.value = ''; 
        matchBufferTimeInput.value = ''; 
        deleteMatchButtonModal.style.display = 'none'; // Skryť tlačidlo Vymazať pri pridávaní
        openModal(matchModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
        // Ak je už kategória vybraná (napr. pri editácii, ktorá volá tento modal), aktualizujeme trvanie/buffer
        if (matchCategorySelect.value) {
            await updateMatchDurationAndBuffer();
        } else {
            // Ak nie je kategória vybraná, skúsime nájsť čas iba na základe dátumu a miesta (s predvolenými hodnotami)
            await findFirstAvailableTime(); 
        }
    });

    // Event listener pre tlačidlo Pridať autobus
    addBusButton.addEventListener('click', async () => {
        busForm.reset();
        busIdInput.value = '';
        busModalTitle.textContent = 'Pridať autobusovú linku';
        await populatePlayingDaysSelect(busDateSelect);
        await populateAllPlaceSelects(busStartLocationSelect); // Používame všetky typy miest
        await populateAllPlaceSelects(busEndLocationSelect, ''); 
        deleteBusButtonModal.style.display = 'none'; // Skryť tlačidlo Vymazať pri pridávaní
        openModal(busModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    // --- Zatváranie modálnych okien ---
    closePlayingDayModalButton.addEventListener('click', () => {
        closeModal(playingDayModal);
        displayMatchesAsSchedule();
    });

    closePlaceModalButton.addEventListener('click', () => { 
        closeModal(placeModal); 
        displayMatchesAsSchedule();
    });

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule();
    });

    // Zatváranie modálneho okna pre autobus
    closeBusModalButton.addEventListener('click', () => {
        closeModal(busModal);
        displayMatchesAsSchedule();
    });

    matchCategorySelect.addEventListener('change', async () => { 
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            await populateGroupSelect(selectedCategoryId, matchGroupSelect); 
            matchGroupSelect.disabled = false;
            await updateMatchDurationAndBuffer(); 
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
            team1NumberInput.value = '';
            team2NumberInput.value = '';
            // Ak nie je vybraná kategória, nastavíme predvolené hodnoty a pokúsime sa nájsť čas
            matchDurationInput.value = 60;
            matchBufferTimeInput.value = 5;
            await findFirstAvailableTime();
        }
    });

    // Event listenery pre automatické nastavenie času zápasu
    matchDateSelect.addEventListener('change', findFirstAvailableTime);
    matchLocationSelect.addEventListener('change', findFirstAvailableTime);
    matchDurationInput.addEventListener('change', findFirstAvailableTime);
    matchBufferTimeInput.addEventListener('change', findFirstAvailableTime);


    const getTeamName = async (categoryId, groupId, teamNumber) => {
        if (!categoryId || !groupId || !teamNumber) {
            return { fullDisplayName: null, clubName: null, clubId: null };
        }

        try {
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? (categoryDoc.data().name || categoryId) : categoryId;

            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            let groupData = null; 
            if (groupDoc.exists()) {
                groupData = groupData(); 
            }
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
            console.error("Chyba pri získavaní názvov tímov: ", error);
            return { fullDisplayName: `Chyba`, clubName: `Chyba`, clubId: null };
        }
    };

    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        const team1Number = parseInt(team1NumberInput.value);
        const team2Number = parseInt(team2NumberInput.value);

        const matchDate = matchDateSelect.value;
        const matchLocationName = matchLocationSelect.value; // Toto je len názov športovej haly
        const matchStartTime = matchStartTimeInput.value;
        const matchDuration = parseInt(matchDurationInput.value);
        const matchBufferTime = parseInt(matchBufferTimeInput.value); 


        const currentMatchId = matchIdInput.value;

        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number) || !matchDate || !matchLocationName || !matchStartTime || isNaN(matchDuration) || isNaN(matchBufferTime)) {
            alert('Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2, Dátum, Miesto, Čas začiatku, Trvanie, Prestávka po zápase).');
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

        const [newStartHour, newStartMinute] = matchStartTime.split(':').map(Number);
        const newMatchStartInMinutes = newStartHour * 60 + newStartMinute;
        const newMatchEndInMinutesWithBuffer = newMatchStartInMinutes + matchDuration + matchBufferTime; 

        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocationName)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let overlapFound = false;
            let overlappingMatchDetails = null;

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                if (currentMatchId && existingMatchId === currentMatchId) {
                    return;
                }

                const [existingStartHour, existingStartMinute] = existingMatch.startTime.split(':').map(Number);
                const existingMatchStartInMinutes = existingStartHour * 60 + existingStartMinute;
                const existingMatchEndInMinutesWithBuffer = existingMatchStartInMinutes + (existingMatch.duration || 0) + (existingMatch.bufferTime || 0);

                if (newMatchStartInMinutes < existingMatchEndInMinutesWithBuffer && newMatchEndInMinutesWithBuffer > existingMatchStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = existingMatch;
                    return; 
                }
            });

            if (overlapFound) {
                const [existingStartHour, existingStartMinute] = overlappingMatchDetails.startTime.split(':').map(Number);
                const existingMatchEndTimeObj = new Date(); 
                existingMatchEndTimeObj.setHours(existingStartHour, existingStartMinute + (overlappingMatchDetails.duration || 0), 0, 0);
                const formattedExistingEndTime = existingMatchEndTimeObj.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit'});

                alert(`Zápas sa prekrýva s existujúcim zápasom v mieste "${matchLocationName}" dňa ${matchDate}:\n\n` + 
                      `Existujúci zápas: ${overlappingMatchDetails.startTime} - ${formattedExistingEndTime}\n` +
                      `Tímy: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n` +
                      `Prosím, upravte čas začiatku alebo trvanie nového zápasu, alebo prestávku po zápase.`);
                return; 
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania zápasov: ", error);
            alert("Vyskytla sa chyba pri kontrole prekrývania zápasov. Skúste to znova.");
            return;
        }

        // Získame typ miesta pre uloženie s dátami zápasu
        const allPlacesSnapshot = await getDocs(placesCollectionRef);
        const allPlaces = allPlacesSnapshot.docs.map(doc => doc.data());
        const selectedPlaceData = allPlaces.find(p => p.name === matchLocationName && p.type === 'Športová hala');
        const matchLocationType = selectedPlaceData ? selectedPlaceData.type : 'Športová hala'; // Predvolene 'Športová hala'

        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime, 
            location: matchLocationName, // Ukladáme len názov
            locationType: matchLocationType, // NOVÉ: Ukladáme aj typ miesta
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


    busForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const busName = busNameInput.value.trim();
        const busDate = busDateSelect.value;
        const busStartLocationCombined = busStartLocationSelect.value; // Toto je "názov:::typ"
        const busStartTime = busStartTimeInput.value;
        const busEndLocationCombined = busEndLocationSelect.value;     // Toto je "názov:::typ"
        const busEndTime = busEndTimeInput.value;
        const busNotes = busNotesInput.value.trim();

        const currentBusId = busIdInput.value;

        if (!busName || !busDate || !busStartLocationCombined || !busStartTime || !busEndLocationCombined || !busEndTime) {
            alert('Prosím, vyplňte všetky povinné polia (Názov autobusu, Dátum, Miesto začiatku, Čas odchodu, Miesto cieľa, Čas príchodu).');
            return;
        }

        if (busStartLocationCombined === busEndLocationCombined) {
            alert('Miesto začiatku a miesto cieľa nemôžu byť rovnaké. Prosím, zvoľte rôzne miesta.');
            return;
        }

        const [startH, startM] = busStartTime.split(':').map(Number);
        const [endH, endM] = busEndTime.split(':').map(Number);
        const startTimeInMinutes = startH * 60 + startM;
        let endTimeInMinutes = endH * 60 + endM;

        if (endTimeInMinutes < startTimeInMinutes) {
            endTimeInMinutes += 24 * 60; 
        }

        const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
        if (durationInMinutes <= 0) {
            alert('Čas príchodu musí byť po čase odchodu.');
            return;
        }


        try {
            const existingBusesQuery = query(
                busesCollectionRef,
                where("date", "==", busDate),
                where("busName", "==", busName) 
            );
            const existingBusesSnapshot = await getDocs(existingBusesQuery);

            let overlapFound = false;
            let overlappingBusDetails = null;

            existingBusesSnapshot.docs.forEach(doc => {
                const existingBus = doc.data();
                const existingBusId = doc.id;

                if (currentBusId && existingBusId === currentBusId) {
                    return;
                }

                const [existingStartH, existingStartM] = existingBus.startTime.split(':').map(Number);
                const [existingEndH, existingEndM] = existingBus.endTime.split(':').map(Number);
                const existingBusStartInMinutes = existingStartH * 60 + existingStartM;
                let existingBusEndInMinutes = existingEndH * 60 + existingEndM;
                if (existingBusEndInMinutes < existingBusStartInMinutes) {
                    existingBusEndInMinutes += 24 * 60;
                }

                if (startTimeInMinutes < existingBusEndInMinutes && endTimeInMinutes > existingBusStartInMinutes) {
                    overlapFound = true;
                    overlappingBusDetails = existingBus;
                    return; 
                }
            });

            if (overlapFound) {
                alert(`Autobus "${busName}" sa prekrýva s existujúcou linkou dňa ${busDate}:\n\n` +
                      `Existujúca linka: ${overlappingBusDetails.startTime} - ${overlappingBusDetails.endTime} (${overlappingBusDetails.startLocation.split(':::')[0]} -> ${overlappingBusDetails.endLocation.split(':::')[0]})\n\n` + // Zobrazíme len názov
                      `Prosím, upravte čas odchodu alebo príchodu novej linky.`);
                return; 
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania autobusových liniek: ", error);
            alert("Vyskytla sa chyba pri kontrole prekrývania autobusových liniek. Skúste to znova.");
            return;
        }

        const busData = {
            busName: busName,
            date: busDate,
            startLocation: busStartLocationCombined, // Ukladáme "názov:::typ"
            startTime: busStartTime,
            endLocation: busEndLocationCombined,     // Ukladáme "názov:::typ"
            endTime: busEndTime,
            notes: busNotes,
            createdAt: new Date()
        };

        console.log('Dáta autobusu na uloženie:', busData);

        try {
            if (currentBusId) {
                console.log('Aktualizujem autobusovú linku s ID:', currentBusId, 'Dáta:', busData); 
                await setDoc(doc(busesCollectionRef, currentBusId), busData, { merge: true });
                alert('Autobusová linka úspešne aktualizovaná!');
            } else {
                console.log('Pridávam novú autobusovú linku s dátami:', busData); 
                await addDoc(busesCollectionRef, busData);
                alert('Nová autobusová linka úspešne pridaná!');
            }
            closeModal(busModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní autobusovej linky: ", error);
            alert("Chyba pri ukladaní autobusovej linky. Pozrite konzolu pre detaily.");
        }
    });


    // Listener pre odoslanie formulára miesta
    placeForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const id = placeIdInput.value; 
        const type = placeTypeSelect.value.trim();
        const name = placeNameInput.value.trim();
        const address = placeAddressInput.value.trim();
        const googleMapsUrl = placeGoogleMapsUrlInput.value.trim();

        if (!type || !name || !address || !googleMapsUrl) {
            alert('Prosím, vyplňte všetky polia (Typ miesta, Názov miesta, Adresa, Odkaz na Google Maps).');
            return;
        }

        try {
            new URL(googleMapsUrl); 
        } catch (_) {
            alert('Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            // Kontrola duplicity názvu miesta A TYPU miesta
            const q = query(placesCollectionRef, where("name", "==", name), where("type", "==", type));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                alert(`Miesto s názvom "${name}" a typom "${type}" už existuje!`);
                return;
            }

            const placeData = {
                type: type,
                name: name,
                address: address,
                googleMapsUrl: googleMapsUrl,
                createdAt: new Date()
            };

            console.log('Dáta miesta na uloženie:', placeData); 

            if (id) { // Ak existuje ID, ide o úpravu
                console.log('Aktualizujem miesto s ID:', id, 'Dáta:', placeData); 
                await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
                alert('Miesto úspešne aktualizované!');
            } else { // Inak ide o pridanie nového miesta
                await addDoc(placesCollectionRef, placeData);
                alert('Miesto úspešne pridané!');
            }
            
            closeModal(placeModal);
            await displayMatchesAsSchedule(); 
        } catch (error) {
            console.error("Chyba pri ukladaní miesta: ", error); 
            alert("Chyba pri ukladaní miesta. Pozrite konzolu pre detaily.");
        }
    });


    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = playingDayIdInput.value; 
        const date = playingDayDateInput.value;

        if (!date) {
            alert('Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) { 
                alert('Hrací deň s týmto dátumom už existuje!');
                return;
            }

            const playingDayData = { date: date };

            if (id) { // Ak existuje ID, ide o úpravu
                await setDoc(doc(playingDaysCollectionRef, id), playingDayData, { merge: true });
                alert('Hrací deň úspešne aktualizovaný!');
            } else { // Inak ide o pridanie nového hracieho dňa
                await addDoc(playingDaysCollectionRef, { ...playingDayData, createdAt: new Date() });
                alert('Hrací deň úspešne pridaný!');
            }
            
            closeModal(playingDayModal);
            await displayMatchesAsSchedule(); 
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            alert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });
});
