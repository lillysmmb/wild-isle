// Textes du jeu en français, anglais et portugais.
(function () {
  const D = {
    fr: {
      tagline: 'SEUL LE DERNIER SURVIT', loading: 'CHARGEMENT',
      tips: ['Des mines sont cachées sous le sable. Regardez où vous marchez.', 'Les serpents se cachent dans les buissons.', 'La nuit, on entend les pas des autres joueurs.', 'Les cabanes abandonnées cachent parfois une arme rare.', 'Un feu de camp éclaire autour de vous la nuit.', 'Dans les grottes, on trouve du métal.'],
      play: 'JOUER', createServer: 'CRÉER UN SERVEUR', profile: 'PROFIL', settings: 'PARAMÈTRES', back: 'Retour',
      online: 'En ligne', offline: 'Connexion au serveur…',
      servers: 'SERVEURS', all: 'Tous', ffa: 'Chacun pour soi', v3: '3 contre 3', refresh: 'Actualiser',
      noServers: 'Aucun serveur pour le moment. Créez le vôtre !', join: 'Rejoindre', inGame: 'En partie', full: 'Complet', priv: 'Privé', pub: 'Public',
      serverName: 'Nom du serveur', mode: 'Mode', visibility: 'Visibilité', password: 'Mot de passe', create: 'Créer', cancel: 'Annuler', ok: 'OK',
      enterPassword: 'Ce serveur est privé. Entrez le mot de passe :',
      err_name: 'Donnez un nom au serveur.', err_password: 'Choisissez un mot de passe.', err_gone: 'Ce serveur n’existe plus.', err_playing: 'Une partie est déjà en cours sur ce serveur.', err_full: 'Ce serveur est complet.', err_badPassword: 'Mot de passe incorrect.',
      host: 'Hôte', you: 'vous', startGame: 'LANCER LA PARTIE', waitingHost: 'En attente que l’hôte lance la partie…', leave: 'Quitter', switchTeam: 'Changer d’équipe', team: 'Équipe', teamA: 'ÉQUIPE ROUGE', teamB: 'ÉQUIPE BLEUE', players: 'joueurs',
      name: 'Nom', gender: 'Personnage', boy: 'Garçon', girl: 'Fille', skin: 'Peau', hair: 'Cheveux', hairColor: 'Couleur des cheveux', outfit: 'Tenue', accessory: 'Accessoire', save: 'Enregistrer',
      hairs: ['Court', 'Hérissé', 'Crête', 'Rasé', 'Chauve', 'Long', 'Queue de cheval', 'Chignon', 'Tresses', 'Carré'],
      outfits: ['Tunique', 'Cuir', 'Armure', 'Tribal', 'Ninja', 'Viking', 'Mercenaire', 'Chasseur'],
      accs: ['Aucun', 'Casque', 'Casque à cornes', 'Bandeau', 'Bandana', 'Cache-œil', 'Peinture de guerre', 'Capuche', 'Masque', 'Plume'],
      language: 'Langue', sound: 'Son', soundOn: 'Activé', soundOff: 'Coupé', volume: 'Volume', controls: 'Touches (ordinateur)', pressKey: 'Appuyez sur une touche…', resetKeys: 'Touches par défaut',
      k_up: 'Avancer', k_down: 'Reculer', k_left: 'Gauche', k_right: 'Droite', k_run: 'Courir', k_interact: 'Ouvrir / Relever', k_build: 'Construire', k_craft: 'Fabriquer', k_cancel: 'Annuler',
      mouseHelp: 'Souris : viser · Clic gauche : attaquer / récolter · Clic droit : annuler · 1 à 8 ou molette : armes',
      alive: 'EN VIE', day: 'JOUR', night: 'NUIT', kills: 'Éliminations',
      wood: 'Bois', stone: 'Pierre', fiber: 'Fibres', metal: 'Métal',
      w_fists: 'Poings', w_sword: 'Épée', w_slingshot: 'Lance-pierre', w_bow: 'Arc', w_pistol: 'Pistolet', w_sniper: 'Sniper', w_bomb: 'Bombe', w_trap: 'Piège à fil',
      b_wall_wood: 'Mur en bois', b_wall_stone: 'Mur en pierre', b_door: 'Porte', b_roof: 'Toit', b_campfire: 'Feu de camp',
      craft: 'FABRIQUER', build: 'CONSTRUIRE', close: 'Fermer', buildHelp: 'Cliquez sur le sol pour placer · Clic droit pour annuler', buildHelpTouch: 'Touchez le sol pour placer',
      m_noRes: 'Pas assez de matériaux', m_tooFar: 'Trop loin', m_cantBuild: 'Impossible de construire ici', m_needTree: 'Mettez-vous près d’un arbre', m_needTwoTrees: 'Il faut un 2e arbre pas trop loin', m_trapSet: 'Piège posé', m_crafted: 'Fabriqué :',
      downed: 'À TERRE !', downedHelp: 'Un coéquipier peut vous relever (touche {k})', reviving: 'Relève en cours…',
      dead: 'VOUS ÊTES MORT', watching: 'Vous regardez', swipeHelp: 'Glissez ou utilisez les flèches pour changer de joueur',
      victory: 'VICTOIRE !', defeat: 'DÉFAITE', winnerIs: 'Gagnant :', winnersAre: 'Gagnants :', nobody: 'Personne n’a survécu', backToRoom: 'Retour au salon',
      f_kill: '{a} a éliminé {b}', f_killBy: '{b} a été tué par {x}', f_died: '{b} est mort', f_down: '{b} est à terre', f_revive: '{a} a relevé {b}', f_left: '{b} a quitté la partie',
      x_boar: 'un sanglier', x_wolf: 'un loup', x_snake: 'un serpent', x_mine: 'une mine',
      rotate: 'Tournez votre téléphone pour jouer', interactHint: 'Ouvrir', reviveHint: 'Relever', mineWarn: 'Mine !',
      gained: '+{n} {r}', practice: 'Seul : partie d’entraînement'
    },
    en: {
      tagline: 'ONLY THE LAST SURVIVES', loading: 'LOADING',
      tips: ['Mines are hidden under the sand. Watch your step.', 'Snakes hide in bushes.', 'At night, you can hear other players’ footsteps.', 'Abandoned huts sometimes hide a rare weapon.', 'A campfire lights up the area at night.', 'You can find metal in caves.'],
      play: 'PLAY', createServer: 'CREATE SERVER', profile: 'PROFILE', settings: 'SETTINGS', back: 'Back',
      online: 'Online', offline: 'Connecting to server…',
      servers: 'SERVERS', all: 'All', ffa: 'Free for all', v3: '3 vs 3', refresh: 'Refresh',
      noServers: 'No servers yet. Create your own!', join: 'Join', inGame: 'In game', full: 'Full', priv: 'Private', pub: 'Public',
      serverName: 'Server name', mode: 'Mode', visibility: 'Visibility', password: 'Password', create: 'Create', cancel: 'Cancel', ok: 'OK',
      enterPassword: 'This server is private. Enter the password:',
      err_name: 'Give the server a name.', err_password: 'Choose a password.', err_gone: 'This server no longer exists.', err_playing: 'A game is already running on this server.', err_full: 'This server is full.', err_badPassword: 'Wrong password.',
      host: 'Host', you: 'you', startGame: 'START GAME', waitingHost: 'Waiting for the host to start…', leave: 'Leave', switchTeam: 'Switch team', team: 'Team', teamA: 'RED TEAM', teamB: 'BLUE TEAM', players: 'players',
      name: 'Name', gender: 'Character', boy: 'Boy', girl: 'Girl', skin: 'Skin', hair: 'Hair', hairColor: 'Hair colour', outfit: 'Outfit', accessory: 'Accessory', save: 'Save',
      hairs: ['Short', 'Spiky', 'Mohawk', 'Buzz cut', 'Bald', 'Long', 'Ponytail', 'Bun', 'Braids', 'Bob'],
      outfits: ['Tunic', 'Leather', 'Armour', 'Tribal', 'Ninja', 'Viking', 'Mercenary', 'Hunter'],
      accs: ['None', 'Helmet', 'Horned helmet', 'Headband', 'Bandana', 'Eye patch', 'War paint', 'Hood', 'Mask', 'Feather'],
      language: 'Language', sound: 'Sound', soundOn: 'On', soundOff: 'Off', volume: 'Volume', controls: 'Keys (computer)', pressKey: 'Press a key…', resetKeys: 'Default keys',
      k_up: 'Up', k_down: 'Down', k_left: 'Left', k_right: 'Right', k_run: 'Run', k_interact: 'Open / Revive', k_build: 'Build', k_craft: 'Craft', k_cancel: 'Cancel',
      mouseHelp: 'Mouse: aim · Left click: attack / gather · Right click: cancel · 1 to 8 or wheel: weapons',
      alive: 'ALIVE', day: 'DAY', night: 'NIGHT', kills: 'Kills',
      wood: 'Wood', stone: 'Stone', fiber: 'Fibre', metal: 'Metal',
      w_fists: 'Fists', w_sword: 'Sword', w_slingshot: 'Slingshot', w_bow: 'Bow', w_pistol: 'Pistol', w_sniper: 'Sniper', w_bomb: 'Bomb', w_trap: 'Tripwire',
      b_wall_wood: 'Wood wall', b_wall_stone: 'Stone wall', b_door: 'Door', b_roof: 'Roof', b_campfire: 'Campfire',
      craft: 'CRAFT', build: 'BUILD', close: 'Close', buildHelp: 'Click the ground to place · Right click to cancel', buildHelpTouch: 'Tap the ground to place',
      m_noRes: 'Not enough materials', m_tooFar: 'Too far', m_cantBuild: 'Can’t build here', m_needTree: 'Stand next to a tree', m_needTwoTrees: 'You need a 2nd tree close by', m_trapSet: 'Trap set', m_crafted: 'Crafted:',
      downed: 'DOWN!', downedHelp: 'A teammate can revive you (key {k})', reviving: 'Reviving…',
      dead: 'YOU ARE DEAD', watching: 'Watching', swipeHelp: 'Swipe or use the arrows to switch player',
      victory: 'VICTORY!', defeat: 'DEFEAT', winnerIs: 'Winner:', winnersAre: 'Winners:', nobody: 'Nobody survived', backToRoom: 'Back to lobby',
      f_kill: '{a} eliminated {b}', f_killBy: '{b} was killed by {x}', f_died: '{b} died', f_down: '{b} is down', f_revive: '{a} revived {b}', f_left: '{b} left the game',
      x_boar: 'a boar', x_wolf: 'a wolf', x_snake: 'a snake', x_mine: 'a mine',
      rotate: 'Rotate your phone to play', interactHint: 'Open', reviveHint: 'Revive', mineWarn: 'Mine!',
      gained: '+{n} {r}', practice: 'Alone: practice game'
    },
    pt: {
      tagline: 'SÓ O ÚLTIMO SOBREVIVE', loading: 'A CARREGAR',
      tips: ['Há minas escondidas na areia. Cuidado onde pisas.', 'As cobras escondem-se nos arbustos.', 'À noite, ouvem-se os passos dos outros jogadores.', 'As cabanas abandonadas às vezes escondem uma arma rara.', 'Uma fogueira ilumina à tua volta durante a noite.', 'Nas grutas encontra-se metal.'],
      play: 'JOGAR', createServer: 'CRIAR SERVIDOR', profile: 'PERFIL', settings: 'DEFINIÇÕES', back: 'Voltar',
      online: 'Online', offline: 'A ligar ao servidor…',
      servers: 'SERVIDORES', all: 'Todos', ffa: 'Cada um por si', v3: '3 contra 3', refresh: 'Atualizar',
      noServers: 'Ainda não há servidores. Cria o teu!', join: 'Entrar', inGame: 'Em jogo', full: 'Cheio', priv: 'Privado', pub: 'Público',
      serverName: 'Nome do servidor', mode: 'Modo', visibility: 'Visibilidade', password: 'Palavra-passe', create: 'Criar', cancel: 'Cancelar', ok: 'OK',
      enterPassword: 'Este servidor é privado. Introduz a palavra-passe:',
      err_name: 'Dá um nome ao servidor.', err_password: 'Escolhe uma palavra-passe.', err_gone: 'Este servidor já não existe.', err_playing: 'Já há um jogo a decorrer neste servidor.', err_full: 'Este servidor está cheio.', err_badPassword: 'Palavra-passe errada.',
      host: 'Anfitrião', you: 'tu', startGame: 'COMEÇAR JOGO', waitingHost: 'À espera que o anfitrião comece…', leave: 'Sair', switchTeam: 'Mudar de equipa', team: 'Equipa', teamA: 'EQUIPA VERMELHA', teamB: 'EQUIPA AZUL', players: 'jogadores',
      name: 'Nome', gender: 'Personagem', boy: 'Rapaz', girl: 'Rapariga', skin: 'Pele', hair: 'Cabelo', hairColor: 'Cor do cabelo', outfit: 'Roupa', accessory: 'Acessório', save: 'Guardar',
      hairs: ['Curto', 'Espetado', 'Crista', 'Rapado', 'Careca', 'Comprido', 'Rabo de cavalo', 'Carrapito', 'Tranças', 'Bob'],
      outfits: ['Túnica', 'Couro', 'Armadura', 'Tribal', 'Ninja', 'Viking', 'Mercenário', 'Caçador'],
      accs: ['Nenhum', 'Capacete', 'Capacete com chifres', 'Fita', 'Bandana', 'Pala no olho', 'Pintura de guerra', 'Capuz', 'Máscara', 'Pena'],
      language: 'Idioma', sound: 'Som', soundOn: 'Ligado', soundOff: 'Desligado', volume: 'Volume', controls: 'Teclas (computador)', pressKey: 'Carrega numa tecla…', resetKeys: 'Teclas por defeito',
      k_up: 'Frente', k_down: 'Trás', k_left: 'Esquerda', k_right: 'Direita', k_run: 'Correr', k_interact: 'Abrir / Reanimar', k_build: 'Construir', k_craft: 'Fabricar', k_cancel: 'Cancelar',
      mouseHelp: 'Rato: apontar · Clique esquerdo: atacar / recolher · Clique direito: cancelar · 1 a 8 ou roda: armas',
      alive: 'VIVOS', day: 'DIA', night: 'NOITE', kills: 'Eliminações',
      wood: 'Madeira', stone: 'Pedra', fiber: 'Fibras', metal: 'Metal',
      w_fists: 'Punhos', w_sword: 'Espada', w_slingshot: 'Fisga', w_bow: 'Arco', w_pistol: 'Pistola', w_sniper: 'Sniper', w_bomb: 'Bomba', w_trap: 'Armadilha de fio',
      b_wall_wood: 'Muro de madeira', b_wall_stone: 'Muro de pedra', b_door: 'Porta', b_roof: 'Telhado', b_campfire: 'Fogueira',
      craft: 'FABRICAR', build: 'CONSTRUIR', close: 'Fechar', buildHelp: 'Clica no chão para colocar · Clique direito para cancelar', buildHelpTouch: 'Toca no chão para colocar',
      m_noRes: 'Materiais insuficientes', m_tooFar: 'Demasiado longe', m_cantBuild: 'Não podes construir aqui', m_needTree: 'Põe-te perto de uma árvore', m_needTwoTrees: 'Precisas de uma 2.ª árvore perto', m_trapSet: 'Armadilha colocada', m_crafted: 'Fabricado:',
      downed: 'NO CHÃO!', downedHelp: 'Um colega de equipa pode reanimar-te (tecla {k})', reviving: 'A reanimar…',
      dead: 'ESTÁS MORTO', watching: 'A ver', swipeHelp: 'Desliza ou usa as setas para mudar de jogador',
      victory: 'VITÓRIA!', defeat: 'DERROTA', winnerIs: 'Vencedor:', winnersAre: 'Vencedores:', nobody: 'Ninguém sobreviveu', backToRoom: 'Voltar à sala',
      f_kill: '{a} eliminou {b}', f_killBy: '{b} foi morto por {x}', f_died: '{b} morreu', f_down: '{b} está no chão', f_revive: '{a} reanimou {b}', f_left: '{b} saiu do jogo',
      x_boar: 'um javali', x_wolf: 'um lobo', x_snake: 'uma cobra', x_mine: 'uma mina',
      rotate: 'Roda o telemóvel para jogar', interactHint: 'Abrir', reviveHint: 'Reanimar', mineWarn: 'Mina!',
      gained: '+{n} {r}', practice: 'Sozinho: jogo de treino'
    }
  };
  let lang = 'fr';
  try { lang = localStorage.getItem('wi_lang') || (navigator.language || 'fr').slice(0, 2); } catch (e) {}
  if (!D[lang]) lang = 'fr';
  window.I18N = {
    get lang() { return lang; },
    set(l) { if (D[l]) { lang = l; try { localStorage.setItem('wi_lang', l); } catch (e) {} this.apply(); } },
    t(k, vars) {
      let s = (D[lang][k] ?? D.fr[k] ?? k);
      if (vars && typeof s === 'string') for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
      return s;
    },
    apply() {
      document.documentElement.lang = lang;
      document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = this.t(el.dataset.i18n); });
      document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = this.t(el.dataset.i18nPh); });
      document.dispatchEvent(new CustomEvent('langchange'));
    }
  };
})();
