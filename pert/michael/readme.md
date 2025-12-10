# michaels pert chart system

### chartgen.js

this is where all the chart patterns live. got 8 different layouts hardcoded in there. classic diamond parallel ladder zigzag splitmerge converge complex. each one has its own predecessor relationships and xy positions for the nodes

also stores 10 preset duration sets so every chart is reproducible. you call generateLayout and it picks a random layout plus random duration set or you can pass specific indices if you want control

**how generateLayout works**

takes optional layoutindex 1 to 8 and setindex 1 to 10. first it picks which duration set to use by checking passed setindex then url params like game.html?set=3 then falls back to random. next picks layout pattern same way with layoutindex. loops through nodes a to g and builds task objects with id duration predecessors successors and xy position. durations come from the chosen preset array. positions come from layout object

**successor limiting**

enforces max 2 outgoing arrows per node to keep diagrams readable. loops through all predecessor relationships and counts how many successors each node has. if a node already has 2 successors any additional predecessor links get dropped. this breaks some dependencies but prevents too many crossing lines

**compact string**

builds identifier like a4b8c2d1e5f6g10 by concatenating lowercase letter plus duration for each task. used by answer matching system to find correct csv entry when layout name or set number matching fails

the function returns an object with tasks compact layoutname setindex layoutindex. tasks has all the node data. everything else helps with answer key matching and logging

### pert_ui.js

this has all the visual stuff split into classes using polymorphism

**arrowrenderer classes** strategy pattern for drawing arrows

arrowrenderer base class with abstract draw method. curvedarrowrenderer does smooth bezier curves. straightarrowrenderer does direct lines. steppedarrowrenderer does right angle bends

the graphrenderer class stores whichever arrow renderer you pick in this.arrowrenderer then calls draw on it. so you can swap rendering styles without touching any other code. right now it always picks curved but you could add logic to switch based on user preference or whatever

**graphrenderer class** draws the whole diagram

drawemptyquiz builds all the node divs with input fields and creates svg overlay for arrows. relaxnodepositions runs physics sim to push overlapping nodes apart uses aabb collision detection. redrawarrows clears and redraws all arrows after resize. bunch of helper methods for getting user inputs clearing feedback highlighting critical path

**other stuff**

animationmanager handles the critical path highlight animation. soundmanager plays audio feedback

### main.js

ties everything together. has the uicontroller class that manages the whole quiz flow

**csv loading** loadcsvanswer key reads pertkey.csv and builds window.michaelanswer key object. stores correct answers organized by layout name and set number like classicdata1 paralleldata5 etc

**answer matching** findanswer keyforlayout matches generated chart to csv answers. tries three strategies. direct match by layoutname plus setindex. fallback match by comparing compact duration string. last resort grab first key for that layout type

**grading logic** oncheckclick does all the validation

compares user inputs to correct answers field by field. shows green red feedback. displays correct answer hints when wrong. plays mario fall sound for errors or success chime for perfect score. switches button to try again mode after grading

**try again mode** generates fresh random layout and clears everything so user can practice again

### mainmenu.js

super simple just button handlers. start button goes to game page. easy hard buttons pass url params for difficulty. rules button toggles explanation panel

## how they talk to each other

```
chartgen creates data → main.js uicontroller stores it → 
graphrenderer draws it → user fills inputs → uicontroller grades against csv answers → animationmanager shows results
```

key connection points window.generatelayout exposed globally by chartgen. window.lastgeneratedlayout stores current chart data. window.michaelanswer key stores csv answers. main.js creates instances of graphrenderer animationmanager soundmanager and coordinates them

### want to add a new layout

add it to the layouts array in chartgen with name preds and positions. dont forget to add a matching preset duration array if you want 10 sets for it. thats it chartgen will auto include it in random selection

### want to change arrow style

create new class extending arrowrenderer implement the draw method then modify selectarrowrenderer in graphrenderer to return your new class. everything else just works because polymorphism

### want to add more input fields per node

update the html template in drawemptyquiz. add fields to getuseranswers return object. add them to fieldstocheck array in grading loop. update csv with new columns. update csv parser to read new columns

### want different feedback animations

modify animationmanager class. its completely separate from grading logic so you cant break the quiz. just make sure you pass it the correct tasks object

### want to add sound effects

add methods to soundmanager. right now it just logs to console but you could play actual audio files. uicontroller already has reference to soundmanager so just call your new methods

## important things to not mess with

dont change the compact string format in chartgen or answer matching breaks. dont rename the layoutname or setindex properties or csv matching fails. dont modify how tasks object is structured lots of stuff depends on id len pred succ x y. graphrenderer expects specific  structure for nodes if you change the html template update the collision detection too.



## prefab documentation

### chartgen.js prefabs

**generateLayout(layoutIndex, setIndex)**
returns object   with tasks compact layoutname setindex layoutindex. layoutindex 1 to 8 picks which pattern. setindex 1 to 10 picks which duration set. leave both empty for random selection

**layouts array**
holds 8 preset chart patterns each has name preds positions. preds defines predecessor relationships. positions sets xy coords for each node

**presetSets array**
10 arrays of 7 numbers each. maps to tasks a through g. used to make charts reproducible

**randInt(min, max)**
generates random integer between min and max inclusive. used internally for random selection

### pert_ui.js prefabs

**ArrowRenderer**
abstract base class for arrow drawing. has draw method that throws error. subclasses override it. has getcoords helper that calculates connection points on node edges

**CurvedArrowRenderer**
extends arrowrenderer. draw method creates smooth curve paths between nodes using svg path with cubic bezier command

**StraightArrowRenderer**
extends arrowrenderer. draw method creates direct line paths between nodes using svg line command

**SteppedArrowRenderer**
extends arrowrenderer. draw method creates right angle paths with horizontal then vertical then horizontal segments

**GraphRenderer**
main rendering class. constructor sets up container reference and picks arrow renderer strategy. stores currenttasks for redrawing

**GraphRenderer.selectArrowRenderer()**
factory method returns instance of arrow renderer. currently always returns curvedarrowrenderer. modify this to switch strategies

**GraphRenderer.drawEmptyQuiz(tasks)**
creates all node divs with input fields. builds svg overlay for arrows. calls relaxnodepositions then draws all arrows. populates task table at bottom

**GraphRenderer.relaxNodePositions()**
iterative physics simulation. detects node collisions using aabb algorithm. pushes overlapping nodes apart vertically. runs max 20 iterations or until stable

**GraphRenderer.redrawArrows(tasks)**
clears all existing arrow paths from svg. recalculates container position. redraws all arrows using stored arrow renderer

**GraphRenderer.getUserAnswers(taskId)**
returns object with es ef ls lf slack values from input fields for specified task

**GraphRenderer.showFeedback(taskId, field, isCorrect)**
adds correct or wrong class to input element for visual feedback

**GraphRenderer.clearFeedback()**
removes all correct wrong and critical highlight classes from nodes and inputs

**GraphRenderer.clearInputs()**
clears all input field values and removes feedback classes

**AnimationManager**
handles visual animations. constructor takes soundmanager reference

**AnimationManager.playCriticalPathAnimation(correctTasks)**
loops through tasks finds ones with slack equals 0. adds critical highlight class to those nodes

**SoundManager**
manages audio playback. currently just logs to console

**SoundManager.playSound(soundName)**
plays specified sound. right now only logs but could play actual audio files

### main.js prefabs

**loadCSVAnswerKey()**
async function fetches pertkey.csv. parses rows and columns. builds window.michaelanswer key object organized by layoutname plus data plus setindex like classicdata1

**UIController**
main controller class coordinates all the pieces

**UIController.constructor()**
sets up button and container references. creates soundmanager animationmanager graphrenderer instances. generates initial layout. draws quiz. sets up button listener

**UIController.findAnswerKeyForLayout(gen, keyStore)**
matches generated chart to csv answer key. tries direct match by name and set. falls back to comparing durations. last resort grabs first match for layout type

**UIController.onCheckClick()**
handles check button and try again button. in try mode regenerates layout and clears inputs. in check mode loads answer key compares user inputs shows feedback plays sounds switches to try mode


