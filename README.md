## Computer Graphics project 
Built on top of the [base code](https://gitlab.inria.fr/holzschu/GPGPU_TP) as part of the Computer Graphics II course of the Mosig2 GVR Maters. 

#### To generate Makefiles:
```
$ cd computer_graphics_project
$ qmake
```
#### To compile the code:
```
$ make
```
#### To run the code:
```
$ ./viewer/myViewer
```
Both Blinn-Phong and Cook-Torrance models are implemented in "2_phong" shader.

#### To use the color picker:
1. the object should not have a color.
2. for example open scene "buddha50K.ply".

#### For perlin noise texture:
1. open scene: "buddha50K.ply".
2. change to shader: "7_noiseAlone".
