import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const clubListSection = document.getElementById('clubListSection');
const clubsSummaryTable = document.getElementById('clubsSummaryTable'); // Referencia na hornú tabuľku (s thead a novým tbody)
const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader'); // Referencia na thead (TR element v thead)
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

// >>> NOVÁ PREMENNÁ NA ULOŽENIE VYPOČÍTANEJ ŠÍRKY OSTATNÝCH STĹPCOV <<<
let otherColumnCalculatedWidth = 'auto'; // Predvolená hodnota

async function loadAllData() {
    try {
        const clubsSnapshot = await getDocs(clubsCollectionRef);
        allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // >>> NOVÝ VÝPOČET ŠÍRKY OSTATNÝCH STĹPCOV PO NAČÍTANÍ KATEGÓRIÍ <<<
        const numOtherColumns = 1 + allCategories.length; // 1 pre "Tímy" + počet kategórií
        if (numOtherColumns > 0) {
             // Zvyšných 60% šírky tabuľky (ak prvý stĺpec zaberie 40%) sa rozdelí medzi tieto stĺpce
            const widthPercentage = 60 / numOtherColumns;
            otherColumnCalculatedWidth = widthPercentage.toFixed(2) + '%'; // Zaokrúhli na 2 desatinné miesta
        } else {
            otherColumnCalculatedWidth = 'auto'; // Ak nie sú žiadne ďalšie stĺpce, nech je auto
        }
        // console.log('DEBUG: Vypočítaná šírka ostatných stĺpcov:', otherColumnCalculatedWidth); // Pre kontrolu

    } catch (error) {
        alert('Nepodarilo sa načítať dáta turnaja.');
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (clubsSummaryTableBody) {
             // Opravíme colspan pre správny počet stĺpcov v chybovom hlásení
             const numTotalColumns = 1 + 1 + allCategories.length; // Názov + Tímy + Kategórie
             clubsSummaryTableBody.innerHTML = `<tr><td colspan="${numTotalColumns}" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
        }
         allClubs = [];
         allCategories = [];
         allGroups = [];
         otherColumnCalculatedWidth = 'auto'; // Reset pri chybe
         // V prípade chyby naviguj späť na hlavný zoznam a URL
         history.replaceState({}, '', window.location.pathname);
         displayClubsSummaryTable(); // Zobraz zoznam klubov (prázdny alebo s chybou)
    }
}

function updateHeaderColspan(numCategoryColumns) {
    if (clubsSummaryTableHeader) {
        // Clear existing headers except the first one
        clubsSummaryTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());

        const teamsTh = document.createElement('th');
        teamsTh.textContent = 'Tímy';
        teamsTh.style.textAlign = 'center';
        // >>> NASTAVENIE ŠÍRKY pre Tímy <<<
        teamsTh.style.width = otherColumnCalculatedWidth;
        // Odstránili sme min-width 3vw z CSS pre tieto stĺpce, ak ho chceš, nastav ho tu
        // teamsTh.style.minWidth = otherColumnCalculatedWidth; // Alebo iná hodnota ak potrebuješ min

        clubsSummaryTableHeader.querySelector('th').insertAdjacentElement('afterend', teamsTh);

        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const th = document.createElement('th');
                th.textContent = category.name || category.id;
                th.dataset.categoryId = category.id;
                th.style.textAlign = 'center';
                // >>> NASTAVENIE ŠÍRKY pre Kategórie <<<
                th.style.width = otherColumnCalculatedWidth;
                 // Odstránili sme min-width 3vw z CSS pre tieto stĺpce
                 // th.style.minWidth = otherColumnCalculatedWidth; // Alebo iná hodnota

                clubsSummaryTableHeader.appendChild(th);
            });
        }
         // >>> NASTAVENIE ŠÍRKY pre PRVÝ STĹPEC v hlavičke <<<
         // Nastav šírku prvého stĺpca (mala by byť 40%) - CSS pravidlo už bolo upravené na 40%
         const firstTh = clubsSummaryTableHeader.querySelector('th:first-child');
         if (firstTh) {
             firstTh.style.width = '40%'; // Nastav šírku prvého stĺpca na 40%
             // Odstránili sme min-width 15vw z CSS pre prvý stĺpec
             // firstTh.style.minWidth = '40%'; // Alebo iná hodnota
         }
    }
    // Pri použití table-layout: fixed a width: 100% na celej tabuľke,
    // colspan na chybovom riadku v body stačí nastaviť na celkový počet stĺpcov (1 + 1 + numCategoryColumns)
     if (clubsSummaryTableBody) {
         const firstRow = clubsSummaryTableBody.querySelector('tr');
         if (firstRow) {
             const firstCell = firstRow.querySelector('td');
             if (firstCell) {
                  const numTotalColumns = 1 + 1 + allCategories.length; // Názov + Tímy + Kategórie
                  firstCell.colSpan = numTotalColumns;
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

    // Skontroluj existenciu hlavných elementov tabuľky
    if (!clubsSummaryTableBody || !clubsSummaryTableHeader || !longestNameRowFixedBody || !clubsSummaryTable) {
         console.error("Chyba: Nebol nájdený jeden alebo viac hlavných elementov tabuľky.");
         // Môžeš pridať základné zobrazenie chyby aj sem, ak sa nenašli elementy
         return;
    }

    clubsSummaryTableBody.innerHTML = ''; // Clear existing rows in the scrollable body
    longestNameRowFixedBody.innerHTML = ''; // Vyčistíme obsah fixnej tbody

    // Update hlavičky a nastaví šírky TH elementov
    updateHeaderColspan(allCategories.length);

    if (allClubs.length === 0) {
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        // Správny colspan pre telo - musí zodpovedať počtu stĺpcov v hlavičke
        const numTotalColumns = 1 + 1 + allCategories.length; // Názov + Tímy + Kategórie
        cell.colSpan = numTotalColumns;
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

    const sortedBaseNames = Object.keys(clubsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));

    // --- Generovanie riadku s najdlhším názvom v fixnej tbody ---
    let longestBaseName = '';
    let clubsForLongestBaseName = [];

    if (sortedBaseNames.length > 0) {
         const baseNamesWithClubs = sortedBaseNames.filter(name => clubsByBaseName[name] && clubsByBaseName[name].length > 0);
         if (baseNamesWithClubs.length > 0) {
             longestBaseName = baseNamesWithClubs.reduce((a, b) => {
                 const nameA = a || '';
                 const nameB = b || '';
                 return nameA.length > nameB.length ? a : b;
             });
             clubsForLongestBaseName = allClubs.filter(club => getClubBaseName(club) === longestBaseName);
         }
    }

    if (longestBaseName) {
        const longestNameRow = longestNameRowFixedBody.insertRow();
        longestNameRow.dataset.baseName = longestBaseName;

        const cellBaseName = longestNameRow.insertCell();
        cellBaseName.textContent = longestBaseName;
        // >>> NASTAVENIE ŠÍRKY pre PRVÝ STĹPEC v fixnom riadku <<<
        cellBaseName.style.width = '40%'; // Nastav šírku prvého stĺpca na 40%
        // cellBaseName.style.minWidth = '40%'; // Ak potrebuješ min-width

        let totalTeamsCount = 0;
        allCategories.forEach(category => {
             const categoryId = category.id;
             const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
             totalTeamsCount += teamsInCategoryCount;
        });

        const cellTotalTeams = longestNameRow.insertCell();
        cellTotalTeams.textContent = totalTeamsCount > 0 ? totalTeamsCount : '';
        cellTotalTeams.style.textAlign = 'center';
         // >>> NASTAVENIE ŠÍRKY pre stĺpec Tímy v fixnom riadku <<<
         cellTotalTeams.style.width = otherColumnCalculatedWidth;
         // cellTotalTeams.style.minWidth = otherColumnCalculatedWidth; // Ak potrebuješ min-width


        allCategories.forEach(category => {
            const countCell = longestNameRow.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
            countCell.style.textAlign = 'center';
             // >>> NASTAVENIE ŠÍRKY pre stĺpce Kategórie v fixnom riadku <<<
             countCell.style.width = otherColumnCalculatedWidth;
             // countCell.style.minWidth = otherColumnCalculatedWidth; // Ak potrebuješ min-width
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
         // >>> NASTAVENIE ŠÍRKY pre PRVÝ STĹPEC v riadkoch tela <<<
         baseNameCell.style.width = '40%'; // Nastav šírku prvého stĺpca na 40%
         // baseNameCell.style.minWidth = '40%'; // Ak potrebuješ min-width


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
         // >>> NASTAVENIE ŠÍRKY pre stĺpec Tímy v riadkoch tela <<<
         totalTeamsCell.style.width = otherColumnCalculatedWidth;
         // totalTeamsCell.style.minWidth = otherColumnCalculatedWidth; // Ak potrebuješ min-width


        allCategories.forEach(category => {
            const countCell = row.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
            countCell.style.textAlign = 'center';
             if (teamsInCategoryCount > 0) {
                  countCell.style.fontWeight = 'bold';
             }
             // >>> NASTAVENIE ŠÍRKY pre stĺpce Kategórie v riadkoch tela <<<
             countCell.style.width = otherColumnCalculatedWidth;
             // countCell.style.minWidth = otherColumnCalculatedWidth; // Ak potrebuješ min-width
        });
    });

    // >>> ODSTRÁNENÁ NESPRÁVNA LOGIKA PREHODENIA THEAD A TBODY <<<
    /*
     if (clubsSummaryTable && clubsSummaryTableHeader && longestNameRowFixedBody) {
         const parentTable = clubsSummaryTable;
         const thead = clubsSummaryTableHeader.parentNode;
         const fixedTbody = longestNameRowFixedBody;
         if (parentTable && thead && fixedTbody) {
             parentTable.appendChild(thead);
         } else {
              console.warn("Nepodarilo sa prehodiť THEAD a fixnú TBODY v hornej tabuľke. Jeden alebo oba elementy alebo rodič neboli nájdené.");
         }
     }
    */
}

// Funkcia na zvýraznenie tlačidla tímu - ponechaná bez zmien
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
              targetButton.style.backgroundColor = '#c46f50'; // Aktívne oranžové pozadie
              targetButton.style.color = 'white'; // Aktívny biely text
         }
     }
}

// Funkcia na zobrazenie detailov subjektu (klubu - baseName) - ponechaná bez zmien v logike zobrazenia, len volanie displaySpecificTeamDetails s initialTeamId
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
                  // Zvýraznenie sa volá na konci displaySpecificTeamDetails
              });

             teamsInCategoryButtonsDiv.appendChild(teamButton);
         });

         // --- KÓD pre automatický výber a zvýraznenie tímu (ÚPRAVA) ---
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
         // --- KONIEC ÚPRAVY ---
     }

     if (teamsInCategoryListUl) {
          teamsInCategoryListUl.innerHTML = '';
     }
}


// Funkcia na zobrazenie detailov konkrétneho tímu - ponechaná bez zmien
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
    } finally {
         highlightTeamButton(teamId);
    }
}

// Funkcia na návrat na prehľad - ponechaná bez zmien
function goBackToList() {
     displayClubsSummaryTable();
     history.replaceState({}, '', window.location.pathname);
}

// Funkcia na spracovanie stavu URL pri načítaní stránky a zmene histórie - ponechaná bez zmien
async function handleUrlState() {
     await loadAllData(); // Počkaj, kým sa načítajú dáta a vypočíta šírka stĺpcov

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


// Spustenie spracovania URL stavu po načítaní DOM - ponechané bez zmien
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

// Spracovanie udalosti 'popstate' pre navigáciu späť/vpred - ponechané bez zmien
window.addEventListener('popstate', () => {
     handleUrlState();
});
