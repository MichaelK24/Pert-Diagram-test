//mainmenu js
//michael king
//handles main menu navigation and buttons

document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btn-start');
  const btnLearn = document.getElementById('btn-learn');
  const btnEasy = document.getElementById('btn-easy');
  const btnHard = document.getElementById('btn-hard');
  const learnSub = document.getElementById('learn-sub');
  //no status element per design use console logs for debug

  btnStart.addEventListener('click', () => {
    console.log('Starting game...');
    //load the game page in the parent folder
    const url = '../game.html';
    window.location.href = url;
  });

  //submenu shows on hover css disable click toggling so only hover opens it
  //ensure any previously added show state is removed on load
  learnSub.classList.remove('show');
  learnSub.setAttribute('aria-hidden', 'true');

  btnEasy.addEventListener('click',()=> 
    {
    console.log('Learn Mode: Easy selected');
    window.location.href = '../game.html?mode=learn&level=easy';
  });

  btnHard.addEventListener('click', () => {
    console.log('Learn Mode: Hard selected');
    window.location.href = '../game.html?mode=learn&level=hard';
  });

  //rules panel handlers
  const btnRules = document.getElementById('btn-rules');
  const rulesPanel = document.getElementById('rules-panel');
  const rulesClose = document.getElementById('rules-close');
  btnRules.addEventListener('click', () => {
    rulesPanel.classList.add('show');
    rulesPanel.setAttribute('aria-hidden','false');
  });
  rulesClose.addEventListener('click', () => {
    rulesPanel.classList.remove('show');
    rulesPanel.setAttribute('aria-hidden','true');
  });
  

});
