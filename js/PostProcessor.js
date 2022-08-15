var PostProcessingManager = function (data, scene, camera, renderer, width, height, passes) {
    var _this = this;
    _initPostProcessing();

    function _initPostProcessing(){
        _loadPPScripts().then( _createPostProcessor );
    }

    function _createPostProcessor(){
        var rtParameters = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            stencilBuffer: true
        };

        var rtWidth  = width;
        var rtHeight = height;
        var renderTarget = new THREE.WebGLRenderTarget( width, height, rtParameters );

        _this.composer = new THREE.EffectComposer(renderer, renderTarget);
        _this.composer.setSize(width, height);

        var renderPass = new THREE.RenderPass(scene, camera);
        _this.composer.addPass(renderPass);

        var shaderPass = new THREE.ShaderPass(THREE.CopyShader);
        shaderPass.renderToScreen = true;

        passes.forEach(function(element){
            switch(element.type) {
                case "msaa":
                    _this.msaaPass = new THREE.ManualMSAARenderPass(scene, camera);
                    _this.msaaPass.sampleLevel = element.config.sampleLevel || 2;
                    _this.msaaPass.unbiased = true;
                    _this.composer.addPass(_this.msaaPass);
                    break;
                case "fxaa":
                    _this.fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
                    _this.fxaaPass.uniforms[ 'resolution' ].value.set( 1 / width, 1 / height );
                    _this.fxaaPass.renderToScreen = false;
                    _this.composer.addPass(_this.fxaaPass);
                    break;
                case "bloom":
                    _this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.5, 0.85);
                    _this.composer.addPass(_this.bloomPass);
                    break;
                case "vignette":
                    _this.vignettePass = new THREE.ShaderPass(THREE.VignetteShader);
                    _this.vignettePass.uniforms.offset.value = element.config.offset || 0.35;
                    _this.vignettePass.uniforms.darkness.value = element.config.darkness || 1.0;
                    _this.composer.addPass(_this.vignettePass);
                    break;
                case "colorCorrection":
                    _this.colorCorrectionPass = new THREE.ShaderPass(THREE.ColorCorrectionShader);
                    _this.colorCorrectionPass.uniforms.powRGB.value = new THREE.Vector3( element.config.r || 1.0, element.config.g || 1.1, element.config.b || 1.15);
                    _this.composer.addPass(_this.colorCorrectionPass);
                    break;
                case "hblur":
                    _this.hblur = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader);
                    _this.hblur.enabled = true;
                    _this.hblur.uniforms.h.value = element.config.h || 0.0 / 1024;
                    _this.hblur.uniforms.r.value = element.config.r || 0.5;
                    _this.composer.addPass(_this.hblur);
                    break;
                case "vblur":
                    _this.vblur = new THREE.ShaderPass(THREE.VerticalTiltShiftShader);
                    _this.vblur.enabled = true;
                    _this.vblur.uniforms.v.value = element.config.v || 2.0 / 2048;
                    _this.vblur.uniforms.r.value = element.config.r || 0.5;
                    _this.composer.addPass(_this.vblur);
                    break;
                case "rgbShift":
                    _this.rgbShiftPass = new THREE.ShaderPass(THREE.RGBShiftShader);
                    _this.rgbShiftPass.uniforms.angle.value = element.config.angle || 1.0 * Math.PI;
                    _this.rgbShiftPass.uniforms.amount.value = element.config.amount || 0.007;
                    _this.rgbShiftPass.enabled = true;
                    _this.composer.addPass(_this.rgbShiftPass);
                    break;
                case "glitch":
                    _this.glitchPass = new THREE.GlitchPass(element.config.intensity || 128.0);
                    _this.glitchPass.goWild = true;
                    _this.glitchPass.enabled = true;
                    _this.composer.addPass(_this.glitchPass);
                    break;
            }
        });
        
        _this.composer.addPass(shaderPass);
        console.log(_this);
    }

    function _loadPPScripts (){
        return new Promise(function(resolve, reject) {
            var filesToLoad = [
                [   
                    "/js/vendors/threejs/r90/js/postprocessing/EffectComposer.js", 
                    "/js/vendors/threejs/r90/js/postprocessing/CopyShader.js",   
                    "/js/vendors/threejs/r90/js/postprocessing/RenderPass.js",   
                    "/js/vendors/threejs/r90/js/postprocessing/ShaderPass.js"   
                ]
            ];

            var dependencyArr   = [];
            var scriptArr       = [];

            var dependencies = 
            {
                bloom_dependency    : ["/js/vendors/threejs/r90/js/postprocessing/LuminosityHighPassShader.js"],
                glitch_dependency   : ["/js/vendors/threejs/r90/js/postprocessing/DigitalGlitch.js"]  
            };

            var scripts = 
            {
                msaa            : { url: "/js/vendors/wagner/ManualMSAARenderPass.js"},
                mask            : { url: "/js/vendors/threejs/r90/js/postprocessing/MaskPass.js"},
                fxaa            : { url: "/js/vendors/threejs/r90/js/postprocessing/FXAAShader.js"},
                bloom           : { url: "/js/vendors/threejs/r90/js/postprocessing/UnrealBloomPass.js", dependency: "bloom_dependency" },
                vignette        : { url: "/js/vendors/threejs/r90/js/postprocessing/VignetteShader.js"},
                colorCorrection : { url: "/js/vendors/threejs/r90/js/postprocessing/ColorCorrectionShader.js"},
                hblur           : { url: "/js/vendors/threejs/r90/js/postprocessing/HorizontalTiltShiftShader.js"},
                vblur           : { url: "/js/vendors/threejs/r90/js/postprocessing/VerticalTiltShiftShader.js"},
                rgbShift        : { url: "/js/vendors/threejs/r90/js/postprocessing/RGBShiftShader.js"},
                glitch          : { url: "/js/vendors/threejs/r90/js/postprocessing/GlitchPass.js", dependency: "glitch_dependency"},
            };

            passes.forEach(function(element){
                if ( scripts[element.type].dependency ) {
                    dependencies[scripts[element.type].dependency].forEach(function(el){
                        dependencyArr.push(el);
                    });
                }
                scriptArr.push(scripts[element.type].url);
            });
            dependencyArr.length > 0 && filesToLoad.push(dependencyArr);
            filesToLoad.push(scriptArr);
            
            var scriptLoader = new ScriptLoader();
            return new Promise(function(resolve, reject) {
                scriptLoader.load( data.cdn, filesToLoad ).then(function(){
                    console.log('PPscripts are loaded');
                    resolve();
                }).catch(function(){
                    console.log("Error");
                });
            }).then(function(){
                resolve();
            });
            
        });
    }

};

PostProcessingManager.prototype.update = function () {
    this.composer.render();
};
PostProcessingManager.prototype.setSize = function (width, height) {
    this.composer.setSize(width, height);
};
PostProcessingManager.prototype.updatePPConfig = function (configurations) {
    this.msaa.sampleLevel = configurations.sampleLevel;
    this.msaa.unbaised = configurations.unbaised;
};