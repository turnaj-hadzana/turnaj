document.getElementById("groupAForm").addEventListener("submit", function(event) {
  event.preventDefault();
  let teams = [
    document.getElementById("teamA1").value,
    document.getElementById("teamA2").value,
    document.getElementById("teamA3").value,
    document.getElementById("teamA4").value,
    document.getElementById("teamA5").value
  ];
  generateMatches(teams, "A");
});

document.getElementById("groupBForm").addEventListener("submit", function(event) {
  event.preventDefault();
  let teams = [
    document.getElementById("teamB1").value,
    document.getElementById("teamB2").value,
    document.getElementById("teamB3").value,
    document.getElementById("teamB4").value,
    document.getElementById("teamB5").value
  ];
  generateMatches(teams, "B");
});

document.getElementById("groupCForm").addEventListener("submit", function(event) {
  event.preventDefault();
  let teams = [
    document.getElementById("teamC1").value,
    document.getElementById("teamC2").value,
    document.getElementById("teamC3").value,
    document.getElementById("teamC4").value
  ];
  generateMatches(teams, "C");
});

function generateMatches(teams, group) {
  let matchesHtml = '';
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchesHtml += `<div class="match">
        ${teams[i]} vs ${teams[j]} 
        <input type="number" placeholder="Skóre ${teams[i]}" class="score1"> : 
        <input type="number" placeholder="Skóre ${teams[j]}" class="score2">
      </div>`;
    }
  }
  
  document.getElementById("matches" + group).innerHTML = matchesHtml;
}
