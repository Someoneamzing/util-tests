const {Sprite} = require('electron-game-util');

new Sprite('item-stone', './images/stone.png', 32, 32, 32, 32, false);
new Sprite('item-test', './images/test.png', 128, 32, 32, 32, true);
new Sprite('item-sword', './images/sword.png', 32, 32, 32, 32, false);
new Sprite('teleporter', './images/teleporter.png', 48,48,48,48,false);

new Sprite('background-main', './images/background-main.png', 1920, 1080, 1920, 1080, false);
new Sprite('background-alien', './images/background-alien.png', 1920, 1080, 1920, 1080, false);
