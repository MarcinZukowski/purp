function runGL(withMaps)
{
    'use strict';

    var renderer, camera, uniforms;
    var bufferTexture

    var grad;

    var webglOverlayView;

    var vertexShader = `
#define GLSLIFY 1

varying vec2 vUv;

void main() {
    gl_Position = vec4(position, 1.0);
    vUv = uv;
}
`;

    var fragmentShader = `
#define GLSLIFY 1

uniform sampler2D u_texture;
varying vec2 vUv;

// All components are in the range [0…1], including hue.
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    // Compute pixel color. 
    vec3 pixel_color = texture2D(u_texture, vUv).rgb;
    
    // Adjust to range GREEN..PURPLE - note, we need to wrap around HSV 
    const float GREEN = 1.0 + 1.0/3.0;
    const float PURPLE = 4.0/6.0;
    const float RANGE = GREEN - PURPLE;
    float H = pixel_color.r / pixel_color.g;  // in range 0..1
    H = fract(GREEN - H * RANGE);

    vec3 hsv = vec3(H, 1.0, 1.0);
    pixel_color = hsv2rgb(hsv);
    
    float CUTOFF = 0.1;
    float alpha = texture2D(u_texture, vUv).a;
    alpha = alpha < CUTOFF ? alpha / CUTOFF : 1.0;
    
    gl_FragColor = vec4(pixel_color, alpha);
}    
`;

    async function loadGrad()
    {
        await new Promise(resolve => {
            grad = new THREE.TextureLoader().load('radial-gradient-pow2.png', resolve);
        });
    }

    async function initScene()
    {
        await loadGrad();
        console.log("called loadGrad")

        // Initialize the camera
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Create the texture that will store our result
        bufferTexture = new THREE.WebGLRenderTarget(512, 512, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            type: THREE.FloatType,
        });
    }

    var frame = 0;

    function render() {
        frame += 1
        if (frame > 100) {
            return;
        }
        const add = frame * 0.03;

        renderer.setRenderTarget(bufferTexture);
        renderer.clear();

        console.log(grad.version);

        const tmpScene = new THREE.Scene();
        const SIZE = 0.8;
        const square = new THREE.PlaneBufferGeometry(SIZE, SIZE);
        const mat = new THREE.MeshBasicMaterial({
            alphaMap: grad,
//            alphaTest: 0.05,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneFactor,
            blendEquationAlpha: THREE.AddEquation,
            blendSrcAlpha: THREE.OneFactor,
            blendDstAlpha: THREE.OneFactor,
            opacity: 0.5,
            transparent: true,
        });

        let mesh = new THREE.Mesh(square, mat);
        tmpScene.add(mesh);

        let COUNT = 10;
        let FRAC = 0.05;
        for (let i = 0; i < COUNT; i++) {
            mesh.position.setX((Math.sin(add + i * 1.0) + Math.sin(add + i * 1.1)) / 2.5);
            mesh.position.setY((Math.sin(add + i * 1.4) + Math.sin(add + i * 1.3)) / 2.5);
            mat.color.setRGB(FRAC * i / (COUNT - 1 || 1), FRAC, 1.0);
            renderer.render(tmpScene, camera);
        }

        // Define the shader uniforms
        uniforms = {
            u_texture : {
                type : "t",
                value : bufferTexture.texture
            }
        };

        const shaderMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader : vertexShader,
            fragmentShader: fragmentShader,
            transparent: true
        });

        // Initialize the scene
        const scene2 = new THREE.Scene();

        const geo2 = new THREE.PlaneBufferGeometry(0.5, 1.2);
        const mesh2 = new THREE.Mesh(geo2, shaderMat);
        scene2.add(mesh2);

        renderer.setRenderTarget(null);
        renderer.render(scene2, camera);
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

        function animate() {
            render();
            setTimeout(function () {
                requestAnimationFrame(animate);
            }, 1000 / 20);
        }

        initScene().then(() => {
            animate();
        });
    }
}
