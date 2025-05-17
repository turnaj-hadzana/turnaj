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
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
         showOnly(null);
         return false;
     }
      return true;
}
async function loadAllTournamentData() {
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         allGroups = allGroups.map(group => {
              if (!group.categoryId) {
                 const categoryFromId = allCategories.find(cat => group.id.startsWith(`${cat.id} - `));
                 if (categoryFromId) {
                      group.categoryId = categoryFromId.id;
                 }
              }
              return group;
         }).filter(group => group.categoryId);
        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}
function showOnly(containerIdToShow) {
    // This function now primarily manages the visibility of allGroupsContent and singleGroupContent
    // categoryButtonsContainer visibility is managed directly in the display functions
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
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
            if (allGroupsContent) allGroupsContent.style.display = 'block';
            break;
        case 'singleGroupContent':
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
            if (singleGroupContent) singleGroupContent.style.display = 'block';
            break;
        case 'categoryButtonsContainer': // Used for initial state, will also ensure others are hidden
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
            break;
        default: // Hide everything if containerIdToShow is null or unrecognized
             if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none'; // Should not happen with new logic, but good fallback
             if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
             if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
             if (allGroupsContent) allGroupsContent.style.display = 'none';
             if (singleGroupContent) singleGroupContent.style.display = 'none';
            break;
    }
     if (containerIdToShow === 'allGroupsContent' && allGroupsContainer) {
         const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
          if (uniformWidth > 0) {
             setUniformTableWidth(uniformWidth, allGroupsContainer);
          }
     } else if (containerIdToShow === 'singleGroupContent' && singleGroupContent) {
           const uniformWidth = findMaxTableContentWidth(singleGroupContent);
            if (uniformWidth > 0) {
               setUniformTableWidth(uniformWidth, singleGroupContent);
            }
     }
}
function displayCategoriesAsButtons() {
    currentCategoryId = null;
    currentGroupId = null;
     if (!getHTMLElements()) {
         return;
     }
    // Clear content areas except category buttons container
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';
    if (categoryTitleDisplay) categoryTitleDisplay.textContent = '';
    // Manage visibility
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Ensure category buttons are visible
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    showOnly('categoryButtonsContainer'); // Hide other content areas using showOnly

    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }
    if (allCategories.length === 0) {
        if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }
    // Rebuild category buttons - required if we cleared innerHTML before, but now we don't clear it.
    // Let's assume categoryButtonsContainer is only populated once on initial load.
    // If we need to refresh it, innerHTML = '' would be needed here.
    // For this request, we assume it's populated once. If not, a different approach is needed.
    // Based on the original code, it seems displayCategoriesAsButtons is used for initial load and back navigation.
    // Clearing innerHTML here was correct for the original logic. Let's revert the removal of innerHTML clear here.
    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = ''; // Keep clearing for rebuilding

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
function displayGroupsForCategory(categoryId) {
    currentCategoryId = categoryId;
    currentGroupId = null;
     if (!getHTMLElements()) {
         goBackToCategories();
         return;
     }
    // Clear group specific content, keep category buttons
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = ''; // Keep clearing group selection buttons as they are specific to the selected category
    if (categoryTitleDisplay) categoryTitleDisplay.textContent = '';

    // Manage visibility
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Ensure category buttons are visible
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none'; // Hide back to categories button
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    showOnly('allGroupsContent'); // Show all groups content area, hide single group content area using showOnly

    window.location.hash = 'category-' + encodeURIComponent(categoryId);
    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) {
         if (dynamicContentArea) dynamicContentArea.innerHTML = `<p>Chyba: Kategória "${categoryId}" sa nenašla. Prosím, skúste znova alebo kontaktujte administrátora.</p>`;
         // Optionally go back to categories or display an error state
         // goBackToCategories(); // Decided not to automatically go back on error for debugging
        return;
    }
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = selectedCategory.name || selectedCategory.id;
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);
     if (allGroupsContainer) {
         if (groupsInCategory.length === 5) {
              allGroupsContainer.classList.add('force-3-plus-2-layout');
         } else {
              allGroupsContainer.classList.remove('force-3-plus-2-layout');
         }
     }
    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));
    if (groupsInCategory.length === 0) {
         if (groupSelectionButtons) groupSelectionButtons.innerHTML = '<p>V kategórii nie sú skupiny na výber.</p>';
         if (allGroupsContainer) allGroupsContainer.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
    } else {
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
        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display');
            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);
            groupTitle.style.cursor = 'pointer';
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
function displaySingleGroup(groupId) {
     const group = allGroups.find(g => g.id === groupId);
     if (!group) {
           if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
           if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
           showOnly(null); // Hide all content areas using showOnly
           if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Vybraná skupina sa nenašla.</p>';
           currentCategoryId = null;
           currentGroupId = null;
          return;
     }
     currentCategoryId = group.categoryId;
     currentGroupId = groupId;
     if (!getHTMLElements()) {
         goBackToCategories(); // Go back if elements not found
         return;
     }
    // Clear specific content areas
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    // Manage visibility
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Ensure category buttons are visible
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none'; // Hide back to categories button
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block'; // Show back to groups button
    showOnly('singleGroupContent'); // Show single group content area, hide all groups content area using showOnly

     window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;
      const category = allCategories.find(cat => cat.id === currentCategoryId);
      if (category && categoryTitleDisplay) {
           categoryTitleDisplay.textContent = category.name || category.id;
      }
     if (singleGroupDisplayBlock) {
         const groupTitle = document.createElement('h3');
         groupTitle.textContent = group.name || group.id;
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
function goBackToCategories() {
    currentCategoryId = null;
    currentGroupId = null;
     if (!getHTMLElements()) {
         return;
     }
    // Clear content areas except category buttons container
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';
    if (categoryTitleDisplay) categoryTitleDisplay.textContent = '';

    // Manage visibility
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Ensure category buttons are visible
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    showOnly('categoryButtonsContainer'); // Hide other content areas using showOnly

    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }
     displayCategoriesAsButtons(); // Re-render category buttons if needed (or just rely on display:flex if they weren't cleared)
}
function goBackToGroupView() {
     currentGroupId = null;
     if (!getHTMLElements()) {
          goBackToCategories(); // Go back further if elements not found
         return;
     }
     if (!currentCategoryId) {
         goBackToCategories(); // If no category is set, go back to categories
         return;
     }
    // Clear single group content
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';

    // Manage visibility (category buttons remain visible)
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Ensure category buttons are visible
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none'; // Hide back to groups button
    showOnly('allGroupsContent'); // Show all groups content area, hide single group content area using showOnly

    window.location.hash = 'category-' + encodeURIComponent(currentCategoryId); // Update hash
    displayGroupsForCategory(currentCategoryId); // Re-render group list for the category
}
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
        table.style.flexBasis = 'auto';
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';
    });
}
document.addEventListener('DOMContentLoaded', async () => {
     if (!getHTMLElements()) {
         return;
     }
    await loadAllTournamentData();
    if (backToCategoriesButton) backToCategoriesButton.addEventListener('click', goBackToCategories);
    if (backToGroupButtonsButton) backToGroupButtonsButton.addEventListener('click', goBackToGroupView);
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
            currentCategoryId = decodedCategoryId;
            currentGroupId = decodedGroupId;
            if (decodedGroupId) {
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      // First display category groups, then the single group
                      displayGroupsForCategory(decodedCategoryId); // This will show category buttons and group selection/all groups
                      displaySingleGroup(decodedGroupId); // This will switch to single group view and keep category buttons visible
                 } else {
                      // Group in hash not found, display category groups
                      displayGroupsForCategory(decodedCategoryId);
                 }
            } else {
                // Only category in hash, display category groups
                displayGroupsForCategory(decodedCategoryId);
            }
        } else {
            // Category in hash not found, display all categories
            displayCategoriesAsButtons();
        }
    } else {
        // No valid hash, display all categories
        displayCategoriesAsButtons();
    }

});
window.addEventListener('resize', () => {
    if (!getHTMLElements()) {
         return;
     }
    if (currentCategoryId !== null) {
         let containerElement = null;
         // Determine which container is currently visible to resize its groups
         if (currentGroupId === null) {
              // All groups view
              containerElement = allGroupsContainer; // This is the container *within* allGroupsContent
         } else {
              // Single group view
              containerElement = singleGroupContent; // singleGroupContent directly contains the group-display in this view
         }
         // Check if the relevant content area is actually displayed before trying to resize
         const isAllGroupsVisible = allGroupsContent && window.getComputedStyle(allGroupsContent).display !== 'none';
         const isSingleGroupVisible = singleGroupContent && window.getComputedStyle(singleGroupContent).display !== 'none';

         if (isAllGroupsVisible && containerElement === allGroupsContainer) {
             const uniformWidth = findMaxTableContentWidth(containerElement);
              if (uniformWidth > 0) {
                 setUniformTableWidth(uniformWidth, containerElement);
              }
         } else if (isSingleGroupVisible && containerElement === singleGroupContent) {
              // For single group view, we need to find the group-display element inside singleGroupContent
              const singleGroupDisplay = singleGroupContent.querySelector('.group-display');
              if (singleGroupDisplay) {
                   const uniformWidth = findMaxTableContentWidth(singleGroupContent); // findMaxTableContentWidth takes container
                   if (uniformWidth > 0) {
                       setUniformTableWidth(uniformWidth, singleGroupContent); // setUniformTableWidth takes container
                   }
              }
         }
    }
 });
window.addEventListener('hashchange', () => {
    if (!getHTMLElements()) {
         return;
     }
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
                 return; // Already in the state defined by the hash
             }
            currentCategoryId = decodedCategoryId; // Update current state
            currentGroupId = decodedGroupId;
            if (decodedGroupId) {
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      // Display category groups and then single group
                      displayGroupsForCategory(decodedCategoryId);
                      displaySingleGroup(decodedGroupId);
                 } else {
                      // Group not found, display category groups
                      displayGroupsForCategory(decodedCategoryId);
                 }
            } else {
                // Only category in hash, display category groups
                displayGroupsForCategory(decodedCategoryId);
            }
        } else {
             // Category not found, go back to categories view
             displayCategoriesAsButtons();
        }
    } else {
         // Hash doesn't start with category prefix, go back to categories view
         displayCategoriesAsButtons();
    }
});
