# Wild Isle — version 1

Jeu de combat et de survie multijoueur sur une île, jouable sur ordinateur et sur téléphone.
**Seul le dernier survit.**

Ce dossier contient tout le jeu : le serveur (qui gère les parties) et le jeu qui s'affiche dans le navigateur.

---

## 1. Essayer le jeu sur votre ordinateur (facultatif)

Cette étape permet de jouer chez vous avant de mettre le jeu en ligne.

1. **Installez Node.js** : allez sur <https://nodejs.org>, téléchargez la version **LTS** et installez-la (cliquez sur « Suivant » jusqu'au bout).
2. **Décompressez** le fichier `wild-isle.zip` (clic droit → « Extraire tout »).
3. **Ouvrez un terminal dans le dossier `wild-isle`** :
   - **Windows** : ouvrez le dossier, cliquez dans la barre d'adresse en haut, tapez `cmd` puis appuyez sur Entrée.
   - **Mac** : clic droit sur le dossier → « Nouveau terminal au dossier ».
4. Tapez cette commande puis Entrée (à faire une seule fois, ça télécharge ce dont le jeu a besoin) :
   ```
   npm install
   ```
5. Lancez le jeu :
   ```
   npm start
   ```
6. Ouvrez votre navigateur à l'adresse **http://localhost:3000**.
   Pour tester à plusieurs, ouvrez un deuxième onglet : chaque onglet compte comme un joueur.

Pour arrêter le jeu, revenez dans le terminal et appuyez sur `Ctrl` + `C`.

---

## 2. Mettre le jeu en ligne (pour jouer avec n'importe qui)

On utilise deux sites gratuits :
- **GitHub** pour stocker le code du jeu ;
- **Render** pour le faire tourner sur Internet et vous donner un lien à partager.

### Étape A — Mettre le code sur GitHub

1. Créez un compte sur <https://github.com> (bouton **Sign up**).
2. Une fois connecté, cliquez sur le **+** en haut à droite → **New repository**.
3. Nom du dépôt : `wild-isle`. Laissez le reste par défaut et cliquez sur **Create repository**.
4. Sur la page suivante, cliquez sur le lien **uploading an existing file**.
5. Ouvrez le dossier `wild-isle` sur votre ordinateur, **sélectionnez tout son contenu** (les dossiers `public`, `server`, `shared` et les fichiers `package.json`, `README.md`, `.gitignore`) et **glissez-le** dans la page.
   ⚠️ Ne mettez pas le dossier `node_modules` s'il existe (il est créé par `npm install` et n'est pas nécessaire).
6. En bas de la page, cliquez sur **Commit changes**.

### Étape B — Lancer le jeu sur Render

1. Allez sur <https://render.com> et cliquez sur **Get Started**. Choisissez **GitHub** pour vous connecter (c'est le plus simple).
2. Dans le tableau de bord, cliquez sur **New +** → **Web Service**.
3. Choisissez votre dépôt `wild-isle` dans la liste (si Render le demande, autorisez l'accès à GitHub).
4. Remplissez les réglages :
   - **Name** : `wild-isle` (ou le nom que vous voulez, il apparaîtra dans le lien)
   - **Language / Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : **Free**
5. Cliquez sur **Create Web Service** (ou **Deploy**). Attendez 2 à 3 minutes : quand vous voyez « Your service is live », c'est prêt.
6. En haut de la page, Render affiche votre lien, du style `https://wild-isle-xxxx.onrender.com`.
   **C'est le lien du jeu : envoyez-le à vos amis !**

### Bon à savoir sur l'offre gratuite de Render

- Si personne ne joue pendant **15 minutes**, Render met le jeu en veille. La personne suivante qui ouvre le lien attend environ **30 secondes à 1 minute** pendant que le jeu se réveille (l'écran de chargement s'affiche), puis tout fonctionne normalement.
- Pour que le jeu soit toujours allumé, Render propose une offre payante (« Starter »).

### Mettre à jour le jeu plus tard

Quand je vous donnerai une nouvelle version : sur GitHub, ouvrez votre dépôt → **Add file** → **Upload files**, glissez les nouveaux fichiers (ils remplacent les anciens), puis **Commit changes**. Render remet le jeu à jour tout seul en quelques minutes.

---

## 3. Comment on joue

**Menus**
- **Profil** : votre nom (modifiable quand vous voulez), fille ou garçon, peau, cheveux, couleur des cheveux, tenue (dont des tenues de guerrier) et accessoire.
- **Paramètres** (roue dentée) : langue (français, anglais, portugais), son et volume, et changement des touches sur ordinateur.
- **Jouer** : la liste des serveurs (publics et privés avec cadenas).
- **Créer un serveur** : un nom, le mode (**Chacun pour soi** jusqu'à 6 joueurs, ou **3 contre 3**) et public ou privé (avec mot de passe).
- Dans le salon, l'hôte lance la partie. En 3 contre 3, chacun peut changer d'équipe.

**Commandes sur ordinateur** (modifiables dans les Paramètres)
| Action | Touche |
|---|---|
| Se déplacer | Z Q S D (ou W A S D en clavier anglais) ou les flèches |
| Courir | Shift |
| Viser | Souris |
| Attaquer / récolter | Clic gauche (maintenu = continu) |
| Choisir une arme | 1 à 8 ou la molette |
| Ouvrir une caisse / relever un coéquipier | E (maintenir pour relever) |
| Fabriquer | C |
| Construire | B (puis clic sur le sol, clic droit pour annuler) |

**Commandes sur téléphone** (à tenir à l'horizontale)
- Joystick de gauche pour se déplacer, joystick de droite pour viser et attaquer.
- Bouton **RUN** pour courir, bouton **E** pour ouvrir ou relever.
- Touchez une arme en haut pour la choisir.
- **Construire** : choisissez une pièce, puis touchez le sol pour la poser.

**Règles**
- Frappez les arbres (bois), les rochers (pierre), les plantes (fibres), les épaves et le minerai des grottes (métal).
- **Fabriquez** une épée, un lance-pierre, un arc, des bombes et des pièges à fil (à poser près d'un arbre : le fil se tend vers un 2e arbre).
- Le **pistolet** et le **petit sniper** se trouvent seulement dans les **caisses** (cabanes abandonnées et plages).
- **Construisez** des murs en bois ou en pierre, des portes (seule votre équipe peut passer), des toits (on ne vous voit pas dessous) et des feux de camp (ils éclairent la nuit). On peut casser les constructions des autres.
- La **barre de vie** est au-dessus de chaque tête. La vie remonte toute seule si on ne prend pas de coups pendant 5 secondes.
- **Dangers** : sangliers qui foncent, loups en meute, serpents cachés dans les buissons, et **mines** cachées dans le sol.
- **La nuit**, les animaux dorment, il fait sombre et on ne voit qu'autour de soi… mais on entend les pas des autres.
- Dans les **buissons**, on est caché tant qu'on n'attaque pas.
- En **3 contre 3**, un joueur à terre peut être relevé par un coéquipier.
- Quand on meurt, on devient **spectateur** : flèches ou glissement du doigt pour changer de joueur regardé.

---

## 4. Modifier le jeu

Les réglages du jeu (dégâts des armes, vitesse, coût des constructions, durée du jour et de la nuit…) sont tous dans le fichier `shared/constants.js`, avec des commentaires. Les textes des trois langues sont dans `public/js/i18n.js`.

## Contenu du dossier

```
server/index.js      le serveur : salons, mots de passe, lancement des parties
server/game.js       les règles : île, combats, animaux, constructions, jour/nuit
shared/constants.js  les nombres du jeu (modifiables)
public/              le jeu dans le navigateur (affichage, menus, sons, commandes)
```
