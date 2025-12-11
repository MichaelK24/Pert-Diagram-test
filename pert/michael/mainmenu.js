//mainmenu js
//michael king
//handles main menu navigation and buttons

document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btn-start');
  const btnLearn = document.getElementById('btn-learn');
  const btnEasy = document.getElementById('btn-easy');
  const btnHard = document.getElementById('btn-hard');
  const learnSub = document.getElementById('learn-sub');

  const btnTutorial = document.getElementById('btn-tutorial'); // NEW
  const btnTest = document.getElementById('btn-test');         // NEW


  //start button navigates to main game page
  btnStart.addEventListener('click', () => {
    console.log('Starting game...');
    const url = '../game.html';
    window.location.href = url;
  });

  //learn submenu opens on hover via css
  learnSub.classList.remove('show');
  learnSub.setAttribute('aria-hidden', 'true');

  //easy mode starts game with simpler charts
  btnEasy.addEventListener('click',()=> 
    {
    console.log('Learn Mode: Easy selected');
    window.location.href = '../game.html?mode=learn&level=easy';
  });

  //hard mode starts game with complex charts
  btnHard.addEventListener('click', () => {
    console.log('Learn Mode: Hard selected');
    window.location.href = '../game.html?mode=learn&level=hard';
  });

  // Tutorial Mode: go to Bigyan's tutorial page
  if (btnTutorial) {
    btnTutorial.addEventListener('click', () => {
      console.log('Tutorial Mode selected');
      window.location.href = '../bigyan/tutorial.html';
    });
  }

  // Test Mode: go to game with test mode enabled
  if (btnTest) {
    btnTest.addEventListener('click', () => {
      console.log('Test Mode selected');
      window.location.href = '../game.html?mode=test';
    });
  }


  //rules button opens explanation panel
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
  
  /* [Ananda] Main Menu Audio Logic */
  const menuAudioBtn = document.getElementById('menu-audio-btn');
  // NOTE: This assumes mainmenu.html is in a subfolder (like 'michael/') 
  // and needs to go up one level to find 'ananda/'. 
  // If sound fails, try changing this to: 'ananda/background.mp3'
  const menuMusic = new Audio('../ananda/background.mp3'); 
  menuMusic.loop = true;
  menuMusic.volume = 0.3;
  let menuMuted = false;

  // 1. Browser Autoplay Hack: Try to play immediately
  menuMusic.play().catch(e => {
      console.log("Autoplay blocked. Waiting for interaction.");
  });

  // 2. Fallback: Start music on the VERY FIRST click anywhere on the page
  document.addEventListener('click', () => {
      if (!menuMuted && menuMusic.paused) {
          menuMusic.play().catch(e => {});
      }
  }, { once: true });

  // 3. Toggle Button Logic
  if (menuAudioBtn) {
    menuAudioBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop click from triggering other things
      menuMuted = !menuMuted;
      if (menuMuted) {
        menuMusic.pause();
        menuAudioBtn.textContent = "🔇 Off";
      } else {
        menuMusic.play().catch(e => {});
        menuAudioBtn.textContent = "🔊 On";
      }
    });
  }
});
