// Paramètres enregistrés sur l'appareil : touches, son, profil.
(function () {
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // Les codes de touches sont "physiques" : KeyW = Z sur un clavier AZERTY.
  const DEFAULT_KEYS = {
    up: { code: 'KeyW', label: '' }, down: { code: 'KeyS', label: '' }, left: { code: 'KeyA', label: '' }, right: { code: 'KeyD', label: '' },
    run: { code: 'ShiftLeft', label: 'Shift' }, interact: { code: 'KeyE', label: 'E' }, build: { code: 'KeyB', label: 'B' },
    craft: { code: 'KeyC', label: 'C' }, cancel: { code: 'Escape', label: 'Échap' }
  };
  const ACTIONS = Object.keys(DEFAULT_KEYS);

  const S = {
    keys: Object.assign({}, DEFAULT_KEYS, load('wi_keys', {})),
    sound: load('wi_sound', true),
    volume: load('wi_volume', 0.7),
    profile: Object.assign({ name: '', look: { g: 'm', skin: 1, hair: 0, hairC: 0, outfit: 2, acc: 1 } }, load('wi_profile', {})),
    ACTIONS,
    setKey(action, code, label) { this.keys[action] = { code, label }; save('wi_keys', this.keys); },
    resetKeys() { this.keys = Object.assign({}, DEFAULT_KEYS); save('wi_keys', this.keys); },
    setSound(on) { this.sound = !!on; save('wi_sound', this.sound); },
    setVolume(v) { this.volume = Math.max(0, Math.min(1, +v)); save('wi_volume', this.volume); },
    saveProfile() { save('wi_profile', this.profile); },
    keyLabel(action) {
      const k = this.keys[action]; if (!k) return '?';
      if (k.label) return k.label;
      return S.labelFor(k.code);
    },
    labelFor(code) {
      // Libellé selon la disposition du clavier quand c'est possible
      if (S.layoutMap && S.layoutMap.get(code)) return S.layoutMap.get(code).toUpperCase();
      if (code.startsWith('Key')) return code.slice(3);
      if (code.startsWith('Digit')) return code.slice(5);
      const names = { Space: 'Espace', ShiftLeft: 'Shift', ShiftRight: 'Shift D', ControlLeft: 'Ctrl', AltLeft: 'Alt', Escape: 'Échap', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Entrée' };
      return names[code] || code;
    }
  };
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard.getLayoutMap().then(m => { S.layoutMap = m; document.dispatchEvent(new CustomEvent('langchange')); }).catch(() => {});
  }
  window.SETTINGS = S;
})();
