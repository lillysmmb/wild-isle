// Règles du jeu partagées entre le serveur et le navigateur.
// Modifiez les nombres ici pour équilibrer le jeu (dégâts, vitesses, coûts...).
(function (root) {
  const C = {
    TICK_RATE: 30,          // calculs du serveur par seconde
    SNAP_RATE: 20,          // envois aux joueurs par seconde

    // Île
    WORLD: 7600,            // taille du monde (carré), l'île est au centre
    ISLAND_R: 3000,         // rayon moyen de l'île (environ 1 minute pour la traverser en marchant)
    BEACH: 200,             // largeur de la plage
    TILE: 64,               // taille d'une case de construction

    // Joueurs
    MAX_PLAYERS: 6,
    PLAYER_R: 22,
    WALK_SPEED: 150,
    RUN_SPEED: 235,
    DOWNED_SPEED: 45,
    MAX_HP: 100,
    REGEN_DELAY: 5,         // secondes sans dégâts avant de récupérer de la vie
    REGEN_RATE: 9,          // vie récupérée par seconde
    DOWNED_HP: 40,          // en 3 contre 3 : "vie" quand on est à terre
    DOWNED_TIME: 25,        // secondes avant de mourir à terre
    REVIVE_TIME: 3,         // secondes pour relever un coéquipier
    INTERACT_R: 80,
    BUILD_RANGE: 220,

    // Visibilité
    SEND_R: 1700,           // distance d'envoi des objets
    NIGHT_VISION: 270,      // on ne voit qu'autour de soi la nuit
    CAMPFIRE_LIGHT: 280,
    BUSH_REVEAL: 95,        // distance où l'on voit quelqu'un caché dans un buisson
    CAVE_VISION: 240,
    STEP_HEAR: 750,         // distance où l'on entend les pas

    // Jour / nuit (en secondes)
    DAY_LEN: 180,
    NIGHT_LEN: 90,
    FADE: 12,

    // Armes : emplacement 1 à 8 dans la barre
    SLOTS: ['fists', 'sword', 'slingshot', 'bow', 'pistol', 'sniper', 'bomb', 'trap'],
    WEAPONS: {
      fists:     { kind: 'melee',  dmg: 9,  range: 52,  arc: 1.3, cd: 0.42, struct: 4,  harvest: 1 },
      sword:     { kind: 'melee',  dmg: 28, range: 78,  arc: 1.7, cd: 0.5,  struct: 22, harvest: 2 },
      slingshot: { kind: 'ranged', dmg: 13, speed: 780,  range: 560,  cd: 0.42, struct: 3 },
      bow:       { kind: 'ranged', dmg: 25, speed: 980,  range: 820,  cd: 0.8,  struct: 6 },
      pistol:    { kind: 'ranged', dmg: 17, speed: 1400, range: 720,  cd: 0.24, struct: 8,  ammo: true },
      sniper:    { kind: 'ranged', dmg: 72, speed: 2400, range: 1650, cd: 1.6,  struct: 20, ammo: true },
      bomb:      { kind: 'throw',  dmg: 62, range: 420,  cd: 0.8, radius: 150, fuse: 1.4, struct: 140 },
      trap:      { kind: 'trap',   dmg: 34, cd: 0.6, slow: 2.5, len: 280 }
    },

    // Fabrication
    RECIPES: {
      sword:     { wood: 10, stone: 6 },
      slingshot: { wood: 8,  fiber: 5 },
      bow:       { wood: 14, fiber: 10 },
      bomb:      { stone: 5, fiber: 4, metal: 1 },
      trap:      { wood: 4,  fiber: 10 }
    },

    // Constructions
    BUILD: {
      wall_wood:  { cost: { wood: 6 },            hp: 160, solid: true },
      wall_stone: { cost: { stone: 8 },           hp: 420, solid: true },
      door:       { cost: { wood: 8 },            hp: 160, solid: true, door: true },
      roof:       { cost: { wood: 4 },            hp: 70,  solid: false, roof: true },
      campfire:   { cost: { wood: 5, stone: 2 },  hp: 60,  solid: false, light: true }
    },
    BUILD_ORDER: ['wall_wood', 'wall_stone', 'door', 'roof', 'campfire'],

    // Ressources de l'île
    NODES: {
      tree:  { r: 26, hp: 10, gives: { wood: 2 },            respawn: 90 },
      rock:  { r: 34, hp: 10, gives: { stone: 2 },           respawn: 100 },
      plant: { r: 16, hp: 3,  gives: { fiber: 3 },           respawn: 45, soft: true },
      ore:   { r: 30, hp: 8,  gives: { stone: 2, metal: 1 }, respawn: 120 },
      wreck: { r: 40, hp: 6,  gives: { metal: 1, wood: 2 },  respawn: 150 }
    },

    // Animaux sauvages
    ANIMALS: {
      boar:  { hp: 60, r: 24, speed: 95,  aggro: 380, dmg: 22, chargeSpeed: 430, chargeTime: 1.0, windup: 0.6, cd: 2.6 },
      wolf:  { hp: 45, r: 20, speed: 205, aggro: 460, giveUp: 760, dmg: 10, cd: 0.9, range: 44 },
      snake: { hp: 25, r: 14, dmg: 15, cd: 1.5, range: 58, reveal: 130 }
    },

    // Mines explosives
    MINE: { trigger: 28, radius: 115, dmg: 58, visible: 90 },

    // Caisses
    CRATE_R: 22
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C;
  else root.WI = C;
})(typeof window !== 'undefined' ? window : globalThis);
