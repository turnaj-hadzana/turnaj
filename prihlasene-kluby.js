import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const clubListSection = document.getElementById('clubListSection');
// const clubsSummaryTable = document.getElementById('clubsSummaryTable'); // Zdá sa, že tento element sa nepoužíva, tabuľky sú oddelené clubsHeaderTable a clubsBodyTable
const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader'); // Referencia na THEAD riadok v hlavičkovej tabuľke
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody'); // Referencia na TBODY v tele tabuľky
const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span');
// const teamsInCategoryListUl = document.getElementById('teamsInCategoryList'); // Táto referencia sa už nepoužíva na pridávanie elementov
const teamsInCategoryButtonsDiv = document.getElementById('teamsInCategoryButtons'); // Nová referencia pre kontajner tlačidiel
const selectedTeamDetailsDiv = document.getElementById('selectedTeamDetails');
// const selectedTeamNameSpan = document.getElementById('selectedTeamName'); // Zdá sa, že tento element sa nepoužíva, názov tímu je v h4/button
const selectedTeamRealizacnyTimDiv = document.getElementById('selectedTeamRealizacnyTim');
const selectedTeamTrenerInfoSpan = document.getElementById('selectedTeamTrenerInfo');
const selectedTeamVeduciDruzstvaInfoSpan = document.getElementById('selectedTeamVeduciDruzstvaInfo');
const selectedTeamSoupiskaHracovUl = document.getElementById('selectedTeamSoupiskaHracov');

let allClubs = [];
let allCategories = [];

// Helper function to get the base name of a club (without category suffix)
function getClubBaseName(club) {
    if (!club || typeof club.name !== 'string') {
        return 'Neznámy klub';
    }
    // Odstráni príponu typu " - kategoriaId" z názvu klubu
    const categorySuffixMatch = club.name.match(/ - (.*)$/);
    if (categorySuffixMatch && categorySuffixMatch[1]) {
         const categoryId = categorySuffixMatch[1];
         // Skontroluje, či categoryId zodpovedá existujúcej kategórii
         const categoryExists = allCategories.some(cat => cat.id === categoryId);
         if (categoryExists) {
              const baseName = club.name.substring(0, club.name.length - categorySuffixMatch[0].length);
              return baseName.trim();
         }
    }
    // Ak prípona nezodpovedá kategórii alebo neexistuje, vráť celý názov
    return club.name;
}


// Function to load all clubs from Firestore
async function loadAllClubs() {
    try {
        const querySnapshot = await getDocs(clubsCollectionRef);
        allClubs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // console.log("Načítané kluby:", allClubs); // Debugging
    } catch (error) {
        console.error("Chyba pri načítaní klubov:", error);
        allClubs = []; // Clear clubs in case of error
    }
}

// Function to load all categories from Firestore
async function loadAllCategories() {
    try {
        const querySnapshot = await getDocs(categoriesCollectionRef);
        // Sort categories alphabetically by name for consistent display
        allCategories = querySnapshot.docs
             .map(doc => ({ id: doc.id, ...doc.data() }))
             .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, 'sk-SK'));
        // console.log("Načítané kategórie:", allCategories); // Debugging
    } catch (error) {
        console.error("Chyba pri načítaní kategórií:", error);
        allCategories = []; // Clear categories in case of error
    }
}


// Function to update the table header based on the number of categories
// UPRAVENÉ: Implementácia zalomenia textu v hlavičke (<br>) a zabezpečenie prvého stĺpca
function updateHeaderColspan(numCategoryColumns) {
    if (clubsSummaryTableHeader) {
        // Clear existing headers except the first one
        // Zachováme prvý th element
        const firstTh = clubsSummaryTableHeader.querySelector('th:first-child');
        // Pred vymazaním ostatných riadkov (ak existujú, napr. riadok s najdlhším názvom)
        // ich najprv odstránime, aby sme mohli vložiť nový riadok s najdlhším názvom presne za prvý
        const rowsToRemove = clubsSummaryTableHeader.querySelectorAll('tr:not(:first-child)');
        rowsToRemove.forEach(row => row.remove());


        // Pridaj hlavičku "Tímy" hneď za "Názov klubu"
        const teamsTh = document.createElement('th');
        teamsTh.textContent = 'Tímy'; // Pôvodný text
        // *** UPRAVENÉ: Nahradenie medzier <br> pre zalomenie riadku ***
        // Používame textContent pre bezpečnosť a potom ho nahradíme v innerHTML
        teamsTh.innerHTML = teamsTh.textContent.replace(/ /g, '<br>');
        // ***********************************************************
        teamsTh.style.textAlign = 'center';
        // Vlož novú hlavičku za prvého potomka (Názov klubu)
        if (firstTh) {
             firstTh.insertAdjacentElement('afterend', teamsTh);
        } else {
             // Ak prvý th neexistuje (nemalo by sa stať), pridaj ho na koniec
             clubsSummaryTableHeader.appendChild(teamsTh);
        }


        // Pridaj hlavičky kategórií
        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const th = document.createElement('th');
                th.textContent = category.name || category.id; // Pôvodný text
                 // *** UPRAVENÉ: Nahradenie medzier <br> pre zalomenie riadku ***
                 th.innerHTML = th.textContent.replace(/ /g, '<br>');
                 // ***********************************************************
                th.dataset.categoryId = category.id;
                th.style.textAlign = 'center';
                clubsSummaryTableHeader.appendChild(th);
            });
        }

        // KÓD NA PRIDANIE NOVÉHO POSLEDNÉHO STĹPCA DO HLAVIČKY BOL ODSTRÁNENÝ
    }

    // Aktualizácia colspanu pre počiatočný riadok/riadok s chybou v tele
    if (clubsSummaryTableBody) {
        const firstRow = clubsSummaryTableBody.querySelector('tr');
        if (firstRow) {
            const firstCell = firstRow.querySelector('td');
            if (firstCell) {
                 // colspan = 1 (Názov klubu) + 1 (Tímy) + numCategoryColumns (Správny colspan pre telo)
                firstCell.colSpan = 1 + 1 + numCategoryColumns; // Colspan calculation remains correct for the body
            }
        }
    }
}


// Function to display the summary table of clubs
async function displayClubsSummaryTable() {
    if (!clubListSection || !clubsSummaryTableBody || !clubsSummaryTableHeader) {
        console.error("Potrebné DOM elementy neboli nájdené.");
        return;
    }

    // Zobrazí sekciu so zoznamom klubov a skryje detaily
    clubListSection.style.display = 'block';
    if (clubDetailSection) {
        clubDetailSection.style.display = 'none';
    }
    // Skryje detaily tímu (ak boli zobrazené)
     if (selectedTeamDetailsDiv) {
         selectedTeamDetailsDiv.style.display = 'none';
     }


    // Vyčistí telo tabuľky (riadky s dátami)
    clubsSummaryTableBody.innerHTML = '<tr><td style="text-align: center;">Načítavam prehľad...</td></tr>';


    // Načítať kategórie a kluby
    await loadAllCategories();
    await loadAllClubs();


    // Aktualizuje hlavičku s riadkom "Tímy" a kategóriami (bez extra posledného stĺpca)
    // Toto sa volá PRED naplnením tela, aby sa zabezpečil správny počet stĺpcov
    updateHeaderColspan(allCategories.length);


    clubsSummaryTableBody.innerHTML = ''; // Clear loading message


    if (allClubs.length === 0) {
        // Ak nie sú žiadne kluby, zobraz správu
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        // colspan = 1 (Názov klubu) + 1 (Tímy) + allCategories.length (Správny colspan pre telo)
        cell.colSpan = 1 + 1 + allCategories.length; // Správny colspan pre telo
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad.";
        cell.style.textAlign = 'center';
        return;
    }

    // Skupinové kluby podľa základného názvu
    const clubsByBaseName = allClubs.reduce((acc, club) => {
        const baseName = getClubBaseName(club);
        if (!acc[baseName]) {
            acc[baseName] = [];
        }
        acc[baseName].push(club);
        return acc;
    }, {});

    // Zoradiť základné názvy abecedne
    const sortedBaseNames = Object.keys(clubsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));


    // --- NOVÉ: Nájsť základný názov s maximálnou dĺžkou ---
    let longestBaseName = '';
    let longestBaseNameData = null; // Uložiť tímy priradené k najdlhšiemu názvu

    sortedBaseNames.forEach(baseName => {
        if (baseName.length > longestBaseName.length) {
            longestBaseName = baseName;
            longestBaseNameData = clubsByBaseName[baseName];
        }
    });

    // --- NOVÉ: Pridať riadok s najdlhším názvom do hlavičkovej tabuľky ---
    // Už sme odstránili staré riadky v updateHeaderColspan, teraz môžeme pridať nový
    const originalHeaderRow = clubsSummaryTableHeader.querySelector('tr:first-child');

    // Ak existuje najdlhší názov a dáta pre neho a existuje pôvodný riadok hlavičky
    if (longestBaseName && longestBaseNameData && clubsSummaryTableHeader && originalHeaderRow) {
        // Skontrolujeme, či už taký riadok neexistuje (pre prípad viacnásobného volania displayClubsSummaryTable)
        if (!clubsSummaryTableHeader.querySelector('tr.longest-name-row')) {
             const longestNameRow = document.createElement('tr');
             // Pridáme CSS triedu pre špecifické štýlovanie
             longestNameRow.classList.add('longest-name-row');
             // Nastavíme cursor na default, aby nebol klikateľný ako riadky v body
             longestNameRow.style.cursor = 'default';


             // Bunka pre najdlhší základný názov (TD v THEAD)
             const longestNameCell = document.createElement('td');
             longestNameCell.textContent = longestBaseName;
             longestNameRow.appendChild(longestNameCell);

             // Bunka pre celkový počet tímov pre najdlhší názov (TD v THEAD)
             let totalTeamsCount = 0;
             allCategories.forEach(category => {
                 const teamsInCategoryCount = longestBaseNameData.filter(club => club.categoryId === category.id).length;
                 totalTeamsCount += teamsInCategoryCount;
             });
             const totalTeamsCell = document.createElement('td');
             totalTeamsCell.textContent = totalTeamsCount > 0 ? totalTeamsCount : '';
             totalTeamsCell.style.textAlign = 'center';
             if (totalTeamsCount > 0) {
                  totalTeamsCell.style.fontWeight = 'bold';
             }
             longestNameRow.appendChild(totalTeamsCell);


             // Bunky pre počty tímov v jednotlivých kategóriách pre najdlhší názov (TD v THEAD)
             allCategories.forEach(category => {
                 const countCell = document.createElement('td');
                 const categoryId = category.id;
                 const teamsInCategoryCount = longestBaseNameData.filter(club => club.categoryId === categoryId).length;
                 countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
                 countCell.style.textAlign = 'center';
                  if (teamsInCategoryCount > 0) {
                      countCell.style.fontWeight = 'bold';
                  }
                 longestNameRow.appendChild(countCell);
             });

             // Vložiť tento riadok do thead za pôvodný riadok (riadok s pôvodnými hlavičkami TH)
              originalHeaderRow.insertAdjacentElement('afterend', longestNameRow);
         }
    }
    // --- KONIEC NOVÉHO PRIDANIA RIADKU ---


    // Naplniť telo tabuľky s dátami klubov
    sortedBaseNames.forEach(baseName => {
        const row = clubsSummaryTableBody.insertRow();
        row.dataset.baseName = baseName;
        row.style.cursor = 'pointer'; // Aby bolo vidieť, že riadok je klikateľný
        row.addEventListener('click', () => {
             // Aktualizácia URL pri kliknutí na riadok klubu
             const url = new URL(window.location.href);
             url.searchParams.set('club', baseName);
             url.searchParams.delete('team'); // Odstráň parameter team pre zobrazenie prehľadu klubu
             history.pushState({ baseName: baseName }, '', url.toString());

             displaySubjectDetails(baseName); // Zobraz detaily subjektu
        });

        // Pridať bunku "Názov klubu"
        const baseNameCell = row.insertCell();
        baseNameCell.textContent = baseName;


        // Vypočítať a pridať bunku s počtom "Tímov" (celkový počet pre základný názov)
        let totalTeamsCount = 0;
        // Prejsť kategóriami a spočítať tímy pre tento základný názov
         allCategories.forEach(category => {
             const categoryId = category.id;
             const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
             totalTeamsCount += teamsInCategoryCount; // Pripočítať k celkovému počtu
         });

        const totalTeamsCell = row.insertCell();
        totalTeamsCell.textContent = totalTeamsCount > 0 ? totalTeamsCount : '';
        totalTeamsCell.style.textAlign = 'center';
        if (totalTeamsCount > 0) {
             totalTeamsCell.style.fontWeight = 'bold';
        }


        // Pridať bunky s počtom tímov v jednotlivých kategóriách
        allCategories.forEach(category => {
            const countCell = row.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
            countCell.style.textAlign = 'center';
             if (teamsInCategoryCount > 0) {
                 countCell.style.fontWeight = 'bold';
             }
        });

         // KÓD NA PRIDANIE POSLEDNEJ BUNKY DO TELA JE ODSTRÁNENÝ
    });
}

// Function to display details for a specific club base name
async function displaySubjectDetails(clubBaseName) {
     if (!clubDetailSection || !clubListSection || !clubDetailTitleSpan || !teamsInCategoryButtonsDiv || !selectedTeamDetailsDiv) {
         console.error("Potrebné DOM elementy pre detaily klubu neboli nájdené.");
         return;
     }

    // Skryť zoznam klubov a zobraziť sekciu detailov
    clubListSection.style.display = 'none';
    clubDetailSection.style.display = 'block';
    selectedTeamDetailsDiv.style.display = 'none'; // Na začiatku skryjeme detaily konkrétneho tímu


    // Vyčistiť kontajner tlačidiel kategórií a informácie o tíme
    teamsInCategoryButtonsDiv.innerHTML = 'Načítavam tímy...'; // Zobraz loading message
    // clearTeamDetails(); // Uistite sa, že detaily tímu sú vyčistené


     // Nájsť všetky kluby s daným základným názvom
    const clubsForBaseName = allClubs.filter(club => getClubBaseName(club) === clubBaseName);

    if (clubsForBaseName.length === 0) {
        clubDetailTitleSpan.textContent = `Nenašiel sa klub s názvom "${clubBaseName}"`;
        teamsInCategoryButtonsDiv.innerHTML = '<p>Žiadne tímy priradené k tomuto klubu.</p>';
        // Možno presmerovať späť na zoznam alebo zobraziť chybovú správu
         console.warn(`Nenašiel sa klub s názvom "${clubBaseName}".`);
         goBackToList(); // Automaticky sa vrátiť
        return;
    }

     // Zobraz názov klubu
    clubDetailTitleSpan.textContent = clubBaseName;

    // Zoskupiť tímy podľa kategórií pre daný základný názov
    const teamsByCategory = allCategories.reduce((acc, category) => {
        const teamsInThisCategory = clubsForBaseName.filter(club => club.categoryId === category.id);
        if (teamsInThisCategory.length > 0) {
            acc[category.id] = teamsInThisCategory;
        }
        return acc;
    }, {});

    // Vyčistiť loading message v kontajneri tlačidiel
    teamsInCategoryButtonsDiv.innerHTML = '';

    // Zobraziť tlačidlá pre kategórie (ktoré majú tímy pod týmto základným názvom)
    const categoryIdsWithTeams = Object.keys(teamsByCategory);

    if (categoryIdsWithTeams.length === 0) {
         teamsInCategoryButtonsDiv.innerHTML = '<p>Žiadne tímy priradené k tomuto klubu v žiadnej kategórii.</p>';
         return;
    }

    categoryIdsWithTeams.forEach(categoryId => {
        const category = allCategories.find(cat => cat.id === categoryId);
        if (category) {
            const button = document.createElement('button');
            button.classList.add('action-button'); // Použi existujúci štýl tlačidla
            button.textContent = `${category.name || category.id} (${teamsByCategory[categoryId].length} tímov)`;
            button.addEventListener('click', () => {
                 // Po kliknutí zobraz detaily tímov v tejto kategórii pre tento klub
                 displayTeamsForCategory(clubBaseName, categoryId, teamsByCategory[categoryId]);
                 // Aktualizuj URL s názvom tímu
                  const url = new URL(window.location.href);
                  url.searchParams.set('club', clubBaseName); // Zachovaj club parameter
                  // url.searchParams.set('category', categoryId); // Môže byť užitočné pridať aj kategóriu do URL, zatiaľ netreba
                  url.searchParams.delete('team'); // Uistite sa, že parameter team je odstránený pri výbere kategórie
                  history.pushState({ clubBaseName: clubBaseName, categoryId: categoryId }, '', url.toString());
            });
            teamsInCategoryButtonsDiv.appendChild(button);
        }
    });

     // Skontrolovať, či URL obsahuje parameter 'team' a zobraziť jeho detaily
     const urlParams = new URLSearchParams(window.location.search);
     const teamIdFromUrl = urlParams.get('team');

     if (teamIdFromUrl) {
          // Nájdeme tím v načítaných kluboch (ktoré už máme)
          const teamFromUrl = allClubs.find(club => club.id === teamIdFromUrl && getClubBaseName(club) === clubBaseName);

          if (teamFromUrl) {
               // Ak sa tím našiel a patrí k aktuálnemu zobrazenému klubu, zobraz jeho detaily
               displayTeamDetails(teamFromUrl);
          } else {
               console.warn(`Tím s ID "${teamIdFromUrl}" pre klub "${clubBaseName}" sa nenašiel.`);
               // Ak sa tím nenašiel, ale klub je zobrazený, odstráň parameter team z URL
               const url = new URL(window.location.href);
               url.searchParams.delete('team');
               history.replaceState({ clubBaseName: clubBaseName }, '', url.toString());
               // A uisti sa, že detaily tímu nie sú zobrazené (už skryté na začiatku funkcie)
          }
     } else {
          // Ak nie je v URL parameter team, uisti sa, že detaily tímu nie sú zobrazené
          clearTeamDetails();
     }
}


// Function to display the list of teams within a selected category for a club base name
function displayTeamsForCategory(clubBaseName, categoryId, teams) {
    if (!teamsInCategoryButtonsDiv || !selectedTeamDetailsDiv) {
         console.error("Potrebné DOM elementy pre zobrazenie tímov neboli nájdené.");
         return;
    }

    // Vyčistiť existujúce tlačidlá tímov a skryť detaily tímu
    teamsInCategoryButtonsDiv.innerHTML = ''; // Vyčistí tlačidlá kategórií
    selectedTeamDetailsDiv.style.display = 'none'; // Skryje detaily konkrétneho tímu
    clearTeamDetails(); // Vyčistí obsah detailov tímu


    const category = allCategories.find(cat => cat.id === categoryId);
    const categoryName = category ? (category.name || category.id) : categoryId;

    // Zobraziť tlačidlá pre každý tím v rámci vybranej kategórie
    if (teams && teams.length > 0) {
         // Pridaj nadpis pre tímy v danej kategórii (voliteľné)
         const categoryTeamsTitle = document.createElement('h4');
         categoryTeamsTitle.textContent = `Tímy v kategórii ${categoryName} pre ${clubBaseName}`;
         teamsInCategoryButtonsDiv.appendChild(categoryTeamsTitle);


         teams.forEach(team => {
            const button = document.createElement('button');
            button.classList.add('action-button'); // Použi existujúci štýl tlačidla
            // Názov tímu môže byť len základný názov klubu, alebo s pridaným identifikátorom
            // Ak má tím groupName, použijeme groupName, inak len základný názov
            const teamDisplayName = team.groupName && team.groupName !== team.name ? `${getClubBaseName(team)} - ${team.groupName}` : getClubBaseName(team);
            button.textContent = teamDisplayName; // Zobrazí základný názov klubu
            button.addEventListener('click', () => {
                 // Po kliknutí zobraz detaily konkrétneho tímu
                 displayTeamDetails(team);
                 // Aktualizuj URL s ID tímu
                 const url = new URL(window.location.href);
                 url.searchParams.set('club', clubBaseName); // Zachovaj club parameter
                 url.searchParams.set('team', team.id); // Pridaj parameter team s ID tímu
                 history.pushState({ clubBaseName: clubBaseName, categoryId: categoryId, teamId: team.id }, '', url.toString());
            });
            teamsInCategoryButtonsDiv.appendChild(button);
        });
    } else {
        teamsInCategoryButtonsDiv.innerHTML = `<p>Žiadne tímy v kategórii ${categoryName} pre ${clubBaseName}.</p>`;
    }
}

// Function to display details of a specific team
function displayTeamDetails(team) {
     if (!selectedTeamDetailsDiv || !selectedTeamRealizacnyTimDiv || !selectedTeamTrenerInfoSpan || !selectedTeamVeduciDruzstvaInfoSpan || !selectedTeamSoupiskaHracovUl) {
         console.error("Potrebné DOM elementy pre detaily tímu neboli nájdené.");
         return;
     }

    // Zobrazí sekciu detailov tímu
    selectedTeamDetailsDiv.style.display = 'block';

    // Vyplní informácie o realizačnom tíme
    selectedTeamTrenerInfoSpan.textContent = team.trener || 'Nezadané';
    selectedTeamVeduciDruzstvaInfoSpan.textContent = team.veduci || 'Nezadané';

    // Vyplní súpisku hráčov
    selectedTeamSoupiskaHracovUl.innerHTML = ''; // Vyčistí súpisku
    if (team.hraci && team.hraci.length > 0) {
        team.hraci.forEach(hrac => {
            const li = document.createElement('li');
             // Zobrazí meno a priezvisko, ak existujú, inak 'Nezadané meno'
            li.textContent = hrac.name && hrac.surname ? `${hrac.name} ${hrac.surname}` : 'Nezadaný hráč';
            selectedTeamSoupiskaHracovUl.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'Zatiaľ bez súpisky.';
        selectedTeamSoupiskaHracovUl.appendChild(li);
    }
}

// Helper function to clear team details display
function clearTeamDetails() {
     if (selectedTeamRealizacnyTimDiv && selectedTeamTrenerInfoSpan && selectedTeamVeduciDruzstvaInfoSpan && selectedTeamSoupiskaHracovUl) {
         selectedTeamTrenerInfoSpan.textContent = 'Nezadané';
         selectedTeamVeduciDruzstvaInfoSpan.textContent = 'Nezadané';
         selectedTeamSoupiskaHracovUl.innerHTML = '<li>Zatiaľ bez súpisky.</li>';
         selectedTeamDetailsDiv.style.display = 'none';
     }
}


// Function to handle the "Back to List" button click
function goBackToList() {
    // Odstráni parametre club a team z URL a vráti sa na základný zoznam klubov
    const url = new URL(window.location.href);
    url.searchParams.delete('club');
    url.searchParams.delete('team');
    history.pushState(null, '', url.pathname); // Použi pathname, nie toString(), aby sa odstránili všetky query params
    displayClubsSummaryTable(); // Zobrazí prehľadovú tabuľku
}


// Function to handle URL state changes (initial load and popstate)
async function handleUrlState() {
    const urlParams = new URLSearchParams(window.location.search);
    const clubBaseName = urlParams.get('club');
    const teamId = urlParams.get('team');

     // Najprv načítame všetky dáta, ktoré budeme potrebovať
     await loadAllCategories();
     await loadAllClubs();


    if (clubBaseName) {
         // V URL je parameter 'club', zobraz detaily daného klubu
         // Musíme overiť, či klub s takým baseName existuje v načítaných dátach
         const subjectExists = allClubs.some(club => getClubBaseName(club) === clubBaseName);

         if (subjectExists) {
              displaySubjectDetails(clubBaseName);
              // displaySubjectDetails volá displayTeamsForCategory, ak sú tímy,
              // a displayTeamsForCategory potom volá displayTeamDetails, ak je v URL aj parameter teamId.
         } else {
              // Subjekt s daným baseName sa nenašiel, zobraz zoznam klubov
              console.warn(`Subjekt "${clubBaseName}" sa nenašiel.`);
              history.replaceState(null, '', window.location.pathname); // Odstráň neplatné parametre z URL
              displayClubsSummaryTable();
         }
    } else {
        // V URL nie sú žiadne relevantné parametre, zobraz zoznam klubov
        displayClubsSummaryTable();
    }
}


// Spustenie spracovania URL stavu po načítaní DOM
document.addEventListener('DOMContentLoaded', () => {
    // Odstránenie starej logiky pri načítaní DOM, voláme handleUrlState
    handleUrlState();

    if (backToListButton) {
        // Zabezpečiť, že tlačidlo Späť volá novú funkciu goBackToList
        // Odstráň existujúce listenery kliknutia, aby sa nepridali duplicitne
        // Najbezpečnejší spôsob je klonovať element a nahradiť ho
        const newButton = backToListButton.cloneNode(true);
        backToListButton.parentNode.replaceChild(newButton, backToListButton);
        // Získaj referenciu na nový (klonovaný) element tlačidla
        const updatedBackButton = document.getElementById('backToListButton');


        updatedBackButton.addEventListener('click', goBackToList);

    } else {
       console.warn("Element s ID 'backToListButton' nebol nájdený.");
    }
});

// Spracovanie udalosti popstate (pri navigácii späť/vpred v prehliadači)
window.addEventListener('popstate', (event) => {
    console.log("Popstate event:", event.state); // Debugging
     // Pri popstate znova spracujeme URL stav
    handleUrlState();
});
