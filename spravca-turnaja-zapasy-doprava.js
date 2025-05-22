import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, busesCollectionRef, teamAccommodationsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const addOptions = document.getElementById('addOptions');
    const addPlayingDayButton = document.getElementById('addPlayingDayButton');
    const addPlaceButton = document.getElementById('addPlaceButton');
    const addMatchButton = document.getElementById('addMatchButton');
    const addBusButton = document.getElementById('addBusButton');
    const assignAccommodationButton = document.getElementById('assignAccommodationButton');

    // Modálne okno pre zápas
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime'); 
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
    const playingDayIdInput = document.getElementById('playingDayId');
    const playingDayDateInput = document.getElementById('playingDayDate');
    const playingDayModalTitle = document.getElementById('playingDayModalTitle');
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

    // Modálne okno pre miesto (pôvodne športová hala)
    const placeModal = document.getElementById('placeModal');
    const closePlaceModalButton = document.getElementById('closePlaceModal');
    const placeForm = document.getElementById('placeForm');
    const placeIdInput = document.getElementById('placeId');
    const placeTypeSelect = document.getElementById('placeTypeSelect');
    const placeNameInput = document.getElementById('placeName');
    const placeAddressInput = document.getElementById('placeAddress');
    const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
    const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

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

    // Modálne okno pre priradenie ubytovania
    const assignAccommodationModal = document.getElementById('assignAccommodationModal');
    const closeAssignAccommodationModalButton = document.getElementById('closeAssignAccommodationModal');
    const assignAccommodationForm = document.getElementById('assignAccommodationForm');
    const assignmentIdInput = document.getElementById('assignmentId');
    // Zmenené na assignmentDateFromSelect a pridané assignmentDateToSelect
    const assignmentDateFromSelect = document.getElementById('assignmentDateFromSelect'); 
    const assignmentDateToSelect = document.getElementById('assignmentDateToSelect'); 
    const clubSelect = document.getElementById('clubSelect'); 
    const specificTeamSelect = document.getElementById('specificTeamSelect');
    const accommodationSelect = document.getElementById('accommodationSelect');
    const assignAccommodationModalTitle = document.getElementById('assignAccommodationModalTitle');
    const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');

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
        if (!selectElement) return; // Pridaná kontrola
        selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
        try {
            const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            console.log('Načítané hracie dni:', querySnapshot.docs.map(doc => doc.data())); // Log pre hracie dni
            querySnapshot.forEach((doc) => {
                const day = doc.data();
                const option = document.createElement('option');
                option.value = day.date;
                
                const dateObj = new Date(day.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                option.textContent = formattedDate;
                
                selectElement.appendChild(option);
            });
            if (selectedDate) {
                selectElement.value = selectedDate; 
            }
        } catch (error) {
            console.error("Error loading playing days: ", error);
        }
    }

    // Funkcia: Plní select boxy iba športovými halami (pre zápasy)
    async function populateSportHallSelects(selectElement, selectedPlaceName = '') {
        if (!selectElement) return; // Pridaná kontrola
        selectElement.innerHTML = '<option value="">-- Vyberte miesto (športovú halu) --</option>';
        try {
            const querySnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Športová hala"), orderBy("name", "asc")));
            console.log('Načítané športové haly:', querySnapshot.docs.map(doc => doc.data())); // Log pre športové haly
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
                    option.value = place.name;
                    option.textContent = `${place.name}`;
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

    // Funkcia: Plní select boxy všetkými typmi miest (pre autobusy)
    async function populateAllPlaceSelects(selectElement, selectedPlaceCombined = '') {
        if (!selectElement) return; // Pridaná kontrola
        selectElement.innerHTML = '<option value="">-- Vyberte miesto --</option>';
        try {
            // Táto časť kódu načítava VŠETKY miesta bez ohľadu na typ
            const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
            console.log('Načítané všetky miesta:', querySnapshot.docs.map(doc => doc.data())); // Log pre všetky miesta
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

    // Funkcia na plnenie prvého select boxu (kluby)
    async function populateClubSelect(selectElement, selectedClubName = '') {
        if (!selectElement) return; // Pridaná kontrola
        selectElement.innerHTML = '<option value="">-- Vyberte klub --</option>'; // Pridaná predvolená možnosť
        try {
            console.log('Načítavam kluby pre select box...');
            const clubsSnapshot = await getDocs(query(clubsCollectionRef, orderBy("name", "asc")));
            const uniqueBaseClubNames = new Set();
            
            clubsSnapshot.forEach((doc) => {
                const team = doc.data();
                if (team.name) {
                    // Ak názov tímu obsahuje '⁄', považuje sa za samostatný základný názov klubu
                    if (team.name.includes('⁄')) {
                        uniqueBaseClubNames.add(team.name);
                    } else {
                        // Inak odstránenie suffixov ako " A", " B", " C" atď.
                        const baseClubName = team.name.replace(/\s[A-Z]$/, '');
                        uniqueBaseClubNames.add(baseClubName);
                    }
                }
            });
            console.log('Unikátne základné názvy klubov:', Array.from(uniqueBaseClubNames)); // Log pre unikátne základné názvy klubov

            Array.from(uniqueBaseClubNames).sort().forEach(clubName => {
                const option = document.createElement('option');
                option.value = clubName;
                option.textContent = clubName;
                if (selectedClubName === clubName) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });

            if (uniqueBaseClubNames.size === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Žiadne kluby nenájdené --';
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn("No clubs found in Firestore.");
            }
        } catch (error) {
            console.error("Chyba pri načítaní klubov pre select: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní klubov --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }

    // Funkcia na plnenie druhého select boxu (konkrétne tímy pre vybraný klub)
    async function populateSpecificTeamSelect(selectElement, baseClubName, selectedTeamId = '') {
        if (!selectElement) return; // Pridaná kontrola
        selectElement.innerHTML = '<option value="">-- Vyberte konkrétny tím (nepovinné) --</option>'; // Pridaná predvolená možnosť
        if (!baseClubName) {
            selectElement.disabled = true;
            return;
        }
        selectElement.disabled = false;
        try {
            console.log(`Načítavam tímy pre základný klub: ${baseClubName}...`);
            const allTeamsSnapshot = await getDocs(clubsCollectionRef);
            const filteredTeams = [];

            // Načítame všetky skupiny a kategórie raz, aby sme sa vyhli opakovaným volaniam getDoc v cykle
            const groupsSnapshot = await getDocs(groupsCollectionRef);
            const groupsMap = new Map();
            groupsSnapshot.forEach(doc => {
                groupsMap.set(doc.id, doc.data().name);
            });

            const categoriesSnapshot = await getDocs(categoriesCollectionRef);
            const categoriesMap = new Map();
            categoriesSnapshot.forEach(doc => {
                categoriesMap.set(doc.id, doc.data().name);
            });

            allTeamsSnapshot.forEach((doc) => {
                const team = { id: doc.id, ...doc.data() };
                
                if (baseClubName.includes('⁄')) {
                    // Ak základný názov klubu obsahuje '⁄', hľadáme presnú zhodu
                    if (team.name === baseClubName) {
                        filteredTeams.push(team);
                    }
                } else {
                    // Ak základný názov klubu neobsahuje '⁄', hľadáme varianty s písmenami na konci
                    // Regulárny výraz `^${baseClubName}(?:\\s[A-Z])?$` zodpovedá:
                    // - presnému názvu klubu (napr. "MŠK IUVENTA Michalovce")
                    // - alebo názvu klubu s medzerou a jedným veľkým písmenom na konci (napr. "MŠK IUVENTA Michalovce A")
                    if (team.name.match(new RegExp(`^${baseClubName}(?:\\s[A-Z])?$`))) {
                        filteredTeams.push(team);
                    }
                }
            });
            console.log(`Filtrované tímy pre základný klub "${baseClubName}":`, filteredTeams); // Log pre filtrované tímy

            if (filteredTeams.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = `-- Žiadne tímy pre tento klub nenájdené --`;
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn(`No teams found for base club: ${baseClubName} in Firestore.`);
            } else {
                filteredTeams.sort((a, b) => {
                    // Triedenie podľa celého názvu tímu pre špecifické tímy
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                }).forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.id;
                    // Získame názov skupiny a kategórie z máp, alebo použijeme ID ak názov neexistuje
                    const groupName = groupsMap.get(team.groupId) || team.groupId;
                    const categoryName = categoriesMap.get(team.categoryId) || team.categoryId;
                    option.textContent = `${team.name} (${categoryName}, ${groupName})`; 
                    if (selectedTeamId === team.id) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error(`Chyba pri načítaní tímov pre klub ${baseClubName}: `, error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní tímov --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }

    // Funkcia na plnenie selectu ubytovňami
    async function populateAccommodationSelect(selectElement, selectedAccommodationId = '') {
        if (!selectElement) return; // Pridaná kontrola
        selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
        try {
            const querySnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Ubytovanie"), orderBy("name", "asc")));
            console.log('Načítané ubytovne:', querySnapshot.docs.map(doc => doc.data())); // Log pre ubytovne
            if (querySnapshot.empty) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Žiadne ubytovne nenájdené --';
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn("No accommodation places found in Firestore.");
            } else {
                querySnapshot.forEach((doc) => {
                    const place = { id: doc.id, ...doc.data() };
                    const option = document.createElement('option');
                    option.value = place.id;
                    option.textContent = place.name;
                    if (selectedAccommodationId === place.id) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Chyba pri načítaní ubytovní: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní ubytovní --';
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
     * Nájsť prvý dostupný časový slot pre zápas na základe vybranej dátumu, miesta, trvania a ochranného pásma.
     * Nastaví nájdený čas do inputu matchStartTimeInput.
     */
    async function findFirstAvailableTime() {
        const selectedDate = matchDateSelect.value;
        const selectedLocationName = matchLocationSelect.value;
        const duration = parseInt(matchDurationInput.value) || 60;
        const bufferTime = parseInt(matchBufferTimeInput.value) || 5;

        if (!selectedDate || !selectedLocationName) {
            matchStartTimeInput.value = ''; 
            return;
        }

        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            let firstDayStartTime = '08:00';
            let otherDaysStartTime = '08:00';

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                firstDayStartTime = data.firstDayStartTime || '08:00';
                otherDaysStartTime = data.otherDaysStartTime || '08:00';
            }

            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
            const isFirstPlayingDay = sortedPlayingDays.length > 0 && selectedDate === sortedPlayingDays[0];

            let [startH, startM] = (isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime).split(':').map(Number);
            const endSearchHour = 22;
            const intervalMinutes = 1;

            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", selectedDate),
                where("location", "==", selectedLocationName)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
            const existingEvents = existingMatchesSnapshot.docs.map(doc => {
                const data = doc.data();
                const [eventStartH, eventStartM] = data.startTime.split(':').map(Number);
                const startInMinutes = eventStartH * 60 + eventStartM;
                const endInMinutes = startInMinutes + (data.duration || 0) + (data.bufferTime || 0);
                return { start: startInMinutes, end: endInMinutes };
            });

            existingEvents.sort((a, b) => a.start - b.start);

            for (let hour = startH; hour <= endSearchHour; hour++) {
                const currentMinuteStart = (hour === startH) ? startM : 0; 
                for (let minute = currentMinuteStart; minute < 60; minute += intervalMinutes) {
                    const potentialStartInMinutes = hour * 60 + minute;
                    const potentialEndInMinutes = potentialStartInMinutes + duration + bufferTime;

                    let overlap = false;
                    for (const existingEvent of existingEvents) {
                        if (potentialStartInMinutes < existingEvent.end && potentialEndInMinutes > existingEvent.start) {
                            overlap = true;
                            break;
                        }
                    }

                    if (!overlap) {
                        const formattedHour = String(hour).padStart(2, '0');
                        const formattedMinute = String(minute).padStart(2, '0');
                        matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
                        return;
                    }
                }
            }

            matchStartTimeInput.value = ''; 
            console.warn("Nenašiel sa žiadny voľný časový slot pre zápas v daný deň a hale v rozsahu 08:00 - 22:00.");

        } catch (error) {
            console.error("Chyba pri hľadaní prvého dostupného času: ", error);
            matchStartTimeInput.value = '';
        }
    }

    // --- Funkcia na načítanie a zobrazenie zápasov, autobusov a UBYTOVANIA ako rozvrh ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = ''; 
        matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam logistiku turnaja...</p>');
        
        const CELL_WIDTH_PX = 350;
        const MINUTES_PER_HOUR = 60;
        const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_HOUR;
        const ITEM_HEIGHT_PX = 140;

        try {
            const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
            const matchesSnapshot = await getDocs(matchesQuery);
            const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));

            const busesQuery = query(busesCollectionRef, orderBy("date", "asc"), orderBy("busName", "asc"), orderBy("startTime", "asc"));
            const busesSnapshot = await getDocs(busesQuery);
            const allBuses = busesSnapshot.docs.map(doc => ({ id: doc.id, type: 'bus', ...doc.data() }));

            // Upravená logika pre načítanie ubytovaní: teraz nemajú pole 'date', ale 'dateFrom'
            const accommodationsSnapshot = await getDocs(query(teamAccommodationsCollectionRef, orderBy("dateFrom", "asc"), orderBy("accommodationName", "asc")));
            const allAccommodations = accommodationsSnapshot.docs.map(doc => ({ id: doc.id, type: 'accommodation', ...doc.data() }));

            // Získame všetky hracie dni, aby sme prešli všetky dátumy, pre ktoré máme vytvárať stĺpce
            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const existingPlayingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);

            const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc"))); 
            const existingPlacesData = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 

            const uniquePlacesForRows = [];
            const addedPlaceKeys = new Set(); 

            existingPlacesData.forEach(place => {
                const placeKey = `${place.name}:::${place.type}`;
                if (!addedPlaceKeys.has(placeKey)) {
                    uniquePlacesForRows.push(place);
                    addedPlaceKeys.add(placeKey);
                }
            });

            uniquePlacesForRows.sort((a, b) => {
                if (a.type < b.type) return -1;
                if (a.type > b.type) return 1;
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            });

            const uniqueLocations = new Set(); 
            uniquePlacesForRows.forEach(place => uniqueLocations.add(`${place.name}:::${place.type}`));

            // Zoznam všetkých unikátnych dátumov, ktoré sa majú zobraziť v rozvrhu (z hracích dní)
            const sortedDates = Array.from(new Set(existingPlayingDays)).sort(); 

            console.log("Sorted Dates for schedule:", sortedDates); 

            // Filter events for time range calculation: only matches and buses
            const eventsForTimeRangeCalculation = [...allMatches, ...allBuses]; // Ubytovanie tu vynechávame

            const dailyTimeRanges = new Map();
            eventsForTimeRangeCalculation.forEach(event => { 
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
                        endTimeInMinutes += 24 * 60; 
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
            
            // Ak dátum nemá žiadne zápasy alebo autobusy, nastavíme predvolený časový rozsah
            sortedDates.forEach(date => { 
                if (!dailyTimeRanges.has(date)) {
                    dailyTimeRanges.set(date, { minHour: 8, maxHour: 18 }); // Predvolený rozsah
                }
            });

            matchesContainer.innerHTML = ''; 

            let scheduleHtml = '<div class="schedule-table-container" style="position: relative; overflow: auto;">'; 
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
            scheduleHtml += `<th class="fixed-column" style="position: sticky; top: 0; left: 0; z-index: 101; background-color: #d0d0d0;">Miesto ⁄ Čas</th>`;

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
                const displayYear = displayDateObj.getFullYear();
                const formattedDisplayDate = `${displayDay}. ${displayMonth}. ${displayYear}`;

                const colspan = hoursForDate.length > 0 ? hoursForDate.length : 1;

                scheduleHtml += `<th colspan="${colspan}" class="date-header-clickable" data-date="${date}" title="Kliknutím upravíte hrací deň ${formattedDisplayDate}" style="position: sticky; top: 0; z-index: 100; background-color: #d0d0d0;">`; 
                scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div>`;
                scheduleHtml += '<div class="schedule-times-row">';
                if (hoursForDate.length > 0) {
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                    });
                } else {
                    scheduleHtml += `<span></span>`; 
                }
                scheduleHtml += '</div>';

                scheduleHtml += '</th>';
            });
            scheduleHtml += '</tr></thead><tbody>';

            uniquePlacesForRows.forEach(placeData => { 
                const locationName = placeData.name;
                const placeAddress = placeData.address;
                const placeGoogleMapsUrl = placeData.googleMapsUrl;
                const placeType = placeData.type; 

                let typeClass = '';
                let specificBackgroundColor = ''; 
                switch (placeType) {
                    case 'Športová hala':
                        typeClass = 'place-type-sport-hall';
                        specificBackgroundColor = 'background-color: #007bff;'; 
                        break;
                    case 'Stravovacie zariadenie':
                        typeClass = 'place-type-catering';
                        specificBackgroundColor = 'background-color: #ffc107;'; 
                        break;
                    case 'Ubytovanie':
                        typeClass = 'place-type-accommodation';
                        specificBackgroundColor = 'background-color: #4CAF50;'; // Zmenená farba pre ubytovanie
                        break;
                    default:
                        typeClass = ''; 
                }

                const stickyColumnStyles = `position: sticky; left: 0; z-index: 100; background-color: #e0e0e0;`; 
                const finalColumnStyle = `${stickyColumnStyles} ${specificBackgroundColor}`;

                scheduleHtml += '<tr>';
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

                    // Filter matches for the current cell
                    const matchesInCell = allMatches.filter(event => {
                        return event.date === date && placeType === 'Športová hala' && event.location === locationName;
                    });

                    // Filter accommodations for the current cell, checking date range
                    const accommodationsInCell = allAccommodations.filter(assignment => {
                        const dateFrom = new Date(assignment.dateFrom);
                        const dateTo = new Date(assignment.dateTo);
                        const currentDate = new Date(date);
                        // Kontrola, či aktuálny dátum spadá do rozsahu ubytovania
                        return currentDate >= dateFrom && currentDate <= dateTo && placeType === 'Ubytovanie' && assignment.accommodationName === locationName;
                    });

                    // Render matches (current logic)
                    matchesInCell.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    matchesInCell.forEach(event => {
                        const [startH, startM] = event.startTime.split(':').map(Number);
                        const absoluteStartMin = startH * 60 + startM;
                        
                        const relativeStartMinInCell = absoluteStartMin - (range.minHour * 60);

                        const matchBlockLeftPx = relativeStartMinInCell * PIXELS_PER_MINUTE;
                        const matchBlockWidthPx = event.duration * PIXELS_PER_MINUTE;
                        const bufferBlockLeftPx = matchBlockLeftPx + matchBlockWidthPx;
                        const bufferBlockWidthPx = event.bufferTime * PIXELS_PER_MINUTE;

                        const matchEndTime = new Date();
                        matchEndTime.setHours(startH, startM + event.duration, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        let team1ClubNameDisplay = event.team1ClubName ? `${event.team1ClubName}` : '';
                        let team2ClubNameDisplay = event.team2ClubName ? `${event.team2ClubName}` : '';

                        let clubNamesHtml = '';
                        if (team1ClubNameDisplay) {
                            clubNamesHtml += `${team1ClubNameDisplay}`;
                        }
                        if (team2ClubNameDisplay) {
                            if (clubNamesHtml) clubNamesHtml += `<br>`; 
                            clubNamesHtml += `${team2ClubNameDisplay}`;
                        }

                        const finalClubNamesHtml = clubNamesHtml ? `<span style="font-weight: normal;">${clubNamesHtml}</span>` : '';

                        scheduleHtml += `
                            <div class="schedule-cell-match"
                                data-id="${event.id}" data-type="${event.type}"
                                style="left: ${matchBlockLeftPx}px; width: ${matchBlockWidthPx}px; top: 0;">
                                <div class="schedule-cell-content">
                                    <p class="schedule-cell-time">${event.startTime} - ${formattedEndTime}</p>
                                    <p class="schedule-cell-category">${event.categoryName || 'N/A'}${event.groupName ? ` ${event.groupName}` : ''}</p>
                                    <p class="schedule-cell-teams">
                                        ${event.team1DisplayName}<br>
                                        ${event.team2DisplayName}<br>
                                        ${finalClubNamesHtml}
                                    </p>
                                </div>
                            </div>
                        `;
                        if (event.bufferTime > 0) {
                            scheduleHtml += `
                                <div class="schedule-cell-buffer"
                                    style="left: ${bufferBlockLeftPx}px; width: ${bufferBlockWidthPx}px; top: 0;">
                                </div>
                            `;
                        }
                    });

                    // Render accommodations (new logic for side-by-side)
                    const totalAccommodationsInCell = accommodationsInCell.length;
                    if (totalAccommodationsInCell > 0) {
                        const cellWidth = (range.maxHour - range.minHour) * CELL_WIDTH_PX; // Total width of the td cell
                        // Prispôsobíme šírku bloku tak, aby sa zmestili všetky záznamy
                        const blockWidth = totalAccommodationsInCell > 0 ? (cellWidth / totalAccommodationsInCell) : cellWidth; 

                        accommodationsInCell.forEach((assignment, index) => {
                            const blockLeft = index * blockWidth;
                            // Zobrazenie tímov, ktoré sú ubytované
                            const teamNames = assignment.teams.map(team => team.teamName.split('(')[0].trim()).join(', '); // Zobraziť len názov tímu
                            const accommodationId = assignment.id; // Použijeme ID záznamu o ubytovaní

                            scheduleHtml += `
                                <div class="schedule-cell-accommodation"
                                    data-id="${accommodationId}" data-type="${assignment.type}"
                                    style="position: absolute; left: ${blockLeft}px; width: ${blockWidth}px; top: 0; height: 100%;">
                                    <div class="schedule-cell-content">
                                        <p class="schedule-cell-title">Ubytovanie</p>
                                        <p class="schedule-cell-teams">${teamNames}</p>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    scheduleHtml += '</td>';
                });
                scheduleHtml += '</tr>';
            });
            scheduleHtml += '</tbody></table>';
            scheduleHtml += '</div>'; 

            matchesContainer.insertAdjacentHTML('beforeend', scheduleHtml);

            const scheduleTableContainer = matchesContainer.querySelector('.schedule-table-container');
            const scheduleTable = matchesContainer.querySelector('.match-schedule-table');
            
            if (!scheduleTableContainer || !scheduleTable) {
                console.error("Schedule table container or table not found. Cannot render buses or calculate offsets.");
                matchesContainer.innerHTML = '<p>Chyba pri zobrazení rozvrhu. Chýbajú komponenty tabuľky.</p>';
                return; 
            }

            const scheduleTableContainerRect = scheduleTableContainer.getBoundingClientRect();

            const busOverlayContainer = document.createElement('div');
            busOverlayContainer.id = 'busOverlayContainer';
            busOverlayContainer.style.cssText = `
                    position: absolute; 
                    top: 0; 
                    left: 0; 
                    width: ${scheduleTable.offsetWidth}px; 
                    height: ${scheduleTable.offsetHeight}px; 
                    pointer-events: none;
                `; 
            scheduleTableContainer.appendChild(busOverlayContainer); 

            const locationRowTopOffsets = new Map(); 
            scheduleTable.querySelectorAll('tbody tr').forEach(row => {
                const locationHeader = row.querySelector('th.fixed-column');
                if (locationHeader) {
                    const locationName = locationHeader.dataset.location;
                    const locationType = locationHeader.dataset.type;
                    locationRowTopOffsets.set(`${locationName}:::${locationType}`, locationHeader.getBoundingClientRect().top - scheduleTableContainerRect.top); 
                }
            });

            const timeColumnLeftOffsets = new Map(); 
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
                            const hour = firstHourInDay + index; 
                            hourOffsets.push({
                                hour: hour,
                                left: (dateHeader.getBoundingClientRect().left - scheduleTableContainerRect.left) + (index * CELL_WIDTH_PX)
                            });
                        });
                        timeColumnLeftOffsets.set(date, hourOffsets);
                    }
                });
            }
            
            allBuses.forEach(bus => {
                const startLocationKey = bus.startLocation; 
                const endLocationKey = bus.endLocation;     
                const date = bus.date;

                let busStartY, busEndY;
                const startLocationTop = locationRowTopOffsets.get(startLocationKey);
                const endLocationTop = locationRowTopOffsets.get(endLocationKey);

                if (startLocationTop === undefined || endLocationTop === undefined) {
                    console.warn(`Nenašiel som pozíciu pre začiatok alebo koniec trasy autobusu: ${bus.busName} (${startLocationKey} → ${endLocationKey}). Možno chýba typ miesta v uložených dátach autobusu.`);
                    return;
                }

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
                    endTimeInMinutes += 24 * 60; 
                }

                const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
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

                // Nájdeme správnu pozíciu X pre autobus na základe času a rozsahu pre daný dátum
                const timeOffsets = timeColumnLeftOffsets.get(date);
                let busLeftPx = 0;
                if (timeOffsets && timeOffsets.length > 0) {
                    const firstHourInDay = dailyTimeRanges.get(date) ? dailyTimeRanges.get(date).minHour : 0;
                    const relativeStartMin = startTimeInMinutes - (firstHourInDay * 60);
                    busLeftPx = timeOffsets[0].left + (relativeStartMin * PIXELS_PER_MINUTE);
                } else {
                    console.warn(`Nemôžem vypočítať pozíciu X pre autobus ${bus.busName} na dátum ${date}.`);
                    return; // Skip rendering this bus if X position cannot be determined
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
                busRouteText.textContent = `${bus.startLocation.split(':::')[0]} → ${bus.endLocation.split(':::')[0]}`; 
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

            // Pridanie event listenerov pre kliknutie na zápas/autobus/UBYTOVANIE pre úpravu
            matchesContainer.querySelectorAll('.schedule-cell-match').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; 
                    editMatch(id);
                });
            });

            busOverlayContainer.querySelectorAll('.bus-svg').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; 
                    editBus(id);
                });
            });

            // Event listener pre priradenie ubytovania v rozvrhu
            matchesContainer.querySelectorAll('.schedule-cell-accommodation').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id;
                    editAccommodationAssignment(id);
                });
            });

            matchesContainer.querySelectorAll('.date-header-clickable').forEach(header => { 
                header.addEventListener('click', (event) => {
                    if (event.target.tagName === 'A' || event.target.closest('.hall-address')) { 
                        return; 
                    }
                    if (event.target === header || event.target.closest('.schedule-date-header-content')) { 
                        const dateToEdit = header.dataset.date;
                        editPlayingDay(dateToEdit); 
                    }
                });
            });
            matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
                header.addEventListener('click', (event) => {
                    if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                        return; 
                    }
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

                // Úprava pre mazanie priradení ubytovania:
                // Ak je záznam o ubytovaní v rozsahu, vymaže sa celý záznam.
                const accommodationsQuery = query(
                    teamAccommodationsCollectionRef,
                    where("dateFrom", "<=", dateToDelete), // Začína pred alebo v deň mazania
                    where("dateTo", ">=", dateToDelete)    // Končí po alebo v deň mazania
                );
                const accommodationsSnapshot = await getDocs(accommodationsQuery);
                accommodationsSnapshot.docs.forEach(accDoc => {
                    batch.delete(doc(teamAccommodationsCollectionRef, accDoc.id));
                });

                await batch.commit();
                alert(`Hrací deň ${dateToDelete} a všetky súvisiace zápasy, autobusové linky a priradenia ubytovania, ktoré sa prekrývali s týmto dňom, boli úspešne vymazané!`);
                closeModal(playingDayModal);
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

                // Vymazanie súvisiacich priradení ubytovania, ak je vymazané miesto typu "Ubytovanie"
                if (placeTypeToDelete === 'Ubytovanie') {
                    const accommodationsQuery = query(teamAccommodationsCollectionRef, where("accommodationId", "==", placeSnapshot.docs[0].id));
                    const accommodationsSnapshot = await getDocs(accommodationsQuery);
                    accommodationsSnapshot.docs.forEach(accDoc => {
                        batch.delete(doc(teamAccommodationsCollectionRef, accDoc.id));
                    });
                }

                await batch.commit();
                alert(`Miesto ${placeNameToDelete} (${placeTypeToDelete}) a všetky súvisiace zápasy, autobusové linky a priradenia ubytovania boli úspešne vymazané!`); 
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
                deletePlaceButtonModal.onclick = () => deletePlace(placeData.name, placeData.type);

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
                await populateSportHallSelects(matchLocationSelect, matchData.location);

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
                closeModal(matchModal);
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
                // Tieto volania funkcií už načítavajú VŠETKY miesta
                await populateAllPlaceSelects(busStartLocationSelect);
                busStartLocationSelect.value = busData.startLocation || ''; // Predvyplniť hodnotu
                busStartTimeInput.value = busData.startTime || '';
                await populateAllPlaceSelects(busEndLocationSelect, ''); 
                busEndLocationSelect.value = busData.endLocation || ''; // Predvyplniť hodnotu
                busEndTimeInput.value = busData.endTime || '';
                busNotesInput.value = busData.notes || '';

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
                closeModal(busModal);
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní autobusovej linky: ", error);
                alert("Chyba pri mazaní autobusovej linky. Pozrite konzolu pre detaily.");
            }
        }
    }

    // Funkcie pre úpravu a mazanie priradenia ubytovania
    async function editAccommodationAssignment(assignmentId) {
        try {
            const assignmentDocRef = doc(teamAccommodationsCollectionRef, assignmentId);
            const assignmentDoc = await getDoc(assignmentDocRef);

            if (assignmentDoc.exists()) {
                const assignmentData = assignmentDoc.data();
                assignmentIdInput.value = assignmentId;
                assignAccommodationModalTitle.textContent = 'Upraviť priradenie ubytovania';

                // Naplníme oba select boxy dátumov
                await populatePlayingDaysSelect(assignmentDateFromSelect, assignmentData.dateFrom);
                await populatePlayingDaysSelect(assignmentDateToSelect, assignmentData.dateTo);
                
                // Predpokladáme, že assignmentData.teams je pole, aj keď pre zjednodušenie ukladáme len jeden tím
                const assignedTeam = assignmentData.teams[0];
                let assignedClubName = '';
                if (assignedTeam && assignedTeam.teamName) {
                    // Ak názov tímu obsahuje '⁄', použijeme ho celý ako základný názov klubu
                    if (assignedTeam.teamName.includes('⁄')) {
                        assignedClubName = assignedTeam.teamName.split('(')[0].trim();
                    } else {
                        // Inak odstránime suffixy ako " A", " B", " C" atď.
                        assignedClubName = assignedTeam.teamName.split('(')[0].trim().replace(/\s[A-Z]$/, '');
                    }
                }
                
                await populateClubSelect(clubSelect, assignedClubName); // Naplníme kluby a vyberieme priradený základný klub

                if (assignedClubName) {
                    await populateSpecificTeamSelect(specificTeamSelect, assignedClubName, assignedTeam?.teamId || ''); // Naplníme tímy pre základný klub a vyberieme konkrétny tím
                } else {
                    if (specificTeamSelect) { // Pridaná kontrola
                        specificTeamSelect.innerHTML = '<option value="">-- Vyberte konkrétny tím (nepovinné) --</option>';
                        specificTeamSelect.disabled = true;
                    }
                }
                
                await populateAccommodationSelect(accommodationSelect, assignmentData.accommodationId);

                // Zobrazenie tlačidla Vymazať v modale
                deleteAssignmentButtonModal.style.display = 'inline-block';
                deleteAssignmentButtonModal.onclick = () => deleteAccommodationAssignment(assignmentId);

                openModal(assignAccommodationModal);
            } else {
                alert("Priradenie ubytovania sa nenašlo.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát priradenia ubytovania pre úpravu: ", error);
            alert("Vyskytla sa chyba pri načítavaní dát priradenia ubytovania. Skúste to znova.");
        }
    }

    async function deleteAccommodationAssignment(assignmentId) {
        if (confirm('Naozaj chcete vymazať toto priradenie ubytovania?')) {
            try {
                await deleteDoc(doc(teamAccommodationsCollectionRef, assignmentId));
                alert('Priradenie ubytovania úspešne vymazané!');
                closeModal(assignAccommodationModal);
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní priradenia ubytovania: ", error);
                alert("Chyba pri mazaní priradenia ubytovania. Pozrite konzolu pre detaily.");
            }
        }
    }

    await displayMatchesAsSchedule();


    // --- Logika pre tlačidlo '+' a dropdown ---
    addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        addOptions.classList.toggle('show');
    });

    // Skryť dropdown, ak kliknem mimo neho alebo jeho možností
    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        playingDayIdInput.value = '';
        playingDayModalTitle.textContent = 'Pridať hrací deň';
        deletePlayingDayButtonModal.style.display = 'none';
        openModal(playingDayModal);
        addOptions.classList.remove('show');
    });

    addPlaceButton.addEventListener('click', () => { 
        placeForm.reset(); 
        placeIdInput.value = ''; 
        placeTypeSelect.value = ''; 
        placeNameInput.value = ''; 
        placeAddressInput.value = ''; 
        placeGoogleMapsUrlInput.value = ''; 
        deletePlaceButtonModal.style.display = 'none';
        openModal(placeModal); 
        addOptions.classList.remove('show');
    });

    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas';
        await populateCategorySelect(matchCategorySelect);
        await populatePlayingDaysSelect(matchDateSelect);
        await populateSportHallSelects(matchLocationSelect);
        if (matchGroupSelect) { // Pridaná kontrola
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
        }
        team1NumberInput.value = '';
        team2NumberInput.value = '';
        matchDurationInput.value = ''; 
        matchBufferTimeInput.value = ''; 
        deleteMatchButtonModal.style.display = 'none';
        openModal(matchModal);
        addOptions.classList.remove('show');
        if (matchCategorySelect.value) {
            await updateMatchDurationAndBuffer();
        } else {
            await findFirstAvailableTime(); 
        }
    });

    // Event listener pre tlačidlo Pridať autobus
    addBusButton.addEventListener('click', async () => {
        busForm.reset();
        busIdInput.value = '';
        busModalTitle.textContent = 'Pridať autobusovú linku';
        // Tieto volania funkcií už načítavajú VŠETKY miesta
        await populatePlayingDaysSelect(busDateSelect);
        await populateAllPlaceSelects(busStartLocationSelect);
        await populateAllPlaceSelects(busEndLocationSelect, ''); 
        deleteBusButtonModal.style.display = 'none';
        openModal(busModal);
        addOptions.classList.remove('show');
    });

    // Event listener pre tlačidlo Priradiť ubytovanie
    assignAccommodationButton.addEventListener('click', async () => {
        assignAccommodationForm.reset();
        assignmentIdInput.value = '';
        assignAccommodationModalTitle.textContent = 'Priradiť ubytovanie';
        // Naplníme oba dátumové select boxy
        await populatePlayingDaysSelect(assignmentDateFromSelect);
        await populatePlayingDaysSelect(assignmentDateToSelect);
        await populateClubSelect(clubSelect); 
        if (specificTeamSelect) { 
            specificTeamSelect.innerHTML = '<option value="">-- Vyberte konkrétny tím (nepovinné) --</option>';
            specificTeamSelect.disabled = true;
        }
        await populateAccommodationSelect(accommodationSelect);
        deleteAssignmentButtonModal.style.display = 'none';
        openModal(assignAccommodationModal);
        addOptions.classList.remove('show');
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

    // Zatváranie modálneho okna pre priradenie ubytovania
    closeAssignAccommodationModalButton.addEventListener('click', () => {
        closeModal(assignAccommodationModal);
        displayMatchesAsSchedule();
    });

    matchCategorySelect.addEventListener('change', async () => { 
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            await populateGroupSelect(selectedCategoryId, matchGroupSelect); 
            if (matchGroupSelect) { // Pridaná kontrola
                matchGroupSelect.disabled = false;
            }
            await updateMatchDurationAndBuffer(); 
        } else {
            if (matchGroupSelect) { // Pridaná kontrola
                matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                matchGroupSelect.disabled = true;
            }
            team1NumberInput.value = '';
            team2NumberInput.value = '';
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

    // Nový event listener pre zmenu výberu klubu
    if (clubSelect) { // Pridaná kontrola
        clubSelect.addEventListener('change', async () => {
            const selectedClubName = clubSelect.value; // Toto je teraz základný názov klubu
            await populateSpecificTeamSelect(specificTeamSelect, selectedClubName);
        });
    }


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
                groupData = groupDoc.data(); 
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
        const matchLocationName = matchLocationSelect.value;
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
        const matchLocationType = selectedPlaceData ? selectedPlaceData.type : 'Športová hala';

        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime, 
            location: matchLocationName,
            locationType: matchLocationType,
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
                alert('Nová zápas úspešne pridaný!');
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
        const busStartLocationCombined = busStartLocationSelect.value;
        const busStartTime = busStartTimeInput.value;
        const busEndLocationCombined = busEndLocationSelect.value;
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
            let overlappingBusDetails = null;;

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
                      `Existujúca linka: ${overlappingBusDetails.startTime} - ${overlappingBusDetails.endTime} (${overlappingBusDetails.startLocation.split(':::')[0]} → ${overlappingBusDetails.endLocation.split(':::')[0]})\n\n` +
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
            startLocation: busStartLocationCombined,
            startTime: busStartTime,
            endLocation: busEndLocationCombined,
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

            if (id) {
                console.log('Aktualizujem miesto s ID:', id, 'Dáta:', placeData); 
                await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
                alert('Miesto úspešne aktualizované!');
            } else {
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

            if (id) {
                await setDoc(doc(playingDaysCollectionRef, id), playingDayData, { merge: true });
                alert('Hrací deň úspešne aktualizovaný!');
            } else {
                await addDoc(playingDaysCollectionRef, { ...playingDayData, createdAt: new Date() });
                alert('Nová hrací deň úspešne pridaný!');
            }
            
            closeModal(playingDayModal);
            await displayMatchesAsSchedule(); 
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            alert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    // Listener pre odoslanie formulára priradenia ubytovania
    assignAccommodationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = assignmentIdInput.value;
        const assignmentDateFrom = assignmentDateFromSelect.value; // Nové
        const assignmentDateTo = assignmentDateToSelect.value;     // Nové
        const selectedClubName = clubSelect.value; 
        const selectedSpecificTeamId = specificTeamSelect.value; 
        const selectedAccommodationId = accommodationSelect.value;

        if (!assignmentDateFrom || !assignmentDateTo || !selectedClubName || !selectedAccommodationId) {
            alert('Prosím, vyplňte všetky povinné polia (Dátum od, Dátum do, Klub, Ubytovňa).');
            return;
        }

        // Validácia rozsahu dátumov
        if (new Date(assignmentDateFrom) > new Date(assignmentDateTo)) {
            alert('Dátum "Od" nemôže byť po dátume "Do".');
            return;
        }

        try {
            let teamsData = [];

            if (selectedSpecificTeamId) {
                // Ak je vybraný konkrétny tím, pridáme len ten jeden tím
                const teamDoc = await getDoc(doc(clubsCollectionRef, selectedSpecificTeamId));
                if (teamDoc.exists()) {
                    const team = teamDoc.data(); 
                    teamsData.push({
                        teamId: selectedSpecificTeamId,
                        teamName: `${team.name} (Kat: ${team.categoryName}, Skup: ${team.groupName}, Tím: ${team.orderInGroup})`
                    });
                } else {
                    alert('Vybraný konkrétny tím sa nenašiel v databáze.');
                    return;
                }
            } else {
                // Ak nie je vybraný konkrétny tím, priradíme všetky tímy, ktorých názov začína so základným názvom klubu
                const allClubsSnapshot = await getDocs(clubsCollectionRef);
                const teamsForBaseClub = [];

                allClubsSnapshot.forEach(doc => {
                    const team = doc.data();
                    // Kontrolujeme, či názov tímu začína s vybraným základným názvom klubu
                    // a či nie je presne rovnaký ako základný názov (ak existuje tím s presne takým názvom)
                    if (selectedClubName.includes('⁄')) {
                        if (team.name === selectedClubName) {
                            teamsForBaseClub.push({
                                teamId: doc.id,
                                teamName: `${team.name} (Kat: ${team.categoryName}, Skup: ${team.groupName}, Tím: ${team.orderInGroup})`
                            });
                        }
                    } else {
                        if (team.name.match(new RegExp(`^${selectedClubName}(?:\\s[A-Z])?$`))) {
                            teamsForBaseClub.push({
                                teamId: doc.id,
                                teamName: `${team.name} (Kat: ${team.categoryName}, Skup: ${team.groupName}, Tím: ${team.orderInGroup})`
                            });
                        }
                    }
                });

                if (teamsForBaseClub.length > 0) {
                    teamsData = teamsForBaseClub;
                } else {
                    alert('Pre vybraný základný názov klubu sa nenašli žiadne tímy v databáze.');
                    return;
                }
            }

            const accommodationDoc = await getDoc(doc(placesCollectionRef, selectedAccommodationId));
            let accommodationName = '';
            if (accommodationDoc.exists()) {
                accommodationName = accommodationDoc.data().name;
            } else {
                alert('Vybraná ubytovňa sa nenašla v databáze.');
                return;
            }

            const assignmentData = {
                dateFrom: assignmentDateFrom, // Ukladáme dátum od
                dateTo: assignmentDateTo,     // Ukladáme dátum do
                teams: teamsData, 
                accommodationId: selectedAccommodationId,
                accommodationName: accommodationName,
                createdAt: new Date()
            };

            console.log('Dáta priradenia ubytovania na uloženie:', assignmentData);

            if (id) {
                console.log('Aktualizujem priradenie ubytovania s ID:', id, 'Dáta:', assignmentData);
                await setDoc(doc(teamAccommodationsCollectionRef, id), assignmentData, { merge: true });
                alert('Priradenie ubytovania úspešne aktualizované!');
            } else {
                await addDoc(teamAccommodationsCollectionRef, assignmentData);
                alert('Nové priradenie ubytovania úspešne pridané!');
            }

            closeModal(assignAccommodationModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní priradenia ubytovania: ", error);
            alert("Chyba pri ukladaní priradenia ubytovania. Pozrite konzolu pre detaily.");
        }
    });
});
