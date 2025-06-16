import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
const SETTINGS_DOC_ID = 'matchTimeSettings';

/**
 * Populates a select element with playing days from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedDate=''] The date to pre-select.
 */
async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
    try {
        const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
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
        console.error("Chyba pri načítavaní hracích dní:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with available places from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedPlaceId=''] The ID of the place to pre-select.
 */
async function populatePlacesSelect(selectElement, selectedPlaceId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte miesto --</option>';
    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
        querySnapshot.forEach((doc) => {
            const place = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = place.name;
            selectElement.appendChild(option);
        });
        if (selectedPlaceId) {
            selectElement.value = selectedPlaceId;
        }
    } catch (error) {
        console.error("Chyba pri načítavaní miest:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Loads and displays matches grouped by playing day and then by place.
 * This function also handles drag-and-drop functionality for reordering matches.
 */
async function displayMatchesAsSchedule() {
    const scheduleContainer = document.getElementById('scheduleContainer');
    if (!scheduleContainer) return;
    scheduleContainer.innerHTML = '<h2>Rozpis zápasov</h2><p>Načítavam rozpis zápasov...</p>';

    try {
        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
        const matchesSnapshot = await getDocs(query(matchesCollectionRef, orderBy("dateTime", "asc")));
        const clubsSnapshot = await getDocs(clubsCollectionRef);
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const settingsDoc = await getDoc(doc(settingsCollectionRef, SETTINGS_DOC_ID));

        const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const places = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const clubs = {};
        clubsSnapshot.forEach(doc => {
            const data = doc.data();
            if (!clubs[data.categoryId]) {
                clubs[data.categoryId] = {};
            }
            if (!clubs[data.categoryId][data.groupId]) {
                clubs[data.categoryId][data.groupId] = {};
            }
            if (!clubs[data.categoryId][data.groupId][data.clubBaseName]) {
                clubs[data.categoryId][data.groupId][data.clubBaseName] = [];
            }
            clubs[data.categoryId][data.groupId][data.clubBaseName].push({ id: doc.id, ...data });
        });

        const categories = {};
        categoriesSnapshot.forEach(doc => categories[doc.id] = doc.data().name);

        const globalSettings = settingsDoc.exists() ? settingsDoc.data() : {};
        const categoryMatchSettings = globalSettings.categoryMatchSettings || {};
        const firstDayStartTime = globalSettings.firstDayStartTime || '08:00'; // Default
        const otherDaysStartTime = globalSettings.otherDaysStartTime || '08:00'; // Default

        if (playingDays.length === 0) {
            scheduleContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne hracie dni.</p>';
            return;
        }

        if (places.length === 0) {
            scheduleContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne miesta.</p>';
            return;
        }

        let scheduleHTML = '';
        playingDays.forEach((day, dayIndex) => {
            const dayDate = new Date(day.date);
            const formattedDate = `${String(dayDate.getDate()).padStart(2, '0')}. ${String(dayDate.getMonth() + 1).padStart(2, '0')}. ${dayDate.getFullYear()}`;
            const isFirstPlayingDay = dayIndex === 0;

            scheduleHTML += `<div class="day-group" data-day-id="${day.id}">`;
            scheduleHTML += `<h3>Hrací deň: ${formattedDate}</h3>`;
            scheduleHTML += `<table class="schedule-table"><thead><tr><th>Čas</th><th>Miesto</th><th>Zápas</th><th>Kategória</th><th></th></tr></thead><tbody>`;

            let currentDayMatches = matches.filter(match => {
                const matchDate = new Date(match.dateTime);
                return matchDate.toDateString() === dayDate.toDateString();
            }).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

            // Populate time slots
            const timeSlots = generateTimeSlots(dayDate, currentDayMatches, places.length, isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime, categoryMatchSettings);

            timeSlots.forEach(slot => {
                places.forEach(place => {
                    const matchInSlot = currentDayMatches.find(match => {
                        const matchTime = new Date(match.dateTime).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
                        return matchTime === slot.time && match.placeId === place.id;
                    });

                    let matchInfo = '<span class="no-match-placeholder">Voľné</span>';
                    let rowClass = '';
                    let matchId = '';
                    let draggableAttribute = '';
                    let categoryName = '';

                    if (matchInSlot) {
                        const team1 = clubs[matchInSlot.categoryId]?.[matchInSlot.group1Id]?.[matchInSlot.team1BaseName]?.find(team => team.id === matchInSlot.team1Id);
                        const team2 = clubs[matchInSlot.categoryId]?.[matchInSlot.group2Id]?.[matchInSlot.team2BaseName]?.find(team => team.id === matchInSlot.team2Id);
                        
                        const team1Display = team1 ? `${team1.clubBaseName} ${team1.orderNumber ? '(' + team1.orderNumber + ')' : ''}` : 'Neznámy tím';
                        const team2Display = team2 ? `${team2.clubBaseName} ${team2.orderNumber ? '(' + team2.orderNumber + ')' : ''}` : 'Neznámy tím';
                        
                        matchInfo = `${team1Display} vs ${team2Display}`;
                        rowClass = 'match-row';
                        matchId = matchInSlot.id;
                        draggableAttribute = 'draggable="true"';
                        categoryName = categories[matchInSlot.categoryId] || 'Neznáma kategória';
                    }

                    scheduleHTML += `<tr class="${rowClass}" data-match-id="${matchId}" ${draggableAttribute} data-time="${slot.time}" data-place-id="${place.id}" data-day-id="${day.id}" data-category-id="${matchInSlot ? matchInSlot.categoryId : ''}">`;
                    scheduleHTML += `<td>${slot.time}</td>`;
                    scheduleHTML += `<td>${place.name}</td>`;
                    scheduleHTML += `<td class="match-cell">${matchInfo}</td>`;
                    scheduleHTML += `<td>${categoryName}</td>`;
                    scheduleHTML += `<td>`;
                    if (matchInSlot) {
                        scheduleHTML += `<button class="action-button edit-match-button" data-id="${matchId}" title="Upraviť zápas">&#9998;</button>`;
                        scheduleHTML += `<button class="action-button delete-match-button" data-id="${matchId}" title="Vymazať zápas">&#128465;</button>`;
                    } else {
                        scheduleHTML += `<button class="action-button add-match-button" data-day-id="${day.id}" data-place-id="${place.id}" data-time="${slot.time}" title="Pridať zápas">&#x2795;</button>`;
                    }
                    scheduleHTML += `</td>`;
                    scheduleHTML += `</tr>`;
                });
            });
            scheduleHTML += `</tbody></table></div>`;
        });
        scheduleContainer.innerHTML = scheduleHTML;
        addDragAndDropListeners(); // Attach listeners after rendering

        // Add event listeners for buttons
        document.querySelectorAll('.edit-match-button').forEach(button => {
            button.addEventListener('click', (event) => openMatchModal(event.target.dataset.id));
        });
        document.querySelectorAll('.delete-match-button').forEach(button => {
            button.addEventListener('click', (event) => deleteMatch(event.target.dataset.id));
        });
        document.querySelectorAll('.add-match-button').forEach(button => {
            button.addEventListener('click', (event) => openMatchModal(null, event.target.dataset.dayId, event.target.dataset.placeId, event.target.dataset.time));
        });

    } catch (error) {
        console.error("Chyba pri načítavaní rozpisu zápasov:", error);
        scheduleContainer.innerHTML = '<p>Nastala chyba pri načítavaní rozpisu zápasov. Skúste to znova.</p>';
    }
}

/**
 * Generates time slots for a given day, considering existing matches, places, and category settings.
 * @param {Date} dayDate The date for which to generate time slots.
 * @param {Array<Object>} currentDayMatches An array of match objects for the current day.
 * @param {number} numberOfPlaces The total number of available places.
 * @param {string} startTime The start time for the day (e.g., "08:00").
 * @param {Object} categoryMatchSettings Object containing duration and bufferTime settings per category.
 * @returns {Array<Object>} An array of time slot objects.
 */
function generateTimeSlots(dayDate, currentDayMatches, numberOfPlaces, startTime, categoryMatchSettings) {
    const slots = [];
    let currentTime = new Date(dayDate);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(dayDate);
    endTime.setHours(23, 0, 0, 0); // End of the day for scheduling

    // Create a set of occupied slots to avoid duplicates
    const occupiedSlots = new Set();
    currentDayMatches.forEach(match => {
        const matchTime = new Date(match.dateTime);
        const formattedMatchTime = matchTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
        occupiedSlots.add(`${formattedMatchTime}-${match.placeId}`);
    });

    while (currentTime < endTime) {
        let hasMatchAtCurrentTime = false;
        // Check if any match starts at the current time slot across all places
        for (let i = 0; i < numberOfPlaces; i++) {
            if (currentDayMatches.some(match => {
                const matchTime = new Date(match.dateTime);
                return matchTime.getHours() === currentTime.getHours() &&
                       matchTime.getMinutes() === currentTime.getMinutes();
            })) {
                hasMatchAtCurrentTime = true;
                break;
            }
        }

        // Add the current time slot if there's a match, or if it's an empty slot that hasn't been added yet
        const formattedCurrentTime = currentTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
        
        // Add this time slot regardless, if it's the beginning of the day or there's an existing match
        // or if it's the next logical step after a match duration + buffer
        slots.push({ time: formattedCurrentTime });

        // Determine next time based on match durations and buffer times
        let maxAdvanceTime = 15; // Default minimum step
        
        currentDayMatches.forEach(match => {
            const matchStart = new Date(match.dateTime);
            const matchEnd = new Date(matchStart);

            const categorySettings = categoryMatchSettings[match.categoryId];
            const matchDuration = categorySettings ? (categorySettings.duration || 15) : 15;
            const bufferTime = categorySettings ? (categorySettings.bufferTime || 0) : 0;
            
            matchEnd.setMinutes(matchEnd.getMinutes() + matchDuration + bufferTime);

            // If the current time is when a match *starts*, then consider its duration for the next slot
            if (currentTime.getHours() === matchStart.getHours() && currentTime.getMinutes() === matchStart.getMinutes()) {
                const difference = (matchEnd.getTime() - currentTime.getTime()) / (1000 * 60);
                if (difference > maxAdvanceTime) {
                    maxAdvanceTime = difference;
                }
            }
        });

        // Advance the time
        currentTime.setMinutes(currentTime.getMinutes() + maxAdvanceTime);
    }
    
    // Ensure all unique match start times are present
    currentDayMatches.forEach(match => {
        const matchTime = new Date(match.dateTime);
        const formattedMatchTime = matchTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
        if (!slots.some(slot => slot.time === formattedMatchTime)) {
            slots.push({ time: formattedMatchTime });
        }
    });

    // Sort slots by time
    slots.sort((a, b) => {
        const [h1, m1] = a.time.split(':').map(Number);
        const [h2, m2] = b.time.split(':').map(Number);
        if (h1 !== h2) return h1 - h2;
        return m1 - m2;
    });

    // Remove duplicates if any were introduced by ensuring match times
    const uniqueSlots = [];
    const seenTimes = new Set();
    for (const slot of slots) {
        if (!seenTimes.has(slot.time)) {
            uniqueSlots.push(slot);
            seenTimes.add(slot.time);
        }
    }

    return uniqueSlots;
}

// Global variables for drag and drop
let draggedMatch = null;

/**
 * Adds drag and drop event listeners to match rows.
 */
function addDragAndDropListeners() {
    const matchRows = document.querySelectorAll('.match-row');
    matchRows.forEach(row => {
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('dragleave', handleDragLeave);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
    });
}

/**
 * Handles the start of a drag operation.
 * @param {DragEvent} e The drag event.
 */
function handleDragStart(e) {
    draggedMatch = e.target;
    e.dataTransfer.effectAllowed = 'move';
    // Store information about whether Ctrl key was pressed
    e.dataTransfer.setData('text/plain', JSON.stringify({
        matchId: draggedMatch.dataset.matchId,
        ctrlKey: e.ctrlKey // Pass ctrlKey state
    }));
    setTimeout(() => {
        draggedMatch.classList.add('dragging');
    }, 0); // Add class after a short delay to avoid immediate flicker
}

/**
 * Handles the drag over event. Prevents default to allow dropping.
 * @param {DragEvent} e The drag event.
 */
function handleDragOver(e) {
    e.preventDefault();
    const targetRow = e.target.closest('tr');
    if (targetRow && draggedMatch && targetRow !== draggedMatch) {
        const boundingBox = targetRow.getBoundingClientRect();
        const offset = e.clientY - boundingBox.top;

        // Determine if dragging above or below the current row
        if (offset < boundingBox.height / 2) {
            targetRow.classList.add('drop-over-row-before');
            targetRow.classList.remove('drop-over-row-after');
        } else {
            targetRow.classList.add('drop-over-row-after');
            targetRow.classList.remove('drop-over-row-before');
        }
    }
    // Set appropriate drop effect based on Ctrl key
    if (e.ctrlKey) {
        e.dataTransfer.dropEffect = 'copy';
    } else {
        e.dataTransfer.dropEffect = 'move';
    }
}

/**
 * Handles the drag leave event. Removes visual indicators.
 * @param {DragEvent} e The drag event.
 */
function handleDragLeave(e) {
    const targetRow = e.target.closest('tr');
    if (targetRow) {
        targetRow.classList.remove('drop-over-row-before', 'drop-over-row-after');
    }
}

/**
 * Handles the drop event. Reorders matches and updates Firestore.
 * @param {DragEvent} e The drag event.
 */
async function handleDrop(e) {
    e.preventDefault();
    const targetRow = e.target.closest('tr');

    if (draggedMatch && targetRow && targetRow !== draggedMatch) {
        // Retrieve data transferred during dragstart
        const transferData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const draggedMatchId = transferData.matchId;
        const targetMatchId = targetRow.dataset.matchId;

        // If Ctrl key was pressed, duplicate the match
        if (e.ctrlKey) {
            if (!draggedMatchId) {
                // Cannot duplicate an empty slot
                await showMessage('Chyba', 'Prázdny slot nie je možné duplikovať.');
                removeDragClasses();
                return;
            }
            await duplicateMatch(draggedMatchId, targetRow.dataset.dayId, targetRow.dataset.placeId, targetRow.dataset.time);
            removeDragClasses();
            return; // Exit after duplicating
        }

        if (!draggedMatchId) {
             // This happens if you drag an empty slot onto another empty slot or a match.
             // We can allow adding a new match to an empty slot.
             const targetDayId = targetRow.dataset.dayId;
             const targetPlaceId = targetRow.dataset.placeId;
             const targetTime = targetRow.dataset.time;
             openMatchModal(null, targetDayId, targetPlaceId, targetTime);
             removeDragClasses();
             return;
        }

        const isBefore = targetRow.classList.contains('drop-over-row-before');

        // Check if moving within the same day and place
        const samePlace = draggedMatch.dataset.placeId === targetRow.dataset.placeId;
        const sameDay = draggedMatch.dataset.dayId === targetRow.dataset.dayId;

        if (samePlace && sameDay) {
            // Reorder within the same place and day
            await reorderMatchesInPlace(draggedMatchId, targetMatchId, isBefore);
        } else {
            // Move match to a different place/time slot
            await moveMatchToNewSlot(draggedMatchId, targetRow.dataset.dayId, targetRow.dataset.placeId, targetRow.dataset.time, targetRow.dataset.categoryId);
        }
    }
    removeDragClasses();
}

/**
 * Handles the end of a drag operation. Cleans up.
 * @param {DragEvent} e The drag event.
 */
function handleDragEnd(e) {
    draggedMatch.classList.remove('dragging');
    removeDragClasses();
    draggedMatch = null;
}

/**
 * Removes drag-related CSS classes from all table rows.
 */
function removeDragClasses() {
    document.querySelectorAll('.schedule-table tbody tr').forEach(row => {
        row.classList.remove('drop-over-row-before', 'drop-over-row-after');
    });
}

/**
 * Reorders matches within the same place and updates their dateTime to reflect the new order.
 * This is a simplified reordering logic. A more robust solution might involve:
 * 1. Fetching all matches for the given day and place.
 * 2. Adjusting their times based on their new sequence.
 * 3. Saving all modified matches in a batch.
 *
 * For now, it will simply swap the times of the dragged and target match.
 * @param {string} draggedMatchId The ID of the dragged match.
 * @param {string} targetMatchId The ID of the target match.
 * @param {boolean} isBefore True if dragged match should be placed before target.
 */
async function reorderMatchesInPlace(draggedMatchId, targetMatchId, isBefore) {
    if (draggedMatchId === targetMatchId) return; // No change if dropping on itself

    try {
        const draggedMatchRef = doc(matchesCollectionRef, draggedMatchId);
        const targetMatchRef = doc(matchesCollectionRef, targetMatchId);

        const [draggedDoc, targetDoc] = await Promise.all([
            getDoc(draggedMatchRef),
            getDoc(targetMatchRef)
        ]);

        if (!draggedDoc.exists() || !targetDoc.exists()) {
            await showMessage('Chyba', 'Jeden zo zápasov sa nenašiel.');
            return;
        }

        const draggedData = draggedDoc.data();
        const targetData = targetDoc.data();

        // Check for same place and day explicitly
        if (draggedData.placeId !== targetData.placeId || new Date(draggedData.dateTime).toDateString() !== new Date(targetData.dateTime).toDateString()) {
            await showMessage('Chyba', 'Preusporiadanie je možné iba v rámci toho istého miesta a dňa. Pre presun na iné miesto/čas použite drag and drop do voľného slotu alebo existujúceho zápasu na inom mieste/čase.');
            return;
        }

        // Swap the times
        const batch = writeBatch(db);
        batch.update(draggedMatchRef, { dateTime: targetData.dateTime });
        batch.update(targetMatchRef, { dateTime: draggedData.dateTime });
        await batch.commit();

        await showMessage('Úspech', 'Zápas úspešne preusporiadaný!');
        displayMatchesAsSchedule(); // Re-render the schedule
    } catch (error) {
        console.error('Chyba pri preusporiadaní zápasov:', error);
        await showMessage('Chyba', 'Chyba pri preusporiadaní zápasov. Skúste to znova.');
    }
}


/**
 * Moves a match to a new time slot (new date, place, or time).
 * @param {string} matchId The ID of the match to move.
 * @param {string} newDayId The ID of the target playing day.
 * @param {string} newPlaceId The ID of the target place.
 * @param {string} newTime The new time in HH:MM format.
 * @param {string} newCategoryId The category ID of the target slot (if it was an existing match).
 */
async function moveMatchToNewSlot(matchId, newDayId, newPlaceId, newTime, newCategoryId) {
    try {
        const matchRef = doc(matchesCollectionRef, matchId);
        const matchDoc = await getDoc(matchRef);

        if (!matchDoc.exists()) {
            await showMessage('Chyba', 'Zápas na presun sa nenašiel.');
            return;
        }

        const oldMatchData = matchDoc.data();
        const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, newDayId));
        if (!playingDayDoc.exists()) {
            await showMessage('Chyba', 'Cieľový hrací deň sa nenašiel.');
            return;
        }
        const newDateString = playingDayDoc.data().date; // "YYYY-MM-DD"

        const newDateTimeString = `${newDateString}T${newTime}:00`;
        const newDateTime = new Date(newDateTimeString);

        // Check for overlaps at the target slot
        const qOverlap = query(matchesCollectionRef, 
            where('dateTime', '==', newDateTimeString),
            where('placeId', '==', newPlaceId)
        );
        const overlapSnapshot = await getDocs(qOverlap);

        if (!overlapSnapshot.empty && overlapSnapshot.docs[0].id !== matchId) {
            await showMessage('Chyba', 'Na tomto mieste a čase už existuje iný zápas!');
            return;
        }

        // If a new category is provided (meaning dropping onto an existing match's slot),
        // we should try to keep the original category, otherwise update it.
        // This logic needs to be carefully considered. For now, we'll try to preserve the original category
        // unless the UI explicitly indicates a category change by dragging to a different category's specific slot.
        // For simplicity, we will update the category only if the target slot had a different category and we allow it.
        // Here, we just use the original match's category.

        await updateDoc(matchRef, {
            dateTime: newDateTimeString,
            placeId: newPlaceId,
            // categoryId: oldMatchData.categoryId // Preserve original category, unless specific logic dictates change
        });

        await showMessage('Úspech', 'Zápas úspešne presunutý!');
        displayMatchesAsSchedule();
    } catch (error) {
        console.error('Chyba pri presune zápasu:', error);
        await showMessage('Chyba', `Chyba pri presune zápasu. Detail: ${error.message}`);
    }
}

/**
 * Duplicates an existing match, places the copy at the target slot, and opens the modal for editing the new match.
 * @param {string} originalMatchId The ID of the match to duplicate.
 * @param {string} newDayId The ID of the target playing day.
 * @param {string} newPlaceId The ID of the target place.
 * @param {string} newTime The new time in HH:MM format.
 */
async function duplicateMatch(originalMatchId, newDayId, newPlaceId, newTime) {
    try {
        const originalMatchRef = doc(matchesCollectionRef, originalMatchId);
        const originalMatchDoc = await getDoc(originalMatchRef);

        if (!originalMatchDoc.exists()) {
            await showMessage('Chyba', 'Pôvodný zápas na duplikovanie sa nenašiel.');
            return;
        }

        const originalMatchData = originalMatchDoc.data();
        const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, newDayId));
        if (!playingDayDoc.exists()) {
            await showMessage('Chyba', 'Cieľový hrací deň sa nenašiel.');
            return;
        }
        const newDateString = playingDayDoc.data().date; // "YYYY-MM-DD"
        const newDateTimeString = `${newDateString}T${newTime}:00`;

        // Create new match data, overriding dateTime and placeId
        const newMatchData = {
            ...originalMatchData,
            dateTime: newDateTimeString,
            placeId: newPlaceId,
            createdAt: new Date() // Set new creation timestamp for the duplicated match
        };

        // Add the new duplicated match to Firestore
        const newDocRef = await addDoc(matchesCollectionRef, newMatchData);
        
        await showMessage('Úspech', 'Zápas bol úspešne duplikovaný! Môžete ho upraviť.');
        
        // Refresh the schedule to show the new match
        await displayMatchesAsSchedule();

        // Open the modal for the newly created match
        openMatchModal(newDocRef.id, newDayId, newPlaceId, newTime);

    } catch (error) {
        console.error('Chyba pri duplikovaní zápasu:', error);
        await showMessage('Chyba', `Chyba pri duplikovaní zápasu. Detail: ${error.message}`);
    }
}


const playingDayModal = document.getElementById('playingDayModal');
const playingDayForm = document.getElementById('playingDayForm');
const playingDayModalTitle = document.getElementById('playingDayModalTitle');
const playingDayIdInput = document.getElementById('playingDayId');
const playingDayDateInput = document.getElementById('playingDayDate');
const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

const placeModal = document.getElementById('placeModal');
const placeForm = document.getElementById('placeForm');
const placeModalTitle = document.getElementById('placeModalTitle');
const placeIdInput = document.getElementById('placeId');
const placeNameInput = document.getElementById('placeName');
const placeAccommodationCheckbox = document.getElementById('placeAccommodation');
const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

const matchModal = document.getElementById('matchModal');
const matchForm = document.getElementById('matchForm');
const matchModalTitle = document.getElementById('matchModalTitle');
const matchIdInput = document.getElementById('matchId');
const matchCategorySelect = document.getElementById('matchCategorySelect');
const matchGroup1Select = document.getElementById('matchGroup1Select');
const matchTeam1Select = document.getElementById('matchTeam1Select');
const matchGroup2Select = document.getElementById('matchGroup2Select');
const matchTeam2Select = document.getElementById('matchTeam2Select');
const matchPlayingDaySelect = document.getElementById('matchPlayingDaySelect');
const matchPlaceSelect = document.getElementById('matchPlaceSelect');
const matchTimeInput = document.getElementById('matchTimeInput');
const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

const accommodationModal = document.getElementById('accommodationModal');
const accommodationForm = document.getElementById('accommodationForm');
const accommodationModalTitle = document.getElementById('accommodationModalTitle');
const accommodationIdInput = document.getElementById('accommodationId');
const accommodationTeamSelect = document.getElementById('accommodationTeamSelect');
const accommodationSelect = document.getElementById('accommodationSelect');
const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');
const unassignedTeamRadio = document.getElementById('unassignedTeamRadio');
const assignedTeamRadio = document.getElementById('assignedTeamRadio');
const accommodationTeamContainer = document.getElementById('accommodationTeamContainer');
const unassignedTeamSelect = document.getElementById('unassignedTeamSelect');
const assignedTeamSelect = document.getElementById('assignedTeamSelect');


// Event listeners for opening/closing modals
document.querySelectorAll('.modal .close').forEach(button => {
    button.addEventListener('click', (event) => closeModal(event.target.closest('.modal')));
});

window.addEventListener('click', (event) => {
    // Close modal if clicked outside of modal-content
    document.querySelectorAll('.modal').forEach(modal => {
        const modalContent = modal.querySelector('.modal-content');
        if (event.target === modal && modalContent && !modalContent.contains(event.target)) {
            closeModal(modal);
            // Specific reset logic for match modal
            if (modal.id === 'matchModal') {
                resetMatchModal();
            } else if (modal.id === 'playingDayModal') {
                resetPlayingDayModal();
            } else if (modal.id === 'placeModal') {
                resetPlaceModal();
            } else if (modal.id === 'accommodationModal') {
                resetAccommodationModal();
            }
        }
    });
    // Close addOptions dropdown
    const addOptions = document.getElementById('addOptions');
    const addButton = document.getElementById('addButton');
    if (addOptions && addButton && event.target !== addButton && !addOptions.contains(event.target)) {
        addOptions.style.display = 'none';
    }
});


/**
 * Resets the playing day modal form.
 */
function resetPlayingDayModal() {
    playingDayForm.reset();
    playingDayIdInput.value = '';
    playingDayModalTitle.textContent = 'Pridať hrací deň';
    deletePlayingDayButtonModal.style.display = 'none';
}

/**
 * Resets the place modal form.
 */
function resetPlaceModal() {
    placeForm.reset();
    placeIdInput.value = '';
    placeModalTitle.textContent = 'Pridať miesto';
    deletePlaceButtonModal.style.display = 'none';
}

/**
 * Resets the match modal form.
 */
function resetMatchModal() {
    matchForm.reset();
    matchIdInput.value = '';
    matchModalTitle.textContent = 'Pridať zápas';
    deleteMatchButtonModal.style.display = 'none';
    // Clear dynamic select options but keep default placeholder
    matchCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
    matchGroup1Select.innerHTML = '<option value="">-- Vyberte skupinu tímu 1 --</option>';
    matchTeam1Select.innerHTML = '<option value="">-- Vyberte tím 1 --</option>';
    matchGroup2Select.innerHTML = '<option value="">-- Vyberte skupinu tímu 2 --</option>';
    matchTeam2Select.innerHTML = '<option value="">-- Vyberte tím 2 --</option>';
    matchPlayingDaySelect.innerHTML = '<option value="">-- Vyberte dátum --</option>';
    matchPlaceSelect.innerHTML = '<option value="">-- Vyberte miesto --</option>';
}

/**
 * Resets the accommodation modal form.
 */
function resetAccommodationModal() {
    accommodationForm.reset();
    accommodationIdInput.value = '';
    accommodationModalTitle.textContent = 'Priradiť ubytovanie';
    deleteAssignmentButtonModal.style.display = 'none';
    unassignedTeamRadio.checked = true; // Default to unassigned teams
    accommodationTeamContainer.style.display = 'block';
    populateUnassignedTeamsSelect(unassignedTeamSelect);
    accommodationSelect.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    assignedTeamSelect.innerHTML = '<option value="">-- Vyberte priradený tím --</option>';
    assignedTeamSelect.style.display = 'none';
}

/**
 * Opens the playing day modal for adding or editing.
 * @param {string|null} dayId The ID of the playing day to edit, or null to add a new one.
 */
async function openPlayingDayModal(dayId = null) {
    resetPlayingDayModal();
    if (dayId) {
        const docRef = doc(playingDaysCollectionRef, dayId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            playingDayIdInput.value = dayId;
            playingDayDateInput.value = data.date;
            playingDayModalTitle.textContent = 'Upraviť hrací deň';
            deletePlayingDayButtonModal.style.display = 'inline-block';
        }
    }
    openModal(playingDayModal);
}

/**
 * Opens the place modal for adding or editing.
 * @param {string|null} placeId The ID of the place to edit, or null to add a new one.
 */
async function openPlaceModal(placeId = null) {
    resetPlaceModal();
    if (placeId) {
        const docRef = doc(placesCollectionRef, placeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            placeIdInput.value = placeId;
            placeNameInput.value = data.name;
            placeAccommodationCheckbox.checked = data.isAccommodation || false;
            placeModalTitle.textContent = 'Upraviť miesto';
            deletePlaceButtonModal.style.display = 'inline-block';
        }
    }
    openModal(placeModal);
}

/**
 * Opens the match modal for adding or editing.
 * @param {string|null} matchId The ID of the match to edit, or null to add a new one.
 * @param {string} [initialDayId=''] Initial playing day ID for new match.
 * @param {string} [initialPlaceId=''] Initial place ID for new match.
 * @param {string} [initialTime=''] Initial time for new match.
 */
async function openMatchModal(matchId = null, initialDayId = '', initialPlaceId = '', initialTime = '') {
    resetMatchModal();
    await populateCategorySelect(matchCategorySelect);
    await populatePlayingDaysSelect(matchPlayingDaySelect, initialDayId);
    await populatePlacesSelect(matchPlaceSelect, initialPlaceId);

    // Initial population for groups/teams based on pre-selected category if editing
    let initialCategoryId = '';

    if (matchId) {
        const docRef = doc(matchesCollectionRef, matchId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            matchIdInput.value = matchId;
            matchModalTitle.textContent = 'Upraviť zápas';
            deleteMatchButtonModal.style.display = 'inline-block';

            initialCategoryId = data.categoryId;
            matchCategorySelect.value = data.categoryId;

            await populateGroupSelect(matchGroup1Select, data.categoryId, data.group1Id);
            await populateTeamsInGroupSelect(matchTeam1Select, data.group1Id, data.team1Id);

            await populateGroupSelect(matchGroup2Select, data.categoryId, data.group2Id);
            await populateTeamsInGroupSelect(matchTeam2Select, data.group2Id, data.team2Id);

            matchPlayingDaySelect.value = data.dateTime.substring(0, 10); // Extract date part
            matchPlaceSelect.value = data.placeId;
            matchTimeInput.value = data.dateTime.substring(11, 16); // Extract time part
        }
    } else {
        // For adding new match, if initial values are provided
        if (initialCategoryId) {
            matchCategorySelect.value = initialCategoryId;
        }
        if (initialDayId) {
            matchPlayingDaySelect.value = initialDayId;
        }
        if (initialPlaceId) {
            matchPlaceSelect.value = initialPlaceId;
        }
        if (initialTime) {
            matchTimeInput.value = initialTime;
        }
    }

    openModal(matchModal);
}

/**
 * Opens the accommodation modal for adding or editing.
 * @param {string|null} assignmentId The ID of the assignment to edit, or null to add a new one.
 */
async function openAccommodationModal(assignmentId = null) {
    resetAccommodationModal();
    await populateAccommodationPlacesSelect(accommodationSelect);

    if (assignmentId) {
        const docRef = doc(db, 'tournamentData', 'mainTournamentData', 'accommodationAssignments', assignmentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            accommodationIdInput.value = assignmentId;
            accommodationModalTitle.textContent = 'Upraviť priradenie ubytovania';
            deleteAssignmentButtonModal.style.display = 'inline-block';

            // Determine if the team is currently unassigned or assigned
            const clubDoc = await getDoc(doc(clubsCollectionRef, data.clubId));
            if (clubDoc.exists() && clubDoc.data().accommodationPlaceId) {
                // Team is currently assigned, switch to assigned team radio
                assignedTeamRadio.checked = true;
                accommodationTeamContainer.style.display = 'none';
                assignedTeamSelect.style.display = 'block';
                await populateAssignedTeamsSelect(assignedTeamSelect, data.clubId);
            } else {
                // Team is unassigned, keep unassigned team radio checked
                unassignedTeamRadio.checked = true;
                accommodationTeamContainer.style.display = 'block';
                await populateUnassignedTeamsSelect(unassignedTeamSelect, data.clubId);
            }
            
            accommodationSelect.value = data.accommodationPlaceId;
        }
    } else {
        // Default to unassigned teams when adding a new assignment
        unassignedTeamRadio.checked = true;
        accommodationTeamContainer.style.display = 'block';
        await populateUnassignedTeamsSelect(unassignedTeamSelect);
    }
    openModal(accommodationModal);
}

/**
 * Populates the accommodation select element with places marked as accommodation.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedPlaceId=''] The ID of the place to pre-select.
 */
async function populateAccommodationPlacesSelect(selectElement, selectedPlaceId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    try {
        const q = query(placesCollectionRef, where("isAccommodation", "==", true), orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const place = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = place.name;
            selectElement.appendChild(option);
        });
        if (selectedPlaceId) {
            selectElement.value = selectedPlaceId;
        }
    } catch (error) {
        console.error("Chyba pri načítavaní ubytovní:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with teams that are not yet assigned to an accommodation.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedClubId=''] The ID of the club to pre-select.
 */
async function populateUnassignedTeamsSelect(selectElement, selectedClubId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
    try {
        // Query for clubs that do NOT have accommodationPlaceId set or it's empty
        const q = query(clubsCollectionRef, where("accommodationPlaceId", "==", "")); // Check for empty string
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const club = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${club.clubBaseName} (${club.categoryName} - ${club.groupName})`;
            selectElement.appendChild(option);
        });
        if (selectedClubId) {
            selectElement.value = selectedClubId;
        }
    } catch (error) {
        console.error("Chyba pri načítavaní nepriradených tímov:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with teams that are already assigned to an accommodation.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedClubId=''] The ID of the club to pre-select.
 */
async function populateAssignedTeamsSelect(selectElement, selectedClubId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte priradený tím --</option>';
    try {
        // Query for clubs that have accommodationPlaceId set
        const q = query(clubsCollectionRef, where("accommodationPlaceId", "!=", "")); // Check for non-empty string
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const club = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${club.clubBaseName} (${club.categoryName} - ${club.groupName})`;
            selectElement.appendChild(option);
        });
        if (selectedClubId) {
            selectElement.value = selectedClubId;
        }
    } catch (error) {
        console.error("Chyba pri načítavaní priradených tímov:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}


/**
 * Displays accommodation assignments in a table-like structure.
 */
async function displayAccommodationAssignments() {
    const accommodationScheduleContainer = document.getElementById('accommodationScheduleContainer');
    if (!accommodationScheduleContainer) return;
    accommodationScheduleContainer.innerHTML = '<h2>Priradenie ubytovania</h2><p>Načítavam priradenia ubytovania...</p>';

    try {
        const placesSnapshot = await getDocs(query(placesCollectionRef, where("isAccommodation", "==", true), orderBy("name", "asc")));
        const clubsSnapshot = await getDocs(clubsCollectionRef);

        const accommodationPlaces = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const clubs = {};
        clubsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.accommodationPlaceId) { // Only add clubs with accommodation assigned
                if (!clubs[data.accommodationPlaceId]) {
                    clubs[data.accommodationPlaceId] = [];
                }
                clubs[data.accommodationPlaceId].push({ id: doc.id, ...data });
            }
        });

        if (accommodationPlaces.length === 0) {
            accommodationScheduleContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne ubytovne.</p>';
            return;
        }

        let accommodationHTML = '';
        accommodationPlaces.forEach(place => {
            const assignedTeams = clubs[place.id] || [];
            accommodationHTML += `<div class="schedule-cell-accommodation">`;
            accommodationHTML += `<div class="schedule-cell-title">${place.name}</div>`;
            accommodationHTML += `<div class="schedule-cell-teams">`;
            if (assignedTeams.length > 0) {
                assignedTeams.forEach(team => {
                    accommodationHTML += `<p>${team.clubBaseName} (${team.categoryName} - ${team.groupName}) <button class="action-button edit-accommodation-assignment-button" data-assignment-club-id="${team.id}" data-assignment-place-id="${place.id}" title="Upraviť">&#9998;</button></p>`;
                });
            } else {
                accommodationHTML += `<p>Žiadne tímy priradené k tomuto miestu.</p>`;
            }
            accommodationHTML += `</div>`;
            accommodationHTML += `</div>`;
        });
        accommodationScheduleContainer.innerHTML = accommodationHTML;

        document.querySelectorAll('.edit-accommodation-assignment-button').forEach(button => {
            button.addEventListener('click', async (event) => {
                const clubId = event.target.dataset.assignmentClubId;
                const placeId = event.target.dataset.assignmentPlaceId;
                // Find the assignment document ID based on clubId (since assignment doc stores clubId and accommodationPlaceId)
                // This assumes a 1:1 relationship between club and assignment for simplicity or we need to query assignments.
                // For simplicity, we directly open modal based on clubId to modify its accommodation.
                await openAccommodationModalForClub(clubId);
            });
        });

    } catch (error) {
        console.error("Chyba pri načítavaní priradení ubytovania:", error);
        accommodationScheduleContainer.innerHTML = '<p>Nastala chyba pri načítavaní priradení ubytovania. Skúste to znova.</p>';
    }
}

/**
 * Opens the accommodation modal to edit an existing assignment for a given club.
 * @param {string} clubId The ID of the club whose accommodation assignment is to be edited.
 */
async function openAccommodationModalForClub(clubId) {
    resetAccommodationModal();
    await populateAccommodationPlacesSelect(accommodationSelect);

    const clubDocRef = doc(clubsCollectionRef, clubId);
    const clubDocSnap = await getDoc(clubDocRef);

    if (clubDocSnap.exists()) {
        const clubData = clubDocSnap.data();
        accommodationModalTitle.textContent = 'Upraviť priradenie ubytovania';
        deleteAssignmentButtonModal.style.display = 'inline-block';

        // Select the correct radio button based on whether the club currently has an assignment
        if (clubData.accommodationPlaceId) {
            assignedTeamRadio.checked = true;
            accommodationTeamContainer.style.display = 'none'; // Hide unassigned select
            assignedTeamSelect.style.display = 'block'; // Show assigned select
            await populateAssignedTeamsSelect(assignedTeamSelect, clubId); // Populate with the specific club selected
            accommodationSelect.value = clubData.accommodationPlaceId;
            accommodationIdInput.value = clubId; // Use clubId as 'assignmentId' for update context
        } else {
            unassignedTeamRadio.checked = true; // Should not happen if called from edit button for assigned team, but as fallback
            accommodationTeamContainer.style.display = 'block';
            assignedTeamSelect.style.display = 'none';
            await populateUnassignedTeamsSelect(unassignedTeamSelect, clubId);
            accommodationIdInput.value = clubId; // Use clubId as 'assignmentId' for update context
        }
    }
    openModal(accommodationModal);
}

// Event Listeners for Forms and Buttons

// Add/Edit Playing Day Form
playingDayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = playingDayIdInput.value;
    const date = playingDayDateInput.value;

    // Basic validation
    if (!date) {
        await showMessage('Chyba', 'Prosím, zadajte dátum hracieho dňa.');
        return;
    }

    try {
        const q = query(playingDaysCollectionRef, where("date", "==", date));
        const querySnapshot = await getDocs(q);

        // Check for duplicate playing day date
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            await showMessage('Chyba', 'Hrací deň s týmto dátumom už existuje!');
            return;
        }

        const playingDayData = { date: date };

        if (id) {
            await setDoc(doc(playingDaysCollectionRef, id), playingDayData, { merge: true });
            await showMessage('Úspech', 'Hrací deň úspešne upravený!');
        } else {
            await addDoc(playingDaysCollectionRef, { ...playingDayData, createdAt: new Date() });
            await showMessage('Úspech', 'Hrací deň úspešne pridaný!');
        }
        closeModal(playingDayModal);
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Chyba pri ukladaní hracieho dňa:", error);
        await showMessage('Chyba', `Chyba pri ukladaní hracieho dňa. Detail: ${error.message}`);
    }
});

// Delete Playing Day Button (inside modal)
deletePlayingDayButtonModal.addEventListener('click', async () => {
    const dayId = playingDayIdInput.value;
    if (!dayId) return;

    const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať tento hrací deň? Vymažú sa aj všetky súvisiace zápasy!');
    if (!confirmation) return;

    try {
        // Delete all matches associated with this playing day first
        const qMatches = query(matchesCollectionRef, where("dateTime", ">=", `${playingDayDateInput.value}T00:00:00`), where("dateTime", "<=", `${playingDayDateInput.value}T23:59:59`));
        const matchesSnapshot = await getDocs(qMatches);
        const batch = writeBatch(db);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });
        await batch.commit();

        await deleteDoc(doc(playingDaysCollectionRef, dayId));
        await showMessage('Úspech', 'Hrací deň a súvisiace zápasy boli úspešne vymazané!');
        closeModal(playingDayModal);
        await displayMatchesAsSchedule(); // Refresh schedule
    } catch (error) {
        console.error("Chyba pri mazaní hracieho dňa:", error);
        await showMessage('Chyba', `Chyba pri mazaní hracieho dňa. Detail: ${error.message}`);
    }
});


// Add/Edit Place Form
placeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = placeIdInput.value;
    const name = placeNameInput.value.trim();
    const isAccommodation = placeAccommodationCheckbox.checked;

    if (!name) {
        await showMessage('Chyba', 'Prosím, zadajte názov miesta.');
        return;
    }

    try {
        const q = query(placesCollectionRef, where("name", "==", name));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            await showMessage('Chyba', 'Miesto s týmto názvom už existuje!');
            return;
        }

        const placeData = { name: name, isAccommodation: isAccommodation };

        if (id) {
            await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
            await showMessage('Úspech', 'Miesto úspešne upravené!');
        } else {
            await addDoc(placesCollectionRef, { ...placeData, createdAt: new Date() });
            await showMessage('Úspech', 'Miesto úspešne pridané!');
        }
        closeModal(placeModal);
        await displayMatchesAsSchedule(); // Refresh schedule to include new/updated places
        await displayAccommodationAssignments(); // Refresh accommodation to include new/updated places
    } catch (error) {
        console.error("Chyba pri ukladaní miesta:", error);
        await showMessage('Chyba', `Chyba pri ukladaní miesta. Detail: ${error.message}`);
    }
});

// Delete Place Button (inside modal)
deletePlaceButtonModal.addEventListener('click', async () => {
    const placeId = placeIdInput.value;
    if (!placeId) return;

    const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať toto miesto? Vymažú sa aj všetky súvisiace zápasy a priradenia ubytovania!');
    if (!confirmation) return;

    try {
        // Delete all matches associated with this place
        const qMatches = query(matchesCollectionRef, where("placeId", "==", placeId));
        const matchesSnapshot = await getDocs(qMatches);
        const batch = writeBatch(db);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });
        await batch.commit();

        // Remove accommodation assignment from clubs if this place was an accommodation
        const qClubsWithAccommodation = query(clubsCollectionRef, where("accommodationPlaceId", "==", placeId));
        const clubsSnapshot = await getDocs(qClubsWithAccommodation);
        const clubBatch = writeBatch(db);
        clubsSnapshot.forEach(clubDoc => {
            clubBatch.update(clubDoc.ref, { accommodationPlaceId: "" }); // Set to empty string
        });
        await clubBatch.commit();
        
        await deleteDoc(doc(placesCollectionRef, placeId));
        await showMessage('Úspech', 'Miesto, súvisiace zápasy a priradenia ubytovania boli úspešne vymazané!');
        closeModal(placeModal);
        await displayMatchesAsSchedule(); // Refresh schedule
        await displayAccommodationAssignments(); // Refresh accommodation
    } catch (error) {
        console.error("Chyba pri mazaní miesta:", error);
        await showMessage('Chyba', `Chyba pri mazaní miesta. Detail: ${error.message}`);
    }
});

// Add/Edit Match Form
matchCategorySelect.addEventListener('change', async () => {
    const categoryId = matchCategorySelect.value;
    if (categoryId) {
        await populateGroupSelect(matchGroup1Select, categoryId);
        matchGroup2Select.innerHTML = matchGroup1Select.innerHTML; // Populate group2 with same options
    } else {
        matchGroup1Select.innerHTML = '<option value="">-- Vyberte skupinu tímu 1 --</option>';
        matchTeam1Select.innerHTML = '<option value="">-- Vyberte tím 1 --</option>';
        matchGroup2Select.innerHTML = '<option value="">-- Vyberte skupinu tímu 2 --</option>';
        matchTeam2Select.innerHTML = '<option value="">-- Vyberte tím 2 --</option>';
    }
});

matchGroup1Select.addEventListener('change', async () => {
    const groupId = matchGroup1Select.value;
    if (groupId) {
        await populateTeamsInGroupSelect(matchTeam1Select, groupId);
    } else {
        matchTeam1Select.innerHTML = '<option value="">-- Vyberte tím 1 --</option>';
    }
});

matchGroup2Select.addEventListener('change', async () => {
    const groupId = matchGroup2Select.value;
    if (groupId) {
        await populateTeamsInGroupSelect(matchTeam2Select, groupId);
    } else {
        matchTeam2Select.innerHTML = '<option value="">-- Vyberte tím 2 --</option>';
    }
});

/**
 * Populates a select element with teams belonging to a specific group.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} groupId The ID of the group.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
async function populateTeamsInGroupSelect(selectElement, groupId, selectedTeamId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
    if (!groupId) return;

    try {
        const q = query(clubsCollectionRef, where("groupId", "==", groupId), orderBy("clubBaseName", "asc"), orderBy("orderNumber", "asc"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const team = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${team.clubBaseName} ${team.orderNumber ? '(' + team.orderNumber + ')' : ''}`;
            selectElement.appendChild(option);
        });
        if (selectedTeamId) {
            selectElement.value = selectedTeamId;
        }
    } catch (error) {
        console.error("Chyba pri načítavaní tímov v skupine:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

matchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = matchIdInput.value;
    const categoryId = matchCategorySelect.value;
    const group1Id = matchGroup1Select.value;
    const team1Id = matchTeam1Select.value;
    const group2Id = matchGroup2Select.value;
    const team2Id = matchTeam2Select.value;
    const playingDayDate = matchPlayingDaySelect.value;
    const placeId = matchPlaceSelect.value;
    const matchTime = matchTimeInput.value;

    // Basic validation
    if (!categoryId || !group1Id || !team1Id || !group2Id || !team2Id || !playingDayDate || !placeId || !matchTime) {
        await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia zápasu.');
        return;
    }

    if (team1Id === team2Id) {
        await showMessage('Chyba', 'Tím 1 a Tím 2 nemôžu byť rovnaké!');
        return;
    }
    
    // Construct dateTime string in ISO format
    const dateTime = `${playingDayDate}T${matchTime}:00`;

    try {
        // Get full club names and category/group names for display purposes (denormalization)
        const team1Doc = await getDoc(doc(clubsCollectionRef, team1Id));
        const team2Doc = await getDoc(doc(clubsCollectionRef, team2Id));
        const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
        const group1Doc = await getDoc(doc(groupsCollectionRef, group1Id));
        const group2Doc = await getDoc(doc(groupsCollectionRef, group2Id));

        if (!team1Doc.exists() || !team2Doc.exists() || !categoryDoc.exists() || !group1Doc.exists() || !group2Doc.exists()) {
            await showMessage('Chyba', 'Nepodarilo sa načítať informácie o tímoch, kategórii alebo skupinách.');
            return;
        }

        const team1Data = team1Doc.data();
        const team2Data = team2Doc.data();
        const categoryData = categoryDoc.data();

        // Check for duplicate match at same time and place
        const qOverlap = query(matchesCollectionRef, 
            where('dateTime', '==', dateTime),
            where('placeId', '==', placeId)
        );
        const overlapSnapshot = await getDocs(qOverlap);

        if (!overlapSnapshot.empty && overlapSnapshot.docs[0].id !== id) {
            await showMessage('Chyba', 'Na tomto mieste a čase už existuje iný zápas!');
            return;
        }

        const matchData = {
            categoryId: categoryId,
            categoryName: categoryData.name, // Denormalized name
            group1Id: group1Id,
            group2Id: group2Id,
            team1Id: team1Id,
            team1BaseName: team1Data.clubBaseName, // Denormalized name
            team2Id: team2Id,
            team2BaseName: team2Data.clubBaseName, // Denormalized name
            dateTime: dateTime,
            placeId: placeId,
            status: 'scheduled' // Default status
        };

        if (id) {
            await setDoc(doc(matchesCollectionRef, id), matchData, { merge: true });
            await showMessage('Úspech', 'Zápas úspešne upravený!');
        } else {
            await addDoc(matchesCollectionRef, { ...matchData, createdAt: new Date() });
            await showMessage('Úspech', 'Zápas úspešne pridaný!');
        }
        closeModal(matchModal);
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Chyba pri ukladaní zápasu:", error);
        await showMessage('Chyba', `Chyba pri ukladaní zápasu. Detail: ${error.message}`);
    }
});

// Delete Match Function
async function deleteMatch(matchId) {
    const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať tento zápas?');
    if (!confirmation) return;

    try {
        await deleteDoc(doc(matchesCollectionRef, matchId));
        await showMessage('Úspech', 'Zápas úspešne vymazaný!');
        await displayMatchesAsSchedule(); // Refresh schedule
    } catch (error) {
        console.error("Chyba pri mazaní zápasu:", error);
        await showMessage('Chyba', `Chyba pri mazaní zápasu. Detail: ${error.message}`);
    }
}


// Add/Edit Accommodation Assignment Form
accommodationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const assignmentClubId = accommodationIdInput.value; // This will hold the club ID
    const selectedAccommodationPlaceId = accommodationSelect.value;
    const isUnassignedTeamSelected = unassignedTeamRadio.checked;

    let clubIdToAssign;
    if (isUnassignedTeamSelected) {
        clubIdToAssign = unassignedTeamSelect.value;
    } else {
        clubIdToAssign = assignedTeamSelect.value;
    }
    
    if (!clubIdToAssign || !selectedAccommodationPlaceId) {
        await showMessage('Chyba', 'Prosím, vyberte tím a ubytovňu.');
        return;
    }

    try {
        const clubRef = doc(clubsCollectionRef, clubIdToAssign);
        const clubDoc = await getDoc(clubRef);

        if (!clubDoc.exists()) {
            await showMessage('Chyba', 'Vybraný tím neexistuje.');
            return;
        }

        const clubData = clubDoc.data();
        
        // Check if the team is already assigned to this accommodation place
        if (clubData.accommodationPlaceId === selectedAccommodationPlaceId && clubIdToAssign === assignmentClubId) {
            await showMessage('Informácia', 'Tím je už priradený k tejto ubytovni.');
            closeModal(accommodationModal);
            return;
        }

        // Update the club document directly
        await setDoc(clubRef, { accommodationPlaceId: selectedAccommodationPlaceId }, { merge: true });

        await showMessage('Úspech', 'Priradenie ubytovania úspešne uložené!');
        closeModal(accommodationModal);
        await displayAccommodationAssignments(); // Refresh display
    } catch (error) {
        console.error("Chyba pri ukladaní priradenia ubytovania:", error);
        await showMessage('Chyba', `Chyba pri ukladaní priradenia ubytovania. Detail: ${error.message}`);
    }
});

// Delete Accommodation Assignment Button (inside modal)
deleteAssignmentButtonModal.addEventListener('click', async () => {
    const clubIdToDeleteAssignment = accommodationIdInput.value; // This is the club ID
    if (!clubIdToDeleteAssignment) return;

    const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať priradenie ubytovania pre tento tím?');
    if (!confirmation) return;

    try {
        const clubRef = doc(clubsCollectionRef, clubIdToDeleteAssignment);
        await setDoc(clubRef, { accommodationPlaceId: "" }, { merge: true }); // Set accommodation to empty string
        await showMessage('Úspech', 'Priradenie ubytovania úspešne vymazané!');
        closeModal(accommodationModal);
        await displayAccommodationAssignments(); // Refresh display
    } catch (error) {
        console.error("Chyba pri mazaní priradenia ubytovania:", error);
        await showMessage('Chyba', `Chyba pri mazaní priradenia ubytovania. Detail: ${error.message}`);
    }
});

// Radio button change listeners for accommodation modal
unassignedTeamRadio.addEventListener('change', async () => {
    if (unassignedTeamRadio.checked) {
        accommodationTeamContainer.style.display = 'block';
        assignedTeamSelect.style.display = 'none';
        await populateUnassignedTeamsSelect(unassignedTeamSelect);
    }
});

assignedTeamRadio.addEventListener('change', async () => {
    if (assignedTeamRadio.checked) {
        accommodationTeamContainer.style.display = 'none';
        assignedTeamSelect.style.display = 'block';
        await populateAssignedTeamsSelect(assignedTeamSelect);
    }
});


// Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Load initial data and display schedules
    await displayMatchesAsSchedule();
    await displayAccommodationAssignments();

    // Toggle add options dropdown
    const addButton = document.getElementById('addButton');
    const addOptions = document.getElementById('addOptions');
    if (addButton) {
        addButton.addEventListener('click', () => {
            addOptions.style.display = addOptions.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Add Playing Day Button
    const addPlayingDayButton = document.getElementById('addPlayingDayButton');
    if (addPlayingDayButton) {
        addPlayingDayButton.addEventListener('click', () => {
            openPlayingDayModal();
            addOptions.style.display = 'none';
        });
    }

    // Add Place Button
    const addPlaceButton = document.getElementById('addPlaceButton');
    if (addPlaceButton) {
        addPlaceButton.addEventListener('click', () => {
            openPlaceModal();
            addOptions.style.display = 'none';
        });
    }

    // Add Match Button
    const addMatchButton = document.getElementById('addMatchButton');
    if (addMatchButton) {
        addMatchButton.addEventListener('click', () => {
            openMatchModal();
            addOptions.style.display = 'none';
        });
    }

    // Add Accommodation Assignment Button
    const addAccommodationAssignmentButton = document.getElementById('addAccommodationAssignmentButton');
    if (addAccommodationAssignmentButton) {
        addAccommodationAssignmentButton.addEventListener('click', () => {
            openAccommodationModal();
            addOptions.style.display = 'none';
        });
    }

    // Event listener for opening playing day modal from schedule (edit button)
    const editPlayingDaysButton = document.getElementById('editPlayingDaysButton');
    if (editPlayingDaysButton) { // Added null check
        editPlayingDaysButton.addEventListener('click', async () => {
            const scheduleContainer = document.getElementById('scheduleContainer');
            scheduleContainer.innerHTML = '<h2>Hracie dni</h2><p>Načítavam hracie dni...</p>';
            try {
                const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
                let html = `<table class="data-table"><thead><tr><th>Dátum</th><th></th></tr></thead><tbody>`;
                if (playingDaysSnapshot.empty) {
                    html += `<tr><td colspan="2">Žiadne hracie dni.</td></tr>`;
                } else {
                    playingDaysSnapshot.forEach(doc => {
                        const day = doc.data();
                        const dateObj = new Date(day.date);
                        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                        html += `<tr><td>${formattedDate}</td><td><button class="action-button edit-item-button" data-id="${doc.id}" data-type="playingDay">&#9998;</button></td></tr>`;
                    });
                }
                html += `</tbody></table>`;
                scheduleContainer.innerHTML = html;

                document.querySelectorAll('.edit-item-button[data-type="playingDay"]').forEach(button => {
                    button.addEventListener('click', (event) => openPlayingDayModal(event.target.dataset.id));
                });

            } catch (error) {
                console.error("Chyba pri načítavaní hracích dní na úpravu:", error);
                scheduleContainer.innerHTML = '<p>Chyba pri načítavaní hracích dní.</p>';
            }
        });
    }

    // Event listener for opening places modal from schedule (edit button)
    const editPlacesButton = document.getElementById('editPlacesButton');
    if (editPlacesButton) { // Added null check
        editPlacesButton.addEventListener('click', async () => {
            const scheduleContainer = document.getElementById('scheduleContainer');
            scheduleContainer.innerHTML = '<h2>Miesta</h2><p>Načítavam miesta...</p>';
            try {
                const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
                let html = `<table class="data-table"><thead><tr><th>Názov</th><th>Ubytovňa</th><th></th></tr></thead><tbody>`;
                if (placesSnapshot.empty) {
                    html += `<tr><td colspan="3">Žiadne miesta.</td></tr>`;
                } else {
                    placesSnapshot.forEach(doc => {
                        const place = doc.data();
                        const isAccommodationText = place.isAccommodation ? 'Áno' : 'Nie';
                        html += `<tr><td>${place.name}</td><td>${isAccommodationText}</td><td><button class="action-button edit-item-button" data-id="${doc.id}" data-type="place">&#9998;</button></td></tr>`;
                    });
                }
                html += `</tbody></table>`;
                scheduleContainer.innerHTML = html;

                document.querySelectorAll('.edit-item-button[data-type="place"]').forEach(button => {
                    button.addEventListener('click', (event) => openPlaceModal(event.target.dataset.id));
                });

            } catch (error) {
                console.error("Chyba pri načítavaní miest na úpravu:", error);
                scheduleContainer.innerHTML = '<p>Chyba pri načítavaní miest.</p>';
            }
        });
    }

    // Event listener for showing all matches
    const showAllMatchesButton = document.getElementById('showAllMatchesButton');
    if (showAllMatchesButton) { // Added null check
        showAllMatchesButton.addEventListener('click', displayMatchesAsSchedule);
    }

    // Event listener for showing accommodation assignments
    const showAccommodationButton = document.getElementById('showAccommodationButton');
    if (showAccommodationButton) { // Added null check
        showAccommodationButton.addEventListener('click', displayAccommodationAssignments);
    }
});
