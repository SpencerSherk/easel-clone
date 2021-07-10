import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js";

let renderer, scene, camera, line, grid;
let perspOrbit, perspCam;
let orthoOrbit, orthoCam, positions;

let count = 0;
let maxPoint = 6;
let mouse = new THREE.Vector3();
let plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);	// facing us for mouse intersection
let raycaster = new THREE.Raycaster();

let point3ds = [];

init();
animate();

function init() {

  // canvas / cam dimensions
  const width = window.innerWidth;
  const height = window.innerHeight * .75;

  // renderer
  renderer = new THREE.WebGLRenderer();
  
  renderer.setSize(window.innerWidth - 15, height);
  document.body.appendChild(renderer.domElement);

  // scene
  scene = new THREE.Scene();

  // camera perspective
  perspCam = new THREE.PerspectiveCamera(45, (width - 15) / height, 1, 10000);
  perspCam.position.set(0, 0, 200);
  
  // camera ortho
  orthoCam = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0, 1200);
  
  // assign cam
  camera = perspCam;
  
  // grid
  grid = new THREE.GridHelper(1024, 56);
  grid.rotateX(Math.PI / 2);
  scene.add(grid);

  // quad line geometry
  let geometry = new THREE.BufferGeometry();
  let MAX_POINTS = 500;
  positions = new Float32Array(MAX_POINTS * 3);
  geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

  // quad line material
  let material = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 2
  });

  // quad line mesh
  line = new THREE.Line(geometry, material);
  line.position.z = 0;
  scene.add(line);

  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener('mousedown', onMouseDown, false);
  
  createIndent();
}

// update line
function updateLine(x, y, z) {
  positions[count * 3 - 3] = x;
  positions[count * 3 - 2] = y;
  positions[count * 3 - 1] = z;
  line.geometry.attributes.position.needsUpdate = true;
}

// mouse move handler
function onMouseMove(event) {

  if (count < 5) {
    let rect = renderer.domElement.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) / (rect.right - rect.left) * 2 - 1;
    mouse.y = - ((event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    mouse = raycaster.ray.intersectPlane(plane, mouse);
    
    if( count !== 0 && count < maxPoint){
      updateLine(mouse.x, mouse.y, mouse.z);
    }
  }
}

// add point to quad based on cursor position
function addPoint(event){
  if (count < 5) {
    console.log("point nr " + count + ": " + mouse.x + " " + mouse.y + " " + mouse.z);
    positions[count * 3 + 0] = mouse.x;
    positions[count * 3 + 1] = mouse.y;
    positions[count * 3 + 2] = mouse.z
    count++;

    line.geometry.setDrawRange(0, count);
    updateLine(mouse.x, mouse.y, mouse.z);
    point3ds.push(new THREE.Vector3(mouse.x, mouse.y, mouse.z));

    if (count === 5) {
      positions[count * 3 + 0] = positions[0];
      positions[count * 3 + 1] = positions[1];
      positions[count * 3 + 2] = positions[2];
      line.geometry.setDrawRange(0, count);
      updateLine(positions[0], positions[1], positions[2]);
      point3ds.push(new THREE.Vector3(positions[0], positions[1], positions[2]));
    }
  } else {
    console.log('max points reached: ' + maxPoint);
  }
  
}

// detect if point is inside quad
function isInside(point, vs) {

  let x = point.x,
      y = point.y;

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].x,
          yi = vs[i].y;
      let xj = vs[j].x,
          yj = vs[j].y;

      let intersect = ((yi > y) != (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }

  return inside;
}

// mouse down handler
function onMouseDown(evt) {
  // force add an extra point on first click so buffer line can display
  // buffer geometry requires two points to display, so first click should add two points
  if(count === 0){
    addPoint();	
  }
  
  if(count < maxPoint){
    addPoint();
  }
}

// render
function render() {
  renderer.render(scene, camera);
}

// animate
function animate() {
  requestAnimationFrame(animate);
  render();
}

// add plane to scene with indent determined by quad shape
function createIndent(){

  const btn = document.createElement('button');
  document.body.appendChild(btn);
  btn.innerHTML = 'Carve';
  btn.addEventListener('mousedown', () => {

    // clear scene
    scene.remove(grid);
    scene.remove(line);

    // add lights
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(light);

    const light1 = new THREE.PointLight(0xffffff, 0.5);
    light1.position.set( 100, 100, 50 );
    scene.add(light1);

    // make indent plane
    requestAnimationFrame(render);
    const planeGeo = new THREE.PlaneGeometry(300, 120, 600, 240)
    const planeMaterial = new THREE.MeshLambertMaterial({color: 0xF3FFE2});
    const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
    planeMesh.position.set(0, 0, 0);

    let planePoints = planeGeo.attributes.position.array;

    let quadCorners = [
      {
        "x": positions[0],
        "y": positions[1]
      },
      {
        "x": positions[3],
        "y": positions[4]
      },
      {
        "x": positions[6],
        "y": positions[7]
      },
      {
        "x": positions[9],
        "y": positions[10]
      }
    ];

    // detect indent area, add mesh
    for (let i = 0; i < planePoints.length; i += 3) {
      let pointXY = { "x": planePoints[i], "y": planePoints[i+1] };
      if (isInside(pointXY, quadCorners)) {
        planePoints[i+2] -= 10;
      }
    }

    scene.add( planeMesh );

    // add orbiting controls to both cameras
    if (!perspOrbit){
      perspOrbit = new OrbitControls(perspCam, renderer.domElement);
      perspOrbit.screenSpacePanning = true;

      // rotation is enabled once Carve is pressed
      setToFullOrbit(perspOrbit);
      perspOrbit.enabled = true;	// set to true by default
      
    }
    
    // add orbit to orthocam
    if (!orthoOrbit) {
      orthoOrbit = new OrbitControls(orthoCam, renderer.domElement);
      orthoOrbit.screenSpacePanning = true;
      orthoOrbit.enabled = false;	// set to false by default
      orthoOrbit.enableDamping = true;
      orthoOrbit.dampingFactor = .15;
    }

  });

}

function setToFullOrbit(orbitControl) {
  // how far you can orbit vertically
  orbitControl.minPolarAngle = 0;
  orbitControl.maxPolarAngle = Math.PI;

  // How far you can dolly in and out ( PerspectiveCamera only )
  orbitControl.minDistance = 0;
  orbitControl.maxDistance = Infinity;

  orbitControl.enableZoom = true; // Set to false to disable zooming
  orbitControl.zoomSpeed = 1.0;

  orbitControl.enableRotate = true;

  // allow keyboard arrows
  orbitControl.enableKeys = true;

  // Set to false to disable panning (ie vertical and horizontal translations)
  orbitControl.enablePan = true;
}
