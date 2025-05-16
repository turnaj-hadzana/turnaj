// Import potrebných funkcií a referencií z common súboru
import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js'; // Import collection explicitne

// Referencie na HTML elementy (aktualizované)
const clubListSection = document.getElementById('clubListSection');
const clubsSummaryTable = document.getElementById('clubsSummaryTable'); // Nová referencia na celú tabuľku
const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader'); // Nová referencia na thead > tr
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody'); // Nová referencia
const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span');
// Referencie pre zobrazenie detailov konkrétneho tímu
const selectedTeamDetailsDiv = document.getElementById('selectedTeamDetails');
const selectedTeamNameSpan = document.getElementById('selectedTeamName');
const selectedTeamRealizacnyTimDiv = document.getElementById('selectedTeamRealizacnyTim');
const selectedTeamTrenerInfoSpan = document.getElementById('selectedTeamTrenerInfo');
const selectedTeamVeduciDruzstvaInfoSpan = document.getElementById('selectedTeamVeduciDruzstvaInfo');
const selectedTeamSoupiskaHracovUl = document.getElementById('selectedTeamSoupiskaHracov');

// Nové referencie pre zobrazenie zoznamu tímov v detailoch klubu
const detailCategoryNameSpan = document.getElementById('detailCategoryName');
const teamsInCategoryListUl = document.getElementById('teamsInCategoryList'); // Zoznam tímov v detaile klubu

// Premenné na ukladanie dát
let allClubs = [];
let allCategories = [];
let allGroups = []; // Aj keď skupiny nebudú v prehľadovej tabuľke, stále ich môžeme potrebovať pre detaily tímu

// Funkcia na načítanie všetkých dát
async function loadAllData() {
    try {
        // Načítaj všetky kluby/tímy
        const clubsSnapshot = await getDocs(clubsCollectionRef);
        allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Načítaj všetky kategórie (pre dynamické stĺpce tabuľky)
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         // Zoraď kategórie pre konzistentné poradie stĺpcov
         allCategories.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));


        // Načítaj všetky skupiny (možno pre detaily tímu)
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error('Chyba pri načítaní dát turnaja:', error);
        alert('Nepodarilo sa načítať dáta turnaja.');
        // Zobraz chybovú správu v tabuľke
        if (clubsSummaryTableBody) {
             // Zmenené colspan na 1, pretože je len jeden pevný stĺpec na začiatku
             clubsSummaryTableBody.innerHTML = `<tr><td colspan="1" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
             // Ak hlavička už existuje, pokús sa nastaviť colspan aj tam
             updateHeaderColspan(1);
        }
         allClubs = [];
         allCategories = [];
         allGroups = [];
    }
}

// Pomocná funkcia na získanie "hlavného názvu" klubu
// Toto je kľúčové pre zoskupenie tímov pod jeden názov subjektu
// Predpokladáme, že hlavný názov subjektu je buď v poli 'createdFromBase'
// alebo v prvej časti ID dokumentu pred ' - ' ak 'createdFromBase' chýba
function getClubBaseName(club) {
    if (club.createdFromBase && typeof club.createdFromBase === 'string' && club.createdFromBase.trim() !== '') {
        return club.createdFromBase.trim();
    }
    if (club.id && typeof club.id === 'string' && club.id.includes(' - ')) {
        return club.id.split(' - ')[0].trim();
    }
    return club.name || club.id || 'Neznámy subjekt'; // Fallback
}

// Funkcia na aktualizáciu colspan hlavičky a tela tabuľky
function updateHeaderColspan(numCategoryColumns) {
    if (clubsSummaryTableHeader) {
        const fixedHeaderCell = clubsSummaryTableHeader.querySelector('th');
        if (fixedHeaderCell) {
            // colspan bude 1 (pre názov klubu) + počet stĺpcov kategórií
            fixedHeaderCell.colSpan = 1 + numCategoryColumns;
        }
        // Odstráň staré hlavičky kategórií
        clubsSummaryTableHeader.querySelectorAll('th[data-category-id]').forEach(th => th.remove());
    }

    if (clubsSummaryTableBody) {
         // Nájsť prvý riadok s načítavacou/chybovou správou a aktualizovať jeho colspan
         const firstRow = clubsSummaryTableBody.querySelector('tr');
         if (firstRow) {
              const firstCell = firstRow.querySelector('td');
              if (firstCell) {
                   firstCell.colSpan = 1 + numCategoryColumns;
              }
         }
    }
}


// Funkcia na zobrazenie prehľadnej tabuľky klubov podľa kategórií
function displayClubsSummaryTable() {
    // Uisti sa, že sú zobrazené sekcie so zoznamom a skryté detaily
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';

    if (!clubsSummaryTableBody || !clubsSummaryTableHeader) {
        console.error("Potrebné elementy tabuľky nenájdené!");
        return;
    }

    // Vyprázdni telo tabuľky pred vyplnením
    clubsSummaryTableBody.innerHTML = '';

    // Vygeneruj hlavičky kategórií
    // Začni od 1, preskoč prvý pevný stĺpec (Názov klubu/subjektu)
    const existingFixedHeader = clubsSummaryTableHeader.querySelector('th'); // Získaj existujúcu pevnú hlavičku
    if (!existingFixedHeader) { // Ak z nejakého dôvodu pevná hlavička chýba, vytvor ju (nemalo by sa stať)
         const defaultTh = document.createElement('th');
         defaultTh.textContent = 'Názov klubu/subjektu';
         clubsSummaryTableHeader.appendChild(defaultTh);
    }

    allCategories.forEach(category => {
        const th = document.createElement('th');
        th.textContent = category.name || category.id; // Názov kategórie ako hlavička
        th.dataset.categoryId = category.id; // Ulož ID kategórie do data atribútu
        th.style.textAlign = 'center'; // Centrovanie čísel v stĺpcoch
        clubsSummaryTableHeader.appendChild(th);
    });

    // Aktualizuj colspan pre počiatočné správy (napr. načítavam)
    updateHeaderColspan(allCategories.length);


    if (allClubs.length === 0) {
        // Zobraz správu, ak nie sú žiadne kluby
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        cell.colSpan = 1 + allCategories.length; // Colspan = 1 (názov) + počet kategórií
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad.";
        cell.style.textAlign = 'center';
        return; // Ukonči funkciu, ak nie sú kluby
    }

    // Zoskup kluby podľa ich hlavného názvu subjektu
    const clubsByBaseName = allClubs.reduce((acc, club) => {
        const baseName = getClubBaseName(club);
        if (!acc[baseName]) {
            acc[baseName] = [];
        }
        acc[baseName].push(club);
        return acc;
    }, {});

    // Získaj a zoraď unikátne hlavné názvy subjektov
    const sortedBaseNames = Object.keys(clubsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));


    // Vyplň tabuľku prehľadu
    sortedBaseNames.forEach(baseName => {
        const row = clubsSummaryTableBody.insertRow();
        row.dataset.baseName = baseName; // Ulož hlavný názov do data atribútu riadku
        row.style.cursor = 'pointer'; // Naznač, že riadok je klikateľný

        // Pridaj poslucháč udalosti kliknutia na riadok
        row.addEventListener('click', () => {
             // Pri kliknutí na riadok zobrazíme detaily VŠETKÝCH tímov tohto subjektu
             displayClubDetails(baseName); // Použijeme baseName ako identifikátor
        });


        const baseNameCell = row.insertCell();
        baseNameCell.textContent = baseName; // Hlavný názov klubu/subjektu

        // Pre každú kategóriu spočítaj tímy daného subjektu
        allCategories.forEach(category => {
            const countCell = row.insertCell();
            const categoryId = category.id;

            // Spočítať tímy daného subjektu v danej kategórii
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;

            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : ''; // Zobraz počet, ak je > 0, inak prázdne
            countCell.style.textAlign = 'center'; // Centrovanie čísla
             if (teamsInCategoryCount > 0) {
                  countCell.style.fontWeight = 'bold'; // Zvýrazni bunky s počtom
                  // Môžeš tu pridať aj ďalšie štýly, napr. farbu pozadia
             }
             // Možno pridať poslucháč udalosti kliknutia na túto bunku pre zobrazenie detailov len pre túto kategóriu?
             // Zatiaľ to neimplementujeme, aby sme nezložili logiku príliš, ale je to možnosť.
        });
    });
}

// Funkcia na zobrazenie detailov VŠETKÝCH tímov pre daný hlavný názov subjektu
// Toto nahrádza pôvodnú displayClubDetails
async function displayClubDetails(baseName) {
     // Skry zoznam a zobraz sekciu detailov
     if (clubListSection) clubListSection.style.display = 'none';
     if (clubDetailSection) clubDetailSection.style.display = 'block';

     // Vyprázdni predchádzajúce detaily
     if(clubDetailTitleSpan) clubDetailTitleSpan.textContent = baseName; // Nastav názov subjektu
     if(teamsInCategoryListUl) teamsInCategoryListUl.innerHTML = '<li>Načítavam tímy...</li>';
     // Skry detaily konkrétneho tímu, kým nejaký nie je vybratý
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
      if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';


     // Nájsť všetky tímy patriace tomuto hlavnému subjektu
     const teamsForSubject = allClubs.filter(club => getClubBaseName(club) === baseName);

     if (!teamsInCategoryListUl) {
          console.error("Element #teamsInCategoryListUl not found!");
          return;
     }

     teamsInCategoryListUl.innerHTML = ''; // Vyprázdni zoznam tímov

     if (teamsForSubject.length === 0) {
          const noTeamsItem = document.createElement('li');
          noTeamsItem.textContent = `Žiadne tímy pre subjekt "${baseName}".`;
          teamsInCategoryListUl.appendChild(noTeamsItem);
     } else {
          // Zoraď tímy pre konzistentné zobrazenie
          teamsForSubject.sort((a, b) => {
               // Môžeš zoraďovať podľa kategórie, potom podľa názvu tímu alebo ID
               const categoryA = a.categoryId || '';
               const categoryB = b.categoryId || '';
               const categoryComparison = categoryA.localeCompare(categoryB, 'sk-SK');
               if (categoryComparison !== 0) {
                    return categoryComparison;
               }
               const nameA = (a.name || a.id || '').toLowerCase();
               const nameB = (b.name || b.id || '').toLowerCase();
               return nameA.localeCompare(nameB, 'sk-SK');
          });


          teamsForSubject.forEach(team => {
               const teamItem = document.createElement('li');
               teamItem.textContent = team.name || team.id; // Zobraz názov tímu
               teamItem.dataset.teamId = team.id; // Ulož ID tímu
               teamItem.style.cursor = 'pointer'; // Naznač klikateľnosť
               teamItem.style.fontWeight = 'normal'; // Základné zobrazenie
               teamItem.style.listStyleType = 'disc'; // Odrážky
               teamItem.style.marginLeft = '20px';

                // Pridaj poslucháč kliknutia na konkrétny tím v zozname
                teamItem.addEventListener('click', () => {
                     displaySpecificTeamDetails(team.id); // Zobraz detaily vybratého tímu
                     // Zvýrazni vybratý tím v zozname
                     teamsInCategoryListUl.querySelectorAll('li').forEach(li => li.style.fontWeight = 'normal');
                     teamItem.style.fontWeight = 'bold';
                });

               teamsInCategoryListUl.appendChild(teamItem);
          });
     }

     // Voliteľné: Ak chceš hneď zobraziť detaily prvého tímu v zozname
     // if (teamsForSubject.length > 0) {
     //      displaySpecificTeamDetails(teamsForSubject[0].id);
     //      if(teamsInCategoryListUl.querySelector('li')) {
     //          teamsInCategoryListUl.querySelector('li').style.fontWeight = 'bold';
     //      }
     // } else {
     //      // Ak nie sú žiadne tímy, skry sekciu detailov konkrétneho tímu
     //      if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     // }

      // Dôležité: Pri zobrazení prehľadu subjektu sa detaily konkrétneho tímu skryjú
      if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
      if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
      if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
      if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';


}

// Funkcia na načítanie a zobrazenie detailov JEDNÉHO vybratého tímu
async function displaySpecificTeamDetails(teamId) {
    // Uisti sa, že sekcia pre detaily konkrétneho tímu je zobrazená
    if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'block';

    // Zobraz načítavacie správy
    if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Načítavam...';
    if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p>Tréner: Načítavam...</p><p>Vedúci družstva: Načítavam...</p>';
    if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Načítavam súpisku...</li>';


    try {
        // Načítaj samotný dokument tímu
        const teamDocRef = doc(clubsCollectionRef, teamId); // Klubu sú v kolekcii clubs
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) {
            if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba: Tím nenájdený';
            if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Detail tímu sa nepodarilo načítať.</p>';
            if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
            console.error(`Tím s ID ${teamId} sa nenašiel.`);
            return;
        }

        const teamData = teamDoc.data();
        const teamName = teamData.name || teamDoc.id;

        // Nastav názov tímu v hlavičke detailu konkrétneho tímu
        if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = teamName;

        // --- Načítanie a zobrazenie Realizačného tímu pre tento konkrétny tím ---
        if (selectedTeamRealizacnyTimDiv) {
            selectedTeamRealizacnyTimDiv.innerHTML = ''; // Vyprázdni predchádzajúci obsah

            const trenerPara = document.createElement('p');
            trenerPara.textContent = 'Tréner: ';
            const trenerSpan = document.createElement('span');
            trenerSpan.textContent = 'Načítavam...'; // Počiatočný stav
            trenerPara.appendChild(trenerSpan);
            selectedTeamRealizacnyTimDiv.appendChild(trenerPara);

            const veduciPara = document.createElement('p');
            veduciPara.textContent = 'Vedúci družstva: ';
            const veduciSpan = document.createElement('span');
            veduciSpan.textContent = 'Načítavam...'; // Počiatočný stav
            veduciPara.appendChild(veduciSpan);
            selectedTeamRealizacnyTimDiv.appendChild(veduciPara);

             // Pridaj referenciu na subkolekciu 'realizacnyTim' pod DOKUMENTOM TÍMU
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

                  // Aktualizuj text po načítaní
                  if(trenerSpan) trenerSpan.textContent = trenerName;
                  if(veduciSpan) veduciSpan.textContent = veduciName;

             } catch (realizacnyTimError) {
                  console.error('Chyba pri načítaní realizačného tímu pre tím:', realizacnyTimError);
                  if(trenerSpan) trenerSpan.textContent = 'Chyba pri načítaní';
                  if(veduciSpan) veduciSpan.textContent = 'Chyba pri načítaní';
             }
        }


        // --- Načítanie a zobrazenie Súpisky hráčov pre tento konkrétny tím ---
        if (selectedTeamSoupiskaHracovUl) {
             selectedTeamSoupiskaHracovUl.innerHTML = ''; // Vyprázdni predchádzajúci obsah

             // Pridaj referenciu na subkolekciu 'hraci' pod DOKUMENTOM TÍMU
             const hraciCollectionRef = collection(teamDoc.ref, 'hraci');

             try {
                  const hraciSnapshot = await getDocs(hraciCollectionRef);

                  if (hraciSnapshot.empty) {
                       const noPlayersItem = document.createElement('li');
                       noPlayersItem.textContent = 'Zatiaľ bez súpisky.';
                       selectedTeamSoupiskaHracovUl.appendChild(noPlayersItem);
                  } else {
                       const hraciList = hraciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                       // Zoraď hráčov
                       hraciList.sort((a, b) => {
                            // Predpokladáme pole 'cisloDresu' a 'meno' pre hráčov
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
                  console.error('Chyba pri načítaní súpisky hráčov pre tím:', hraciError);
                  if (selectedTeamSoupiskaHracovUl) {
                       selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
                  }
             }
        }


    } catch (error) {
        console.error('Chyba pri načítaní detailov konkrétneho tímu:', error);
         if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba pri načítaní detailov tímu';
         if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Nepodarilo sa načítať detaily realizačného tímu.</p>';
         if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Nepodarilo sa načítať súpisku.</li>';
    }
}


// Funkcia na návrat zo zobrazenia detailov na zoznam klubov
function goBackToList() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';

    // Vyčisti obsah detailov pri návrate
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = '';
    if (detailCategoryNameSpan) detailCategoryNameSpan.textContent = '';
    if (teamsInCategoryListUl) teamsInCategoryListUl.innerHTML = '';

    // Skry a vyčisti detaily konkrétneho tímu
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';

     // Znova zobraz tabuľku prehľadu
     // displayClubsSummaryTable(); // Toto nie je nutné, dáta sú už načítané a HTML zobrazené
}

// Inicializácia po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    // Načítaj všetky potrebné dáta
    await loadAllData();

    // Zobraz prehľadnú tabuľku klubov
    displayClubsSummaryTable();

    // Pridaj poslucháč udalosti na tlačidlo "Späť na prehľad"
    if (backToListButton) {
        backToListButton.addEventListener('click', goBackToList);
    } else {
         console.error("Element #backToListButton not found!");
    }
});
