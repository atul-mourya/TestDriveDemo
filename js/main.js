/* jshint expr: true */

function isElement(obj) {
    try {
        return obj instanceof HTMLElement;
    } catch (e) {
        return (typeof obj === "object") && (obj.nodeType === 1) && (typeof obj.style === "object") && (typeof obj.ownerDocument === "object");
    }
}
var AbstractTestDrive = function(data,loadingManager,scripts,onGameReady) {

    var _this = this;
    var container = data.container;

    var _global = {
        data                : data,
        loadingManager      : loadingManager,
        bodyColoredParts    : {},
        standardParts       : {},
        baseParts           : {},
        environmentParts    : {},
        carBody             : null,
        sceneReady          : false,
        ultraHD             : false
    };

    if (container) {
        if (!isElement(container)) {
            this.container = document.getElementById(container);
            if(this.container == null){
                container = document.createElement('div');
                document.body.appendChild(container);
                this.container = container;
            }

        } else {
            this.container = container;
        }
    } else {
         container = document.createElement('div');
         document.body.appendChild(container);
         this.container = container;
    }

    this.setting = {
        //screenshot
        cameraAngle1            : { phi: Math.PI / 2, theta: Math.PI / 4 },     // front corner veiw. It is also the default camera view    **rework needed**
        cameraAngle2            : { phi: Math.PI / 2, theta: Math.PI / 2 },     // side view. To be used for creating snapshot              **rework needed**
        cameraAngle3            : { phi: -Math.PI / 2, theta: -Math.PI / 4 },   // rear corner view. To be used for creating snapshot       **rework needed**
        
        //initial values
        ground_clearence        : 0,       // camera height from ground
        nearCamLimit            : 0,      // from car's outer bounding radius
        farCamLimit             : 300,      // from car's outer bounding radius
        extendedFarCamLimit     : 200,      // for mobile portrait mode screens
        autoRotateSpeed         : 4,        // auto rotate speed parameter
        rotationSensitivity     : 0.5,
        enableDamping           : false,
        userControlledAimation  : true,    // set true to enable continuos rendering   **rework needed**
        
        //tween
        tweenJumpBackDistance   : 50,       // to be used in effectjs                   **rework needed**

        //render engine
        antialias               : true,     // antialiasing 
        fogEffectOnCar          : false,
        physicallyCorrectLights : false,     // for more realistic lighting at cost of computation
        toneMappingExposure     : 1,
        toneMappingWhitePoint   : 1,
        rendererGammaInput      : true,
        rendererGammaOutput     : true,
        fpsLimit                : 30,    // frame per second 
        enableShadow            : false,

        postprocessing          : false,
        
        // initial control button status
        nightMode               : false,    // default night mode switch button status  **rework needed**        
        hasNightMode            : false,    // need to grab this from database          **rework needed**
    };

    var tracker = {
        analysis    : true,
        pan         : true,
        exportScene : true
    };
    
    this.initSceneSetup = function() {
       _setup().then(_init);
    };

    function _setup(){
        var scriptLoader = new ScriptLoader();
        return new Promise(function(resolve, reject) {
            scriptLoader.load(data.cdn,scripts).then(function(){
                console.log('scripts are loaded');
                _global.client = new ClientJS();
                _global.clock = new THREE.Clock();
                resolve();
            }).catch(function(){
                console.log("Error");
            });
        });
    }

    function _init(){
        THREE.Cache.enabled = true;
        _initScene();
        _initRenderer();
        _initCamera();
        // _initControls();
        _importAssets();
        _registerEventListeners();
    }
    
    function _initScene() {
        _this.scene             = new THREE.Scene();
        _this.scene.name        = "Scene";
        _this.scene.background  = new THREE.Color(0xffffff);
        _this.scene.fog         = new THREE.Fog(0, 0.1, 0);
        _animateFrame();

        if(tracker.exportScene == true ) window.scene = _this.scene;
    }

    function _initRenderer() {

        _global.renderer = new THREE.WebGLRenderer({
            antialias: _this.setting.antialias,
            alpha: false,
        });

        _global.renderer.setPixelRatio(window.devicePixelRatio);
        _global.renderer.setClearColor(new THREE.Color(0x000000, 1.0));

        _global.canvas                    = _global.renderer.domElement;
        _global.canvas.style.position     = "absolute";
        _global.canvas.style.top          = "0px";
        _global.canvas.style.zIndex       = 0;
        _global.canvas.height             = _this.container.clientHeight;
        _global.canvas.width              = _this.container.clientWidth;
        
        _global.renderer.setSize(_global.canvas.width, _global.canvas.height);
        
        _this.container.appendChild(_global.canvas);
        
        if (tracker.analysis) _stats();
    }

    function _initCamera() {
        _this.camera = new THREE.PerspectiveCamera(45, _global.canvas.width / _global.canvas.height, 0.1, 5000);
        // _this.camera.lookAt(0, _this.setting.ground_clearence, 0);
    }
   
    function _importAssets() {

        var fileloader = new THREE.FileLoader();
        fileloader.load(_global.data.url, function(text) {

            var json = JSON.parse(text);

            function onLoad(){
                _refreshRenderFrame();
                loaded = true;
            }
            function onError(){ _global.loadingManager.onError(); }
            function onProgress(url,itemsLoaded,itemsTotal){
                _global.loadingManager.onProgress(url,itemsLoaded,itemsTotal);
            }

            if(json.data.base_car){

                var loadingManager = new LoadingManager(onLoad,onProgress,onError);
                
                Promise.all([

                    _loadBaseParts(json.data.base_car,loadingManager), 
                    _loadGameData(json.data.game_type, loadingManager),

                ]).then(_loadLevel)
                .then(_createHeightField).then(function(heightData){

                    console.log('Environment, car and standard parts loaded');
                    _this.sceneReady = true;
                    _global.loadingManager.onLoad();

                    _global.carBody.position.x = _global.level.alps.lake.car.origin[0];
                    _global.carBody.position.y = _global.level.alps.lake.car.origin[1];
                    _global.carBody.position.z = _global.level.alps.lake.car.origin[2];

                    _global.carBody.quaternion.x = _global.level.alps.lake.car.orientation[0];
                    _global.carBody.quaternion.y = _global.level.alps.lake.car.orientation[1];
                    _global.carBody.quaternion.z = _global.level.alps.lake.car.orientation[2];
                    _global.carBody.quaternion.w = _global.level.alps.lake.car.orientation[3];


                    // _this.camera.lookAt(_global.carBody.position);
                    // _this.camera.position.set(-9,8,31);
                    // var passes = [
                    //     {   type: "msaa", 
                    //         config:{"sampleLevel":2}
                    //     }
                    // ];
                    // if ( _this.setting.postprocessing && passes.length > 0){
                    //     _global.msaaFilterActive = true;
                    //     _global.postProcessor = new PostProcessingManager( data, _this.scene, _this.camera, _global.renderer, _this.container.clientWidth, _this.container.clientHeight, passes);
                    // } 
                    var initAmmo = true;

                    var onPhysicsReady = function () {
                        // _loadLevel().then(function () {
                            _loadEnvironment();
                            onGameReady();
                        // });
                    }

                    if (initAmmo) {
                        _this.physics = new Physics( _global.envMeshes, _global.carBody, _global.wheels, _this.camera, heightData, onPhysicsReady);
                    }

                });
                
            }
           
        });
    }

    function _loadBaseParts (model,loadManager) {
        return new Promise(function(resolve, reject) {
            
            _global.storedMaterial    = {};
            _global.envMapComponent   = [];
            _global.wheels            = [];
            
            model.url = _global.data.cdn + model.url;
            var modelPath = model.url.substring(0, model.url.lastIndexOf("/") + 1);
            
            var loader = new THREE.ObjectLoader(loadManager);
            loader.setCrossOrigin("anonymous");
            loader.setTexturePath(modelPath + "textures/");
            // loader.setModelPath(modelPath);
            loader.load(model.url, function(base) {

                _organiseObjects(base, "Car");
                _global.baseParts = base;
                console.debug("loaded base parts");
                resolve();

            });

        });
    }

    function _loadGameData(json, loadManager) {
        return new Promise(function(resolve, reject) {

            var l = _global.data.cdn + json.events.url;

            var loader = new THREE.FileLoader(loadManager);
            loader.load(l, function(text) {

                var level = JSON.parse(text);
                _global.level = level;

                resolve();
            });

        });

    }

    function _loadEnvironment() {
        new THREE.TextureLoader().load('./images/sky1.jpg', function (t1) {
            t1.minFilter = THREE.LinearFilter; // Texture is not a power-of-two size; use smoother interpolation.
            skyDome = new THREE.Mesh(
                new THREE.SphereGeometry(8192, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
                new THREE.MeshBasicMaterial({
                    map: t1,
                    side: THREE.BackSide,
                    fog: false
                })
            );
            skyDome.position.y = -_global.level.alps.lake.map.seaLevel;
            skyDome.scale.set(0.5, 0.5, 0.5);
            skyDome.name = "Sky Dome";
            scene.add(skyDome);
        });

        water = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0x006ba0,
                transparent: true,
                opacity: 0.6
            })
        );
        // water = new THREE.Water(new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 16, 16), {
        //     color: new THREE.Color(0xffffff),
        //     scale: 100,
        //     flowDirection: new THREE.Vector2(0, 0),
        //     normalMap0 : new THREE.TextureLoader().load('./images/Water_1_M_Normal.jpg'),
        //     normalMap1 : new THREE.TextureLoader().load('./images/Water_2_M_Normal.jpg'),
        //     textureWidth: 1024,
        //     textureHeight: 1024
        // });
        water.position.y = _global.level.alps.lake.map.seaLevel;
        water.rotation.x = -0.5 * Math.PI;
        water.name = 'Water';
        scene.add(water);

        skyLight = new THREE.DirectionalLight(0xe8bdb0, 1.5);
        skyLight.position.set(2950, 2625, -160); 
        skyLight.name = "Sun Light";

        scene.add(skyLight);

        var light = new THREE.AmbientLight( 0x888888 ); 
        scene.add( light );

    }

    function _loadLevel1() {
        return new Promise(function(resolve, reject) {

            var l = _global.level.alps.lake.map.model;

            var heightmapImage = new Image();
            heightmapImage.src = _global.level.alps.lake.map.heightMap;

            var loader = new THREE.ObjectLoader();
            loader.load(l, function(obj) {
                // obj.rotation.set(0,0,0);
                var o = {
                    easing: THREE.Terrain.Linear,
                    heightmap: heightmapImage,
                    maxHeight: 50,
                    minHeight: -50,
                    smoothing: 'Gaussian (1.0, 11)',
                    steps: 1,
                    stretch: true,
                    turbulent: false,
                    useBufferGeometry: false,
                    xSize: _global.level.alps.lake.map.size[0],
                    ySize: _global.level.alps.lake.map.size[1],
                    xSegments: 499,
                    ySegments: 499,
                    optimization: THREE.Terrain.None,
                };
                // debugger
                // THREE.Terrain.Gaussian(obj.geometry.vertices, o, 1, 11);
                // THREE.Terrain.Normalize(obj, o);

                _this.scene.add(obj);

                resolve();
            });

        });
    }

    function _loadLevel() {
        return new Promise(function(resolve, reject) {

            var heightmapImage = new Image();
            heightmapImage.src = _global.level.alps.lake.map.heightMap;

            var blend, sand;
            var loader = new THREE.TextureLoader();
            loader.load('./images/sand001.jpg', function (t1) {
                t1.wrapS = t1.wrapT = THREE.RepeatWrapping;
                sand = new THREE.Mesh(
                    new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 1, 1),
                    new THREE.MeshLambertMaterial({
                        map: t1
                    })
                );
                sand.position.y = -50;
                // sand.position.y = params.seaLevel - 101;
                sand.rotation.x = -0.5 * Math.PI;
                _this.scene.add(sand);
                loader.load('./images/GrassGreenTexture0002.jpg', function (t2) {
                    loader.load('./images/rock001.png', function (t3) {
                        t3.wrapS = t3.wrapT = THREE.RepeatWrapping;
                        t3.repeat.x = t3.repeat.y = 20;
                        loader.load('./images/snow1.jpg', function (t4) {
                            loader.load('resources/data/events/alps/lake/r_exp.png', function (t5) {
                                t2.wrapS = t2.wrapT = THREE.RepeatWrapping;
                                t2.repeat.x = t2.repeat.y = 200;
                                blend = THREE.Terrain.generateBlendedMaterial([{
                                        texture: t1
                                    },
                                    {
                                        texture: t2,
                                        levels: [-40, -20, 20, 30]
                                    },
                                    {
                                        texture: t3,
                                        levels: [20, 50, 60, 85]
                                    },
                                    {
                                        texture: t4,
                                        glsl: '1.0 - smoothstep(35.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 55.0, vPosition.z)'
                                    },
                                    {
                                        texture: t3,
                                        glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2'
                                    }, // between 27 and 45 degrees
                                    
                                ]);

                                var blend2 = new THREE.MeshLambertMaterial({
                                    color: 0xffffff,
                                    map: new THREE.TextureLoader().load('resources/data/events/alps/lake/c.jpg')
                                });

                                var terrainWidth = _global.level.alps.lake.map.size[0];
                                var terrainDepth = _global.level.alps.lake.map.size[1];
                                var terrainMaxHeight = _global.level.alps.lake.map.heightRange[0];
                                var terrainMinHeight = _global.level.alps.lake.map.heightRange[1];

                                var o = {
                                    xSize: terrainWidth,
                                    ySize: terrainDepth,
                                    xSegments: terrainWidth - 1,
                                    ySegments: terrainDepth - 1,
                                    maxHeight: terrainMaxHeight,
                                    minHeight: terrainMinHeight,
                                    easing: THREE.Terrain.Linear,
                                    heightmap: heightmapImage,
                                    smoothing: 'Gaussian (1.0, 11)',
                                    optimization: THREE.Terrain.POLYGONREDUCTION,
                                    frequency: 2.5,
                                    steps: 1,
                                    stretch: true,
                                    turbulent: false,
                                    useBufferGeometry: false,
                                    material: blend,

                                    //trees spread
                                    seaLevel: _global.level.alps.lake.map.seaLevel
                                    
                                };

                                var level = THREE.Terrain(o);
                                
                                //potential cause of offset in mesh layers
                                THREE.Terrain.Gaussian(level.children[0].geometry.vertices, o, 1, 11);
                                THREE.Terrain.Normalize(level.children[0], o);

                                level.name = "TerrainVisible"; 
                                _this.scene.add(level);
                                _global.terrainObj = level;
                                console.debug("loaded base parts");

                                resolve();
                            });
                        });
                    });
                });
            });
    
        });
    }

    function _createHeightField() {
        return new Promise(function(resolve, reject){
            
            var heightmapImage = new Image();
            heightmapImage.src = _global.level.alps.lake.map.heightMap;

            var terrainWidth = _global.level.alps.lake.map.size[0];
            var terrainDepth = _global.level.alps.lake.map.size[1];
            var terrainMaxHeight = _global.level.alps.lake.map.heightRange[0];
            var terrainMinHeight = _global.level.alps.lake.map.heightRange[1];

            var params = {
                xSize: terrainWidth,
                ySize: terrainDepth,
                xSegments: terrainWidth - 1,
                ySegments: terrainDepth - 1,
                maxHeight: terrainMaxHeight,
                minHeight: terrainMinHeight,
                easing: THREE.Terrain.Linear,
                heightmap: heightmapImage,
                smoothing: 'Gaussian (1.0, 11)',
                optimization: THREE.Terrain.POLYGONREDUCTION,
                frequency: 2.5,
                steps: 1,
                stretch: true,
                turbulent: false,
                useBufferGeometry: false,

                //trees spread
                seaLevel: _global.level.alps.lake.map.seaLevel,					
                spread: 0.2,
                scattering: 'Linear',
                
            };

            // terrainSetup(params, scene).then(function (output) {
                
                // scene.add(output.terrain);
                var heightData = THREE.Terrain.toArray1D(_global.terrainObj.children[0].geometry.vertices);
                // disposeObjMemory(output.terrain);
                
                var data = {
                    heightData      : heightData,
                    terrainWidth    : terrainWidth,
                    terrainDepth    : terrainDepth,
                    terrainMaxHeight : terrainMaxHeight,
                    terrainMinHeight : terrainMinHeight
                };
                

                resolve(data);

            // });
            
        });
			
    }

    function _loadCubeMap (path, callback, loadManager) {
        var format = '.jpg';
        var urls = [
            path + 'r' + format, path + 'l' + format,
            path + 'u' + format, path + 'd' + format,
            path + 'f' + format, path + 'b' + format
        ];
        var reflectionCube = new THREE.CubeTextureLoader(loadManager).load(urls, callback);
        return reflectionCube;
    }

    function _organiseObjects(obj, name) {
        if (obj.type === "Group" || obj.type === "Scene") {
            obj.name = name;

            var length = obj.children.length;
            for ( var i = 0; i < length; i++ ) {

                if( obj.children[i].type == "Group" ){

                    obj.children[i].children.forEach(function(object){
                        
                        _applyObjectSetups(object);

                    });

                    if (obj.children[i].userData.isWheel) {
                        _global.wheels.push(obj.children[i]);
                    } else {
                        _global.carBody.add(obj.children[i]);
                    }

                } else {
                    _applyObjectSetups(obj.children[i]);

                    if (!obj.children[i].userData.isWheel && _global.carBody) {
                        if(_global.carBody.name != "body") _global.carBody.add(obj.children[i]);
                    } 
                }
                
            }

            for (var i = 0; i < length; i++) {

                if (!obj.children[i].userData.isWheel && _global.carBody && obj.children[i].name != "body") {
                    _global.carBody.add(obj.children[i].clone());
                } 

            }
            
            // _this.scene.add( obj );

        }


    }

    function _applyObjectSetups(obj){
        obj.geometry = new THREE.BufferGeometry().fromGeometry(obj.geometry);
        obj.geometry.setDrawRange(0, obj.geometry.attributes.position.count);
        obj.material.fog = _this.setting.fogEffectOnCar;
        obj.material.needsUpdate = false;
        obj.castShadow = false;
        obj.receiveShadow = false;
        if (obj.name == "body") {
            _global.storedMaterial.body = obj.material;
            _global.carBody = obj;
        }

        _fetchEnvMapComponent(obj);
    }

    function _fetchEnvMapComponent (obj) {
        if (obj.material.envMap && ( obj.material.userData.blurredEnvMap == undefined || obj.material.userData.blurredEnvMap == false) ) {
            _global.envMapComponent.push(obj);
            obj.material.envMap.dispose();
            obj.material.envMap = _global.reflectionCube;
            obj.material.needsUpdate = true;
        }
    }

    function _disposeObjMemory(obj){
        if( obj ){
            if( obj.type === "Mesh" ) {

                if( obj.material ) {
                    obj.material.map && obj.material.map.dispose();
                    obj.material.aoMap && obj.material.aoMap.dispose();
                    obj.material.emissiveMap && obj.material.emissiveMap.dispose();
                    obj.material.lightMap && obj.material.lightMap.dispose();
                    obj.material.bumpMap && obj.material.bumpMap.dispose();
                    obj.material.normalMap && obj.material.normalMap.dispose();
                    obj.material.specularMap && obj.material.specularMap.dispose();
                    obj.material.envMap && obj.material.envMap.dispose();
                    obj.material.dispose();
                }
                obj.geometry && obj.geometry.dispose();

            }else if (obj.type === "Group") {
                for (var i = 0; i < obj.children.length; i++) {
                    _disposeObjMemory(obj.children[i]);
                }
            }
        }  
    }

    function _render() {
        // _this.scene.updateMatrix();
        // _this.camera.updateProjectionMatrix();
        if (_this.physics && _this.physics.isReady) _this.physics.update();
        // if(_this.setting.postprocessing && _global.postProcessor && _global.postProcessor.composer && _global.msaaFilterActive ) {
        //     _global.postProcessor.update();
        // } else {
            _global.renderer.render(_this.scene, _this.camera);
        // }
    }
   
    function _animate (doAnimate,timeout){
        _global.doAnimate = doAnimate;
        if(timeout){
            return new Promise(function(resolve,reject){  
                setTimeout(function(){
                    resolve();
                },timeout);
            });
        }
    }

    function _startAnimate() {
        if(!_global.doAnimate){
            _global.doAnimate = true;
        }
    }

    function _stopAnimate() {
        _global.doAnimate = false;
    }

    function _animateFrame() {
        // setTimeout(function () {

            requestAnimationFrame(_animateFrame);

        // }, 1000 / _this.setting.fpsLimit);

        
        if (_this.sceneReady && (_global.doAnimate == true || _this.setting.userControlledAimation == true)) {
            // _this.controls.update();
            if (tracker.analysis) _this.rendererStats.update(_global.renderer), _this.stats.update();
            _render();
        }
    }

    function _refreshRenderFrame(){
        _startAnimate();
        clearTimeout(_global.canvas.renderFrameTimeoutObj);
        _global.canvas.renderFrameTimeoutObj = setTimeout(function() {
            _stopAnimate();
        }, 1000);
    }

    function _registerEventListeners(){

        // var targetWindow = [];
        // if(window.self !== window.top){
        //     targetWindow = [window.parent, window];
        // } else {
        //     targetWindow = [window];
        // }
        
        // targetWindow.forEach(function(element){
        //     _keyPressEvent(element);
        // });     
            _keyPressEvent(window);


        // window.focus();
        window.addEventListener('resize', _onWindowResize, false);
        
        // $(window).focus(function() {
        //     _refreshRenderFrame();
        // });
        // $(window).blur(function() {
        //     _stopAnimate();
        // });
    }

    function _keyPressEvent(element){
        element.addEventListener('keypress', function(event) {
            var x = event.key;
            switch(x){
                case "h"||"H":
                    !_global.ultraHD ? _global.ultraHD = true : _global.ultraHD = false;
                    console.warn('UltraHD set to ' + _global.ultraHD + '. Performance may reduce if UltraHD is enabled. Toggle by pressing key H');
                    _this.experimentalHD(_global.ultraHD);
                    break;
                case "j"||"J":
                    if( _global.postProcessor ){
                        if( !_global.msaaFilterActive ) {
                            _this.setting.antialias = false;
                            _recreateRendererContext();
                            _global.postProcessor.composer.renderer = _global.renderer;
                            _refreshRenderFrame();
                            _global.msaaFilterActive = true;

                        } else {
                            _this.setting.antialias = true;
                            _recreateRendererContext();
                            _global.postProcessor.composer.renderer = _global.renderer;
                            _refreshRenderFrame();
                            _global.msaaFilterActive = false;
                        } 
                        console.warn('MSAA Quality set to ' + _global.msaaFilterActive + '. Performance may reduce if MSAA Quality is enabled. Toggle by pressing key J');
                    } else {
                        console.warn("Post Processing is enabled but no passes assigned. Ignoring this event.");
                    }
                    break;
                case "c" || "C":
                    _this.physics.cameraMode = _this.physics.cameraMode == 3 ? 0 : _this.physics.cameraMode + 1;
                    break;
                case "r" || "R":
                    _this.physics.needsReset = true;
                    break;
            }
        }); 
    }

    function _recreateRendererContext(){
        
        _global.renderer.dispose();
        _global.renderer.forceContextLoss(); 
        _global.renderer.context=undefined;
        var targetDOM = _global.renderer.domElement;
        targetDOM.parentNode.removeChild(targetDOM);
        _initRenderer();
        
    }

    function _onWindowResize() {
        _global.canvas.height = _this.container.clientHeight;
        _global.canvas.width = _this.container.clientWidth;
        _global.postProcessor && _global.postProcessor.composer.setSize(_global.canvas.width, _global.canvas.height);
        _global.renderer.setSize(_global.canvas.width, _global.canvas.height);
        _this.camera.aspect = _global.canvas.width / _global.canvas.height;
        
        // _refreshRenderFrame();
    }

    function _stats() {
        _this.stats = new Stats();
        _this.stats.dom.style.position = 'absolute';
        _this.stats.dom.style.top = '0px';
        _this.stats.dom.style.left = '80px';
        document.body.appendChild(_this.stats.dom);
        _this.rendererStats = new THREEx.RendererStats();
        _this.rendererStats.domElement.style.position = 'absolute';
        _this.rendererStats.domElement.style.left = '0px';
        _this.rendererStats.domElement.style.top = '0px';
        document.body.appendChild(_this.rendererStats.domElement);
    }

};

function find(array, key, value) {
    if (array) {
        for (i = 0; i < array.length; i++) {
            x = array[i];
            if (x[key] === value) {
                return x;
            }
        }
    }
    return null;
}

function disposeObjMemory (obj) {
    if ( obj !== null ) {
        for ( var i = 0; i < obj.children.length; i++ ) {
            disposeObjMemory(obj.children[i]);
        }
        if ( obj.geometry ) {
            obj.geometry.dispose();
            obj.geometry = undefined;
        }
        if ( obj.material ) {
            if (obj.material.map) {
                obj.material.map.dispose();
                obj.material.map = undefined;
            }
            obj.material.dispose();
            obj.material = undefined;
        }
    }
    obj = undefined;
}


TestDrive = function(data, loadingManager, onGameReady) {
    var scripts = [
        [   
            "/js/vendors/threejs/r90/three.js",
            "/js/vendors/ammo/ammo.js",            
        ],
        [
            "/js/vendors/threejs/r90/js/libs/THREE.Terrain.js",
            "/js/vendors/threejs/r90/js/libs/Reflector.js",
            "/js/vendors/threejs/r90/js/libs/Refractor.js",
            "/js/vendors/threejs/r90/js/libs/Water2.js",
        ],
        [
            "/js/vendors/terrain/weightedBoxBlurGaussian.js",
            "/js/vendors/terrain/gaussian.js",
            "/js/vendors/terrain/brownian.js",
            "/js/vendors/terrain/worley.js",
        ],
        [
            
            "/js/terrain2.js",
            
        ],
        [   
            "/js/physics.js",
            "/js/vendors/threex/threex.rendererstats.js",
            "/js/vendors/threejs/r90/js/libs/stats.min.js",
            "/js/vendors/clientjs/client.min.js",
            
        ],
        [
            "/js/iAtulJsonLoader.js",
            "/js/PostProcessor.js"
        ]
    ];
    AbstractTestDrive.call(this, data, loadingManager,scripts, onGameReady);
    
};

TestDrive.prototype = Object.create(AbstractTestDrive.prototype);
TestDrive.prototype.constructor = TestDrive;

function LoadingManager( onLoad, onProgress, onError ) {
    
    var scope = this;

    var isLoading = false;
    var itemsLoaded = 0;
    var itemsTotal = 0;
    var urlModifier;

    this.onStart = undefined;
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;
    this.itemsStart = function ( numberOfItems ) {
        
                itemsTotal += numberOfItems;
                isLoading = true;
        
    };

    this.itemStart = function ( url ) {

        itemsTotal ++;

        if ( isLoading === false ) {

            if ( scope.onStart !== undefined ) {

                scope.onStart( url, itemsLoaded, itemsTotal );

            }

        }

        isLoading = true;

    };

    this.itemEnd = function ( url ) {

        itemsLoaded ++;

        if ( scope.onProgress !== undefined ) {

            scope.onProgress( url, itemsLoaded, itemsTotal );

        }

        if ( itemsLoaded === itemsTotal ) {

            isLoading = false;

            if ( scope.onLoad !== undefined ) {

                scope.onLoad();

            }

        }

    };

    this.itemError = function ( url ) {

        if ( scope.onError !== undefined ) {

            scope.onError( url );

        }

    };

    this.resolveURL = function ( url ) {

        if ( urlModifier ) {

            return urlModifier( url );

        }

        return url;

    };

    this.setURLModifier = function ( transform ) {

        urlModifier = transform;
        return this;

    };   
}

function ScriptLoader() {
    function _add(basepath,urls,loadingManager) {
        var promises = [];
        if(urls && urls.length>0){
            for(var i in urls){
                
                (function(url){
                    var promise = new Promise(function(resolve, reject) {
                        loadingManager && urls && loadingManager.itemStart(url);
                        var script = document.createElement('script');
                        script.src = url;
            
                        script.addEventListener('load', function() {
                            loadingManager && loadingManager.itemEnd(url);
                            console.log("Loaded: "+url);
                            resolve(url);
                        }, false);
            
                        script.addEventListener('error', function() {
                            console.log("Error: "+url);
                            loadingManager && loadingManager.itemEnd(url);
                            reject(url);
                        }, false);
            
                        document.body.appendChild(script);
                    });
            
                    promises.push(promise);
            })(basepath+urls[i]);
            }
        }
        return promises;
    }

    this.load = function(basepath,urls,loadingManager) {

        var promise = null;
        basepath = !basepath?"":basepath;
        if(urls && urls.length>0){
            for(var i in urls){
                (function(basepath,item){
                    if(promise){
                        promise = promise.then(function(){
                            console.log('loaded');
                            return Promise.all(_add(basepath,item,loadingManager)); 
                        });
                    }else{
                        promise = Promise.all(_add(basepath,item,loadingManager));
                    }
                })(basepath,urls[i]);
            }
        }
        console.log(promise);
        // loadingManager && urls && loadingManager.itemsStart(urls.length);
        // var promises = _add(urls,loadingManager);
        // console.log(promises);
        return promise;
    };
}
