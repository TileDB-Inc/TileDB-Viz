import {
//    Color3,
//    Color4
    Scene
  } from '@babylonjs/core';
import {
    AdvancedDynamicTexture,
    Button,
    Control,
    Grid,
    StackPanel,
    Slider,
    TextBlock
  } from '@babylonjs/gui';
import ArrayModel from '../model/array-model';
//import ArrayModel from '../model/array-model';

class PointCloudGUI{
    scene: Scene
    advancedDynamicTexture: AdvancedDynamicTexture
    //arrayModel: ArrayModel

    constructor(
        scene: Scene
    ) {
        this.scene = scene;
        this.advancedDynamicTexture = AdvancedDynamicTexture.CreateFullscreenUI("PC-UI",true,this.scene);
    }

    init(
        arrayModel: ArrayModel
    ) {
        //this.arrayModel = arrayModel;

        console.log("arrayModel");
        console.log(arrayModel);

        // TODO - check these values
        this.advancedDynamicTexture.idealWidth = 800;
        this.advancedDynamicTexture.idealHeight = 900;
        this.advancedDynamicTexture.useSmallestIdeal = true;

        // set up GUI grid
        var grid = new Grid();
        grid.addColumnDefinition(128,true);
        grid.addColumnDefinition(384,true);
        grid.addColumnDefinition(1);
        grid.addColumnDefinition(80,true);

        grid.addRowDefinition(128,true);
        grid.addRowDefinition(1);
        grid.addRowDefinition(80,true);

        this.advancedDynamicTexture.addControl(grid);

        // set up control panel
        var panel = new StackPanel("leftmenu");
        panel.width = 1;
        panel.height = 1;
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        panel.background = "#33804D55";
        grid.addControl(panel,1,0);
 
        // add hamburger button
        var button = Button.CreateSimpleButton("button", "Menu");
        button.background = "#FFFFFF55";
        grid.addControl(button);

        // open and close panel menu on click
        button.onPointerUpObservable.add(() => {
            changeMenu();
        });

        // some buttons as placeholders
        var button0 = Button.CreateSimpleButton("button0", "Hello");
        button0.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        button0.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        button0.width = 1;
        button0.height = '128px';
        button0.top = 0;
        button0.background = "#FFFFFF99";

        button0.onPointerUpObservable.add(() => {
            button1.background = "#FFFFFF99";
            button2.background = "#FFFFFF99";
        });
   
        panel.addControl(button0);

        var button2 = Button.CreateSimpleButton("button2", "Ola");    
        button2.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        button2.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        button2.width = 1;
        button2.height = '128px';
        button2.top = '128px';
        button2.background = "#FFFFFF99";

        button2.onPointerUpObservable.add(() => {
            button1.background = "#FFFFFF99";
            button0.background = "#FFFFFF99";   
        });

        panel.addControl(button2);

        var button1 = Button.CreateSimpleButton("button1", "Hoi");      
        button1.width = 1;    
        button1.height = '128px';
        button1.top = '384px';
        button1.background = "#FFFFFF99";

        button1.onPointerUpObservable.add(() => {
            button0.background = "#FFFFFF99";
            button2.background = "#FFFFFF99";              
        });

        panel.addControl(button1);    

        var _menu = 0;

        var changeMenu = function() {
            if (_menu == 0){
                _menu = 1;
                panel.isVisible = true;
                }
            else if(_menu == 1){
                button.background = "transparent";
                button0.background = "#FFFFFF99";
                button1.background = "#FFFFFF99";
                button2.background = "#FFFFFF99";
                panel.isVisible = false;
                _menu = 0; 
                }
            return _menu;
        }

        //addSlider("Point size:", "particleSize", 0, 10, "20px", panel, 0, arrayModel.particleSize, arrayModel);  

        // make sure the menu is collapsed at the start
        var sceneInit = function() {
            panel.isVisible = false;
        }

        sceneInit();

        var panel2 = new StackPanel();
        panel2.width = 1;
        panel2.height = 1;
        //panel2.width = "220px";
        panel2.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel2.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        panel2.background = "#33804D55";
        panel2.fontSize = 16;
        grid.addControl(panel2,0,1);
        //this.pointCloudGUI.addControl(panel2);

        
        var header = new TextBlock();
        header.height = "30px";
        header.color = "black";

        var slider = new Slider("Slider");
        slider.minimum = 0;
        slider.step = 0.1;
        slider.height = "20px";
        slider.width = "200px";

        header.text = "Size: " + arrayModel.particleSize.toFixed(2);
        slider.maximum = 10;
        slider.value = arrayModel.particleSize;

        slider.onValueChangedObservable.add(
            function (value: any) {
                "Size: " + (value).toFixed(2);
                arrayModel.particleSize = value;
                //arrayModel.loadSystem
            });
  
        panel2.addControl(slider);

        //We run the sceneInit function on scene loading (somewhere near the end of the script)
        
    }

}    



// var addSlider = function(
//         text: string, 
//         property: string, 
//         min: number, 
//         max: number, 
//         left: string, 
//         panel: StackPanel, 
//         top: number, 
//         fixedPoint: number,
//         arrayModel: ArrayModel
//     ) {
//     var topPanel = new StackPanel();        
//     topPanel.height = "30px";
//     topPanel.isVertical = false;
//     panel.addControl(topPanel);    

//     var header = new TextBlock();
//     header.text = text;
//     header.width = "150px";
//     header.color = "white";
//     //header.outlineWidth = "4px";
//     header.outlineColor = "black";
//     header.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
//     topPanel.addControl(header); 
//     if (left) {
//         header.left = left;
//     }

//     var valueHeader = new TextBlock();
//     valueHeader.text = arrayModel.particleSize.toFixed(arrayModel.particleSize);
//     valueHeader.width = "100px";
//     valueHeader.color = "white";
//     //valueHeader.outlineWidth = "4px";
//     valueHeader.outlineColor = "black";        
//     valueHeader.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
//     topPanel.addControl(valueHeader);            

//     var slider = new Slider();
//     slider.minimum = min;
//     slider.maximum = max;
//     slider.height = "20px";
//     slider.color = "green";
//     slider.background = "white";
//     //slider.onSync = function() {
//     //    slider.value = getPropertyPath(property);
//     // }
//     //slider.onSync();
//     slider.onValueChangedObservable.add(function(value: number) {
//         arrayModel.particleSize = value;
//         //valueHeader.text = value.toFixed(fixedPoint);
//         //setPropertyPath(property, value);
//     });

//     if (left) {
//         slider.paddingLeft = left;
//     }

//     panel.addControl(slider);  

//     return slider;
// }    

export default PointCloudGUI;