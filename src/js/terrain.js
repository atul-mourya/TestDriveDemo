function terrainSetup(params, scene) {
    
    return new Promise(function (resolve, reject) {
        
        webglExists = true;

        var terrainScene,
            skyDome, skyLight, water; // jscs:ignore requireLineBreakAfterVariableAssignment


        function applySmoothing(smoothing, o) {
            var m = terrainScene.children[0];
            var g = m.geometry.vertices;
            if (smoothing === 'Conservative (0.5)') THREE.Terrain.SmoothConservative(g, o, 0.5);
            if (smoothing === 'Conservative (1)') THREE.Terrain.SmoothConservative(g, o, 1);
            if (smoothing === 'Conservative (10)') THREE.Terrain.SmoothConservative(g, o, 10);
            else if (smoothing === 'Gaussian (0.5, 7)') THREE.Terrain.Gaussian(g, o, 0.5, 7);
            else if (smoothing === 'Gaussian (1.0, 7)') THREE.Terrain.Gaussian(g, o, 1, 7);
            else if (smoothing === 'Gaussian (1.5, 7)') THREE.Terrain.Gaussian(g, o, 1.5, 7);
            else if (smoothing === 'Gaussian (1.0, 5)') THREE.Terrain.Gaussian(g, o, 1, 5);
            else if (smoothing === 'Gaussian (1.0, 11)') THREE.Terrain.Gaussian(g, o, 1, 11);
            else if (smoothing === 'GaussianBox') THREE.Terrain.GaussianBoxBlur(g, o, 1, 3);
            else if (smoothing === 'Mean (0)') THREE.Terrain.Smooth(g, o, 0);
            else if (smoothing === 'Mean (1)') THREE.Terrain.Smooth(g, o, 1);
            else if (smoothing === 'Mean (8)') THREE.Terrain.Smooth(g, o, 8);
            else if (smoothing === 'Median') THREE.Terrain.SmoothMedian(g, o);
            THREE.Terrain.Normalize(m, o);
        }
    
        function setupWorld() {
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
                skyDome.position.y = -params.seaLevel;
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
            water.position.y = params.seaLevel;
            water.rotation.x = -0.5 * Math.PI;
            water.name = 'Water';
            scene.add(water);

            skyLight = new THREE.DirectionalLight(0xe8bdb0, 1.5);
            skyLight.position.set(2950, 2625, -160); // Sun on the sky texture
            skyLight.name = "Sun Light";


            scene.add(skyLight);

            var light = new THREE.AmbientLight( 0x888888 ); // soft white light
            scene.add( light );

        }
        setupWorld();

        // var heightmapImage = new Image();
        // heightmapImage.src = './images/h.png';

        var mat = new THREE.MeshLambertMaterial({
            color: 0x5566aa,
            wireframe: false
        });

        var o = {
            easing: THREE.Terrain[ params.easing || 'Linear' ],
            heightmap: params.heightmap,
            material:  mat,
            maxHeight: params.mmaxHeight || 200,
            minHeight: params.minHeight || 200,
            steps: params.steps || 1,
            stretch: true,
            turbulent: false,
            useBufferGeometry: false,
            optimization: THREE.Terrain.POLYGONREDUCTION,
            xSize: params.terrainWidth || 1024,
            ySize: params.terrainDepht || 1024,
            xSegments: params.xSegments,
            ySegments: params.ySegments,
            _mesh: typeof terrainScene === 'undefined' ? null : terrainScene.children[0], // internal only
        };

        var loader = new THREE.TextureLoader();
        loader.load('./images/sand001.jpg', function (t1) {
            
            terrainScene = THREE.Terrain(o);
            applySmoothing( 'Gaussian (1.0, 11)', o );
            terrainScene.name = "TerrainHidden"; 
            scene.add(terrainScene);

            var heightData = THREE.Terrain.toArray1D(terrainScene.children[0].geometry.vertices);

            
            // disposeObjMemory(terrainScene);
            console.log("Regenated Terrain");
                        
            var result = {
                terrain: null,
                heightData: heightData
            };
            
            resolve(result);

        });
        


    });
    
}

