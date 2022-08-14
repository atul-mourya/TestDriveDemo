function terrainSetup(params, scene) {
    
    return new Promise(function (resolve, reject) {
        
        webglExists = true;

        var terrainScene, decoScene,
            skyDome, skyLight, sand, water; // jscs:ignore requireLineBreakAfterVariableAssignment

        function setupWorld() {
            new THREE.TextureLoader().load('../app/images/sky1.jpg', function (t1) {
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
            //     normalMap0 : new THREE.TextureLoader().load('../app/images/Water_1_M_Normal.jpg'),
            //     normalMap1 : new THREE.TextureLoader().load('../app/images/Water_2_M_Normal.jpg'),
            //     textureWidth: 1024,
            //     textureHeight: 1024
            // });
            water.position.y = params.seaLevel;
            water.rotation.x = -0.5 * Math.PI;
            water.name = 'Water';
            scene.add(water);

            skyLight = new THREE.DirectionalLight(0xe8bdb0, 1.5);
            skyLight.position.set(2950, 2625, -160); // Sun on the sky texture
            // skyLight.castShadow = true;
            skyLight.name = "Sun Light";
            // skyLight.shadow.mapSize.width = 1024;
            // skyLight.shadow.mapSize.height = 1024;
            // skyLight.shadow.camera.near = 3500; 
            // skyLight.shadow.camera.far = 5500; 
            // skyLight.shadow.camera.left = -512;
            // skyLight.shadow.camera.right = 512;
            // skyLight.shadow.camera.top = 512;
            // skyLight.shadow.camera.bottom = -512;

            scene.add(skyLight);

            var light = new THREE.AmbientLight( 0x888888 ); // soft white light
            scene.add( light );
            // var helper = new THREE.CameraHelper(skyLight.shadow.camera);
            // scene.add(helper);


            // var light = new THREE.DirectionalLight(0xc3eaff, 0.75);
            // light.position.set(-1, -0.5, -1);
            // light.name = "directional light";
            // scene.add(light);
        }

        function setupDatGui() {
            // var heightmapImage = new Image();
            // heightmapImage.src = '../app/images/h.png';

            function Settings() {
                var that = this;
                var mat = new THREE.MeshBasicMaterial({
                    color: 0x5566aa,
                    wireframe: true
                });
                var gray = new THREE.MeshPhongMaterial({
                    color: 0x88aaaa,
                    specular: 0x444455,
                    shininess: 10
                });
                var blend;
                var elevationGraph = document.getElementById('elevation-graph'),
                    slopeGraph = document.getElementById('slope-graph'),
                    analyticsValues = document.getElementsByClassName('value');
                var loader = new THREE.TextureLoader();
                loader.load('../app/images/sand001.jpg', function (t1) {
                    t1.wrapS = t1.wrapT = THREE.RepeatWrapping;
                    sand = new THREE.Mesh(
                        new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 64, 64),
                        new THREE.MeshLambertMaterial({
                            map: t1
                        })
                    );
                    sand.position.y = params.seaLevel - 20;;
                    // sand.position.y = params.seaLevel - 101;
                    sand.rotation.x = -0.5 * Math.PI;
                    scene.add(sand);
                    loader.load('../app/images/GrassGreenTexture0002.jpg', function (t2) {
                        loader.load('../app/images/rock001.png', function (t3) {
                            t3.wrapS = t3.wrapT = THREE.RepeatWrapping;
                            t3.repeat.x = t3.repeat.y = 20;
                            loader.load('../app/images/snow1.jpg', function (t4) {
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
                                console.log(blend);
                                var result = that.Regenerate();
                                console.log("Regenated Terrain");
                                
                                resolve(result);
                            });
                        });
                    });
                });
                this.easing = params.easing || 'Linear';
                this.heightmap = params.heightmap || 'PerlinDiamond';
                this.smoothing = params.smoothing || 'None';
                this.maxHeight = params.maxHeight || 200;
                this.segments = params.segments || webglExists ? 63 : 31;
                this.steps = params.steps || 1;
                this.turbulent = params.turbulent || false;
                this.size = params.size || 1024;
                this.terrainWidth = params.xSize || 1024;
                this.terrainDepht = params.ySize || 1024;
                this.size = params.size || 1024;
                this.sky = params.sky || true;
                this.optimization = params.optimization;
                this.texture = params.texture || webglExists ? 'Blended' : 'Wireframe';
                this.edgeDirection = params.edgeDirection || 'Normal';
                this.edgeType = params.edgeType || 'Box';
                this.edgeDistance = params.edgeDistance || 256;
                this.edgeCurve = params.edgeCurve || 'EaseInOut';
                this.widthLenthRatio = params.widthLengthRatio || 1.0;
                this.spread = params.spread || 2;
                this.scattering = params.scattering || 'PerlinAltitude';
                this.after = params.after || function (vertices, options) {
                    if (that.edgeDirection !== 'Normal') {
                        (that.edgeType === 'Box' ? THREE.Terrain.Edges : THREE.Terrain.RadialEdges)(
                            vertices,
                            options,
                            that.edgeDirection === 'Up' ? true : false,
                            that.edgeType === 'Box' ? that.edgeDistance : Math.min(options.xSize, options.ySize) * 0.5 - that.edgeDistance,
                            THREE.Terrain[that.edgeCurve]
                        );
                    }
                };
                this.Regenerate = function () {
                    var s = parseInt(that.segments, 10);
                        // h = that.heightmap === 'heightmap2.png';
                    // h = that.heightmap = 'h.png';

                    var o = {
                        after: that.after,
                        easing: THREE.Terrain[that.easing],
                        heightmap: that.heightmap,
                        material: that.texture == 'Wireframe' ? mat : (that.texture == 'Blended' ? blend : gray),
                        maxHeight: that.maxHeight,
                        minHeight: -that.maxHeight,
                        optimization: that.optimization,
                        steps: that.steps,
                        stretch: true,
                        turbulent: that.turbulent,
                        useBufferGeometry: false,
                        xSize: that.terrainWidth,
                        ySize: that.terrainDepht,
                        xSegments: params.xSegments,
                        ySegments: params.ySegments,
                        _mesh: typeof terrainScene === 'undefined' ? null : terrainScene.children[0], // internal only
                    };
                    scene.remove(terrainScene);
                    terrainScene = THREE.Terrain(o);
                    applySmoothing(that.smoothing, o);
                    terrainScene.name = "Terrain";
                    // scene.add(terrainScene);
                    skyDome.visible = sand.visible = water.visible = that.texture != 'Wireframe';
                    var he = document.getElementById('heightmap');
                    if (he) {
                        o.heightmap = he;
                        THREE.Terrain.toHeightmap(terrainScene.children[0].geometry.vertices, o);
                    }

                    var heightData = THREE.Terrain.toArray1D(terrainScene.children[0].geometry.vertices);

                    // disposeObjMemory(terrainScene)

                    // that['Scatter meshes']();

                    return {
                        terrain: terrainScene,
                        heightData: heightData
                    };
                };


                function altitudeProbability(z) {
                    if (z > -80 && z < -50) return THREE.Terrain.EaseInOut((z + 80) / (-50 + 80)) * that.spread * 0.002;
                    else if (z > -50 && z < 20) return that.spread * 0.002;
                    else if (z > 20 && z < 50) return THREE.Terrain.EaseInOut((z - 20) / (50 - 20)) * that.spread * 0.002;
                    return 0;
                }
                this.altitudeSpread = function (v, k) {
                    return k % 4 === 0 && Math.random() < altitudeProbability(v.z);
                };
                var mesh = buildTree();
                mesh.name = "Forest Trees";
                var decoMat = mesh.material.map(
                    function (mat) {
                        return mat.clone();
                    }); // new THREE.MeshBasicMaterial({color: 0x229966, wireframe: true});
                decoMat[0].wireframe = true;
                decoMat[1].wireframe = true;
                this['Scatter meshes'] = function () {
                    var s = parseInt(that.segments, 10),
                        spread,
                        randomness;
                    var o = {
                        xSegments: s,
                        ySegments: Math.round(s * that.widthLenthRatio),
                    };
                    if (that.scattering === 'Linear') {
                        spread = that.spread * 0.0005;
                        randomness = Math.random;
                    } else if (that.scattering === 'Altitude') {
                        spread = that.altitudeSpread;
                    } else if (that.scattering === 'PerlinAltitude') {
                        spread = (function () {
                            var h = THREE.Terrain.ScatterHelper(THREE.Terrain.Perlin, o, 2, 0.125)(),
                                hs = THREE.Terrain.InEaseOut(that.spread * 0.01);
                            return function (v, k) {
                                var rv = h[k],
                                    place = false;
                                if (rv < hs) {
                                    place = true;
                                } else if (rv < hs + 0.2) {
                                    place = THREE.Terrain.EaseInOut((rv - hs) * 5) * hs < Math.random();
                                }
                                return Math.random() < altitudeProbability(v.z) * 5 && place;
                            };
                        })();
                    } else {
                        spread = THREE.Terrain.InEaseOut(that.spread * 0.01) * (that.scattering === 'Worley' ? 1 : 0.5);
                        randomness = THREE.Terrain.ScatterHelper(THREE.Terrain[that.scattering], o, 2, 0.125);
                    }
                    var geo = terrainScene.children[0].geometry;
                    terrainScene.remove(decoScene);
                    decoScene = THREE.Terrain.ScatterMeshes(geo, {
                        mesh: mesh,
                        w: params.xSegments,
                        h: Math.round(params.xSegments * that.widthLenthRatio),
                        spread: spread,
                        smoothSpread: that.scattering === 'Linear' ? 0 : 0.2,
                        randomness: randomness,
                        maxSlope: 0.6283185307179586, // 36deg or 36 / 180 * Math.PI, about the angle of repose of earth
                        maxTilt: 0.15707963267948966, //  9deg or  9 / 180 * Math.PI. Trees grow up regardless of slope but we can allow a small variation
                    });
                    if (decoScene) {
                        if (that.texture == 'Wireframe') {
                            decoScene.children[0].material = decoMat;
                        } else if (that.texture == 'Grayscale') {
                            decoScene.children[0].material = gray;
                        }
                        terrainScene.add(decoScene);
                    }
                };
            }
            // var gui = new dat.GUI();
            var settings = new Settings();

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

        function buildTree() {
            var material = [
                new THREE.MeshLambertMaterial({
                    color: 0x3d2817
                }), // brown
                new THREE.MeshLambertMaterial({
                    color: 0x2d4c1e
                }), // green
            ];

            var c0 = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 12, 6, 1, true));
            c0.position.y = 6;
            var c1 = new THREE.Mesh(new THREE.CylinderGeometry(0, 10, 14, 8));
            c1.position.y = 18;
            var c2 = new THREE.Mesh(new THREE.CylinderGeometry(0, 9, 13, 8));
            c2.position.y = 25;
            var c3 = new THREE.Mesh(new THREE.CylinderGeometry(0, 8, 12, 8));
            c3.position.y = 32;

            var g = new THREE.Geometry();
            c0.updateMatrix();
            c1.updateMatrix();
            c2.updateMatrix();
            c3.updateMatrix();
            g.merge(c0.geometry, c0.matrix);
            g.merge(c1.geometry, c1.matrix);
            g.merge(c2.geometry, c2.matrix);
            g.merge(c3.geometry, c3.matrix);

            var b = c0.geometry.faces.length;
            for (var i = 0, l = g.faces.length; i < l; i++) {
                g.faces[i].materialIndex = i < b ? 0 : 1;
            }

            var m = new THREE.Mesh(g, material);

            m.scale.x = m.scale.z = 5;
            m.scale.y = 1.25;

            m.matrixAutoUpdate = false;
            m.matrixWorldNeedsUpdate = false;

            return m;
        }

        setupWorld();
        setupDatGui();

        /**
         * Utility method to round numbers to a given number of decimal places.
         *
         * Usage:
         *   3.5.round(0) // 4
         *   Math.random().round(4) // 0.8179
         *   var a = 5532; a.round(-2) // 5500
         *   Number.prototype.round(12345.6, -1) // 12350
         *   32..round(-1) // 30 (two dots required since the first one is a decimal)
         */
        Number.prototype.round = function (v, a) {
            if (typeof a === 'undefined') {
                a = v;
                v = this;
            }
            if (!a) a = 0;
            var m = Math.pow(10, a | 0);
            return Math.round(v * m) / m;
        };

    });
    
}

