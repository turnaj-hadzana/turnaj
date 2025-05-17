import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';
let dynamicContentArea = null;
let backToCategoriesButton = null;
let backToGroupButtonsButton = null;
let categoryButtonsContainer = null;
let categoryTitleDisplay = null;
let groupSelectionButtons = null;
let allGroupsContent = null;
let singleGroupContent = null;
let allGroupsContainer = null;
let allGroupsUnassignedDisplay = null;
let singleGroupDisplayBlock = null;
let singleGroupUnassignedDisplay = null;
let allCategories = [];
let allGroups = [];
let allTeams = [];
let currentCategoryId = null;
let currentGroupId = null;

// Funkcia na získanie HTML elementov a základnú kontrolu
function getHTMLElements() {
     dynamicContentArea = document.getElementById('dynamicContentArea');
     backToCategoriesButton = document.getElementById('backToCategoriesButton');
     backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton');
     categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
     categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
     groupSelectionButtons = document.getElementById('groupSelectionButtons');
     allGroupsContent = document.getElementById('allGroupsContent');
     singleGroupContent = document.getElementById('singleGroupContent');
     allGroupsContainer = allGroupsContent ? allGroupsContent.querySelector('.groups-container') : null;
     allGroupsUnassignedDisplay = allGroupsContent ? allGroupsContent.querySelector('.unassigned-teams-display') : null;
     singleGroupDisplayBlock = singleGroupContent ? singleGroupContent.querySelector('.group-display') : null;
     singleGroupUnassignedDisplay = singleGroupContent ? singleGroupContent.querySelector('.unassigned-teams-display') : null;
     const elementsFound = dynamicContentArea && backToCategoriesButton && backToGroupButtonsButton &&
                           categoryButtonsContainer && categoryTitleDisplay && groupSelectionButtons &&
                           allGroupsContent && singleGroupContent &&
                           allGroupsContainer && allGroupsUnassignedDisplay &&
                           singleGroupDisplayBlock && singleGroupUnassignedDisplay;
    if (!elementsFound) {
         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>FATAL ERROR: Chyba pri inicializácii aplikácie. Chýbajú potrebné HTML elementy. Skontrolujte konzolu pre detaily.</p>';
         // Skryť všetko ostatné, ak chýbajú elementy
         if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
         if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
         if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
         if (allGroupsContent) allGroupsContent.style.display = 'none';
         if (singleGroupContent) singleGroupContent.style.display = 'none';
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
         return false;
     }
      return true;
}

// Funkcia na načítanie dát z databázy (zostala nezmenená)
async function loadAllTournamentData() {
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         // Ensure categoryId is correctly linked if not present (backward compatibility)
         allGroups = allGroups.map(group => {
              if (!group.categoryId) {
                 const categoryFromId = allCategories.find(cat => group.id.startsWith(`${cat.id} - `));
                 if (categoryFromId) {
                      group.categoryId = categoryFromId.id;
                 }
              }
              return group;
         }).filter(group => group.categoryId); // Filter out groups without a valid categoryId
        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));

        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        // Zobraziť chybu pod tlačidlami kategórií
        if (dynamicContentArea && categoryButtonsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
            // Insert after category buttons container
            categoryButtonsContainer.parentNode.insertBefore(errorDiv, categoryButtonsContainer.nextSibling);
        } else if (dynamicContentArea) {
             dynamicContentArea.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
        // Skryť všetko okrem prípadnej chybovej správy
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
        if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
        if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja."); // Voliteľné upozornenie pre používateľa
    }
}

// Táto funkcia teraz riadi IBA zobrazenie allGroupsContent a singleGroupContent (zostala nezmenená)
function showOnly(containerIdToShow) {
    if (allGroupsContent) allGroupsContent.style.display = 'none';
    if (singleGroupContent) singleGroupContent.style.display = 'none';

    if (dynamicContentArea) {
        if (containerIdToShow === 'singleGroupContent') {
            dynamicContentArea.classList.add('single-group-active');
        } else {
            dynamicContentArea.classList.remove('single-group-active');
        }
    }

    switch (containerIdToShow) {
        case 'allGroupsContent':
            if (allGroupsContent) allGroupsContent.style.display = 'block';
            break;
        case 'singleGroupContent':
            if (singleGroupContent) singleGroupContent.style.display = 'block';
            break;
        default: // Skryť obe hlavné obsahové oblasti
             if (allGroupsContent) allGroupsContent.style.display = 'none';
             if (singleGroupContent) singleGroupContent.style.display = 'none';
            break;
    }

     // Logic for resizing tables within the displayed content (zostala nezmenená)
     if (containerIdToShow === 'allGroupsContent' && allGroupsContainer && window.getComputedStyle(allGroupsContent).display !== 'none') {
         const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
          if (uniformWidth > 0) {
             setUniformTableWidth(uniformWidth, allGroupsContainer);
          }
     } else if (containerIdToShow === 'singleGroupContent' && singleGroupContent && window.getComputedStyle(singleGroupContent).display !== 'none') {
           const uniformWidth = findMaxTableContentWidth(singleGroupContent);
            if (uniformWidth > 0) {
               setUniformTableWidth(uniformWidth, singleGroupContent);
            }
     }
}

// --- Pomocné funkcie pre správu aktívnych tried tlačidiel ---

// Odstráni triedu 'active' zo všetkých tlačidiel kategórií
function clearActiveCategoryButtons() {
    const categoryButtons = categoryButtonsContainer ? categoryButtonsContainer.querySelectorAll('.display-button') : [];
    categoryButtons.forEach(button => button.classList.remove('active'));
}

// Pridá triedu 'active' tlačidlu kategórie s daným ID
function setActiveCategoryButton(categoryId) {
    clearActiveCategoryButtons(); // Najprv odstráni 'active' zo všetkých ostatných
    const categoryButton = categoryButtonsContainer ? categoryButtonsContainer.querySelector(`.display-button[data-category-id="${categoryId}"]`) : null;
    if (categoryButton) {
        categoryButton.classList.add('active');
    }
}

// Odstráni triedu 'active' zo všetkých tlačidiel výberu skupiny
function clearActiveGroupButtons() {
     const groupButtons = groupSelectionButtons ? groupSelectionButtons.querySelectorAll('.display-button') : [];
     groupButtons.forEach(button => button.classList.remove('active'));

     // Tiež odstrániť z názvov skupín v prehľade, ak boli aktívne (aj keď teraz nie sú klikateľné v single view)
     // Pôvodne názvy skupín v prehľade boli klikateľné a mali hover, po kliknutí na ne sa prešlo na single view.
     // Ak chceme, aby aj tie vizuálne naznačovali "aktívnu" skupinu v prehľade, potrebujeme pridať logiku aj sem.
     // Pre zjednodušenie sa zatiaľ zameriame len na tlačidlá v groupSelectionButtons.

     // Logika pre názvy skupín v prehľade (h3 elementy v .group-display):
     const groupTitlesInAllView = allGroupsContainer ? allGroupsContainer.querySelectorAll('.group-display h3') : [];
     groupTitlesInAllView.forEach(title => title.classList.remove('active-title')); // Použijeme inú triedu pre názvy
}

// Pridá triedu 'active' tlačidlu výberu skupiny s daným ID
function setActiveGroupButton(groupId) {
    clearActiveGroupButtons(); // Najprv odstráni 'active' zo všetkých ostatných tlačidiel skupín
    const groupButton = groupSelectionButtons ? groupSelectionButtons.querySelector(`.display-button[data-group-id="${groupId}"]`) : null;
    if (groupButton) {
        groupButton.classList.add('active');
    }

     // Logika pre názvy skupín v prehľade: Pridať triedu 'active-title' zodpovedajúcemu názvu
     const groupTitleInAllView = allGroupsContainer ? allGroupsContainer.querySelector(`.group-display h3`) : null; // Toto nájde prvý h3, potrebujeme nájsť ten správny podľa ID skupiny
     // Na nájdenie správneho h3 potrebujeme prejsť skupiny v allGroupsContainer a porovnať ID
     if (allGroupsContainer) {
         const groupDisplays = allGroupsContainer.querySelectorAll('.group-display');
         groupDisplays.forEach(groupDiv => {
             const h3Title = groupDiv.querySelector('h3');
             // Potrebujeme zistiť, ku ktorej skupine tento div patrí.
             // V súčasnosti nemáme v HTML elemente skupiny ID skupiny.
             // Môžeme buď pridať data-group-id k .group-display alebo h3, alebo nájsť názov skupiny v h3 a porovnať s názvom aktuálnej skupiny.
             // Pridanie data-group-id je robustnejšie. Upravím HTML generovanie v displayGroupsForCategory.

             // Zatiaľ (ak neupravíme HTML generovanie) skúsime podľa textu názvu skupiny:
              const group = allGroups.find(g => g.id === groupId);
              if (group && h3Title && h3Title.textContent === (group.name || group.id)) {
                   h3Title.classList.add('active-title');
              }
         });
     }
}


// Zobrazí úvodný pohľad s tlačidlami kategórií
function displayCategoriesAsButtons() {
    currentCategoryId = null;
    currentGroupId = null;
     if (!getHTMLElements()) {
         return;
     }

    // Nastaviť viditeľnosť pre pohľad s tlačidlami kategórií
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Kategórie sú vždy viditeľné

    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Skryť ostatné hlavné obsahové oblasti
    showOnly(null);

    // Vyčistiť a znova vygenerovať tlačidlá kategórií
    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '';

    // Odstrániť triedy 'active' z tlačidiel (v tomto pohľade nie je žiadne aktívne)
    clearActiveCategoryButtons();
    clearActiveGroupButtons();


    if (window.location.hash) {
        // Ak je hash, ale vraciame sa na kategórie, odstránime hash
        history.replaceState({}, document.title, window.location.pathname);
    }

    if (allCategories.length === 0) {
        if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }

    // Zoskupiť kategórie (Chlapci, Dievčatá, Ostatné) a vytvoriť tlačidlá (zostalo nezmenené, pridaný iba event listener)
    const chlapciCategories = [];
    const dievcataCategories = [];
    const ostatneCategories = [];
    const sortedCategories = [...allCategories].sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

    sortedCategories.forEach(category => {
        const categoryName = category.name || category.id;
        if (categoryName.endsWith(' CH')) {
            chlapciCategories.push(category);
        } else if (categoryName.endsWith(' D')) {
            dievcataCategories.push(category);
        } else {
            ostatneCategories.push(category);
        }
    });

    const createCategoryGroupDisplay = (title, categories) => {
        if (categories.length === 0) return null;
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('category-group');
        const heading = document.createElement('h3');
        heading.textContent = title;
        groupDiv.appendChild(heading);
        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('category-buttons');
        groupDiv.appendChild(buttonsDiv);
        categories.forEach(category => {
            const button = document.createElement('button');
            button.classList.add('display-button');
            button.textContent = category.name || category.id;
            button.dataset.categoryId = category.id;
            button.addEventListener('click', () => {
                const categoryId = button.dataset.categoryId;
                displayGroupsForCategory(categoryId);
            });
            buttonsDiv.appendChild(button);
        });
        return groupDiv;
    };

    if (categoryButtonsContainer) {
         const chlapciGroup = createCategoryGroupDisplay('Chlapci', chlapciCategories);
         if (chlapciGroup) {
              categoryButtonsContainer.appendChild(chlapciGroup);
         }
         const dievcataGroup = createCategoryGroupDisplay('Dievčatá', dievcataCategories);
         if (dievcataGroup) {
              categoryButtonsContainer.appendChild(dievcataGroup);
         }
         const ostatneGroup = createCategoryGroupDisplay('Ostatné kategórie', ostatneCategories);
          if (ostatneGroup) {
              categoryButtonsContainer.appendChild(ostatneGroup);
         }

         if (categoryButtonsContainer.children.length === 0) {
              categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
         }
    }
}

// Zobrazí prehľad skupín pre vybranú kategóriu
function displayGroupsForCategory(categoryId) {
    currentCategoryId = categoryId;
    currentGroupId = null; // Nie sme v detaile jednej skupiny
     if (!getHTMLElements()) {
         goBackToCategories(); // Fallback
         return;
     }

    // Nastaviť viditeľnosť pre pohľad prehľadu skupín
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Kategórie sú vždy viditeľné
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá výberu skupiny viditeľné
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none'; // Tlačidlo späť na skupiny skryté v tomto pohľade

    // Vyčistiť obsah oblasti skupín a nepriradených tímov (v oboch hlavných kontajneroch)
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = ''; // Clear single group content
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Clear single group unassigned
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = ''; // Vyčistiť a znova vygenerovať tlačidlá výberu skupiny

    // Zobraziť oblasť všetkých skupín, skryť detail jednej skupiny
    showOnly('allGroupsContent');

    // Nastaviť aktívnu triedu pre vybranú kategóriu
    setActiveCategoryButton(categoryId);
    clearActiveGroupButtons(); // Pri zobrazení prehľadu skupín by nemala byť aktívna žiadna konkrétna skupina

    // Aktualizovať hash v URL
    window.location.hash = 'category-' + encodeURIComponent(categoryId);

    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) {
         console.error(`Kategória "${categoryId}" sa nenašla.`);
         // Nastaviť viditeľnosť pri chybe
         if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
         if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
         showOnly(null); // Skryť aj oblasti obsahu
         if (dynamicContentArea && categoryButtonsContainer) {
             const errorDiv = document.createElement('div');
             errorDiv.innerHTML = `<p>Chyba: Kategória "${categoryId}" sa nenašla. Prosím, skúste znova alebo kontaktujte administrátora.</p>`;
              categoryButtonsContainer.parentNode.insertBefore(errorDiv, categoryButtonsContainer.nextSibling);
         }
        return;
    }

     if (categoryTitleDisplay) categoryTitleDisplay.textContent = selectedCategory.name || selectedCategory.id;

    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);

     // Apply special layout class if exactly 5 groups for this category
     if (allGroupsContainer) {
         if (groupsInCategory.length === 5) {
              allGroupsContainer.classList.add('force-3-plus-2-layout');
         } else {
              allGroupsContainer.classList.remove('force-3-plus-2-layout');
         }
     }

    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));

    if (groupsInCategory.length === 0) {
         // Ak nie sú skupiny, skryť tlačidlá výberu skupiny a zobraziť správu
         if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
         if (allGroupsContainer) allGroupsContainer.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
    } else {
        // Zobraziť tlačidlá výberu skupiny a vygenerovať ich
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
        groupsInCategory.forEach(group => {
            const button = document.createElement('button');
            button.classList.add('display-button');
            button.textContent = group.name || group.id;
            button.dataset.groupId = group.id;
            button.addEventListener('click', () => {
                 const groupIdToDisplay = button.dataset.groupId;
                 displaySingleGroup(groupIdToDisplay);
            });
            if (groupSelectionButtons) groupSelectionButtons.appendChild(button);
        });

        // Vygenerovať zobrazenie všetkých skupín s tímami (Upravené pre pridanie data-group-id)
        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display');
            groupDiv.dataset.groupId = group.id; // Pridané data-group-id k div.group-display
            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);
            groupTitle.style.cursor = 'pointer'; // Názov skupiny v prehľade je klikateľný
            groupTitle.addEventListener('click', () => {
                  const groupIdToDisplay = group.id;
                  displaySingleGroup(groupIdToDisplay);
            });

            const teamsInGroup = allTeams.filter(team => team.groupId === group.id);
            if (teamsInGroup.length === 0) {
                const noTeamsPara = document.createElement('p');
                noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                 noTeamsPara.style.padding = '10px';
                groupDiv.appendChild(noTeamsPara);
            } else {
                teamsInGroup.sort((a, b) => {
                    const orderA = a.orderInGroup || Infinity;
                    const orderB = b.orderInGroup || Infinity;
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    const nameA = (a.name || a.id || '').toLowerCase();
                    const nameB = (b.name || b.id || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'sk-SK');
                });
                const teamList = document.createElement('ul');
                teamsInGroup.forEach(team => {
                    const teamItem = document.createElement('li');
                    const teamNameSpan = document.createElement('span');
                    teamNameSpan.classList.add('team-name');
                    teamNameSpan.textContent = team.name || 'Neznámy tím';
                    teamItem.appendChild(teamNameSpan);
                    teamList.appendChild(teamItem);
                });
                groupDiv.appendChild(teamList);
            }
            if (allGroupsContainer) allGroupsContainer.appendChild(groupDiv);
        });
    }

    // Zobraziť nepriradené tímy (zostalo nezmenené)
    const unassignedTeamsInCategory = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === categoryId
    );

     if (unassignedTeamsInCategory.length > 0) {
         if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
         const unassignedDivContent = document.createElement('div');
         unassignedDivContent.classList.add('unassigned-teams-display');
         const unassignedTitle = document.createElement('h2');
         unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
         unassignedDivContent.appendChild(unassignedTitle);
         unassignedTeamsInCategory.sort((a, b) => {
              const nameA = (a.name || a.id || '').toLowerCase();
              const nameB = (b.name || b.id || '').toLowerCase();
              return nameA.localeCompare(nameB, 'sk-SK');
         });
         const unassignedList = document.createElement('ul');
         unassignedTeamsInCategory.forEach(team => {
              const teamItem = document.createElement('li');
              teamItem.textContent = team.name || 'Neznámy tím';
              unassignedList.appendChild(teamItem);
         });
         unassignedDivContent.appendChild(unassignedList);
         if (allGroupsUnassignedDisplay) {
              allGroupsUnassignedDisplay.appendChild(unassignedDivContent);
         }
     } else {
          if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
     }
}

// Zobrazí detail jednej skupiny
function displaySingleGroup(groupId) {
     const group = allGroups.find(g => g.id === groupId);
     if (!group) {
           console.error(`Skupina "${groupId}" sa nenašla.`);
           // Ak sa skupina nenájde, vrátiť sa na zobrazenie skupín pre kategóriu
           const hash = window.location.hash;
           const categoryPrefix = '#category-';
           const hashParts = hash.startsWith(categoryPrefix) ? hash.substring(categoryPrefix.length).split('/')[0] : null;
           const categoryIdFromHash = hashParts ? decodeURIComponent(hashParts) : null;

           if (categoryIdFromHash && allCategories.some(cat => cat.id === categoryIdFromHash)) {
                displayGroupsForCategory(categoryIdFromHash); // Vráti sa na prehľad skupín kategórie z hashu
           } else {
                goBackToCategories(); // Ak sa nedá vrátiť na kategóriu, vráti sa úplne späť
           }
          return;
     }

     currentCategoryId = group.categoryId; // Uistiť sa, že currentCategoryId je nastavené
     currentGroupId = groupId;

     if (!getHTMLElements()) {
         goBackToCategories(); // Fallback
         return;
     }

    // Zabezpečiť viditeľnosť základných elementov pre detail skupiny
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Kategórie sú vždy viditeľné
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá výberu skupiny zostávajú viditeľné
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none'; // Tlačidlo späť na kategórie skryté
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block'; // Tlačidlo späť na skupiny viditeľné

    // Vyčistiť obsah oblastí detailu skupiny
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = ''; // Clear single group content
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Clear single group unassigned

    // Zobraziť detail jednej skupiny, skryť oblasť všetkých skupín
    showOnly('singleGroupContent');

    // Nastaviť aktívnu triedu pre vybranú kategóriu a skupinu
    setActiveCategoryButton(currentCategoryId); // Kategória by mala byť stále aktívna
    setActiveGroupButton(groupId); // Nastaviť aktívnu skupinu

     // Aktualizovať hash v URL
     window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;

      const category = allCategories.find(cat => cat.id === currentCategoryId);
      if (category && categoryTitleDisplay) {
           categoryTitleDisplay.textContent = category.name || category.id;
      }

     if (singleGroupDisplayBlock) {
         // Pre detail skupiny vygenerujeme len samotnú skupinu
         const groupTitle = document.createElement('h3');
         groupTitle.textContent = group.name || group.id;
         // Názov skupiny v detaile NIE JE klikateľný
         groupTitle.style.cursor = 'default';
         groupTitle.style.pointerEvents = 'none';

         singleGroupDisplayBlock.appendChild(groupTitle);

         const teamsInGroup = allTeams.filter(team => team.groupId === group.id);
         if (teamsInGroup.length === 0) {
              const noTeamsPara = document.createElement('p');
              noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
              noTeamsPara.style.padding = '10px';
              singleGroupDisplayBlock.appendChild(noTeamsPara);
         } else {
              teamsInGroup.sort((a, b) => {
                   const orderA = a.orderInGroup || Infinity;
                   const orderB = b.orderInGroup || Infinity;
                   if (orderA !== orderB) {
                       return orderA - orderB;
                   }
                   const nameA = (a.name || a.id || '').toLowerCase();
                   const nameB = (b.name || b.id || '').toLowerCase();
                   return nameA.localeCompare(nameB, 'sk-SK');
              });
              const teamList = document.createElement('ul');
              teamsInGroup.forEach(team => {
                   const teamItem = document.createElement('li');
                   const teamNameSpan = document.createElement('span');
                   teamNameSpan.classList.add('team-name');
                   teamNameSpan.textContent = team.name || 'Neznámy tím';
                   teamItem.appendChild(teamNameSpan);
                   teamList.appendChild(teamItem);
              });
              singleGroupDisplayBlock.appendChild(teamList);
         }
     }

     // Zobraziť nepriradené tímy pre danú kategóriu (zostalo nezmenené)
     const unassignedTeamsInCategory = allTeams.filter(team =>
         (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
         team.categoryId === currentCategoryId
     );

     if (unassignedTeamsInCategory.length > 0) {
         if (singleGroupUnassignedDisplay) {
             singleGroupUnassignedDisplay.innerHTML = ''; // Clear previous unassigned teams
             const unassignedDivContent = document.createElement('div');
             unassignedDivContent.classList.add('unassigned-teams-display');
             const unassignedTitle = document.createElement('h2');
             unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
             unassignedDivContent.appendChild(unassignedTitle);
             unassignedTeamsInCategory.sort((a, b) => {
                  const nameA = (a.name || a.id || '').toLowerCase();
                  const nameB = (b.name || b.id || '').toLowerCase();
                  return nameA.localeCompare(nameB, 'sk-SK');
             });
             const unassignedList = document.createElement('ul');
             unassignedTeamsInCategory.forEach(team => {
                  const teamItem = document.createElement('li');
                  teamItem.textContent = team.name || 'Neznámy tím';
                  unassignedList.appendChild(teamItem);
             });
             unassignedDivContent.appendChild(unassignedList);
             if (singleGroupUnassignedDisplay) {
                  singleGroupUnassignedDisplay.appendChild(unassignedDivContent);
             }
          }
     } else {
          if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Clear if no unassigned teams
     }
}

// Návrat na zobrazenie kategórií
function goBackToCategories() {
    currentCategoryId = null;
    currentGroupId = null;
     if (!getHTMLElements()) {
         return;
     }

    // Nastaviť viditeľnosť pre pohľad kategórií
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Kategórie sú vždy viditeľné
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Vyčistiť obsah (okrem categoryButtonsContainer, ten displayCategoriesAsButtons vyčistí a znova naplní)
     if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = ''; // Clear group selection buttons

    // Skryť ostatné hlavné obsahové oblasti
    showOnly(null);

    // Odstrániť triedy 'active' z tlačidiel
    clearActiveCategoryButtons();
    clearActiveGroupButtons();

    // Odstrániť hash z URL
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    displayCategoriesAsButtons(); // Zobraziť úvodné tlačidlá kategórií
}

// Návrat na prehľad skupín v aktuálnej kategórii
function goBackToGroupView() {
     // Potrebujeme vedieť, v ktorej kategórii sme boli, aby sme sa mohli vrátiť
     const categoryIdToReturnTo = currentCategoryId; // Použijeme uložené ID kategórie
     currentGroupId = null; // Už nie sme v detaile jednej skupiny

     if (!getHTMLElements()) {
          goBackToCategories(); // Fallback
         return;
     }

     if (!categoryIdToReturnTo) {
         goBackToCategories(); // Ak nemáme uložené ID kategórie, vrátime sa úplne späť
         return;
     }

    // Nastaviť viditeľnosť pre pohľad prehľadu skupín
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Kategórie sú vždy viditeľné
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá výberu skupiny viditeľné
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none'; // Tlačidlo späť na kategórie skryté
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none'; // Tlačidlo späť na skupiny skryté v tomto pohľade

    // Vyčistiť obsah oblasti detailu skupiny
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';

    // Zobraziť oblasť všetkých skupín, skryť detail jednej skupiny
    showOnly('allGroupsContent');

    // Aktívnou zostáva kategória, aktívna skupina sa ruší
    setActiveCategoryButton(categoryIdToReturnTo);
    clearActiveGroupButtons();


    // Aktualizovať hash v URL (odstrániť časť so skupinou)
    window.location.hash = 'category-' + encodeURIComponent(categoryIdToReturnTo);

    // Zobraziť prehľad skupín pre danú kategóriu (znova vygeneruje)
    displayGroupsForCategory(categoryIdToReturnTo);
}

// Funkcie na úpravu šírky tabuliek (zostali nezmenené)
function findMaxTableContentWidth(containerElement) {
    let maxWidth = 0;
     if (!containerElement) {
         return 0;
     }
    const groupTables = containerElement.querySelectorAll('.group-display');
     if (groupTables.length === 0) {
         return 0;
     }
    groupTables.forEach(table => {
        const originalStyles = {
            flexBasis: table.style.flexBasis,
            width: table.style.width,
            minWidth: table.style.minWidth,
            maxWidth: table.style.maxWidth,
            flexShrink: table.style.flexShrink,
            flexGrow: table.style.flexGrow,
            display: table.style.display
        };
         let tempDisplay = originalStyles.display;
         if (window.getComputedStyle(table).display === 'none') {
              table.style.display = 'block';
         }
        table.style.flexBasis = 'max-content';
        table.style.width = 'auto';
        table.style.minWidth = 'auto';
        table.style.maxWidth = 'none';
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';
        const requiredWidth = table.offsetWidth;
        table.style.flexBasis = originalStyles.flexBasis;
        table.style.width = originalStyles.width;
        table.style.minWidth = originalStyles.minWidth;
        table.style.maxWidth = originalStyles.maxWidth;
        table.style.flexShrink = originalStyles.flexShrink;
        table.style.flexGrow = originalStyles.flexGrow;
         if (window.getComputedStyle(table).display === 'block' && tempDisplay === 'none') {
             table.style.display = originalStyles.display;
         }
        if (requiredWidth > maxWidth) {
            maxWidth = requiredWidth;
        }
    });
    const safetyPadding = 20;
    return maxWidth > 0 ? maxWidth + safetyPadding : 0;
}

function setUniformTableWidth(width, containerElement) {
    if (width <= 0 || !containerElement) {
        return;
    }
    const groupTables = containerElement.querySelectorAll('.group-display');
     if (groupTables.length === 0) {
         return;
     }
    groupTables.forEach(table => {
        table.style.width = `${width}px`;
        table.style.minWidth = `${width}px`;
        table.style.maxWidth = `${width}px`;
        table.style.flexBasis = 'auto'; // Reset flex-basis
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';
    });
}


// Spracovanie načítania stránky
document.addEventListener('DOMContentLoaded', async () => {
     if (!getHTMLElements()) {
         return;
     }

    await loadAllTournamentData();

    // Pridať poslucháčov udalostí pre tlačidlá späť
    if (backToCategoriesButton) backToCategoriesButton.addEventListener('click', goBackToCategories);
    if (backToGroupButtonsButton) backToGroupButtonsButton.addEventListener('click', goBackToGroupView);

    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';

    // Ak existujú dáta (načítanie bolo úspešné)
    if (allCategories.length > 0) {
        // Vždy zobraziť úvodné tlačidlá kategórií ako východiskový bod
        displayCategoriesAsButtons(); // Toto naplní #categoryButtonsContainer a nastaví jeho display

        if (hash && hash.startsWith(categoryPrefix)) {
            const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
            const urlCategoryId = hashParts[0];
            const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;
            const decodedCategoryId = decodeURIComponent(urlCategoryId);
            const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;

            const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

            if (categoryExists) {
                // Kategória z hashu existuje, prejdeme na zobrazenie skupín pre túto kategóriu
                displayGroupsForCategory(decodedCategoryId); // Toto zobrazí nadpis kategórie, tlačidlá výberu skupiny a prehľad všetkých skupín a nastaví aktívnu kategóriu

                if (decodedGroupId) {
                     const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                     if (groupExists) {
                          // Skupina z hashu existuje v danej kategórii, prejdeme na zobrazenie detailu skupiny
                          displaySingleGroup(decodedGroupId); // Toto prepne zobrazenie na detail skupiny a nastaví aktívnu skupinu
                     } else {
                          // Skupina z hashu sa nenašla v danej kategórii, zostaneme na prehľade skupín kategórie
                          console.warn(`Skupina "${decodedGroupId}" z URL sa nenašla v kategórii "${decodedCategoryId}". Zobrazujem prehľad skupín kategórie.`);
                          // Aktívna kategória je už nastavená, aktívna skupina sa ruší v displayGroupsForCategory
                     }
                } else {
                    // V hashi je iba kategória, zostaneme na prehľade skupín kategórie
                     console.log(`V hashi je iba kategória "${decodedCategoryId}". Zobrazujem prehľad skupín.`);
                    // Aktívna kategória je už nastavená, aktívna skupina sa ruší v displayGroupsForCategory
                }
            } else {
                // Kategória z hashu sa nenašla, zostaneme na úvodnom zobrazení kategórií
                console.warn(`Kategória "${decodedCategoryId}" z URL sa nenašla. Zobrazujem úvodné kategórie.`);
                // displayCategoriesAsButtons(); // Už bolo volané, ruší aktívne triedy
            }
        } else {
            // Žiadny platný hash alebo prázdny hash, zostaneme na úvodnom zobrazení kategórií
             console.log("Žiadny platný hash. Zobrazujem úvodné kategórie.");
            // displayCategoriesAsButtons(); // Už bolo volané, ruší aktívne triedy
        }
    }
    // Ak načítanie dát zlyhalo, chybová správa je zobrazená vo loadAllTournamentData
});

// Spracovanie zmeny hashu v URL
window.addEventListener('hashchange', () => {
    if (!getHTMLElements()) {
         return; // Ak chýbajú elementy, nespúšťať logiku
     }

    // Vždy zabezpečiť viditeľnosť kontajnera kategórií pri zmene hashu
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';

    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';

     if (hash && hash.startsWith(categoryPrefix)) {
        const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
        const urlCategoryId = hashParts[0];
        const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;
        const decodedCategoryId = decodeURIComponent(urlCategoryId);
        const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;

        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
             const alreadyInTargetState = (currentCategoryId === decodedCategoryId) &&
                                          (currentGroupId === decodedGroupId);
             if (alreadyInTargetState) {
                 return; // Už sme v stave definovanom hashom, nič nerobíme
             }

            // Stav sa zmenil, aktualizujeme currentIds
            currentCategoryId = decodedCategoryId;
            currentGroupId = decodedGroupId;

            if (decodedGroupId) {
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      // Skupina existuje, zobraziť prehľad kategórie a potom detail skupiny
                      displayGroupsForCategory(decodedCategoryId); // Nastaví pohľad kategórie a aktívnu kategóriu
                      displaySingleGroup(decodedGroupId); // Prepne na detail skupiny a nastaví aktívnu skupinu
                 } else {
                      // Skupina sa nenašla, zobraziť prehľad skupín kategórie
                      console.warn(`Skupina "${decodedGroupId}" z URL sa nenašla pri zmene hashu. Zobrazujem prehľad skupín kategórie "${decodedCategoryId}".`);
                      displayGroupsForCategory(decodedCategoryId); // Nastaví pohľad kategórie a aktívnu kategóriu
                 }
            } else {
                // V hashi je iba kategória, zobraziť prehľad skupín kategórie
                 console.log(`V hashi je iba kategória "${decodedCategoryId}" pri zmene hashu. Zobrazujem prehľad skupín.`);
                displayGroupsForCategory(decodedCategoryId); // Nastaví pohľad kategórie a aktívnu kategóriu
            }
        } else {
             // Kategória sa nenašla, vrátiť sa na úvodné zobrazenie kategórií a odstrániť hash
             console.warn(`Kategória "${decodedCategoryId}" z URL sa nenašla pri zmene hashu. Vraciam sa na úvod.`);
             goBackToCategories(); // Toto odstráni hash a vráti sa na úvod (ruší aktívne triedy)
        }
    } else {
         // Hash nezačína category prefixom alebo je prázdny, vrátiť sa na úvodné zobrazenie kategórií
         console.log("Hash nezačína 'category-' alebo je prázdny pri zmene hashu. Vraciam sa na úvod.");
         goBackToCategories(); // Toto odstráni hash a vráti sa na úvod (ruší aktívne triedy)
    }
});

// Spracovanie zmeny veľkosti okna (zostalo nezmenené)
window.addEventListener('resize', () => {
    if (!getHTMLElements()) {
         return;
     }
    if (currentCategoryId !== null) {
         const isAllGroupsVisible = allGroupsContent && window.getComputedStyle(allGroupsContent).display !== 'none';
         const isSingleGroupVisible = singleGroupContent && window.getComputedStyle(singleGroupContent).display !== 'none';

         if (isAllGroupsVisible && allGroupsContainer) {
             const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
              if (uniformWidth > 0) {
                 setUniformTableWidth(uniformWidth, allGroupsContainer);
              }
         } else if (isSingleGroupVisible && singleGroupContent) {
              const uniformWidth = findMaxTableContentWidth(singleGroupContent);
               if (uniformWidth > 0) {
                   setUniformTableWidth(uniformWidth, singleGroupContent);
               }
         }
    }
 });
