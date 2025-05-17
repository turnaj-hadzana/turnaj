import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const clubListSection = document.getElementById('clubListSection');
const clubsSummaryTable = document.getElementById('clubsSummaryTable');
const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader');
const clubsBodyTableHeader = document.getElementById('clubsBodyTableHeader'); // Thead v #clubsBodyTable
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody'); // Tbody v #clubsBodyTable (posuvná časť)
const clubsHeaderTableBody = document.getElementById('clubsHeaderTableBody'); // Tbody v #clubsHeaderTable (ne-posuvná časť s duplicitnými dátami)

const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span');
const teamsInCategoryListUl = document.getElementById('teamsInCategoryList');
const teamsInCategoryButtonsDiv = document.getElementById('teamsInCategoryButtons');
const selectedTeamDetailsDiv = document.getElementById('selectedTeamDetails');
const selectedTeamNameSpan = document.getElementById('selectedTeamName');
const selectedTeamRealizacnyTimDiv = document.getElementById('selectedTeamRealizacnyTim');
const selectedTeamTrenerInfoSpan = document.getElementById('selectedTeamTrenerInfo');
const selectedTeamVeduciDruzstvaInfoSpan = document.getElementById('selectedTeamVeduciDruzstvaInfo');
const selectedTeamSoupiskaHracovUl = document.getElementById('selectedTeamSoupiskaHracov');

let allClubs = [];
let allCategories = [];
let allGroups = [];
let dataLoadError = false;


async function loadAllData() {
    dataLoadError = false;
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
        dataLoadError = true;
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

    const trailingSuffixRegex = /\s+([A-Z0-9]+)$/;
    const match = initialBaseName.match(trailingSuffixRegex);
    if (match) {
        if (match[1].length <= 3) {
             initialBaseName = initialBaseName.substring(0, match.index).trim();
        }
    }
    return initialBaseName;
}


// NOVÁ FUNKCIA: Rozdelí text hlavičky na dva riadky na mieste prvej medzery
function splitHeaderText(text) {
    if (!text) return '';
    const spaceIndex = text.indexOf(' ');
    if (spaceIndex === -1) {
        // Ak sa medzera nenájde, vráti pôvodný text
        return text;
    }
    // Nahradí prvú medzeru za <br> tag
    return text.substring(0, spaceIndex) + '<br>' + text.substring(spaceIndex + 1);
}


// Funkcia na pridanie hlavičiek (Tímy, Kategórie) do OBCH tabuliek
function updateHeaderColspan(numCategoryColumns) {
    if (!clubsSummaryTableHeader || !clubsBodyTableHeader) {
        console.error("Missing table header elements for club summary.");
        return;
    }

    // --- UPRAVENÉ: Nastav text pre "Názov klubu" priamo, bez použitia splitHeaderText ---
    // Vyber prvú hlavičku v oboch tabuľkách
    const firstThSummary = clubsSummaryTableHeader.querySelector('th:first-child');
    if (firstThSummary) {
        // Nastav textContent na pôvodný text (jednoriadkový)
        firstThSummary.textContent = 'Názov klubu';
    }
     const firstThBody = clubsBodyTableHeader.querySelector('th:first-child');
     if (firstThBody) {
         // Nastav textContent na pôvodný text (jednoriadkový)
         firstThBody.textContent = 'Názov klubu';
     }


    // Vyčisti existujúce dynamické hlavičky okrem prvej V OBCH tabuľkách
    clubsSummaryTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());
    clubsBodyTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());


    // --- UPRAVENÉ: Vytvor a pridaj "Tímy" hlavičku ---
    const teamsThText = "Tímy"; // Pôvodný text
    // Aplikuj splitHeaderText na text "Tímy"
    const teamsThInnerHTML = splitHeaderText(teamsThText); // Modifikovaný text s <br>

    // Pridaj hlavičku "Tímy" do OBCH tabuliek (za prvú hlavičku)
    const teamsThSummary = document.createElement('th');
    teamsThSummary.innerHTML = teamsThInnerHTML; // Použi innerHTML pre <br>
    teamsThSummary.style.textAlign = 'center';
    if (firstThSummary) firstThSummary.insertAdjacentElement('afterend', teamsThSummary);

    const teamsThBody = document.createElement('th');
    teamsThBody.innerHTML = teamsThInnerHTML; // Použi innerHTML pre <br>
    teamsThBody.style.textAlign = 'center';
     if (firstThBody) firstThBody.insertAdjacentElement('afterend', teamsThBody);


    // --- UPRAVENÉ: Vytvor a pridaj hlavičky kategórií ---
    allCategories.forEach(category => {
        const categoryName = category.name || category.id;
        // Aplikuj splitHeaderText na názov kategórie
        const categoryThInnerHTML = splitHeaderText(categoryName); // Modifikovaný text s <br>

        const categoryThSummary = document.createElement('th');
        categoryThSummary.innerHTML = categoryThInnerHTML; // Použi innerHTML pre <br>
        categoryThSummary.dataset.categoryId = category.id;
        categoryThSummary.style.textAlign = 'center';
        clubsSummaryTableHeader.appendChild(categoryThSummary);

        const categoryThBody = document.createElement('th');
        categoryThBody.innerHTML = categoryThInnerHTML; // Použi innerHTML pre <br>
        categoryThBody.dataset.categoryId = category.id;
        categoryThBody.style.textAlign = 'center';
        clubsBodyTableHeader.appendChild(categoryThBody); // Pridaj do druhej hlavičky
    });
}


function displayClubsSummaryTable() {
    // ... (existujúca logika na prepínanie sekcií a vyčistenie detailov) ...
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = '';
    if (teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = '';
    if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
    if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
    if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
    if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';


    if (!clubsSummaryTableBody || !clubsSummaryTableHeader || !clubsHeaderTableBody || !clubsBodyTableHeader) {
        console.error("Missing required table elements for club summary.");
        return;
    }

    // Vyčisti OBE tbody elementy
    clubsSummaryTableBody.innerHTML = '';
    clubsHeaderTableBody.innerHTML = '';


    // Update header with "Tímy" column and category columns v OBCH tabuľkách
    // Táto funkcia teraz vkladá text s <br>
    updateHeaderColspan(allCategories.length);

    // Vypočítaj správny colspan na základe aktuálnej hlavičky
    const numCategoryColumns = Array.isArray(allCategories) ? allCategories.length : 0;
    const numColumns = 1 + 1 + numCategoryColumns; // Názov klubu + Tímy + Počet kategórií

    // Zobrazenie chybovej správy, ak nastala chyba pri načítaní dát
    if (dataLoadError) {
        const errorRowHTML = `<tr><td colspan="${numColumns}" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
        clubsSummaryTableBody.innerHTML = errorRowHTML;
        clubsHeaderTableBody.innerHTML = errorRowHTML; // Duplikuj správu aj do prvej tabuľky
        console.log("Displaying error message in both tables.");
        return;
    }

    if (allClubs.length === 0) {
        const noClubsRowHTML = `<tr><td colspan="${numColumns}" style="text-align: center;">Zatiaľ nie sú pridané žiadne kluby.</td></tr>`;
        clubsSummaryTableBody.innerHTML = noClubsRowHTML;
        clubsHeaderTableBody.innerHTML = noClubsRowHTML; // Duplikuj správu aj do prvej tabuľky
        console.log("Displaying no clubs message in both tables.");
        return;
    }

    // Group clubs by base name (existujúca logika)
    const clubsByBaseName = allClubs.reduce((acc, club) => {
        const baseName = getClubBaseName(club);
        if (!acc[baseName]) {
            acc[baseName] = [];
        }
        acc[baseName].push(club);
        return acc;
    }, {});

    // Sort base names alphabetically (existujúca logika)
    const sortedBaseNames = Object.keys(clubsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));

    // Populate both table bodies
    sortedBaseNames.forEach(baseName => {
        // Vytvorenie riadku pre telo POSUVNEJ tabuľky (#clubsBodyTable)
        const bodyRow = clubsSummaryTableBody.insertRow();
        bodyRow.dataset.baseName = baseName;
        bodyRow.style.cursor = 'pointer';
        // Pridanie event listeneru iba na riadok v posuvnej tabuľke
        bodyRow.addEventListener('click', () => {
             const url = new URL(window.location.href);
             url.searchParams.set('club', baseName);
             url.searchParams.delete('team');
             history.pushState({ baseName: baseName }, '', url.toString());
             displaySubjectDetails(baseName);
        });

        // Pridanie buniek do riadku pre telo POSUVNEJ tabuľky (rovnaká logika ako predtým)
        const bodyBaseNameCell = bodyRow.insertCell();
        bodyBaseNameCell.textContent = baseName;

        let totalTeamsCount = 0;
         allCategories.forEach(category => {
             const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === category.id).length;
             totalTeamsCount += teamsInCategoryCount;
         });
        const bodyTotalTeamsCell = bodyRow.insertCell();
        bodyTotalTeamsCell.textContent = totalTeamsCount > 0 ? totalTeamsCount : '';
        bodyTotalTeamsCell.style.textAlign = 'center';
         if (totalTeamsCount > 0) {
              bodyTotalTeamsCell.style.fontWeight = 'bold';
         }

        allCategories.forEach(category => {
            const bodyCountCell = bodyRow.insertCell();
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === category.id).length;
            bodyCountCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
            bodyCountCell.style.textAlign = 'center';
             if (teamsInCategoryCount > 0) {
                 bodyCountCell.style.fontWeight = 'bold';
             }
        });

        // Klonovanie riadku pre telo PRVEJ tabuľky (#clubsHeaderTable)
        const headerRow = bodyRow.cloneNode(true);

        // Odstránenie event listeneru a kurzora z klonovaného riadku (v prvej tabuľke klik nie je žiaduci)
        headerRow.style.cursor = 'default';
        if (headerRow.dataset.baseName) {
             delete headerRow.dataset.baseName;
        }

        // Pridanie klonovaného riadku do tela PRVEJ tabuľky
        clubsHeaderTableBody.appendChild(headerRow);

        // Pôvodný riadok 'bodyRow' je už pridaný do clubsSummaryTableBody vďaka insertRow()
    });
}


// Funkcia na zvýraznenie tlačidla tímu a resetovanie ostatných
function highlightTeamButton(teamIdToHighlight) {
    if (teamsInCategoryButtonsDiv) {
          teamsInCategoryButtonsDiv.querySelectorAll('button').forEach(btn => {
              btn.style.fontWeight = 'normal';
              btn.style.backgroundColor = '';
              btn.style.color = '';
          });

          const targetButton = teamsInCategoryButtonsDiv.querySelector('button[data-team-id="' + teamIdToHighlight + '"]');
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
               const teamTextA = groupNameA !== 'Nepriradené' ? `${categoryNameA} - ${groupNameA}` : categoryNameA;

               const categoryB = allCategories.find(cat => cat.id === b.categoryId);
               const categoryNameB = (categoryB && categoryB.name) ? categoryNameB : (b.categoryId || 'Neznáma kategória');
               const groupB = allGroups.find(g => g.id === b.groupId);
               const groupNameB = groupB ? (groupB.name || groupB.id) : 'Nepriradené';
               const teamTextB = groupNameB !== 'Nepriradené' ? `${categoryNameB} - ${groupNameB}` : categoryNameB;

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
               console.log(`DEBUG: InitialTeamId "${initialTeamId}" provided. Displaying details for this team.`);
               displaySpecificTeamDetails(initialTeamId);
           } else if (teamsForSubject.length > 0 && !initialTeamId) {
                const firstTeamId = teamsForSubject[0].id;
                console.log(`DEBUG: No InitialTeamId provided. Displaying details for the first team: "${firstTeamId}".`);
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
            selectedTeamRealizacnyTimDiv.innerHTML = '';

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
