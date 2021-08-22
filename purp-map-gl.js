function runGL()
{
    'use strict';

    var renderer, scene, camera, clock, stats, uniforms;
    var bufferScene, bufferTexture, bufferRenderer;

    var webglOverlayView;

    var vertexShader = `
#define GLSLIFY 1
void main() {
    gl_Position = vec4(position, 1.0);
}
`;

    var fragmentShader = `
#define GLSLIFY 1
void main() {
    vec2 v = gl_FragCoord.xy;
    gl_FragColor = vec4(fract((v.x + 3.0 * v.y) / 30.0), fract(v.x / 50.0), fract(v.y / 90.0), 0.1);
}    
`;

    function initRenderer() {
        // Initialize the WebGL renderer
        renderer = new THREE.WebGLRenderer();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Add the renderer to the sketch container
        var container = document.getElementById("map");
        container.appendChild(renderer.domElement);
    }

    function initScene() {

        // Initialize the scene
        scene = new THREE.Scene();

        // Initialize the camera
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Create the plane geometry
        var geometry = new THREE.PlaneBufferGeometry(2, 2);

        // Define the shader uniforms
        uniforms = {};

        // Create the shader material
        var material = new THREE.ShaderMaterial({
            uniforms: uniforms,
//            vertexShader : vertexShader,
            fragmentShader: fragmentShader,
            transparent: true
        });

        // Create a different scene to hold our buffer objects
        bufferScene = new THREE.Scene();
        // Create the texture that will store our result
        bufferTexture = new THREE.WebGLRenderTarget( 16, 16, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            wrapS: THREE.RepeatWrapping});

        // Create the mesh and add it to the scene
        var mesh = new THREE.Mesh(geometry, material);
        bufferScene.add(mesh);

        var geo2 = new THREE.PlaneBufferGeometry(0.5, 1.0);
        const text2 = new THREE.TextureLoader().load('radial-gradient.png');
        const mat2 = new THREE.MeshBasicMaterial({
            map: bufferTexture,
//            map: text2,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.ZeroFactor,
        });
        var mesh2 = new THREE.Mesh(geo2, mat2);
        scene.add(mesh2);

        console.log(scene.toJSON());
        console.log(bufferScene.toJSON());
    }

    function render() {
        renderer.setRenderTarget(bufferTexture);
        renderer.render(bufferScene, camera);

//        renderer.setRenderTarget(renderer.getContext().canvas);
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        renderer.resetState();
    }

    fun("---------------HERE");
    fun(map.getCenter());

    webglOverlayView = new google.maps.WebglOverlayView();

    webglOverlayView.onAdd = () => {
        console.log("foo");
        initScene();
    };

    webglOverlayView.onContextRestored = (gl) => {
        fun("---------------onContextRestored");
        renderer = new THREE.WebGLRenderer({
            canvas: gl.canvas,
            context: gl,
            ...gl.getContextAttributes(),
        });

        renderer.autoClear = false;
    };

    webglOverlayView.onDraw = (gl, coordinateTransformer) => {
        webglOverlayView.requestRedraw();
        render();
    }

    webglOverlayView.setMap(map);
}
