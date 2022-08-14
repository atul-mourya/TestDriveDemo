function isMobile() {
    return window.innerWidth <= 768 && window.innerHeight <= 600;
}
function getContextPath() {
    return window.context || "" === window.context ? window.context : window.location.pathname.substring(0, window.location.pathname.indexOf("/", 2));
}

var baseUrl = null;
window.location.origin || (window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port : "")),
baseUrl = window.location.origin + getContextPath();

var a = new LoadingManager();
a.onLoad = function() {
    //onLoad
    // e.loadingData.isLoading = false
};

a.onProgress = function(a, t, r) {
    //onProgress
    // e.loadingData.isLoading = true,
    // e.loadingData.itemsLoaded = t,
    // e.loadingData.itemsTotal = r,
    // e.loadingData.progress = Math.floor(t / r * 100),
    // r < 10 || e.loadingData.lastProgress >= e.loadingData.progress || (e.$apply(),
    // PG.ProgressBar && PG.ProgressBar.progress && PG.ProgressBar.progress(e.loadingData.progress),
    // e.loadingData.lastProgress = e.loadingData.progress)
};

function _initEventListener(){
    document.addEventListener('click', function (e) {
        
        var event = e.target.id;
        switch ( event ) {
            case 'quick-play':
                // _quickPlay();
                break;
        
            default:
                break;
        }

    });
}

var onGameReady = function () {
    
    document.getElementById("main-menu" ).style.display = 'none';
    document.getElementById("loader" ).style.display = 'none';
    document.getElementById("game-container" ).style.display = 'block';
    
}

function _quickPlay() {
    document.getElementById("loader" ).style.display = 'block';
    document.getElementById("game-container" ).style.display = 'block';


    var e = {
        settings:{
            container: document.getElementById('game-container')
        }
    };
    
    e.loadTestDrive = function() {
        
        var t = baseUrl + "/resources/models/model_lookups.json";
        var r = new TestDrive({
            url: t,
            container: e.settings.container,
            cdn: baseUrl
        },a, onGameReady);
        r.initSceneSetup(),
        e.visualizer = r;
        window.scene =  e.scene;
    };

    e.loadTestDrive();
}

_initEventListener();

    
