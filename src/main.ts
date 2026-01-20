import Phaser from "phaser";

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    const text = this.add.text(40, 40, "Shadow Signal", { fontSize: "32px" });
    text.setShadow(2, 2, "#000", 2);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#1b1b1b",
  scene: [MainScene],
});
