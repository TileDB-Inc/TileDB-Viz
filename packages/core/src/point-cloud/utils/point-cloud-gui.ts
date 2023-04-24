import { Scene } from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Grid,
  TextBlock,
  TextWrapping
} from '@babylonjs/gui';

class CacheGUI {
  advancedDynamicTexture: AdvancedDynamicTexture;

  constructor(scene: Scene) {
    this.advancedDynamicTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'PC-UI',
      true,
      scene
    );
  }

  createConfirmationDialog(
    scene: Scene,
    msg: string,
    titleText: string,
    callback: CallableFunction
  ) {
    const advancedDynamicTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'CONFIRMATION_DIALOG',
      true,
      scene
    );

    const panel = new Grid();
    panel.background = '#f5f5f5';
    panel.width = '300px';
    panel.height = '200px';
    panel.setPadding('16px', '16px', '16px', '16px');
    advancedDynamicTexture.addControl(panel);

    if (advancedDynamicTexture.layer !== null) {
      advancedDynamicTexture.layer.layerMask = 0x10000000;
    }

    const button = Button.CreateSimpleButton('acceptButton', 'Clear cache');
    button.width = '120px';
    button.height = '36px';
    button.color = 'white';
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    button.left = 10;
    button.top = -8;
    button.background = '#0070f0';
    button.cornerRadius = 4;
    button.zIndex = 2;
    button.onPointerUpObservable.add(() => {
      callback();
      panel.dispose();
    });
    panel.addControl(button);

    const button2 = Button.CreateSimpleButton('cancelButton', 'Cancel');
    button2.width = '120px';
    button2.height = '36px';
    button2.color = '#333';
    button2.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    button2.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    button2.left = -10;
    button2.top = -8;
    button2.cornerRadius = 4;
    button2.zIndex = 2;
    button2.onPointerUpObservable.add(() => {
      panel.dispose();
    });
    panel.addControl(button2);

    const text = new TextBlock('dialogText');
    text.height = 1;
    text.color = 'black';
    text.textWrapping = TextWrapping.WordWrap;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    text.text = msg;
    text.top = -10;
    panel.addControl(text);

    const title = new TextBlock('dialogTitle');
    title.height = 1;
    title.color = 'black';
    title.fontWeight = 'bold';
    title.fontSize = 18;
    title.textWrapping = TextWrapping.WordWrap;
    title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    title.top = -50;
    title.text = titleText;
    panel.addControl(title);
  }
}

export default CacheGUI;
