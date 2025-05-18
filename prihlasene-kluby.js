import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const clubListSection = document.getElementById('clubListSection');
const clubsHeaderTable = document.getElementById('clubsHeaderTable'); // Referencia na hornú tabuľku (s thead a novým tbody)
const clubsBodyTable = document.getElementById('clubsBodyTable'); // Referencia na rolujúcu tabuľku

const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader'); // Referencia na thead (v HTML je to foot)
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody'); // Referencia na tbody rolujúcej tabuľky
const longestNameRowFixedBody = document.getElementById('longestNameRowFixedBody'); // NOVÁ REFERENCIA na tbody pre fixný riadok
const clubsBodyTableFooter = document.getElementById('clubsBodyTableFooter'); // NOVÁ REFERENCIA na pätičku rolujúcej tabuľky

const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span');
// const teamsInCategoryListUl = document.getElementById('teamsInCategoryList'); // Túto referenciu zatiaľ ponecháme, ale už ju nebudeme používať na pridávanie elementov
const teamsInCategoryButtonsDiv = document.getElementById('teamsInCategoryButtons'); // Nová referencia
const selectedTeamDetailsDiv = document.getElementById('selectedTeamDetails');
const selectedTeamNameSpan = document.getElementById('selectedTeamName');
const selectedTeamRealizacnyTimDiv = document.getElementById('selectedTeamRealizacnyTim');
const selectedTeamTrenerInfoSpan = document.getElementById('selectedTeamTrenerInfo');
const selectedTeamVeduciDruzstvaInfoSpan = document.getElementById('selectedTeamVeduciDruzstvaInfo');
const selectedTeamSoupiskaHracovUl = document.getElementById('selectedTeamSoupiskaHracov');

let allClubs = [];
let allCategories = [];
let allGroups = [];

async function loadAllData() {
    try {
        const clubsSnapshot = await getDocs(clubsCollectionRef);
        allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        alert('Nepodarilo sa načítať dáta turnaja.');
        console.error("Chyba pri načítaní dát turnaja:", error);
         // Handle error display in the body table
        if (clubsSummaryTableBody) {
             // Calculate colspan based on potential number of columns even with error
             const numPotentialColumns = 1 + 1 + (allCategories ? allCategories.length : 0);
             clubsSummaryTableBody.innerHTML = `<tr><td colspan="${numPotentialColumns}" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
        }
         // Clear data arrays on error to ensure empty state is reflected
         allClubs = [];
         allCategories = []; // Important to clear categories too on error
         allGroups = [];

         // In case of error, navigate back to main list and URL
         history.replaceState({}, '', window.location.pathname);
         // displayClubsSummaryTable(); // Let handleUrlState call this

    }
}

function getClubBaseName(club) {
    let initialBaseName;
    if (club.name && typeof club.name === 'string' && club.name.trim() !== '') {
        initialBaseName = club.name.trim();
    } else if (club.id && typeof club.id === 'string' && club.id.includes(' - ')) {
        initialBaseName = club.id.split(' - ')[0].trim();
    } else {
        initialBaseName = club.name || club.id || 'Neznámy subjekt';
    }

    // Remove trailing suffixes that look like codes (e.g., " - 01", " A", " U15")
    // Adjusted regex to be less aggressive, maybe keep 'SK' etc.
     const trailingSuffixRegex = /\s+([A-Z]{1,3}|\d+)$/; // Keep 1-3 uppercase letters or numbers at the end
    const match = initialBaseName.match(trailingSuffixRegex);
    if (match) {
        initialBaseName = initialBaseName.substring(0, match.index).trim();
    }


    return initialBaseName;
}

// Function to create or update <colgroup> and <col> elements
function updateColgroups() {
    const numColumns = 1 + 1 + allCategories.length; // Názov klubu + Tímy + Kategórie

    // Helper to update colgroup for a given table
    const updateTableColgroup = (table) => {
        if (table) {
            let colgroup = table.querySelector('colgroup');
            if (!colgroup) {
                colgroup = document.createElement('colgroup');
                 // Add colgroup before first child (thead or tbody)
                if(table.firstElementChild) {
                    table.insertBefore(colgroup, table.firstElementChild);
                } else {
                     table.appendChild(colgroup); // Should not happen in this structure
                }
            }
            // Clear existing cols
            colgroup.innerHTML = '';
            // Add new cols - widths will be set later
            for (let i = 0; i < numColumns; i++) {
                colgroup.appendChild(document.createElement('col'));
            }
        }
    };

    updateTableColgroup(clubsHeaderTable);
    updateTableColgroup(clubsBodyTable);
}

function updateHeaderAndFooter() { // Premenovaná funkcia
     // Ensure colgroups are updated first
     updateColgroups();

    // Aktualizácia hlavičky (clubsSummaryTableHeader - which is actually tfoot in HTML)
    // Clear existing headers except the first one ('Názov klubu') in the tfoot element
    if (clubsSummaryTableHeader) {
        // Select all th elements in the tfoot except the first one
        clubsSummaryTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());

        // Add the "Tímy" header right after "Názov klubu"
        const teamsTh = document.createElement('th');
        teamsTh.textContent = 'Tímy';
        teamsTh.style.textAlign = 'center';
         // Find the first th and insert after it
         const firstTh = clubsSummaryTableHeader.querySelector('th');
         if(firstTh) {
             firstTh.insertAdjacentElement('afterend', teamsTh);
         } else {
             // If for some reason the first th is missing, just append
             clubsSummaryTableHeader.appendChild(teamsTh);
         }


        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const th = document.createElement('th');
                th.textContent = category.name || category.id;
                th.dataset.categoryId = category.id;
                th.style.textAlign = 'center';
                clubsSummaryTableHeader.appendChild(th);
            });
        }
        removeTransparentRows(clubsSummaryTableHeader.parentElement);
    }

    // Aktualizácia pätičky (clubsBodyTableFooter) - Kód pre pätičku (tfoot for the body table)
    if (clubsBodyTableFooter) {
        // Clear existing footer content
        clubsBodyTableFooter.innerHTML = '';

        const footerRow = document.createElement('tr');

        // Prvý stĺpec v pätičke (napr. prázdny alebo "Spolu")
        const firstFooterCell = document.createElement('th'); // Použijeme th pre konzistentnosť s hlavičkou
        firstFooterCell.textContent = ''; // Prázdny text pre vizuálnu podobnosť s prvou bunkou v hlavičke
        footerRow.appendChild(firstFooterCell);

        // Pridať stĺpec "Tímy" do pätičky
        const teamsFooterTh = document.createElement('th');
        teamsFooterTh.textContent = 'Tímy'; // Text "Tímy" ako v hlavičke
        teamsFooterTh.style.textAlign = 'center';
        footerRow.appendChild(teamsFooterTh);


        // Pridať stĺpce pre kategórie do pätičky
        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const footerTh = document.createElement('th');
                footerTh.textContent = category.name || category.id; // Názov kategórie ako v hlavičke
                footerTh.style.textAlign = 'center';
                footerRow.appendChild(footerTh);
            });
        }
        clubsBodyTableFooter.appendChild(footerRow); // Pridáme riadok do pätičky
        removeTransparentRows(clubsBodyTableFooter);
    }

    // Adjust colspan for initial loading message if still present
    if (clubsSummaryTableBody) {
        const firstRow = clubsSummaryTableBody.querySelector('tr');
         // Check if the row exists and has only one cell with a colspan attribute
        if (firstRow && firstRow.cells.length === 1 && firstRow.cells[0].hasAttribute('colspan')) {
            const cell = firstRow.cells[0];
            const numColumns = 1 + 1 + allCategories.length;
            cell.colSpan = numColumns;
        }
    }
}


function displayClubsSummaryTable() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = ''; // Clear detail title
    if (teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = ''; // Clear team buttons
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none'; // Hide team details
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';

    if (!clubsSummaryTableBody || !clubsSummaryTableHeader || !longestNameRowFixedBody || !clubsBodyTableFooter || !clubsHeaderTable || !clubsBodyTable) {
        console.error("Chyba: Chýba jeden alebo viac elementov tabuľky.");
        return;
    }

    // Clear existing rows from both body and fixed header
    clubsSummaryTableBody.innerHTML = '';
    longestNameRowFixedBody.innerHTML = '';

    // Update headers, footers, and create colgroup elements (widths set later)
    updateHeaderAndFooter();

    if (allClubs.length === 0) {
        const numColumns = 1 + 1 + allCategories.length;
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        cell.colSpan = numColumns;
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad.";
        cell.style.textAlign = 'center';

        // Clear fixed header and footer if no data
        longestNameRowFixedBody.innerHTML = '';
         if(clubsBodyTableFooter){
             clubsBodyTableFooter.innerHTML = '';
             // Optionally add an empty footer row with colspan matching columns
             const footerRow = clubsBodyTableFooter.insertRow();
             const footerCell = footerRow.insertCell();
             footerCell.colSpan = numColumns;
             footerCell.textContent = '';
         }
         // No clubs, no need to measure/cleanup rows. Widths might still be applied if categories existed.

        return;
    }

    const clubsByBaseName = allClubs.reduce((acc, club) => {
        const baseName = getClubBaseName(club);
        if (!acc[baseName]) {
            acc[baseName] = [];
        }
        acc[baseName].push(club);
        return acc;
    }, {});

    const sortedBaseNames = Object.keys(clubsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));

    // --- Generate fixed row with longest name ---
    let longestBaseName = '';
    let clubsForLongestBaseName = [];

    if (sortedBaseNames.length > 0) {
        const baseNamesWithClubs = sortedBaseNames.filter(name => clubsByBaseName[name] && clubsByBaseName[name].length > 0);
         // Find the base name that is visually longest when rendered.
         // A simple proxy is string length, but for accuracy, we'd need measurement
         // or a more sophisticated text width estimation. Let's use string length as a candidate selector.
        if (baseNamesWithClubs.length > 0) {
             longestBaseName = baseNamesWithClubs.reduce((a, b) => a.length > b.length ? a : b);
             clubsForLongestBaseName = allClubs.filter(club => getClubBaseName(club) === longestBaseName);
        }
    }

    if (longestBaseName) {
        const longestNameRow = longestNameRowFixedBody.insertRow();
        longestNameRow.dataset.baseName = longestBaseName;
        longestNameRow.dataset.isFixedHeader = 'true'; // Mark as fixed header row

        const cellBaseName = longestNameRow.insertCell();
        cellBaseName.textContent = longestBaseName; // Set actual text content

        let totalTeamsCount = 0;
        allCategories.forEach(category => {
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
            totalTeamsCount += teamsInCategoryCount;
        });

        const cellTotalTeams = longestNameRow.insertCell();
        // Set the actual number, we will use data attributes to identify zero later
        cellTotalTeams.textContent = totalTeamsCount > 0 ? totalTeamsCount.toString() : '';
        cellTotalTeams.style.textAlign = 'center';
        cellTotalTeams.dataset.isCountCell = 'true'; // Mark as count cell

        allCategories.forEach(category => {
            const countCell = longestNameRow.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
             // Set the actual number
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount.toString() : '';
            countCell.style.textAlign = 'center';
            countCell.dataset.isCountCell = 'true'; // Mark as count cell
            countCell.dataset.categoryId = categoryId; // Add category ID
        });
        longestNameRow.dataset.totalTeams = totalTeamsCount; // Add total teams count to data attribute
         longestNameRow.dataset.hasTeams = totalTeamsCount > 0; // Indicate if this row has teams
    }


    // --- Generate rows for scrollable body ---
    sortedBaseNames.forEach(baseName => {
        const row = clubsSummaryTableBody.insertRow();
        row.dataset.baseName = baseName;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
             const url = new URL(window.location.href);
             url.searchParams.set('club', baseName);
             url.searchParams.delete('team');
             history.pushState({ baseName: baseName }, '', url.toString());

             displaySubjectDetails(baseName);
        });

        const baseNameCell = row.insertCell();
        baseNameCell.textContent = baseName;

        let totalTeamsCount = 0;
         allCategories.forEach(category => {
             const categoryId = category.id;
             const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
             totalTeamsCount += teamsInCategoryCount;
         });

        const totalTeamsCell = row.insertCell();
        // Set the actual number
        totalTeamsCell.textContent = totalTeamsCount.toString();
        totalTeamsCell.style.textAlign = 'center';
        totalTeamsCell.dataset.isCountCell = 'true'; // Mark as count cell

        allCategories.forEach(category => {
            const countCell = row.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
            // Set the actual number
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount.toString() : '';
            countCell.style.textAlign = 'center';
            countCell.dataset.isCountCell = 'true'; // Mark as count cell
            countCell.dataset.categoryId = categoryId; // Add category ID
        });
        row.dataset.totalTeams = totalTeamsCount; // Add total teams count to data attribute
         row.dataset.hasTeams = totalTeamsCount > 0; // Indicate if this row has teams

    });

    // After populating, schedule the cleanup and width adjustment
    // Use requestAnimationFrame to ensure elements are rendered and can be measured
    requestAnimationFrame(() => {
         adjustTableWidthsAndCleanUp();
    });

}

function adjustTableWidthsAndCleanUp() {
    if (!clubsHeaderTable || !clubsBodyTable || !clubsSummaryTableBody || !longestNameRowFixedBody) {
        console.error("Chyba: Chýba jeden alebo viac elementov tabuľky pre úpravu šírok a čistenie.");
        // Proceed to cleanup only if body is available, even if width adjustment fails
         if(clubsSummaryTableBody) {
              cleanUpZeroRows();
         }
        return;
    }

    const headerCols = clubsHeaderTable.querySelectorAll('colgroup col');
    const bodyCols = clubsBodyTable.querySelectorAll('colgroup col');
    const numColumns = headerCols.length;

    if (numColumns === 0) {
        console.warn("Neboli nájdené žiadne stĺpce (<col>). Úprava šírky preskočená.");
         // Still proceed with row cleanup if measurement skipped
         cleanUpZeroRows();
        return;
    }

    const columnWidths = Array(numColumns).fill(0);

    // Measure widths from fixed header row (if it exists)
    const fixedRow = longestNameRowFixedBody.querySelector('tr');
    if (fixedRow && fixedRow.cells.length === numColumns) {
        Array.from(fixedRow.cells).forEach((cell, index) => {
            // Use getBoundingClientRect().width for more accurate rendered width including padding/border
            columnWidths[index] = Math.max(columnWidths[index], cell.getBoundingClientRect().width);
        });
    }

    // Measure widths from body rows
    // Consider measuring a reasonable subset of rows for performance
    const rowsToMeasure = Array.from(clubsSummaryTableBody.querySelectorAll('tr'));
    // Example: Measure only the first 50 rows plus the fixed header row
    // const rowsToMeasure = Array.from(clubsSummaryTableBody.querySelectorAll('tr')).slice(0, 50);

    rowsToMeasure.forEach(row => {
         if (row.cells.length === numColumns) {
              Array.from(row.cells).forEach((cell, index) => {
                   columnWidths[index] = Math.max(columnWidths[index], cell.getBoundingClientRect().width);
              });
         }
    });

    // Apply calculated widths to <col> elements
    columnWidths.forEach((width, index) => {
        // No need for extra buffer if using getBoundingClientRect().width
        const finalWidth = width; // Use the measured width directly

        if (headerCols[index]) {
            headerCols[index].style.width = `${finalWidth}px`;
        }
        if (bodyCols[index]) {
            bodyCols[index].style.width = `${finalWidth}px`;
        }
    });
    
    removeTransparentRows(clubsSummaryTableBody);         // <tbody> v scrollovacej tabuľke
    removeTransparentRows(longestNameRowFixedBody);       // <tbody> pevnej hlavičky
    removeTransparentRows(clubsSummaryTableHeader);       // <tfoot> = hlavička v druhej tabuľke

    // Now clean up rows with total teams count of 0
    cleanUpZeroRows();
}

function cleanUpZeroRows() {
     if (!clubsSummaryTableBody || !longestNameRowFixedBody) {
          console.error("Chyba: Chýba tbody element pre čistenie riadkov.");
          return;
     }

     const rowsToRemove = [];
     clubsSummaryTableBody.querySelectorAll('tr').forEach(row => {
         // Check the data attribute indicating total teams count is 0
         if (row.dataset.totalTeams === '0') {
             rowsToRemove.push(row);
         }
     });

     rowsToRemove.forEach(row => {
          row.remove();
     });

     // Check if the scrollable body is now empty and display message
     if (clubsSummaryTableBody.children.length === 0) {
         const numColumns = 1 + 1 + allCategories.length; // Use current categories count
         const noClubsRow = clubsSummaryTableBody.insertRow();
         const cell = noClubsRow.insertCell();
         cell.colSpan = numColumns;
         cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad s prihlásenými tímami.";
         cell.style.textAlign = 'center';
         // No need to remove fixed header here, as the message indicates no *teams* were found,
         // but the fixed header represents the club name structure from the data loaded.
         // Only remove fixed header if allClubs.length was 0 initially.
     }

     // If the fixed header row exists and represents a base name that ended up having 0 total teams
     // after considering all its parts (though the data structure suggests a base name is tied to actual clubs/teams),
     // and if the body is now empty and showing the "no teams" message, it might be visually inconsistent
     // to keep the fixed header row. Let's add logic to hide or remove the fixed header
     // if the main body is empty and shows the "no teams" message.
      const fixedRow = longestNameRowFixedBody.querySelector('tr');
      if (fixedRow && clubsSummaryTableBody.children.length === 1 && clubsSummaryTableBody.querySelector('td[colspan]')) {
           // The body is empty and shows the "no teams" message.
           // Hide the fixed header row as there are no teams to align it with.
           fixedRow.style.display = 'none'; // Use display: none to hide while keeping in DOM for potential re-show
      } else if (fixedRow) {
           // If the body is NOT empty (meaning there are rows with teams), ensure the fixed header is visible
           fixedRow.style.display = ''; // Reset display style
      }
}


function highlightTeamButton(teamIdToHighlight) {
     if (teamsInCategoryButtonsDiv) {
          // Reset all buttons first
          teamsInCategoryButtonsDiv.querySelectorAll('button').forEach(btn => {
              btn.style.fontWeight = 'normal';
              btn.style.backgroundColor = ''; // Reset to default
              btn.style.color = ''; // Reset to default
              btn.classList.remove('active-team-button'); // Remove class
          });
          const targetButton = teamsInCategoryButtonsDiv.querySelector(`button[data-team-id="${teamIdToHighlight}"]`);
          if (targetButton) {
              targetButton.style.fontWeight = 'bold'; // Keep style for immediate visual feedback
              targetButton.classList.add('active-team-button'); // Add class for potential CSS styling
               // CSS might define background/color for .active-team-button
          }
     }
}
async function displaySubjectDetails(baseName, initialTeamId = null) {
     if (clubListSection) clubListSection.style.display = 'none';
     if (clubDetailSection) clubDetailSection.style.display = 'block';
     if(clubDetailTitleSpan) clubDetailTitleSpan.textContent = baseName;
     // if(teamsInCategoryListUl) teamsInCategoryListUl.innerHTML = ''; // No longer used
     if(teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = 'Načítavam tímy...';
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';

     const teamsForSubject = allClubs.filter(club => getClubBaseName(club) === baseName);

     if (!teamsInCategoryButtonsDiv) {
         console.error("HTML element s ID 'teamsInCategoryButtons' nebol nájdený.");
         return;
     }
     teamsInCategoryButtonsDiv.innerHTML = '';

     if (teamsForSubject.length === 0) {
         const noTeamsMessage = document.createElement('p');
         noTeamsMessage.textContent = `Žiadne tímy pre subjekt "${baseName}".`;
         teamsInCategoryButtonsDiv.appendChild(noTeamsMessage);
          // Ensure details section is hidden if no team is selected
         if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';

     } else {
          teamsForSubject.sort((a, b) => {
               const categoryA = allCategories.find(cat => cat.id === a.categoryId);
               const categoryNameA = (categoryA && categoryA.name) ? categoryA.name : (a.categoryId || 'Neznáma kategória');
               const groupA = allGroups.find(g => g.id === a.groupId);
               const groupNameA = groupA ? (groupA.name || groupA.id) : 'Nepriradené';
               const teamTextA = `${categoryNameA}${groupNameA !== 'Nepriradené' ? ' - ' + groupNameA : ''}`; // Improved formatting
               const categoryB = allCategories.find(cat => cat.id === b.categoryId);
               const categoryNameB = (categoryB && categoryB.name) ? categoryNameB : (b.categoryId || 'Neznáma kategória');
               const groupB = allGroups.find(g => g.id === b.groupId);
               const groupNameB = groupB ? (groupB.name || groupB.id) : 'Nepriradené';
                const teamTextB = `${categoryNameB}${groupNameB !== 'Nepriradené' ? ' - ' + groupNameB : ''}`; // Improved formatting
               return teamTextA.localeCompare(teamTextB, 'sk-SK');
           });

          teamsForSubject.forEach(team => {
               const teamButton = document.createElement('button');
               teamButton.classList.add('action-button');

               const group = allGroups.find(g => g.id === team.groupId);
               const groupName = group ? (group.name || group.id) : 'Nepriradené';
               let categoryName = 'Neznáma kategória';
               const category = allCategories.find(cat => cat.id === team.categoryId);

               if (category && category.name) {
                    categoryName = category.name;
               } else {
                   const teamIdString = team.id || '';
                   const separator = ' - ';
                   let separatorIndex = teamIdString.indexOf(separator);
                   if (separatorIndex === -1) {
                       separatorIndex = teamIdString.indexOf('-');
                   }
                   if (separatorIndex !== -1) {
                       categoryName = teamIdString.substring(0, separatorIndex).trim();
                   }
               }

               const buttonText = groupName !== 'Nepriradené' ? `${categoryName} - ${groupName}` : categoryName;
               teamButton.textContent = buttonText;
               teamButton.dataset.teamId = team.id;

               teamButton.addEventListener('click', () => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('club', baseName); // Keep baseName in URL
                    url.searchParams.set('team', team.id); // Add team ID to URL
                    history.pushState({ baseName: baseName, teamId: team.id }, '', url.toString()); // Update history state

                    displaySpecificTeamDetails(team.id); // Display details for the clicked team
                });

               teamsInCategoryButtonsDiv.appendChild(teamButton);
           });

           // --- KÓD pre automatický výber a zvýraznenie tímu ---
           // Prioritize initialTeamId from URL/history, then fallback to the first team in the list
           const teamToDisplay = (initialTeamId && teamsForSubject.find(t => t.id === initialTeamId))
                                 ? teamsForSubject.find(t => t.id === initialTeamId)
                                 : (teamsForSubject.length > 0 ? teamsForSubject[0] : null); // Fallback to first team or null

           if (teamToDisplay) {
                displaySpecificTeamDetails(teamToDisplay.id); // Display details for the selected team
           } else {
               // This case should ideally not be reached if teamsForSubject.length > 0,
               // but as a safeguard, ensure details are hidden if no team is determined for display.
                if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
           }
          // --- KONIEC ÚPRAVY ---
     }

     // Dodatočné vyprázdnenie pôvodného UL pre prípad, že ešte existuje
     // if (teamsInCategoryListUl) { teamsInCategoryListUl.innerHTML = ''; } // No longer used
}


async function displaySpecificTeamDetails(teamId) {
    if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'block';
    if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Načítavam...';
    if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p>Tréner: Načítavam...</p><p>Vedúci družstva: Načítavam...</p>';
    if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Načítavam súpisku...</li>';

    try {
        const teamDocRef = doc(clubsCollectionRef, teamId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) {
            console.warn(`Tím s ID "${teamId}" sa nenašiel v databáze.`);
            if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba: Tím nenájdený';
            if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Detail tímu sa nepodarilo načítať.</p>';
            if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
            highlightTeamButton(null); // Clear highlighting if team not found
             if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none'; // Hide details section
            return;
        }

        const teamData = teamDoc.data();
        // Construct a more descriptive title for the team details section
         const baseName = getClubBaseName(teamData); // Get base name for context
         const category = allCategories.find(cat => cat.id === teamData.categoryId);
         const categoryName = (category && category.name) ? category.name : (teamData.categoryId || 'Neznáma kategória');
         const group = allGroups.find(g => g.id === teamData.groupId);
         const groupName = group ? (group.name || group.id) : 'Nepriradené';

         // Use actual team name if available, otherwise construct from baseName/category/group
         const teamDisplayName = teamData.name && teamData.name.trim() !== ''
                                 ? teamData.name.trim()
                                 : `${baseName} - ${categoryName}${groupName !== 'Nepriradené' ? ' - ' + groupName : ''}`;


        if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = teamDisplayName; // Set team name/identifier

        // Load Realizačný tím
        if (selectedTeamRealizacnyTimDiv) {
            selectedTeamRealizacnyTimDiv.innerHTML = ''; // Clear previous content

            const trenerPara = document.createElement('p');
            trenerPara.textContent = 'Tréner: ';
            const trenerSpan = document.createElement('span');
            trenerSpan.textContent = 'Načítavam...';
            trenerPara.appendChild(trenerSpan);
            selectedTeamRealizacnyTimDiv.appendChild(trenerPara);

            const veduciPara = document.createElement('p');
            veduciPara.textContent = 'Vedúci družstva: ';
            const veduciSpan = document.createElement('span');
            veduciSpan.textContent = 'Načítavam...';
            veduciPara.appendChild(veduciSpan);
            selectedTeamRealizacnyTimDiv.appendChild(veduciPara);


            const realizacnyTimCollectionRef = collection(teamDoc.ref, 'realizacnyTim');
            try {
                 const realizacnyTimSnapshot = await getDocs(realizacnyTimCollectionRef);
                 let trenerName = 'Nezadané';
                 let veduciName = 'Nezadané';

                 realizacnyTimSnapshot.docs.forEach(staffDoc => {
                      const staffData = staffDoc.data();
                      if (staffDoc.id === 'trener' && staffData && staffData.meno) {
                           trenerName = staffData.meno;
                      } else if (staffDoc.id === 'veduci' && staffData && staffData.meno) {
                           veduciName = staffData.meno;
                      }
                 });

                 if(trenerSpan) trenerSpan.textContent = trenerName;
                 if(veduciSpan) veduciSpan.textContent = veduciName;

             } catch (realizacnyTimError) {
                 console.error("Error loading realizacnyTim:", realizacnyTimError);
                 if(trenerSpan) trenerSpan.textContent = 'Chyba pri načítaní';
                 if(veduciSpan) veduciSpan.textContent = 'Chyba pri načítaní';
             }
        }

        // Load Súpiska hráčov
        if (selectedTeamSoupiskaHracovUl) {
             selectedTeamSoupiskaHracovUl.innerHTML = ''; // Clear previous content

             const hraciCollectionRef = collection(teamDoc.ref, 'hraci');
             try {
                  const hraciSnapshot = await getDocs(hraciCollectionRef);

                  if (hraciSnapshot.empty) {
                       const noPlayersItem = document.createElement('li');
                       noPlayersItem.textContent = 'Zatiaľ bez súpisky.';
                       selectedTeamSoupiskaHracovUl.appendChild(noPlayersItem);
                  } else {
                       const hraciList = hraciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                       hraciList.sort((a, b) => {
                            const orderA = typeof a.cisloDresu === 'number' ? a.cisloDresu : Infinity;
                            const orderB = typeof b.cisloDresu === 'number' ? b.cisloDresu : Infinity;

                            if (orderA !== orderB) {
                                return orderA - orderB;
                            }

                            const nameA = (a.meno || a.id || '').toLowerCase();
                            const nameB = (b.meno || b.id || '').toLowerCase();
                            return nameA.localeCompare(nameB, 'sk-SK');
                       });


                       hraciList.forEach(hrac => {
                            const hracItem = document.createElement('li');
                            let hracText = '';
                            if (typeof hrac.cisloDresu === 'number' && hrac.cisloDresu > 0) {
                                 hracText += `${hrac.cisloDresu}. `;
                            }
                            hracText += hrac.meno || hrac.id || 'Neznámy hráč';
                            hracItem.textContent = hracText;
                            selectedTeamSoupiskaHracovUl.appendChild(hracItem);
                       });
                  }
             } catch (hraciError) {
                  console.error("Error loading hraci:", hraciError);
                  if (selectedTeamSoupiskaHracovUl) {
                       selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
                  }
             }
        }

    } catch (error) {
         console.error("Error displaying team details:", error);
         if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba pri načítaní detailov tímu';
         if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Nepodarilo sa načítať detaily realizačného tímu.</p>';
         if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Nepodarilo sa načítať súpisku.</li>';
          highlightTeamButton(null); // Clear highlighting on error
           if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none'; // Hide details section
    } finally {
        // Highlight the button corresponding to the displayed team
        highlightTeamButton(teamId);
    }
}

function goBackToList() {
    // Display the summary table, which will trigger the cleanup of zero rows
    displayClubsSummaryTable();
    // Update URL to the base path
    history.replaceState({}, '', window.location.pathname);
    // No need to manually clear details here, displayClubsSummaryTable handles hiding the detail section
}





function removeTransparentRows(container) {
    if (!container) return;

    const rows = Array.from(container.querySelectorAll('tr'));
    for (const row of rows) {
        const hasTransparentCell = Array.from(row.cells).some(cell => {
            const style = window.getComputedStyle(cell);
            return style.color === 'rgba(0, 0, 0, 0)' || style.color === 'transparent';
        });

        if (hasTransparentCell) {
            row.remove();
        }
    }
}





// Function to handle URL state on load and popstate
async function handleUrlState() {
    // Ensure data is loaded before processing URL parameters
    await loadAllData();

    const urlParams = new URLSearchParams(window.location.search);
    const clubBaseName = urlParams.get('club');
    const teamId = urlParams.get('team');

    if (teamId) {
        // If teamId is in URL, try to find the team and display its details
        const team = allClubs.find(c => c.id === teamId);
        if (team) {
            const baseName = getClubBaseName(team);
             // Check if the base name derived from the team actually exists in our grouped clubs
             // This handles cases where a team ID might be valid but the base name group has no other teams
             const clubExistsInSummary = allClubs.some(c => getClubBaseName(c) === baseName);
             if (clubExistsInSummary) {
                  // Display subject details (shows team buttons) and then specific team details (populates info)
                  displaySubjectDetails(baseName, teamId); // Pass teamId to select the button
             } else {
                  // Team exists, but its base name group doesn't have any entries that would be in the summary table.
                  console.warn(`Tím s ID "${teamId}" nájdený, ale jeho subjekt "${baseName}" nemá žiadne ďalšie tímy v prehľade.`);
                   history.replaceState(null, '', window.location.pathname); // Clean up URL
                  displayClubsSummaryTable(); // Show the summary table
             }

        } else {
            // Team with the given ID was not found in the loaded data
            console.warn(`Tím s ID "${teamId}" sa nenašiel.`);
            history.replaceState(null, '', window.location.pathname); // Clean up invalid URL parameter
            displayClubsSummaryTable(); // Show the summary table
        }
    } else if (clubBaseName) {
        // If only clubBaseName is in URL, find if this base name exists and has teams.
         const teamsForSubject = allClubs.filter(club => getClubBaseName(club) === clubBaseName);

         if (teamsForSubject.length > 0) {
              // If teams exist for this base name, display the details for the first one
              const firstTeamId = teamsForSubject[0].id;
               // Redirect to include the first team's ID in the URL for consistent state
              const url = new URL(window.location.href);
              url.searchParams.set('club', clubBaseName);
              url.searchParams.set('team', firstTeamId);
              history.replaceState({ baseName: clubBaseName, teamId: firstTeamId }, '', url.toString());

              // Now call displaySubjectDetails which will automatically select the team via the updated URL state
              displaySubjectDetails(clubBaseName, firstTeamId);

         } else {
              // Base name exists but has no teams, or base name was invalid.
              console.warn(`Subjekt "${clubBaseName}" sa nenašiel alebo nemá žiadne prihlásené tímy.`);
               history.replaceState(null, '', window.location.pathname); // Clean up URL
              displayClubsSummaryTable(); // Show the summary table (which will not include this base name if it has 0 teams after cleanup)
         }
    } else {
        // No relevant parameters in URL, display the main summary table
        displayClubsSummaryTable();
    }
}


// Event listener for DOMContentLoaded to initiate
document.addEventListener('DOMContentLoaded', () => {
    // Initial handling of URL state and data loading
    handleUrlState();

    // Ensure backToListButton has the correct listener
    const currentBackToListButton = document.getElementById('backToListButton');
    if (currentBackToListButton) {
        // Remove any existing listeners to prevent duplicates before adding the correct one
        currentBackToListButton.removeEventListener('click', goBackToList);
        currentBackToListButton.addEventListener('click', goBackToList);
    } else {
       console.warn("Element s ID 'backToListButton' nebol nájdený pri načítaní DOM.");
    }
});


// Event listener for popstate to handle browser back/forward buttons
window.addEventListener('popstate', () => {
    // Re-process URL state when history changes (back/forward button clicks)
    handleUrlState();
});
