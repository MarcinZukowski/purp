var webglOverlayView;

function runGL(withMaps)
{
    'use strict';

    var renderer, camera, uniforms;
    var bufferTexture

    var shaderMat, shaderScene;

    var visScene, visMat, visMesh;

    var grad;

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

const vec4 empty = vec4(0.0, 0.0, 0.0, 0.0);

void main() {
    float alpha = texture2D(u_texture, vUv).a;
    if (alpha == 0.0) {
        gl_FragColor = empty;
        return;
    }

    // Compute alpha
    const float CUTOFF = 0.1;
    const float MAX = 0.5;
    alpha = alpha < CUTOFF ? alpha / CUTOFF * MAX : MAX;

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

        // Initialize the main scene and objects
        visScene = new THREE.Scene();

        visMat = new THREE.MeshBasicMaterial({
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

        const SIZE = 2.0;
        const square = new THREE.PlaneBufferGeometry(SIZE, SIZE);
        visMesh = new THREE.Mesh(square, visMat);
        visScene.add(visMesh);

        // Create the texture that will store our result
        bufferTexture = new THREE.WebGLRenderTarget(512, 512, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            type: THREE.FloatType,
        });

        // Create a shader pass that will perform conversion from HSV-like values to screen
        uniforms = {
            u_texture : {
                type : "t",
            }
        };
        shaderMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader : vertexShader,
            fragmentShader: fragmentShader,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            blendEquationAlpha: THREE.AddEquation,
            blendSrcAlpha: THREE.ZeroFactor,
            blendDstAlpha: THREE.OneFactor,
            transparent: true,
        });

        // Initialize the shader scene
        shaderScene = new THREE.Scene();
        const geo = new THREE.PlaneBufferGeometry(2.0, 2.0);
        const mesh = new THREE.Mesh(geo, shaderMat);
        shaderScene.add(mesh);
    }

    var frame = 0;

    function renderRecords()
    {
        if (!visibleRecs) {
            console.log("----------------- visibleRecs not ready");
            return;
        }

        const EQUATOR = 40075.0; //km
        const RANGE = 25.0; // km
        const DIAM_IN_DEG_X = (RANGE / EQUATOR) * 360.0;

        let bounds = map.getBounds();
        let boundsNE = bounds.getNorthEast();
        let boundsSW = bounds.getSouthWest();
        let boundsRangeY = boundsNE.lat() - boundsSW.lat();
        let boundsRangeX = boundsNE.lng() - boundsSW.lng();

        let mapProjection = map.getProjection();

        let topRight = mapProjection.fromLatLngToPoint(map.getBounds().getNorthEast());
        let bottomLeft = mapProjection.fromLatLngToPoint(map.getBounds().getSouthWest());

        let projLeft = bottomLeft.x;
        let projRight = topRight.x;
        let projTop = topRight.y;
        let projBottom = bottomLeft.y;
        let projRangeX = projRight - projLeft;
        let projRangeY = projBottom - projTop;

        let FRAC = 0.05;
        const AQI_MAX = 300;

        let yscale = (DIAM_IN_DEG_X / boundsRangeY);

        visScene.clear();

        for (let r = 0; r < visibleRecs.length; r++) {
            const rec = visibleRecs[r];
            let recPoint = mapProjection.fromLatLngToPoint(rec.position);
            let glX = 2 * (recPoint.x - projLeft) / projRangeX - 1.0;
            let glY = - (2 * (recPoint.y - projTop) / projRangeY - 1.0);
            let xscale = (DIAM_IN_DEG_X / Math.cos(rec.lat / 180.0) / boundsRangeX);

            if (!rec.mesh) {
                rec.mesh = visMesh.clone();
                rec.material = visMesh.material.clone();
                rec.mesh.material = rec.material;
            }

            let mesh = rec.mesh;
            mesh.scale.setX(xscale);
            mesh.scale.setY(yscale);
            mesh.position.setX(glX);
            mesh.position.setY(glY);
            visScene.add(mesh);

            let aqi = rec.currentAqi;
            aqi = Math.min(AQI_MAX, aqi);
            let aqiVal = aqi / AQI_MAX;
            mesh.material.color.setRGB(FRAC * aqiVal, FRAC, 1.0);
        }
        renderer.render(visScene, camera);
    }

    function render() {
        renderer.resetState();

        frame += 1
        if (frame > 1000) {
//            return;
        }
//        console.log("frame", frame);

        renderer.setRenderTarget(bufferTexture);
        renderer.setClearColor(new THREE.Color( 0x000000 ), 0.0);
        renderer.clear();

        renderRecords();

        shaderMat.uniforms.u_texture.value = bufferTexture.texture;
        renderer.setRenderTarget(null);
        renderer.render(shaderScene, camera);

        renderer.resetState();
    }

    runGL.render = render;

    if (withMaps) {
        initScene().then(() => {
            webglOverlayView = new google.maps.WebglOverlayView();

            webglOverlayView.onAdd = () => {
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
                render();
                webglOverlayView.requestRedraw();
            }

            webglOverlayView.setMap(map);
            webglOverlayView.requestRedraw();

        });
    } else {
        $("#menu").html("");
        $("#map").html(`<canvas id="glCanvas" height="100%" width="100%"></canvas>`);
        let elem = document.getElementById('glCanvas');
        renderer = new THREE.WebGLRenderer({canvas: elem});
        renderer.autoClear = false;
//        renderer.setSize( window.innerWidth, window.innerHeight );
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
