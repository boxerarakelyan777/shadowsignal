// src/systems/input.js
class Input {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.previousKeys = {};
  }

  update() {
    this.previousKeys = { ...this.game.keys };
  }

  isDown(key) {
    return this._isKeyDown(this.game.keys, key);
  }

  justPressed(key) {
    return (
      this._isKeyDown(this.game.keys, key) &&
      !this._isKeyDown(this.previousKeys, key)
    );
  }

  _isKeyDown(map, key) {
    if (!key) return false;
    for (const variant of this._keyVariants(key)) {
      if (map[variant]) return true;
    }
    return false;
  }

  _keyVariants(key) {
    if (key.length === 1) {
      const lower = key.toLowerCase();
      const upper = key.toUpperCase();
      if (lower !== upper) {
        return lower === key ? [lower, upper] : [upper, lower];
      }
    }
    return [key];
  }
}