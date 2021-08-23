function runGL(withMaps)
{
    'use strict';

    var renderer, scene, camera, clock, stats, uniforms;
    var bufferScene, bufferTexture, bufferRenderer;

    var grad;

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
    // gl_FragColor = vec4(fract((v.x + 3.0 * v.y) / 30.0), fract(v.x / 50.0), fract(v.y / 90.0), 0.1);
    gl_FragColor = vec4(0.0, 0.0, 0.5, 0.6);
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

    async function loadGrad()
    {
        await new Promise(resolve => {
            console.log("=== loading");
            grad = new THREE.TextureLoader().load('radial-gradient.png', resolve);
            console.log("=== loading started");
        });
        console.log("=== returned from loading")
    }

    async function initScene() {

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
        bufferTexture = new THREE.WebGLRenderTarget( 512, 512, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            wrapS: THREE.RepeatWrapping});

        // Create the mesh and add it to the scene
        var mesh = new THREE.Mesh(geometry, material);
//        bufferScene.add(mesh);

        await loadGrad();

        if (true) {
            const square = new THREE.PlaneBufferGeometry(0.2, 0.2);
            const mat = new THREE.MeshBasicMaterial({
                map: grad,
                blending: THREE.CustomBlending,
                blendEquation: THREE.AddEquation,
                blendSrc: THREE.OneFactor,
                blendDst: THREE.OneFactor,
                color: 0xff8080,
            });

            for (let i = 0; i < 20; i++) {
                let mesh = new THREE.Mesh(square, mat);
                bufferScene.add(mesh);
                mesh.position.setX(Math.random() - 0.5);
                mesh.position.setY(Math.random() - 0.5);
            }
        }

        var geo2 = new THREE.PlaneBufferGeometry(0.5, 1.0);
        const mat2 = new THREE.MeshBasicMaterial({
            map: bufferTexture.texture,
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

    var doneCounter = 100;
    var frame = 0;

    function render() {
        renderer.setRenderTarget(bufferTexture);
        renderer.clear();

        const tmpScene = new THREE.Scene();
        const square = new THREE.PlaneBufferGeometry(0.4, 0.4);
        const mat = new THREE.MeshBasicMaterial({
            map: grad,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            opacity: 0.5,
        });

        let mesh = new THREE.Mesh(square, mat);
        tmpScene.add(mesh);

        frame += 0.05

        if (frame > 5) {
            return;
        }

        for (let i = 0; i < 20; i++) {
            mesh.position.setX((Math.sin(frame + i * 1.0) + Math.sin(frame + i * 1.1)) / 2.5);
            mesh.position.setY((Math.sin(frame + i * 1.4) + Math.sin(frame + i * 1.3)) / 2.5);
            mat.color.setHSL(0.25 + i * 0.5/20, 1.0, 0.5);
            // mat.color.setRGB(1, 0, 0);
            // mat.color.setHSL(0, 1.0, 0.8);
            renderer.render(tmpScene, camera);
        }

        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        renderer.resetState();
    }

    if (withMaps) {
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
    } else {
        $("#menu").html("");
        $("#map").html(`<canvas id="glCanvas" height="100%" width="100%"></canvas>`);
        let elem = document.getElementById('glCanvas');
        renderer = new THREE.WebGLRenderer({canvas: elem});
        renderer.autoClear = false;
        renderer.setSize( window.innerWidth, window.innerHeight );
//        document.body.appendChild( renderer.domElement );

        initScene();

        function animate() {
            render();
            setTimeout( function() {
                requestAnimationFrame( animate );
            }, 1000 / 10 );
        }
        animate();

    }

}
