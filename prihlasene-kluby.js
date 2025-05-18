import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const clubListSection = document.getElementById('clubListSection');
const clubsSummaryTable = document.getElementById('clubsSummaryTable'); // Referencia na hornú tabuľku (s thead a novým tbody)
const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader'); // Referencia na thead
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody'); // Referencia na tbody rolujúcej tabuľky
const longestNameRowFixedBody = document.getElementById('longestNameRowFixedBody'); // NOVÁ REFERENCIA na tbody pre fixný riadok
const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span');
const teamsInCategoryListUl = document.getElementById('teamsInCategoryList'); // Túto referenciu zatiaľ ponecháme, ale už ju nebudeme používať na pridávanie elementov
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
        if (clubsSummaryTableBody) {
             const numColumns = 1 + 1 + allCategories.length; // colspan pre telo neobsahuje dodatočný stĺpec
             clubsSummaryTableBody.innerHTML = `<tr><td colspan="${numColumns}" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
        }
         allClubs = [];
         allCategories = [];
         allGroups = [];
         // V prípade chyby naviguj späť na hlavný zoznam a URL
         history.replaceState({}, '', window.location.pathname); // Vráť URL bez parametrov a nahraď stav
         displayClubsSummaryTable(); // Zobraz zoznam klubov (prázdny alebo s chybou)

    }
}

function getClubBaseName(club) {
    let initialBaseName;
    if (club.createdFromBase && typeof club.createdFromBase === 'string' && club.createdFromBase.trim() !== '') {
        initialBaseName = club.createdFromBase.trim();
    } else if (club.id && typeof club.id === 'string' && club.id.includes(' - ')) {
        initialBaseName = club.id.split(' - ')[0].trim();
    } else {
        initialBaseName = club.name || club.id || 'Neznámy subjekt';
    }

    // Remove trailing suffixes that look like codes (e.g., " - 01", " A", " U15")
    const trailingSuffixRegex = /\s+([A-Z0-9]+)$/;
    const match = initialBaseName.match(trailingSuffixRegex);
    if (match) {
        // Keep suffixes longer than 3 characters, assume shorter ones are codes/categories
        if (match[1].length <= 3) { // Adjusted to allow short suffixes like 'SK' if needed, but exclude typical categories like U15
             initialBaseName = initialBaseName.substring(0, match.index).trim();
        }
    }

    return initialBaseName;
}

function updateHeaderColspan(numCategoryColumns) {
    if (clubsSummaryTableHeader) {
        // Clear existing headers except the first one
        clubsSummaryTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());

        // Add the "Tímy" header right after "Názov klubu"
        const teamsTh = document.createElement('th');
        teamsTh.textContent = 'Tímy';
        teamsTh.style.textAlign = 'center';
        clubsSummaryTableHeader.querySelector('th').insertAdjacentElement('afterend', teamsTh);

        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const th = document.createElement('th');
                th.textContent = category.name || category.id;
                th.dataset.categoryId = category.id;
                th.style.textAlign = 'center';
                clubsSummaryTableHeader.appendChild(th);
            });
        }
    }
    if (clubsSummaryTableBody) {
        const firstRow = clubsSummaryTableBody.querySelector('tr');
        if (firstRow) {
            const firstCell = firstRow.querySelector('td');
            if (firstCell) {
                const numTotalColumns = 1 + 1 + allCategories.length;
                firstCell.colSpan = numTotalColumns; // Správny colspan pre telo
            }
        }
    }
}

function displayClubsSummaryTable() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = ''; // Vyčisti nadpis detailov
    if (teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = '';
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';

    if (!clubsSummaryTableBody || !clubsSummaryTableHeader || !longestNameRowFixedBody || !clubsSummaryTable) {
        console.error("Chyba: Nebol nájdený jeden alebo viac hlavných elementov tabuľky.");
        return;
    }
    clubsSummaryTableBody.innerHTML = ''; // Clear existing rows in the scrollable body
    longestNameRowFixedBody.innerHTML = ''; // Vyčistíme obsah fixnej tbody

    updateHeaderColspan(allCategories.length);

    if (allClubs.length === 0) {
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        const numTotalColumns = 1 + 1 + allCategories.length;
        cell.colSpan = numTotalColumns; // Správny colspan pre telo
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad.";
        cell.style.textAlign = 'center';
        longestNameRowFixedBody.innerHTML = ''; // Prázdny fixný riadok
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

    // Sort base names alphabetically
    const sortedBaseNames = Object.keys(clubsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));

    // --- Generovanie riadku s najdlhším názvom v fixnej tbody ---

    let longestBaseName = '';
    let clubsForLongestBaseName = [];

    if (sortedBaseNames.length > 0) {
        const baseNamesWithClubs = sortedBaseNames.filter(name => clubsByBaseName[name] && clubsByBaseName[name].length > 0);
        if (baseNamesWithClubs.length > 0) {
             longestBaseName = baseNamesWithClubs.reduce((a, b) => (a || '').length > (b || '').length ? a : b);
             clubsForLongestBaseName = allClubs.filter(club => getClubBaseName(club) === longestBaseName);
        }
    }
    if (longestBaseName) {
        const longestNameRow = longestNameRowFixedBody.insertRow(); // Vložíme riadok do fixnej tbody
        longestNameRow.dataset.baseName = longestBaseName; // Pridáme dataset atribút
        const cellBaseName = longestNameRow.insertCell();
        cellBaseName.textContent = longestBaseName;
        // Šírky sú definované v CSS

        let totalTeamsCount = 0;
        allCategories.forEach(category => {
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
            totalTeamsCount += teamsInCategoryCount;
        });
        const cellTotalTeams = longestNameRow.insertCell();
        cellTotalTeams.textContent = totalTeamsCount > 0 ? totalTeamsCount : '';
        cellTotalTeams.style.textAlign = 'center';
        // Šírky sú definované v CSS

        allCategories.forEach(category => {
            const countCell = longestNameRow.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
            countCell.style.textAlign = 'center';
            // Šírky sú definované v CSS
        });
    }

    // --- Generovanie riadkov v hlavnej rolujúcej tbody ---
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
        // Šírka je definovaná v CSS

        let totalTeamsCount = 0;
         allCategories.forEach(category => {
             const categoryId = category.id;
             const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
             totalTeamsCount += teamsInCategoryCount;
         });

        const totalTeamsCell = row.insertCell();
        totalTeamsCell.textContent = totalTeamsCount > 0 ? totalTeamsCount : '';
        totalTeamsCell.style.textAlign = 'center';
        if (totalTeamsCount > 0) {
             totalTeamsCell.style.fontWeight = 'bold';
        }
        // Šírka je definovaná v CSS

        allCategories.forEach(category => {
            const countCell = row.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
            countCell.style.textAlign = 'center';
             if (teamsInCategoryCount > 0) {
                 countCell.style.fontWeight = 'bold';
             }
            // Šírka je definovaná v CSS
        });
    });

    // --- NOVÁ ČASŤ: Generovanie riadku pätičky v rolujúcej tbody ---
    const footerRow = clubsSummaryTableBody.insertRow();
    footerRow.classList.add('summary-footer-row'); // Pridáme triedu pre štýlovanie

    // Prvá bunka pätičky (napr. "Celkom")
    const footerCellLabel = footerRow.insertCell();
    footerCellLabel.textContent = 'Celkom';
    // Šírka je definovaná v CSS

    // Druhá bunka pätičky (Celkový počet tímov)
    const footerCellTotalTeams = footerRow.insertCell();
    footerCellTotalTeams.textContent = allClubs.length > 0 ? allClubs.length : '';
    footerCellTotalTeams.style.textAlign = 'center';
    // Šírka je definovaná v CSS

    // Ostatné bunky pätičky (Celkový počet tímov v každej kategórii)
    allCategories.forEach(category => {
        const footerCellCategory = footerRow.insertCell();
        const categoryId = category.id;
        // Spočítaj tímy v danej kategórii cez VŠETKY KLUBY
        const totalCountInCategory = allClubs.filter(club => club.categoryId === categoryId).length;
        footerCellCategory.textContent = totalCountInCategory > 0 ? totalCountInCategory : '';
        footerCellCategory.style.textAlign = 'center';
        // Šírka je definovaná v CSS
    });

    // >>> ODSTRÁNENÁ NESPRÁVNA LOGIKA PREHODENIA THEAD A TBODY <<<
    // Zabezpečiť, že thead je stále na správnom mieste (priamo pod table)
    // a fixná tbody je hneď za thead.
    // Ak je HTML štruktúra takáto:
    // <table id="clubsSummaryTable">
    //   <thead id="clubsSummaryTableHeader_parent">...</thead>
    //   <tbody id="longestNameRowFixedBody">...</tbody>
    //   <tbody id="clubsSummaryTableBody">...</tbody>
    // </table>
    // tak kód na "prehodenie" nie je potrebný.
    // Ak je štruktúra iná a tento kód bol pre presun elementov, zváž inú implementáciu
    // fixnej hlavičky/scrollovacieho tela.
    /*
    if (clubsSummaryTable && clubsSummaryTableHeader && longestNameRowFixedBody) {
        // const parentTable = clubsSummaryTable; // toto je ok
        // const thead = clubsSummaryTableHeader.parentNode; // toto by malo byť thead element
        // const fixedTbody = longestNameRowFixedBody;
        // Ak thead a fixedTbody sú už správne v HTML, tento appendChild len presunie thead na koniec tabuľky, čo nie je žiaduce pre fixnú hlavičku.
        // parentTable.appendChild(thead);
        // console.warn("Zváž odstránenie kódu na prehodenie THEAD a fixnej TBODY, ak používaš CSS pre fixnú hlavičku a rolovanie tela.");
    }
    */
}


function highlightTeamButton(teamIdToHighlight) {
     if (teamsInCategoryButtonsDiv) {
          // Reset all buttons first
          teamsInCategoryButtonsDiv.querySelectorAll('button').forEach(btn => {
              btn.style.fontWeight = 'normal';
              btn.style.backgroundColor = '';
              btn.style.color = '';
          });
          const targetButton = teamsInCategoryButtonsDiv.querySelector(`button[data-team-id="${teamIdToHighlight}"]`);
          if (targetButton) {
              targetButton.style.fontWeight = 'bold';
              targetButton.style.backgroundColor = '#c46f50';
              targetButton.style.color = 'white';
          }
     }
}

async function displaySubjectDetails(baseName, initialTeamId = null) {
     if (clubListSection) clubListSection.style.display = 'none';
     if (clubDetailSection) clubDetailSection.style.display = 'block';
     if(clubDetailTitleSpan) clubDetailTitleSpan.textContent = baseName;
     if(teamsInCategoryListUl) teamsInCategoryListUl.innerHTML = '';
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
     } else {
          teamsForSubject.sort((a, b) => {
               const categoryA = allCategories.find(cat => cat.id === a.categoryId);
               const categoryNameA = (categoryA && categoryA.name) ? categoryA.name : (a.categoryId || 'Neznáma kategória');
               const groupA = allGroups.find(g => g.id === a.groupId);
               const groupNameA = groupA ? (groupA.name || groupA.id) : 'Nepriradené';
               const teamTextA = `${categoryNameA} - ${groupNameA}`;
               const categoryB = allCategories.find(cat => cat.id === b.categoryId);
               const categoryNameB = (categoryB && categoryB.name) ? categoryNameB : (b.categoryId || 'Neznáma kategória');
               const groupB = allGroups.find(g => g.id === b.groupId);
               const groupNameB = groupB ? (groupB.name || groupB.id) : 'Nepriradené';
               const teamTextB = `${categoryNameB} - ${groupNameB}`;
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
                        console.warn(`DEBUG: Názov kategórie pre tím "${team.id}" (CategoryID: "${team.categoryId}") sa nenašiel v allCategories. Ako záloha použitý text "${categoryName}" extrahovaný z ID tímu pred prvým oddelovačom.`);

                   } else {
                        console.warn(`DEBUG: Názov kategórie pre tím "${team.id}" (CategoryID: "${team.categoryId}") sa nenašiel v allCategories. V ID tímu sa nenašiel očakávaný oddelovač (" - " alebo "-"). Použitá predvolená hodnota "${categoryName}".`);
                   }
               }

               const buttonText = groupName !== 'Nepriradené' ? `${categoryName} - ${groupName}` : categoryName;
               teamButton.textContent = buttonText;
               teamButton.dataset.teamId = team.id;

               teamButton.addEventListener('click', () => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('team', team.id);
                    history.pushState({ baseName: getClubBaseName(team), teamId: team.id }, '', url.toString());

                    displaySpecificTeamDetails(team.id);
                });

               teamsInCategoryButtonsDiv.appendChild(teamButton);
           });

           if (teamsForSubject.length > 0 && initialTeamId) {
               const initialTeam = teamsForSubject.find(t => t.id === initialTeamId);
               if (initialTeam) {
                    console.log(`DEBUG: InitialTeamId "${initialTeamId}" provided. Displaying details for this team.`);
                    displaySpecificTeamDetails(initialTeamId);
               } else {
                    console.warn(`DEBUG: InitialTeamId "${initialTeamId}" provided, but team not found among teams for baseName. Displaying details for the first team instead.`);
                    const firstTeamId = teamsForSubject[0].id;
                    displaySpecificTeamDetails(firstTeamId);
               }

           } else if (teamsForSubject.length > 0 && !initialTeamId) {
                console.log(`DEBUG: No InitialTeamId provided. Displaying details for the first team.`);
                const firstTeamId = teamsForSubject[0].id;
                displaySpecificTeamDetails(firstTeamId);
           } else if (teamsForSubject.length === 0 && initialTeamId) {
                console.warn(`DEBUG: InitialTeamId "${initialTeamId}" provided, but no teams found for baseName.`);
           }
     }

     if (teamsInCategoryListUl) {
          teamsInCategoryListUl.innerHTML = '';
     }
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
            if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba: Tím nenájdený';
            if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Detail tímu sa nepodarilo načítať.</p>';
            if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
            return;
        }

        const teamData = teamDoc.data();
        const teamName = teamData.name || teamDoc.id;
        if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = teamName;

        // Load Realizačný tím
        if (selectedTeamRealizacnyTimDiv) {
            selectedTeamRealizacnyTimDiv.innerHTML = ''; // Clear previous content

            // Create initial loading state elements
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

        if (selectedTeamSoupiskaHracovUl) {
             selectedTeamSoupiskaHracovUl.innerHTML = '';

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
    } finally {
        highlightTeamButton(teamId);
    }
}

function goBackToList() {
    displayClubsSummaryTable();
    history.replaceState({}, '', window.location.pathname);
}


async function handleUrlState() {
    await loadAllData();

    const urlParams = new URLSearchParams(window.location.search);
    const clubBaseName = urlParams.get('club');
    const teamId = urlParams.get('team');

    if (teamId) {
        const team = allClubs.find(c => c.id === teamId);
        if (team) {
            const baseName = getClubBaseName(team);
            displaySubjectDetails(baseName, teamId);
        } else {
            console.warn(`Tím s ID "${teamId}" sa nenašiel.`);
            history.replaceState(null, '', window.location.pathname);
            displayClubsSummaryTable();
        }
    } else if (clubBaseName) {
        const clubExists = allClubs.some(club => getClubBaseName(club) === clubBaseName);
        if (clubExists) {
            displaySubjectDetails(clubBaseName);
        } else {
            console.warn(`Subjekt "${clubBaseName}" sa nenašiel.`);
            history.replaceState(null, '', window.location.pathname);
            displayClubsSummaryTable();
        }
    } else {
        displayClubsSummaryTable();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    handleUrlState();

    if (backToListButton) {
        const newButton = backToListButton.cloneNode(true);
        backToListButton.parentNode.replaceChild(newButton, backToListButton);
        const updatedBackButton = document.getElementById('backToListButton');

        updatedBackButton.addEventListener('click', goBackToList);

    } else {
       console.warn("Element s ID 'backToListButton' nebol nájdený.");
    }
});

window.addEventListener('popstate', () => {
    handleUrlState();
});
