import * as THREE from 'three';
import {Pen, bodyFront, townsfolk} from './toon';
import {NOINK} from './ink';
import {cameraAt, floodFrontAt, shotAt, shotProgress, smooth, clamp} from './timeline.mjs';

// All scenery and effects are original, generated from geometry and Canvas2D.
// No copied reference frames, stock 3D models, or external texture downloads.
const ink = '#251d2a';
const rgb = (v: string) => new THREE.Color(v);
const hash = (n: number) => {const v = Math.sin(n * 128.43 + 12.57) * 43158.5453; return v - Math.floor(v);};
const mat = (color: string, roughness = .88, metalness = 0) =>
  new THREE.MeshStandardMaterial({color, roughness, metalness});
const M = {
  iron: mat('#475364',.45,.62), trim: mat('#2a3140',.65,.45),
  brass: mat('#bb8b57',.37,.6), wood: mat('#9c6449',.87),
  molasses: mat('#542019',.31,.13), highlight: mat('#bd6639',.34,.1),
  sidewalk: mat('#bcae9b'), sill: mat('#edcbb1'), glass: mat('#547890',.16,.3)
};
function box(root: THREE.Object3D, pos: [number,number,number], size: [number,number,number],
  material: THREE.Material | string, outline = false) {
  const geo = new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
  mesh.position.set(...pos); mesh.receiveShadow = true; mesh.castShadow = true;
  root.add(mesh);
  if (outline) {
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo,38),new THREE.LineBasicMaterial({color:ink,transparent:true,opacity:.55}));
    mesh.add(edge);
  }
  return mesh;
}
function orb(root: THREE.Object3D, pos: [number,number,number], radius: number,
  material: THREE.Material, widthSegments=12, heightSegments=8) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius,widthSegments,heightSegments),material);
  m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; root.add(m);return m;
}
function canvasTexture(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void) {
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const g=cv.getContext('2d')!;draw(g);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=8;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function brickTexture(c:string,seed:number){
  return canvasTexture(512,768,g=>{
    g.fillStyle='#e8b99c';g.fillRect(0,0,512,768);
    for(let row=0;row<28;row++) for(let col=-1;col<9;col++){
      const offset=(row%2)*32,x=col*66-offset+2,y=row*28+2;
      const v=(hash(row*73+col*17+seed)-.5)*32;
      g.fillStyle=c;g.fillRect(x,y,62,24);
      g.fillStyle='rgba(255,229,199,.11)';g.fillRect(x+3,y+2,57,3);
      g.fillStyle='rgba(24,14,25,.11)';g.fillRect(x+1,y+20,60,4);
      g.fillStyle='rgba(39,29,32,'+(.045+hash(row*19+col+seed)*.1)+')';
      for(let i=0;i<7;i++)g.fillRect(x+hash(i+row*40+col*17)*59,y+hash(i*17+col*35+row)*22,2,2);
      if(v>10){g.fillStyle='rgba(245,210,175,.07)';g.fillRect(x,y,60,24);}
    }
  });
}
function cobbleTexture(){
  const t=canvasTexture(1024,1024,g=>{
    g.fillStyle='#a69888';g.fillRect(0,0,1024,1024);
    for(let r=0;r<29;r++)for(let c=0;c<24;c++){
      const x=c*46+(r%2)*21+hash(r*17+c)*5,y=r*37+hash(c*17+r)*4;
      const v=Math.floor(hash(r*245+c*57)*33);
      g.fillStyle='rgb('+(139+v)+','+(128+v)+','+(115+v)+')';
      g.beginPath();g.roundRect(x,y,40,31,6);g.fill();
      g.strokeStyle='rgba(44,36,36,.3)';g.lineWidth=2;g.stroke();
      g.strokeStyle='rgba(250,225,200,.22)';g.beginPath();g.moveTo(x+5,y+6);g.lineTo(x+31,y+4);g.stroke();
    }
  });
  t.repeat.set(1.8,13);return t;
}
function woodTexture(){
  const t=canvasTexture(512,512,g=>{
    g.fillStyle='#946549';g.fillRect(0,0,512,512);
    for(let i=0;i<43;i++){
      const y=i*13+hash(i)*3;
      g.strokeStyle=i%3===0?'rgba(35,20,18,.32)':'rgba(245,205,160,.15)';
      g.lineWidth=1+hash(i*3)*4;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(170,y+8,325,y-8,512,y+3);g.stroke();
    }
  });t.repeat.set(3,3);return t;
}
function cylinder(root:THREE.Object3D,r:number,h:number,pos:[number,number,number],material:THREE.Material,segments=44){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);
  m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
}
function ring(root:THREE.Object3D,rad:number,y:number,material:THREE.Material){
  const t=new THREE.Mesh(new THREE.TorusGeometry(rad,.065,7,72),material);
  t.rotation.x=Math.PI/2;t.position.y=y;root.add(t);return t;
}
function house(side:number,z:number,index:number,firehouse=false){
  const root=new THREE.Group();
  const w=firehouse?10:7.4+hash(index*19)*3.5;
  const h=firehouse?9.4:8+hash(index*31)*4.3;
  const d=6.7+hash(index*7)*1.9;
  root.position.set(side*(13.8+(index%3)*.8),0,z);
  root.rotation.y=side>0?-Math.PI/2:Math.PI/2;
  const colors=['#bb7460','#c89071','#b06b58','#d0a079','#af665b','#c39773'];
  const c=colors[index%colors.length];
  const wall=mat('#ffffff');
  wall.map=brickTexture(c,index+3);
  box(root,[0,h/2,0],[w,h,d],wall,true);
  box(root,[0,h+.15,0],[w+.5,.34,d+.5],M.sill,true);
  box(root,[0,h+.48,0],[w+.8,.38,d+.9],mat('#795352'),true);
  box(root,[0,.43,d/2+.09],[w,.8,.22],mat('#695355'));
  box(root,[0,1.5,d/2+.22],[firehouse?6:2.25,firehouse?2.8:2.65,.18],mat('#554c4e'),true);
  if(firehouse){
    box(root,[0,1.5,d/2+.34],[5.5,2.5,.09],mat('#7b8c92'));
    box(root,[0,5.8,d/2+.15],[6.3,.55,.3],M.sill,true);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(2.85,.2,10,26,Math.PI),M.sill);
    arch.rotation.z=Math.PI;arch.position.set(0,3,d/2+.39);root.add(arch);
  }else{
    box(root,[0,1.35,d/2+.38],[1.8,2.55,.09],mat('#584b49'));
    box(root,[0,2.65,d/2+.42],[2.22,.21,.32],M.sill);
  }
  for(let floor=0;floor<(firehouse?2:3);floor++){
    const y=(firehouse?5:4)+floor*2.5;
    if(y+1.7>h)continue;
    for(let j=-1;j<=1;j++){
      const x=j*w*.265;
      box(root,[x,y,d/2+.12],[1.25,1.75,.13],mat('#5c4045'),true);
      box(root,[x,y,d/2+.2],[1.03,1.51,.075],mat('#6c98a6',.22,.25));
      box(root,[x,y,d/2+.27],[.085,1.55,.06],M.trim);
      box(root,[x,y,d/2+.28],[1.05,.09,.07],M.trim);
      box(root,[x,y-.97,d/2+.33],[1.55,.19,.42],M.sill,true);
      box(root,[x,y+.94,d/2+.25],[1.55,.18,.32],M.sill);
      if(j!==0) box(root,[x-1,y,d/2+.21],[.25,1.8,.16],mat('#785a59'));
    }
  }
  for(let k=0;k<2;k++){
    box(root,[-w*.32+k*w*.65,h+.83,-d*.15],[.72,1.2,.82],mat('#805854'),true);
    box(root,[-w*.32+k*w*.65,h+1.5,-d*.15],[1.05,.18,1.07],mat('#e1b897'));
  }
  return root;
}
function skyDome(){
  const m=new THREE.Mesh(new THREE.SphereGeometry(250,36,20),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    vertexShader:'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 vPos;void main(){float h=clamp(normalize(vPos).y*1.1+0.48,0.,1.);vec3 a=vec3(.73,.83,.94);vec3 b=vec3(.18,.42,.77);gl_FragColor=vec4(mix(a,b,smoothstep(0.,1.,h)),1.);}'
  }));
  m.layers.set(NOINK);m.frustumCulled=false;return m;
}
class Toon {
  mesh:THREE.Mesh;
  shadow:THREE.Mesh;
  tex:THREE.CanvasTexture;
  cv:HTMLCanvasElement;
  last=-9999;
  outfit:ReturnType<typeof townsfolk>;
  seed:number;
  home:THREE.Vector3;
  constructor(parent:THREE.Object3D,index:number,home:[number,number,number]){
    this.seed=index+5;this.home=new THREE.Vector3(...home);this.outfit=townsfolk(index);
    this.cv=document.createElement('canvas');this.cv.width=420;this.cv.height=700;
    this.tex=new THREE.CanvasTexture(this.cv);this.tex.colorSpace=THREE.SRGBColorSpace;
    this.tex.anisotropy=4;
    const geo=new THREE.PlaneGeometry(1.56,2.60);
    const material=new THREE.MeshLambertMaterial({map:this.tex,alphaTest:.38,side:THREE.DoubleSide,transparent:true,depthWrite:true});
    this.mesh=new THREE.Mesh(geo,material);
    this.mesh.layers.set(NOINK);this.mesh.position.set(home[0],1.31,home[2]);this.mesh.castShadow=false;
    parent.add(this.mesh);
    const s=new THREE.Mesh(new THREE.CircleGeometry(.5,30),new THREE.MeshBasicMaterial({color:'#33202a',transparent:true,opacity:.2,depthWrite:false}));
    s.rotation.x=-Math.PI/2;s.scale.set(1,.5,1);s.position.set(home[0],.038,home[2]);parent.add(s);this.shadow=s;
  }
  update(f:number,cam:THREE.PerspectiveCamera,active:boolean,panic:boolean){
    const step=Math.floor(f/3);
    this.mesh.visible=active;this.shadow.visible=active;
    if(!active)return;
    const t=panic? Math.max(0,(f-682)/30):f/30;
    const phase=(t*1.35+this.seed*.14)%1;
    const run=panic&&f>682&&f<1170;
    const x=this.home.x+(run?Math.min(9,(f-682)*.037)*((this.seed%2)?-1:1):.25*Math.sin(f*.013+this.seed));
    const z=this.home.z+(run?Math.min(35,(f-682)*.11):.14*Math.cos(f*.015+this.seed));
    this.mesh.position.set(x,1.31+(run?Math.sin(f*.18)*.06:0),z);
    this.shadow.position.set(x,.038,z);
    this.mesh.rotation.y=Math.atan2(cam.position.x-x,cam.position.z-z);
    if(this.last!==step){
      this.last=step;
      const g=this.cv.getContext('2d')!;
      g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,this.cv.width,this.cv.height);
      g.scale(.7,.7);
      bodyFront(new Pen(g),this.outfit,{
        phase, mode:run?'stroll':(f>1450?'stand':'stroll'),
        expr:run?'shock':(f>1450?'relief':'neutral'),blink:step%43===this.seed,
        look:run?.38:0,seed:this.seed,light:.6
      });
      this.tex.needsUpdate=true;
    }
  }
}
class Flood {
  root=new THREE.Group();
  geom:THREE.BufferGeometry;
  frontGeom:THREE.BufferGeometry;
  glints:THREE.Mesh[]=[];
  constructor(parent:THREE.Object3D){
    const nx=34,nz=43;let pos=new Float32Array((nx+1)*(nz+1)*3);let ids:number[]=[];
    for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
      const n=z*(nx+1)+x;
      ids.push(n,n+1,n+nx+1,n+1,n+nx+2,n+nx+1);
    }
    this.geom=new THREE.BufferGeometry();this.geom.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
    this.geom.setIndex(ids);
    const surf=new THREE.Mesh(this.geom,M.molasses);
    surf.castShadow=true;surf.receiveShadow=true;this.root.add(surf);
    this.frontGeom=new THREE.BufferGeometry();
    this.frontGeom.setAttribute('position',new THREE.BufferAttribute(new Float32Array((nx+1)*2*3),3).setUsage(THREE.DynamicDrawUsage));
    const frontIndex:number[]=[];
    for(let x=0;x<nx;x++){const i=x*2;frontIndex.push(i,i+1,i+2,i+1,i+3,i+2);}
    this.frontGeom.setIndex(frontIndex);
    const front=new THREE.Mesh(this.frontGeom,new THREE.MeshStandardMaterial({color:'#6c3024',roughness:.32,metalness:.08,side:THREE.DoubleSide}));
    this.root.add(front);
    for(let k=0;k<39;k++){
      const o=orb(this.root,[0,0,0],.14+hash(k)*.13,k%4===0?M.highlight:mat('#bc6b3d',.42,.1),9,7);
      o.castShadow=false;this.glints.push(o);
    }
    this.root.visible=false;parent.add(this.root);
  }
  update(f:number){
    const active=f<115||(f>=676&&f<1450);
    this.root.visible=active;if(!active)return;
    const front=floodFrontAt(f),nx=34,nz=43;
    const a=this.geom.getAttribute('position') as THREE.BufferAttribute;
    const cross=(x:number)=>Math.max(.2,1-.37*Math.pow(Math.abs(x)/7.8,3));
    const surface=(x:number,z:number)=>{
      const back=front-z;
      return Math.max(.08,.58+2.9*Math.exp(-Math.pow(back/5.4,2))
        +.18*Math.sin(z*.85+f*.11+x*.23)+.11*Math.sin(z*1.7-f*.14+x*.6))*cross(x);
    };
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const x=-7.6+15.2*i/nx,z=front-37+37*j/nz;
      a.setXYZ(j*(nx+1)+i,x,surface(x,z),z);
    }
    a.needsUpdate=true;this.geom.computeVertexNormals();
    const b=this.frontGeom.getAttribute('position') as THREE.BufferAttribute;
    for(let i=0;i<=nx;i++){
      const x=-7.6+15.2*i/nx;
      b.setXYZ(i*2,x,.05,front+.015);
      b.setXYZ(i*2+1,x,surface(x,front),front+.015);
    }
    b.needsUpdate=true;this.frontGeom.computeVertexNormals();
    for(let i=0;i<this.glints.length;i++){
      const p=this.glints[i],x=-7+hash(i*7)*14;
      const z=front-1.6-hash(i*19)*18;
      const h=surface(x,z);
      p.position.set(x,h+.015+Math.sin(f*.16+i)*.035,z);
      p.scale.set(1.5+.5*hash(i),.18,.42+hash(i));
      p.rotation.y=hash(i*17)*Math.PI;
    }
  }
}
export class World {
  root=new THREE.Group();
  town=new THREE.Group();
  macro=new THREE.Group();
  plans=new THREE.Group();
  private people:Toon[]=[];
  private flood:Flood;
  private tank=new THREE.Group();
  private tankShell:THREE.Mesh;
  private shellFragments:THREE.Mesh[]=[];
  private paintMask:THREE.Mesh;
  private drips:THREE.Mesh[]=[];
  private firehouse:THREE.Group;
  private spoonDrop:THREE.Mesh;
  private spoonStream:THREE.Mesh;
  private tinyTown:THREE.Group;
  private fracture:THREE.Mesh;
  private sun:THREE.DirectionalLight;
  private baseFog=new THREE.Fog('#b8d0ec',32,130);
  constructor(){
    this.root.add(skyDome());
    this.root.add(new THREE.HemisphereLight('#fff1cf','#465879',2.25));
    this.root.add(new THREE.AmbientLight('#d9e5ed',.35));
    this.sun=new THREE.DirectionalLight('#ffdec0',3.4);
    this.sun.position.set(-28,42,12);this.sun.target.position.set(0,0,-10);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
    this.sun.shadow.camera.left=-55;this.sun.shadow.camera.right=55;
    this.sun.shadow.camera.top=65;this.sun.shadow.camera.bottom=-65;
    this.sun.shadow.camera.near=.5;this.sun.shadow.camera.far=160;
    this.sun.shadow.bias=-.0001;
    this.root.add(this.sun,this.sun.target);
    this.root.add(this.town,this.macro,this.plans);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,280),mat('#8fa280'));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.11;ground.receiveShadow=true;this.town.add(ground);
    const streetMat=mat('#fff7e9');streetMat.map=cobbleTexture();
    const road=new THREE.Mesh(new THREE.PlaneGeometry(16.5,215),streetMat);
    road.rotation.x=-Math.PI/2;road.position.set(0,.015,-30);road.receiveShadow=true;this.town.add(road);
    for(const side of [-1,1]){
      box(this.town,[side*9,.15,-28],[2.6,.32,212],M.sidewalk);
      for(let z=-85;z<45;z+=13){
        const k=Math.round((z+85)/13)+(side+1)*31;
        if(side===1&&z>=-23&&z<=-7)continue;
        const h=house(side,z,k);
        this.town.add(h);
      }
    }
    this.firehouse=house(-1,-9,21,true);this.town.add(this.firehouse);
    // Suspended overhead iron railway as a richly layered midground silhouette.
    for(const h of [10.6,11.35]) box(this.town,[0,h,-37],[39,.18,.39],M.iron,true);
    for(let i=-20;i<=20;i+=3.1){
      box(this.town,[i,10.8,-37],[.15,2.25,.35],M.trim);
      if(i<20){
        const beam=box(this.town,[i+1.5,10.9,-37],[.12,3.4,.2],M.iron);
        beam.rotation.z=i%2?-.7:.7;
      }
    }
    for(const x of [-23,23]){
      box(this.town,[x,5.1,-37],[.48,10.2,.48],M.iron,true);
      box(this.town,[x,9,-37],[2.8,.3,1.1],M.iron);
    }
    // Early electric streetlights, rails, curb stones, and roof silhouettes.
    for(const side of [-1,1])for(let z=-60;z<48;z+=29){
      const pole=box(this.town,[side*7.6,3.1,z],[.14,6.2,.14],M.trim);
      box(this.town,[side*7.1,6.18,z],[1.25,.15,.14],M.trim);
      orb(this.town,[side*6.47,5.9,z],.31,mat('#ffe2a2',.26),12,10);
      pole.castShadow=true;
    }
    // Towering riveted molasses storage tank: ~15m tall.
    this.tank.position.set(11.0,0,-16);this.town.add(this.tank);
    const tankMetal=new THREE.MeshStandardMaterial({color:'#617587',metalness:.54,roughness:.48,side:THREE.DoubleSide});
    this.tankShell=cylinder(this.tank,5.65,14.8,[0,7.45,0],tankMetal,72);
    cylinder(this.tank,5.82,.4,[0,.3,0],M.trim);
    cylinder(this.tank,5.82,.35,[0,14.95,0],M.trim);
    for(let y=.65;y<15;y+=1.55){
      ring(this.tank,5.72,y,M.brass);
      for(let k=0;k<43;k++){
        const theta=k*2*Math.PI/43;
        orb(this.tank,[Math.sin(theta)*5.8,y,Math.cos(theta)*5.8],.075,M.brass,8,5);
      }
    }
    for(let k=0;k<28;k++){
      const a=k*Math.PI*2/28;
      box(this.tank,[5.68*Math.sin(a),7.5,5.68*Math.cos(a)],[.06,14.85,.07],M.trim);
    }
    for(let k=0;k<5;k++){
      const theta=-.75+(k-2)*.15;
      const g=new THREE.Mesh(new THREE.CylinderGeometry(5.7,5.7,14.8,10,1,true,theta,.35),tankMetal.clone());
      g.position.y=7.45;g.visible=false;this.tank.add(g);this.shellFragments.push(g);
    }
    this.paintMask=orb(this.tank,[4.8,4.1,2.7],.85,mat('#566779',.52,.45),18,12);
    this.paintMask.scale.set(.45,.9,.12);this.paintMask.visible=false;
    for(let i=0;i<12;i++){
      const d=orb(this.tank,[4.7,3.9,3.3],.07+hash(i)*.09,M.molasses,10,8);
      this.drips.push(d);
    }
    this.flood=new Flood(this.town);
    for(let i=0;i<7;i++){
      const homes: [number,number,number][]=[[-3,0,13],[2.4,0,0],[-2.8,0,-12],[4,0,24],[-4.5,0,28],[1.4,0,-25],[0,0,34]];
      this.people.push(new Toon(this.town,i,homes[i]));
    }
    for(let i=0;i<7;i++){
      orb(this.town,[-10+hash(i*3)*20,14+hash(i*9)*7,-47-i*5],1.4+hash(i)*.8,
        new THREE.MeshLambertMaterial({color:'#ffebdb',transparent:true,opacity:.63,depthWrite:false}),10,8);
    }
    // Real modeled teaspoon with viscous strand and a painted wood table.
    const tableMaterial=mat('#ffffff');tableMaterial.map=woodTexture();
    box(this.macro,[0,.08,0],[40,.2,30],tableMaterial);
    const spoon=new THREE.Group();spoon.position.set(-.9,3.25,-1.7);
    this.macro.add(spoon);
    const bowl=orb(spoon,[-1.1,0,-.3],1.35,new THREE.MeshStandardMaterial({color:'#c4d6d8',roughness:.22,metalness:.88}),24,16);
    bowl.scale.set(1.35,.21,.8);
    const syrup=orb(spoon,[-1.05,.23,-.32],1.08,M.molasses,32,16);syrup.scale.set(1.45,.16,.84);
    const shaft=cylinder(spoon,.17,5.8,[1.95,.15,-.35],M.brass,16);
    shaft.rotation.z=-Math.PI/2.5;
    const strandGeo=new THREE.CylinderGeometry(.12,.22,3.6,12);
    this.spoonStream=new THREE.Mesh(strandGeo,M.molasses);this.macro.add(this.spoonStream);
    this.spoonDrop=orb(this.macro,[-2.2,1.1,-2],.23,M.highlight,14,9);
    box(this.macro,[5,1.75,-8],[3,3.5,3],mat('#9e5f43'),true);
    // Physics miniature: same town at small scale behind the spoon, no labels.
    this.tinyTown=new THREE.Group();this.tinyTown.position.set(4,.24,-12);this.tinyTown.scale.set(.27,.27,.27);
    this.macro.add(this.tinyTown);
    for(let k=0;k<5;k++)this.tinyTown.add(house(k%2?1:-1,-k*7,k+100));
    const miniWave=orb(this.tinyTown,[0,.8,1],3,M.molasses);miniWave.scale.set(2,.3,1);
    // Blueprint room with lit wireframe construction lines and animated seam.
    this.plans.position.set(0,0,-2);
    const back=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshBasicMaterial({color:'#193e59'}));
    back.position.set(0,8,-15);this.plans.add(back);back.layers.set(NOINK);
    for(let i=-16;i<=16;i++){
      const m1=box(this.plans,[i*2,8,-14.94],[.012,40,.012],mat('#507d8b'));m1.layers.set(NOINK);
      const m2=box(this.plans,[0,i*2,-14.94],[60,.012,.012],mat('#507d8b'));m2.layers.set(NOINK);
    }
    const wire=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(5.8,5.8,14,34,14)),new THREE.LineBasicMaterial({color:'#e4dfc3'}));
    wire.position.set(0,8,0);this.plans.add(wire);wire.layers.set(NOINK);
    this.fracture=new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1,12.7,6),new THREE.Vector3(.8,11,6.2),
        new THREE.Vector3(-.5,9,6.3),new THREE.Vector3(1.2,6.5,6.2),
        new THREE.Vector3(-1.5,4.8,6)
      ]),22,.09,8,false),new THREE.MeshBasicMaterial({color:'#ff9556'}));
    this.fracture.layers.set(NOINK);this.plans.add(this.fracture);
  }
  update(f:number,cam:THREE.PerspectiveCamera,scene:THREE.Scene){
    const shot=shotAt(f),info=cameraAt(f),p=shotProgress(f);
    this.town.visible=shot.place==='town';
    this.macro.visible=shot.place==='macro';
    this.plans.visible=shot.place==='blueprint';
    cam.position.set(...info.pos);cam.fov=info.fov;
    cam.lookAt(new THREE.Vector3(...info.look));cam.rotateZ(info.roll);cam.updateProjectionMatrix();
    scene.fog=this.baseFog;
    const golden=shot.light==='gold';
    this.sun.color.set(golden?'#ffc08a':'#fff1d5');
    this.sun.intensity=golden?3.15:3.6;
    this.sun.position.set(golden?19:-31,golden?19:49,golden?15:11);
    this.baseFog.color.copy(rgb(golden?'#ead0ae':'#b8d0ec'));
    if(shot.place!=='town')this.baseFog.near=90;else this.baseFog.near=32;
    const burst=f>=688;
    this.tankShell.visible=!burst;
    for(let i=0;i<this.shellFragments.length;i++){
      const x=this.shellFragments[i],b=smooth((f-688-i*2)/30);
      x.visible=burst&&f<1200;
      x.position.set((i-2)*.95*b,7.45-2.9*b,i%2?2.8*b:-1.8*b);
      x.rotation.set(b*.35,b*(i-2)*.21,b*(i-2)*.24);
    }
    for(let i=0;i<this.drips.length;i++){
      const d=this.drips[i];d.visible=f>=385&&f<688;
      d.position.set(4.75+hash(i)*.28,3.8+(i%5)*.62-(f*.045)%2.7,3.2+hash(i*3)*.22);
      d.scale.set(.65,.7+hash(i)*.8,.8);
    }
    this.paintMask.visible=f>=540&&f<688;
    if(this.paintMask.visible)this.paintMask.scale.set(.3+smooth((f-540)/95)*.7,.5+smooth((f-540)/95),.13);
    this.flood.update(f);
    const panic=shot.id==='hook'||shot.id==='rush'||shot.id==='firehouse'||shot.id==='rupture';
    this.people.forEach((person,i)=>person.update(f,cam,shot.place==='town'&&(
      shot.id==='hook'||shot.id==='tank'||shot.id==='rupture'||shot.id==='rush'||
      shot.id==='firehouse'||shot.id==='aftermath'),panic&&i<5));
    const damaged=shot.id==='firehouse'||shot.id==='aftermath';
    const tilt=damaged?smooth((f-1030)/60):0;
    this.firehouse.rotation.z=-.19*tilt;
    this.firehouse.position.x=-14+tilt*.3;
    this.firehouse.position.y=-.36*tilt;
    const dropY=(f-120)%55/55;
    this.spoonDrop.position.set(-2.2,2.2-1.95*dropY,-1.9);
    this.spoonDrop.scale.set(.8,1.3,.85);
    this.spoonStream.position.set(-2.2,2.55-(dropY*.72),-1.9);
    this.spoonStream.scale.set(1, .22+dropY*.7,1);
    this.tinyTown.visible=shot.id==='physics'&&p>.42;
    this.tinyTown.scale.setScalar(.18+.2*smooth((p-.4)/.6));
    this.fracture.scale.set(1,1,.3+.7*smooth((f-1640)/100));
    return new THREE.Vector3(...info.look);
  }
}
