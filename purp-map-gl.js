function runGL(withMaps)
{
    'use strict';

    var renderer, camera, uniforms;
    var bufferTexture

    var grad, grad2;
    var shaderMat;

    var webglOverlayView;

    var vertexShader = `
#define GLSLIFY 1

varying vec2 vUv;

void main() {
//    gl_Position = vec4(position, 1.0);
    vUv = uv;

    gl_Position =   projectionMatrix * 
                    modelViewMatrix * 
                    vec4(position,1.0);
}
`;

    var fragmentShader = `
#define GLSLIFY 1
uniform sampler2D u_texture;

varying vec2 vUv;

void main() {
    vec2 v = gl_FragCoord.xy;
    float MUL = 0.0;
    vec3 pixel_color = vec3(fract((v.x + 3.0 * v.y) / 30.0) * MUL, fract(v.x / 50.0) * MUL, fract(v.y / 90.0) * MUL);

    pixel_color += texture2D(u_texture, vUv).rgb;
    float alpha = texture2D(u_texture, vUv).a;
    
    alpha = alpha < 0.001 ? 0.0 : 1.0;
    pixel_color *= 10.0; 
    
    gl_FragColor = vec4(pixel_color, alpha);
}    
`;

    async function loadGrad()
    {
        await new Promise(resolve => {
            grad = new THREE.TextureLoader().load('radial-gradient.png', resolve);
        });
        await new Promise(resolve => {
            grad2 = new THREE.TextureLoader().load('radial-gradient2.png', resolve);
        });
    }

    async function initScene() {

        console.log("calling loadGraad")
        await loadGrad();
        console.log("called loadGrad")

        // Initialize the camera
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Create the texture that will store our result
        bufferTexture = new THREE.WebGLRenderTarget( 512, 512, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            wrapS: THREE.RepeatWrapping});

        // Create the shader material
        shaderMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader : vertexShader,
            fragmentShader: fragmentShader,
            transparent: true
        });
    }

    var doneCounter = 100;
    var frame = 0;

    function render() {
        renderer.setRenderTarget(bufferTexture);
        renderer.clear();

        console.log(grad.version);

        const tmpScene = new THREE.Scene();
        const SIZE = 0.8;
        const square = new THREE.PlaneBufferGeometry(SIZE, SIZE);
        const mat = new THREE.MeshBasicMaterial({
            alphaMap: grad2,
            alphaTest: 0.001,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.DstAlphaFactor,
            blendEquationAlpha: THREE.AddEquation,
            blendSrcAlpha: THREE.OneFactor,
            blendDstAlpha: THREE.OneFactor,
            opacity: 0.2,
            transparent: true,
        });

        let mesh = new THREE.Mesh(square, mat);
        tmpScene.add(mesh);

        frame += 1

        if (frame > 100) {
            return;
        }

        const add = frame * 0.07;

        let COUNT = 3;
        let LUM = 0.6;
        for (let i = 0; i < COUNT; i++) {
            mesh.position.setX((Math.sin(add + i * 1.0) + Math.sin(add + i * 1.1)) / 2.5);
            mesh.position.setY((Math.sin(add + i * 1.4) + Math.sin(add + i * 1.3)) / 2.5);
            mat.color.setHSL(0.25 + i * 0.5/COUNT, 1.0, LUM);
            renderer.render(tmpScene, camera);
        }

//        console.log(shaderMat);
//        shaderMat.uniforms.u_texture.value = bufferTexture.texture;
//        shaderMat.uniforms.u_texture.texture = bufferTexture.texture;

        // Define the shader uniforms
        uniforms = {
            u_texture : {
                type : "t",
                value : bufferTexture.texture
            }
        };

//        uniforms.u_texture.value = grad;
//        uniforms.u_texture.texture = grad;

        shaderMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader : vertexShader,
            fragmentShader: fragmentShader,
            transparent: true
        });

        // Initialize the scene
        const scene2 = new THREE.Scene();

        const geo2 = new THREE.PlaneBufferGeometry(0.5, 1.2);
        const mat2 = new THREE.MeshBasicMaterial({
            map: bufferTexture.texture,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.ZeroFactor,
        });
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
