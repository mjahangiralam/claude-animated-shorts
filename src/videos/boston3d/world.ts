import * as THREE from 'three';
import {Pen, bodyFront, townsfolk} from './toon';
import {NOINK} from './ink';
// Reuse the existing Bridge short's painterly shading and lighting pipeline.
import {twoTone, TONE, CHAR, untone} from '../../../templates/bridge/shade';
import {cardShade} from '../../../templates/bridge/cardshade';
import {LIGHTS, LOOK} from '../../../templates/bridge/lights';
import {cloudHD} from '../../../templates/bridge/paint';
import {cameraAt, waveProfileAt, shotAt, shotProgress, tankStateAt, tankLiquidLevelAt, showRushCharacter, surgeSpeedAt, jetParticleAt, floodSpreadAt, TANK_BREACH, fragmentFlightAt, outflowSheetPointAt, outflowCrossSectionAt, spoonBowlHeightAt, spoonDripAt, waveFoldAt, characterStreetPositionAt, characterFloodResponseAt, smooth, clamp} from './timeline.mjs';

// All scenery and effects are original, generated from geometry and Canvas2D.
// No copied reference frames, stock 3D models, or external texture downloads.
const ink = '#251d2a';
const rgb = (v: string) => new THREE.Color(v);
const hash = (n: number) => {const v = Math.sin(n * 128.43 + 12.57) * 43158.5453; return v - Math.floor(v);};
// Painted-matte surfaces get the Bridge template's bold sun/shadow split.
// Metallic or glossy props retain real PBR specular reflections.
const mat = (color: string, roughness = .88, metalness = 0) =>
  metalness <= .12 && roughness >= .65
    ? twoTone(new THREE.MeshLambertMaterial({color}))
    : new THREE.MeshStandardMaterial({color, roughness, metalness});
const M = {
  iron: mat('#4c5b6d',.48,.56), trim: mat('#2f3a50',.61,.48),
  brass: mat('#caab77',.28,.62), wood: mat('#a0785c',.85),
  molasses: mat('#461c16',.29,.12), highlight: mat('#c58053',.28,.08),
  sidewalk: mat('#d8c0a8'), sill: mat('#edcfb1'), glass: mat('#5685a0',.16,.32)
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
    g.fillStyle='#ad9290';g.fillRect(0,0,512,768);
    for(let row=0;row<28;row++) for(let col=-1;col<9;col++){
      const offset=(row%2)*32,x=col*66-offset+2,y=row*28+2;
      const v=(hash(row*73+col*17+seed)-.5)*32;
      g.fillStyle=c;g.fillRect(x,y,62,24);
      g.fillStyle='rgba(255,244,216,.18)';g.fillRect(x+3,y+2,57,3);
      g.fillStyle='rgba(58,38,51,.19)';g.fillRect(x+1,y+20,60,4);
      g.fillStyle='rgba(39,29,32,'+(.045+hash(row*19+col+seed)*.1)+')';
      for(let i=0;i<7;i++)g.fillRect(x+hash(i+row*40+col*17)*59,y+hash(i*17+col*35+row)*22,2,2);
      if(v>10){g.fillStyle='rgba(245,210,175,.07)';g.fillRect(x,y,60,24);}
    }
  });
}
function cobbleTexture(){
  const t=canvasTexture(1024,1024,g=>{
    g.fillStyle='#898a91';g.fillRect(0,0,1024,1024);
    for(let r=0;r<29;r++)for(let c=0;c<24;c++){
      const x=c*46+(r%2)*21+hash(r*17+c)*5,y=r*37+hash(c*17+r)*4;
      const v=Math.floor(hash(r*245+c*57)*33);
      const stones=['#ccb79c','#c3af99','#b5a8a5','#d0bfa6','#afb1b6'];
      const base=new THREE.Color(stones[(r*7+c*3+Math.floor(hash(r*89+c)*9))%stones.length]);
      base.offsetHSL((hash(r*37+c*11)-.5)*.025,0,(v-16)/280);
      g.fillStyle='#'+base.getHexString();
      g.beginPath();g.roundRect(x,y,40,31,6);g.fill();
      g.strokeStyle='rgba(61,59,73,.30)';g.lineWidth=2;g.stroke();
      g.strokeStyle='rgba(250,225,200,.22)';g.beginPath();g.moveTo(x+5,y+6);g.lineTo(x+31,y+4);g.stroke();
    }
  });
  t.repeat.set(1.8,13);return t;
}
function woodTexture(){
  const t=canvasTexture(512,512,g=>{
    g.fillStyle='#ac795a';g.fillRect(0,0,512,512);
    for(let i=0;i<43;i++){
      const y=i*13+hash(i)*3;
      g.strokeStyle=i%3===0?'rgba(35,20,18,.32)':'rgba(245,205,160,.15)';
      g.lineWidth=1+hash(i*3)*4;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(170,y+8,325,y-8,512,y+3);g.stroke();
    }
  });t.repeat.set(3,3);return t;
}
function cloudTexture(){
  return canvasTexture(640,256,g=>{
    g.clearRect(0,0,640,256);
    for(let i=0;i<19;i++){
      const x=35+i*31+hash(i*13)*24;
      const y=120+Math.sin(i*.83)*19-hash(i*11)*28;
      const rx=75+hash(i*23)*48,ry=31+hash(i*5)*21;
      g.save();g.translate(x,y);g.scale(rx,ry);
      const blur=g.createRadialGradient(0,0,.04,0,0,1);
      blur.addColorStop(0,'rgba(255,252,240,.63)');
      blur.addColorStop(.45,'rgba(255,247,232,.42)');
      blur.addColorStop(1,'rgba(255,245,228,0)');
      g.fillStyle=blur;g.beginPath();g.arc(0,0,1,0,Math.PI*2);g.fill();g.restore();
    }
  });
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
  const colors=['#c68070','#d2a084','#b47473','#cba486','#b7776b','#c19475'];
  const c=colors[index%colors.length];
  const wall=mat('#ffffff');
  wall.map=brickTexture(c,index+3);
  box(root,[0,h/2,0],[w,h,d],wall,true);
  box(root,[0,h+.15,0],[w+.5,.34,d+.5],M.sill,true);
  box(root,[0,h+.48,0],[w+.8,.38,d+.9],mat('#664557'),true);
  box(root,[0,.43,d/2+.09],[w,.8,.22],mat('#695355'));
  box(root,[0,1.5,d/2+.22],[firehouse?6:2.25,firehouse?2.8:2.65,.18],mat('#34465f'),true);
  if(firehouse){
    box(root,[0,1.5,d/2+.34],[5.5,2.5,.09],mat('#7b8c92'));
    box(root,[0,5.8,d/2+.15],[6.3,.55,.3],M.sill,true);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(2.85,.2,10,26,Math.PI),M.sill);
    arch.rotation.z=Math.PI;arch.position.set(0,3,d/2+.39);root.add(arch);
    const label=canvasTexture(560,120,g=>{
      g.fillStyle='#4a302d';g.fillRect(0,0,560,120);
      g.strokeStyle='#d5b78a';g.lineWidth=9;g.strokeRect(9,9,542,102);
      g.fillStyle='#f5d9ae';g.textAlign='center';g.textBaseline='middle';
      g.font='bold 58px Georgia';g.fillText('FIRE HOUSE',280,65);
    });
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.8,1.15),
      new THREE.MeshBasicMaterial({map:label,side:THREE.DoubleSide}));
    sign.position.set(0,7.55,d/2+.37);root.add(sign);
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
      box(root,[x,y,d/2+.2],[1.03,1.51,.075],mat('#347ea9',.22,.25));
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
// Five-stop, tone-map-aware gradient sky, copied from the Bridge short's art direction.
// Two alternate palettes ensure the day shots are vivid blue and danger shots burn amber.
const SKY_PALETTES = {
  day: ['#c2d5e7','#a4c5df','#77add6','#598ec2','#4576ab'],
  golden: ['#f3d7b5','#eac2a0','#d7a18e','#b793a2','#857a9a'],
} as const;
function skyDome(){
  const material=new THREE.ShaderMaterial({
    uniforms: {
      c0:{value:new THREE.Color()},c1:{value:new THREE.Color()},c2:{value:new THREE.Color()},
      c3:{value:new THREE.Color()},c4:{value:new THREE.Color()}
    },
    vertexShader:'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 c0,c1,c2,c3,c4;varying vec3 vPos;
      void main(){
        float el=degrees(asin(clamp(normalize(vPos).y,-1.0,1.0)));
        vec3 c=mix(c0,c1,smoothstep(0.,3.,el));
        c=mix(c,c2,smoothstep(3.,9.,el));
        c=mix(c,c3,smoothstep(9.,21.,el));
        c=mix(c,c4,smoothstep(21.,48.,el));
        gl_FragColor=vec4(c,1.);
      }`,
    side:THREE.BackSide,depthWrite:false,fog:false
  });
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(550,48,28),material);
  mesh.layers.set(NOINK);mesh.renderOrder=-1;mesh.frustumCulled=false;
  return mesh;
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
    const geo=new THREE.PlaneGeometry(2.10,3.52);
    const material=cardShade(new THREE.MeshLambertMaterial({map:this.tex,alphaTest:.48,side:THREE.DoubleSide,depthWrite:true}));
    this.mesh=new THREE.Mesh(geo,material);
    this.mesh.layers.set(NOINK);this.mesh.position.set(home[0],1.77,home[2]);this.mesh.castShadow=false;
    parent.add(this.mesh);
    const s=new THREE.Mesh(new THREE.CircleGeometry(.5,30),new THREE.MeshBasicMaterial({color:'#33202a',transparent:true,opacity:.2,depthWrite:false}));
    s.rotation.x=-Math.PI/2;s.scale.set(1,.5,1);s.position.set(home[0],.038,home[2]);parent.add(s);this.shadow=s;
  }
  update(f:number,cam:THREE.PerspectiveCamera,active:boolean,panic:boolean){
    const step=Math.floor(f/3);
    this.mesh.visible=active;this.shadow.visible=active;
    if(!active)return;
    const hookEscape=panic&&f<115;
    const run=hookEscape||(panic&&f>682&&f<1170);
    const t=hookEscape?f/12:panic?Math.max(0,(f-682)/30):f/30;
    const phase=(t*1.35+this.seed*.14)%1;
    const path=characterStreetPositionAt(f,this.seed-5,{x:this.home.x,z:this.home.z});
    const x=path.x;
    const z=path.z;
    this.mesh.position.set(x,1.77+(run?Math.sin(f*.18)*.08:0),z);
    this.shadow.position.set(x,.038,z);
    this.mesh.rotation.y=Math.atan2(cam.position.x-x,cam.position.z-z);
    this.mesh.rotation.z=0;
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
  foam:THREE.Mesh[]=[];
  droplets:THREE.Mesh[]=[];
  constructor(parent:THREE.Object3D){
    const nx=34,nz=43;let pos=new Float32Array((nx+1)*(nz+1)*3);let ids:number[]=[];
    for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
      const n=z*(nx+1)+x;
      ids.push(n,n+1,n+nx+1,n+1,n+nx+2,n+nx+1);
    }
    this.geom=new THREE.BufferGeometry();this.geom.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
    this.geom.setAttribute('color',new THREE.BufferAttribute(new Float32Array(pos.length),3).setUsage(THREE.DynamicDrawUsage));
    this.geom.setIndex(ids);
    const surf=new THREE.Mesh(this.geom,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.22,metalness:.12,side:THREE.DoubleSide}));
    surf.castShadow=true;surf.receiveShadow=true;this.root.add(surf);
    // Seven curved horizontal bands form a rounded, rolling liquid face.
    // The old two-row sheet was a rectangular wall in every camera angle.
    const nf=7;
    this.frontGeom=new THREE.BufferGeometry();
    this.frontGeom.setAttribute('position',new THREE.BufferAttribute(new Float32Array((nx+1)*(nf+1)*3),3).setUsage(THREE.DynamicDrawUsage));
    this.frontGeom.setAttribute('color',new THREE.BufferAttribute(new Float32Array((nx+1)*(nf+1)*3),3).setUsage(THREE.DynamicDrawUsage));
    const frontIndex:number[]=[];
    for(let x=0;x<nx;x++)for(let y=0;y<nf;y++){
      const i=x*(nf+1)+y;
      frontIndex.push(i,i+nf+1,i+1,i+1,i+nf+1,i+nf+2);
    }
    this.frontGeom.setIndex(frontIndex);
    const front=new THREE.Mesh(this.frontGeom,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.23,metalness:.08,side:THREE.DoubleSide}));
    this.root.add(front);
    // A breaking syrup crest needs specular ribbons and airborne spray rather than
    // a smooth, solid-looking hill. Bright amber reads as translucent viscous syrup.
    const crestMats=[
      new THREE.MeshStandardMaterial({color:'#c79b67',roughness:.28,metalness:.05,emissive:'#704025',emissiveIntensity:.06}),
      new THREE.MeshStandardMaterial({color:'#e1be8c',roughness:.25,metalness:.05,emissive:'#805d38',emissiveIntensity:.06}),
      new THREE.MeshStandardMaterial({color:'#854632',roughness:.29,metalness:.04})
    ];
    for(let k=0;k<64;k++){
      const o=orb(this.root,[0,0,0],.13+hash(k*11)*.22,crestMats[k%crestMats.length],11,8);
      o.castShadow=false;this.foam.push(o);
    }
    for(let k=0;k<46;k++){
      const o=orb(this.root,[0,0,0],.045+hash(k*13)*.15,
        k%3===0?crestMats[1]:crestMats[0],9,7);
      o.castShadow=false;this.droplets.push(o);
    }
    for(let k=0;k<39;k++){
      const o=orb(this.root,[0,0,0],.14+hash(k)*.13,k%4===0?M.highlight:mat('#ae7453',.36,.08),9,7);
      o.castShadow=false;this.glints.push(o);
    }
    this.root.visible=false;parent.add(this.root);
  }
  update(f:number){
    const active=f<115||(f>=688&&f<1450);
    this.root.visible=active;if(!active)return;
    const nx=34,nz=43,nf=7;
    const spread=floodSpreadAt(f);
    // Visual wave energy comes from the pressure-head surge and viscous deceleration.
    // The cold-open previews the later burst, hence its remapped time.
    const speed=surgeSpeedAt(f<115?700+f:f);
    const energy=clamp(speed/7.5,.34,1.25);
    const a=this.geom.getAttribute('position') as THREE.BufferAttribute;
    const aColor=this.geom.getAttribute('color') as THREE.BufferAttribute;
    const surface=(x:number,z:number)=>{
      const p=waveProfileAt(f,x),back=Math.max(0,p.front-z);
      // Steep forward bore and a lower turbulent wake. A broad Gaussian made
      // the previous surge look like a smooth brown sand dune.
      // Distinct, fast-moving leading bore and smaller rolling tongues behind
      // it; the old single Gaussian read as a travelling caramel hill.
      const bore=p.height*Math.exp(-Math.pow(back/1.72,2));
      const tongue=.76*energy*Math.exp(-Math.pow((back-3.25)/1.65,2))*
        (.65+.35*Math.sin(x*1.14+f*.13));
      const secondary=.43*energy*Math.exp(-Math.pow((back-7.4)/2.45,2));
      const eddies=(.18+.12*energy)*Math.sin(z*1.30+f*.17+x*.9)
        +.10*Math.cos(z*1.86-f*.20+x*.69);
      return Math.max(.07,.12+bore+tongue+secondary+eddies);
    };
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const x=spread.left+(spread.right-spread.left)*i/nx,lip=waveProfileAt(f,x).front;
      const z=lip-spread.trail+spread.trail*j/nz,y=surface(x,z),idx=j*(nx+1)+i;
      a.setXYZ(idx,x,y,z);
      const light=clamp(.05+y*.18+.13*Math.sin(x*.91+z*.34+f*.085),.02,.92);
      const ribbon=.5+.5*Math.cos(x*2.8+z*.55-f*.13);
      aColor.setXYZ(idx,.085+light*.66+ribbon*.08,.012+light*.32+ribbon*.045,.008+light*.115);
    }
    a.needsUpdate=true;aColor.needsUpdate=true;this.geom.computeVertexNormals();
    const b=this.frontGeom.getAttribute('position') as THREE.BufferAttribute;
    const bColor=this.frontGeom.getAttribute('color') as THREE.BufferAttribute;
    for(let i=0;i<=nx;i++){
      const x=spread.left+(spread.right-spread.left)*i/nx,lip=waveProfileAt(f,x).front,crest=surface(x,lip);
      for(let j=0;j<=nf;j++){
        const t=j/nf,idx=i*(nf+1)+j;
        const fold=waveFoldAt(f,x,t);
        const ripple=(.08+.04*energy)*Math.sin(x*1.8+f*.11+t*8)*Math.sin(Math.PI*t);
        // Upper face overturns into a forward-curling lip; both ends remain
        // attached to the street and rear water surface.
        b.setXYZ(idx,x,.04+(crest-.04)*t+ripple-fold.sag,lip+fold.forward);
        const streak=.19*Math.sin(x*1.15+t*19-f*.087)+.08*Math.cos(x*2.7-t*31);
        const sheen=clamp(t*.76+streak,0,1);
        // Burnt-sienna undercut, molten-orange crest, golden streaked highlights.
        bColor.setXYZ(idx,.065+sheen*.76,.008+sheen*.38,.009+sheen*.12);
      }
    }
    b.needsUpdate=true;bColor.needsUpdate=true;this.frontGeom.computeVertexNormals();
    for(let i=0;i<this.glints.length;i++){
      const p=this.glints[i],x=spread.left+(spread.right-spread.left)*hash(i*7);
      const z=waveProfileAt(f,x).front-1.6-hash(i*19)*Math.min(18,spread.trail*.75);
      const h=surface(x,z);
      p.position.set(x,h+.015+Math.sin(f*.16+i)*.035,z);
      p.scale.set(1.25+.5*energy+.5*hash(i),.18,.42+hash(i));
      p.rotation.y=hash(i*17)*Math.PI;
    }
    for(let i=0;i<this.foam.length;i++){
      const o=this.foam[i],x=spread.left+(spread.right-spread.left)*(i+.5)/this.foam.length;
      const lip=waveProfileAt(f,x).front;
      const y=surface(x,lip);
      const wiggle=Math.sin(f*.17+i*1.73),q=hash(i*17);
      // Different ribbons roll over the front at different heights; they no
      // longer all sit on top of the wave like an unbroken horizontal stripe.
      const t=i%3===0?.62:i%3===1?.82:1;
      const fold=waveFoldAt(f,x,t);
      o.position.set(x,.04+(y-.04)*t-fold.sag+.05*wiggle*energy,
        lip+fold.forward+.08*q);
      o.scale.set((.48+q*.95)*energy,.07+.06*q,.38+.55*hash(i*23));
      o.rotation.set(.15*Math.sin(f*.14+i),-.28+wiggle*.15,wiggle*.18);
    }
    for(let i=0;i<this.droplets.length;i++){
      const o=this.droplets[i],x=spread.left+(spread.right-spread.left)*hash(i*19);
      const lip=waveProfileAt(f,x).front;
      const phase=(f*.037+hash(i*37)*2.1)%2.1;
      const jet=jetParticleAt(phase,.5+energy*1.3,.05,2.6*energy+hash(i*43)*2);
      const crest=surface(x,lip);
      o.visible=jet.height>.08;
      o.position.set(x+Math.sin(phase+i)*.27,crest+jet.height,
        lip+.18+jet.forward*.55);
      const d=.4+hash(i*7)*.52;
      o.scale.set(d,d*(1+.45*energy),d);
    }
  }
}
export class World {
  root=new THREE.Group();
  town=new THREE.Group();
  macro=new THREE.Group();
  plans=new THREE.Group();
  aftermath=new THREE.Group();
  firehouseDebris=new THREE.Group();
  private people:Toon[]=[];
  private flood:Flood;
  private tank=new THREE.Group();
  private tankShell:THREE.Mesh;
  private tankRemnant:THREE.Mesh;
  private tankSyrup:THREE.Mesh;
  private shellFragments:THREE.Mesh[]=[];
  private impacts:THREE.Mesh[]=[];
  private tankBands=new THREE.Group();
  private brokenBands=new THREE.Group();
  private outflow:THREE.Mesh;
  private outflowGeom:THREE.BufferGeometry;
  private spray:THREE.Mesh[]=[];
  private paintMask:THREE.Mesh;
  private drips:THREE.Mesh[]=[];
  private firehouse:THREE.Group;
  private spoonDrop:THREE.Mesh;
  private spoonStream:THREE.Mesh;
  private tinyTown:THREE.Group;
  private fracture:THREE.Mesh;
  private sun:THREE.DirectionalLight;
  private hemi:THREE.HemisphereLight;
  private sky:THREE.Mesh;
  private clouds:THREE.Mesh[]=[];
  private baseFog=new THREE.Fog('#b8d0ec',32,160);
  constructor(){
    this.sky=skyDome();this.root.add(this.sky);
    this.hemi=new THREE.HemisphereLight('#cfe6ff','#64527f',.55);
    this.root.add(this.hemi);
    this.sun=new THREE.DirectionalLight('#fff3e0',2.8);
    this.sun.position.set(-28,42,12);this.sun.target.position.set(0,0,-10);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
    this.sun.shadow.camera.left=-55;this.sun.shadow.camera.right=55;
    this.sun.shadow.camera.top=65;this.sun.shadow.camera.bottom=-65;
    this.sun.shadow.camera.near=.5;this.sun.shadow.camera.far=160;
    this.sun.shadow.bias=-.0001;
    this.root.add(this.sun,this.sun.target);
    this.root.add(this.town,this.macro,this.plans);
    this.town.add(this.aftermath);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,280),mat('#7c9d8b'));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.11;ground.receiveShadow=true;this.town.add(ground);
    const streetMat=mat('#ffffff');streetMat.map=cobbleTexture();
    const road=new THREE.Mesh(new THREE.PlaneGeometry(16.5,215),streetMat);
    road.rotation.x=-Math.PI/2;road.position.set(0,.015,-30);road.receiveShadow=true;this.town.add(road);
    for(const side of [-1,1]){
      box(this.town,[side*9,.15,-28],[2.6,.32,212],M.sidewalk);
      for(let z=-85;z<45;z+=13){
        const k=Math.round((z+85)/13)+(side+1)*31;
        if((side===1&&z>=-23&&z<=-7)||(side===-1&&z===-7))continue;
        const h=house(side,z,k);
        this.town.add(h);
      }
    }
    this.firehouse=house(-1,-9,21,true);this.town.add(this.firehouse);
    this.town.add(this.firehouseDebris);
    for(let i=0;i<22;i++){
      const x=-12+hash(i*17)*5.2,z=-16+hash(i*31)*13;
      const debris=box(this.firehouseDebris,[x,.2+hash(i)*.35,z],
        [.6+hash(i*13)*1.1,.25+hash(i*5)*.6,.5+hash(i*19)*1.3],
        i%4===0?M.wood:i%3===0?M.sill:mat('#b87b61'));
      debris.rotation.set((hash(i*7)-.5)*.5,hash(i*11)*3.14,(hash(i*23)-.5)*.5);
    }
    this.firehouseDebris.visible=false;
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
    const tankMetal=new THREE.MeshStandardMaterial({color:'#4c6177',metalness:.43,roughness:.52,side:THREE.DoubleSide});
    this.tankShell=cylinder(this.tank,5.65,14.8,[0,7.45,0],tankMetal,72);
    // Keep a recognizable curved steel cylinder after the rupture. The open
    // sector faces the street, forming one visible breach instead of a fence.
    const tornWall=new THREE.CylinderGeometry(5.65,5.65,7.8,72,10,true,0,5.03);
    const edgeVerts=tornWall.getAttribute('position') as THREE.BufferAttribute;
    for(let i=0;i<edgeVerts.count;i++){
      const y=edgeVerts.getY(i);
      if(y>3.35)edgeVerts.setY(i,y-.85*hash(i*13));
    }
    tornWall.computeVertexNormals();
    const remnantMetal=new THREE.MeshStandardMaterial({
      color:'#687f92',metalness:.34,roughness:.52,side:THREE.DoubleSide
    });
    this.tankRemnant=new THREE.Mesh(tornWall,remnantMetal);
    this.tankRemnant.position.set(0,4,0);
    this.tankRemnant.castShadow=true;this.tankRemnant.receiveShadow=true;
    this.tankRemnant.visible=false;this.tank.add(this.tankRemnant);
    // A real brown reservoir remains behind the torn steel. The discharge
    // path begins well inside this liquid body and exits via the missing sector.
    this.tankSyrup=new THREE.Mesh(
      new THREE.CylinderGeometry(5.22,5.22,1,72,4,false),
      new THREE.MeshStandardMaterial({color:'#87502c',roughness:.27,metalness:.06,
        side:THREE.DoubleSide})
    );
    this.tankSyrup.castShadow=true;this.tankSyrup.receiveShadow=true;
    this.tankSyrup.visible=false;this.tank.add(this.tankSyrup);
    // Short riveted steel reinforcing bands follow the broken wall surface.
    // The previous thin torus hoops hung across the sky like bent wires.
    this.tank.add(this.brokenBands);this.brokenBands.visible=false;
    for(const y of [1.1,2.8,4.5,6.2]){
      const band=new THREE.Mesh(
        new THREE.CylinderGeometry(5.76,5.76,.20,72,1,true,0,5.03),M.brass);
      band.position.y=y;this.brokenBands.add(band);
    }
    this.tank.add(this.tankBands);
    cylinder(this.tankBands,5.82,.4,[0,.3,0],M.trim);
    cylinder(this.tankBands,5.82,.35,[0,14.95,0],M.trim);
    for(let y=.65;y<15;y+=1.55){
      ring(this.tankBands,5.72,y,M.brass);
      for(let k=0;k<43;k++){
        const theta=k*2*Math.PI/43;
        orb(this.tankBands,[Math.sin(theta)*5.8,y,Math.cos(theta)*5.8],.075,M.brass,8,5);
      }
    }
    for(let k=0;k<28;k++){
      const a=k*Math.PI*2/28;
      box(this.tankBands,[5.68*Math.sin(a),7.5,5.68*Math.cos(a)],[.06,14.85,.07],M.trim);
    }
    // Small scattered tears reveal the broken shell without turning it into a dark wall.
    for(let k=0;k<14;k++){
      const w=.85+hash(k*7)*1.25,h=1.2+hash(k*9)*2.5;
      const geometry=new THREE.PlaneGeometry(w,h,3,4);
      const verts=geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let j=0;j<verts.count;j++){
        const x=verts.getX(j),y=verts.getY(j);
        verts.setZ(j,.35*Math.sin(x*1.9+y*.8+k)+.22*Math.cos(y*2.2-k*.8));
      }
      geometry.computeVertexNormals();
      const panel=new THREE.Mesh(geometry,tankMetal.clone());
      panel.visible=false;panel.castShadow=true;this.tank.add(panel);this.shellFragments.push(panel);
      const impact=new THREE.Mesh(
        new THREE.TorusGeometry(.42,.07,6,20),
        new THREE.MeshBasicMaterial({color:'#8f6651',transparent:true,opacity:.55,depthWrite:false})
      );
      impact.rotation.x=Math.PI/2;impact.visible=false;this.town.add(impact);
      this.impacts.push(impact);
    }
    for(let k=0;k<74;k++){
      const particle=orb(this.tank,[0,0,0],.08+hash(k*3)*.20,k%4===0?M.highlight:M.molasses,7,5);
      particle.castShadow=false;particle.visible=false;this.spray.push(particle);
    }
    this.paintMask=orb(this.tank,[4.8,4.1,2.7],.85,mat('#566779',.52,.45),18,12);
    this.paintMask.scale.set(.45,.9,.12);this.paintMask.visible=false;
    for(let i=0;i<12;i++){
      const d=orb(this.tank,[4.7,3.9,3.3],.07+hash(i)*.09,M.molasses,10,8);
      this.drips.push(d);
    }
    this.flood=new Flood(this.town);
    // A filled ribbon cascades continuously from the broken steel wall to the
    // road, so the approaching wave has an unambiguous physical source.
    const flowNx=16,flowNz=30;
    const flowPos=new Float32Array((flowNx+1)*(flowNz+1)*3);
    const flowColors=new Float32Array(flowPos.length);
    const flowIndices:number[]=[];
    for(let j=0;j<flowNz;j++)for(let i=0;i<flowNx;i++){
      const k=j*(flowNx+1)+i;
      flowIndices.push(k,k+1,k+flowNx+1,k+1,k+flowNx+2,k+flowNx+1);
    }
    for(let j=0;j<=flowNz;j++)for(let i=0;i<=flowNx;i++){
      const k=j*(flowNx+1)+i,angle=2*Math.PI*i/flowNx;
      const light=.73+.27*Math.sin(angle)+.10*Math.cos(j*.7+angle*3);
      flowColors[k*3]=.29*light;
      flowColors[k*3+1]=.105*light;
      flowColors[k*3+2]=.036*light;
    }
    this.outflowGeom=new THREE.BufferGeometry();
    this.outflowGeom.setIndex(flowIndices);
    this.outflowGeom.setAttribute('position',
      new THREE.BufferAttribute(flowPos,3).setUsage(THREE.DynamicDrawUsage));
    this.outflowGeom.setAttribute('color',new THREE.BufferAttribute(flowColors,3));
    this.outflow=new THREE.Mesh(this.outflowGeom,
      new THREE.MeshStandardMaterial({vertexColors:true,roughness:.24,metalness:.11,side:THREE.DoubleSide}));
    this.outflow.castShadow=true;this.outflow.receiveShadow=true;
    this.outflow.visible=false;this.town.add(this.outflow);
    for(let i=0;i<7;i++){
      const homes: [number,number,number][]=[[-3,0,13],[2.4,0,0],[-2.8,0,-12],[4,0,24],[-4.5,0,28],[1.4,0,-25],[0,0,34]];
      this.people.push(new Toon(this.town,i,homes[i]));
    }
    // Actual Bridge painted cloud textures: sunlit puffy crowns and lilac shaded undersides.
    for(let i=0;i<9;i++){
      const cloud=new THREE.Mesh(
        new THREE.PlaneGeometry(17+hash(i)*11,6+hash(i*3)*4),
        new THREE.MeshBasicMaterial({map:cloudHD(i,LOOK.day.cloud),transparent:true,
          opacity:.94,depthWrite:false,side:THREE.DoubleSide,fog:false})
      );
      cloud.position.set(-35+i*9.5,17+hash(i*9)*14,-70-i*8);
      cloud.layers.set(NOINK);cloud.renderOrder=-.5;
      this.clouds.push(cloud);this.town.add(cloud);
    }
    // Torn wood, syrup pools and scattered debris remain after the flood recedes.
    for(let i=0;i<18;i++){
      const x=-6.7+hash(i*7)*13.4,z=-38+hash(i*17)*76;
      const puddle=orb(this.aftermath,[x,.08,z],.85+hash(i)*1.5,M.molasses,24,12);
      puddle.scale.set(1.1+hash(i*11),.035,.7+hash(i*5)*1.1);
      puddle.castShadow=false;
    }
    for(let i=0;i<16;i++){
      const x=-7+hash(i*23)*14,z=-25+hash(i*19)*60;
      const plank=box(this.aftermath,[x,.17,z],[.24,.22,1.5+hash(i)*2.6],M.wood);
      plank.rotation.y=hash(i*37)*Math.PI;plank.rotation.z=(hash(i*53)-.5)*.2;
    }
    // Shallow, separated syrup pools leave damaged cobblestones visible between them.
    for(let i=0;i<8;i++){
      const x=-3.4+hash(i*37)*6.8,z=-19+hash(i*43)*30;
      const pool=orb(this.aftermath,[x,.047,z],1.2+hash(i*17)*.9,M.molasses,28,10);
      pool.scale.set(1.1+hash(i*29)*.5,.02,1.2+hash(i*19)*.6);
      pool.rotation.y=hash(i*13)*Math.PI;pool.castShadow=false;
    }
    this.aftermath.visible=false;
    // Real modeled teaspoon with viscous strand and a painted wood table.
    const tableMaterial=mat('#ffffff');tableMaterial.map=woodTexture();
    box(this.macro,[0,.08,0],[40,.2,30],tableMaterial);
    const spoon=new THREE.Group();spoon.position.set(-.9,3.25,-1.7);
    this.macro.add(spoon);
    // Teaspoon proportions: small oval bowl, thin polished rim, and a narrow
    // silver handle. Low metalness keeps its steel colour under amber lighting.
    const spoonSilver=new THREE.MeshStandardMaterial({
      color:'#e1eaf0',roughness:.24,metalness:.42,
      emissive:'#5d6f7d',emissiveIntensity:.12,side:THREE.DoubleSide
    });
    const under=orb(spoon,[-1.1,-.13,-.3],1.1,spoonSilver,32,16);
    under.scale.set(1.22,.15,.75);
    const radial=16,around=64;
    const bowlVerts=new Float32Array((radial+1)*(around+1)*3);
    const bowlFaces:number[]=[];
    for(let j=0;j<=radial;j++){
      const r=Math.max(.001,j/radial);
      for(let i=0;i<=around;i++){
        const angle=2*Math.PI*i/around,k=j*(around+1)+i;
        bowlVerts[k*3]=-1.1+1.36*r*Math.cos(angle);
        bowlVerts[k*3+1]=spoonBowlHeightAt(r);
        bowlVerts[k*3+2]=-.3+.86*r*Math.sin(angle);
      }
    }
    for(let j=0;j<radial;j++)for(let i=0;i<around;i++){
      const k=j*(around+1)+i;
      bowlFaces.push(k,k+1,k+around+1,k+1,k+around+2,k+around+1);
    }
    const dishGeo=new THREE.BufferGeometry();
    dishGeo.setAttribute('position',new THREE.BufferAttribute(bowlVerts,3));
    dishGeo.setIndex(bowlFaces);dishGeo.computeVertexNormals();
    const bowl=new THREE.Mesh(dishGeo,spoonSilver);bowl.castShadow=true;spoon.add(bowl);
    const silverRim=new THREE.Mesh(new THREE.TorusGeometry(1,.035,10,72),spoonSilver);
    silverRim.rotation.x=Math.PI/2;silverRim.scale.set(1.36,.86,1);
    silverRim.position.set(-1.1,.24,-.3);spoon.add(silverRim);
    const syrupMat=new THREE.MeshStandardMaterial({color:'#441d18',roughness:.12,metalness:.04});
    const syrup=orb(spoon,[-1.1,.088,-.3],1.0,syrupMat,48,20);
    syrup.scale.set(1.13,.047,.66);
    const liquidSheen=new THREE.Mesh(new THREE.TorusGeometry(1,.018,6,64,Math.PI*1.18),
      new THREE.MeshStandardMaterial({color:'#bc7b52',roughness:.20,metalness:.05}));
    liquidSheen.rotation.x=Math.PI/2;liquidSheen.scale.set(1.10,.65,1);
    liquidSheen.rotation.z=-.2;liquidSheen.position.set(-1.1,.125,-.3);spoon.add(liquidSheen);
    // A single continuous, slightly flattened metal handle, not a gold rod.
    const handle=new THREE.Mesh(new THREE.CapsuleGeometry(.115,4.2,10,16),spoonSilver);
    handle.scale.set(1.2,1,.31);handle.rotation.x=Math.PI/2;
    handle.position.set(-1.1,.15,2.69);handle.castShadow=true;spoon.add(handle);
    const neck=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.58,8,12),spoonSilver);
    neck.scale.set(1.20,1,.38);neck.rotation.x=Math.PI/2;
    neck.position.set(-1.1,.16,.67);spoon.add(neck);
    // Syrup gathers at the right edge and forms a thick, stretching drip,
    // fully outside the bowl silhouette from the high macro camera.
    const overflow=orb(spoon,[.16,.20,-.30],.14,M.molasses,16,10);
    overflow.scale.set(.85,.52,.85);
    const strandGeo=new THREE.CylinderGeometry(.075,.115,1,12);
    this.spoonStream=new THREE.Mesh(strandGeo,M.molasses);this.macro.add(this.spoonStream);
    this.spoonDrop=orb(this.macro,[-.62,1.2,-1.9],.18,M.molasses,14,10);
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
    this.aftermath.visible=shot.id==='aftermath';
    this.firehouseDebris.visible=shot.id==='firehouse'||shot.id==='aftermath';
    cam.position.set(info.pos[0],info.pos[1],info.pos[2]);cam.fov=info.fov;
    cam.lookAt(new THREE.Vector3(info.look[0],info.look[1],info.look[2]));cam.rotateZ(info.roll);cam.updateProjectionMatrix();
    scene.fog=this.baseFog;scene.background=null;
    const golden=shot.light==='gold';
    const preset=golden?LIGHTS.golden:LIGHTS.day;
    const look=golden?LOOK.golden:LOOK.day;
    this.sun.color.set(preset.sunCol);
    this.sun.intensity=preset.sunI;
    // Low-angle golden backlight, high-angle daylight, matching the Bridge template.
    this.sun.position.set(golden?19:-31,golden?19:49,golden?15:11);
    this.hemi.intensity=preset.hemiI;
    TONE.uLitCol.value.set(...preset.lit);
    TONE.uShadeCol.value.set(...preset.shade);
    TONE.uShadeLift.value.set(...preset.lift);
    TONE.uLambert.value=preset.lambert;
    TONE.uSideK.value=preset.sideK;
    TONE.uTerm.value=preset.term;
    TONE.uBounce.value.set(...look.bounce);
    TONE.uSat.value=golden?1.04:1.04;
    CHAR.uCharTint.value.set(...preset.charTint);
    CHAR.uCharShade.value=preset.charShade;
    CHAR.uGrad.value=preset.charGrad;
    CHAR.uBodyGrad.value=preset.bodyGrad;
    CHAR.uSideTint.value.set(...preset.sideTint);
    const skyMat=this.sky.material as THREE.ShaderMaterial;
    const skyColors=golden?SKY_PALETTES.golden:SKY_PALETTES.day;
    skyColors.forEach((color,i)=>untone(color,skyMat.uniforms['c'+i].value));
    this.sky.position.copy(cam.position);
    untone(preset.fog,this.baseFog.color);
    this.baseFog.near=shot.place==='town'?40:125;
    this.baseFog.far=shot.place==='town'?200:350;
    for(let i=0;i<this.clouds.length;i++){
      const cloudMat=this.clouds[i].material as THREE.MeshBasicMaterial;
      const targetMap=cloudHD(i,look.cloud);
      if(cloudMat.map!==targetMap){cloudMat.map=targetMap;cloudMat.needsUpdate=true;}
    }
    const tankState=tankStateAt(f);
    const opening=shot.id==='hook';
    const burst=!tankState.intact;
    this.tankShell.visible=tankState.intact;
    this.tankRemnant.visible=tankState.remnant;
    this.tankSyrup.visible=tankState.remnant;
    if(this.tankSyrup.visible){
      const level=tankLiquidLevelAt(f),bottom=.06;
      this.tankSyrup.scale.y=level-bottom;
      this.tankSyrup.position.y=(level+bottom)*.5;
    }
    this.tankBands.visible=tankState.intact;
    this.brokenBands.visible=tankState.remnant;
    for(let i=0;i<this.shellFragments.length;i++){
      // The teaser starts after the explosion: debris has already landed.
      // Reusing f=0 flight positions would leave steel frozen in the air.
      const piece=this.shellFragments[i],flight=fragmentFlightAt(opening?830:f,i);
      piece.visible=burst&&f<1200;
      piece.position.set(flight.x,flight.y,flight.z);
      // Once a plate hits the road it rests flat, instead of hovering or
      // continuing to tumble indefinitely.
      piece.rotation.set(flight.landed?Math.PI/2+(hash(i*7)-.5)*.12:flight.rx,
        flight.ry,flight.landed?(hash(i*11)-.5)*.13:flight.rz);
      const impact=this.impacts[i],age=flight.impactAge;
      impact.visible=!opening&&burst&&age>=0&&age<.5 &&
        Math.abs(this.tank.position.x+flight.x)<8;
      if(impact.visible){
        impact.position.set(this.tank.position.x+flight.x,.12,this.tank.position.z+flight.z);
        impact.scale.setScalar(.45+age*2.2);
        (impact.material as THREE.MeshBasicMaterial).opacity=.65*(1-age/.5);
      }
    }
    // The opening is aftermath footage, not a second live rupture: do not
    // restart the later tank jet or show a detached artificial stream.
    this.outflow.visible=!opening&&burst&&f<1030;
    if(this.outflow.visible){
      const pos=this.outflowGeom.getAttribute('position') as THREE.BufferAttribute;
      const nx=16,nz=30;
      for(let j=0;j<=nz;j++){
        const t=j/nz;
        for(let i=0;i<=nx;i++){
          const angle=2*Math.PI*i/nx;
          const point=outflowCrossSectionAt(f,t,angle);
          pos.setXYZ(j*(nx+1)+i,point.x,point.y,point.z);
        }
      }
      pos.needsUpdate=true;this.outflowGeom.computeVertexNormals();
    }
    for(let i=0;i<this.spray.length;i++){
      const drop=this.spray[i],age=(f-688-i*.19)/30;
      const outletY=3.5+hash(i*17)*6.2;
      const head=14.8-outletY;
      const lift=3.5+hash(i*5)*3.8;
      const jet=jetParticleAt(age,head,outletY,lift);
      drop.visible=age>=0&&age<2.5&&jet.height>.05;
      if(!drop.visible)continue;
      // Breakaway syrup jets start at the breached near-side wall, accelerate
      // from pressure head, and fan into the street as drag slows their travel.
      const yaw=-.62+hash(i*23)*1.34;
      drop.position.set(TANK_BREACH.x-this.tank.position.x+Math.sin(yaw)*jet.forward,jet.height,
        TANK_BREACH.z-this.tank.position.z+Math.cos(yaw)*jet.forward);
      drop.scale.setScalar(.55+.65*hash(i*13));
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
    this.people.forEach((person,i)=>{
      person.update(f,cam,shot.place==='town'&&
        !(shot.id==='tank'&&person.home.z>20)&&(
          shot.id==='hook'||shot.id==='tank'||shot.id==='rupture'||shot.id==='rush'||
          shot.id==='firehouse'||shot.id==='aftermath'),panic&&i<5);
      const impact=characterFloodResponseAt(f,i,{x:person.home.x,z:person.home.z});
      if(impact.hit&&person.mesh.visible){
        // The rushing molasses catches this person: a short sideways fall,
        // then the sprite disappears beneath the opaque advancing crest.
        const sideways=i%2===0?-1:1;
        person.mesh.position.x+=sideways*.34*impact.fall;
        person.mesh.position.z+=impact.sweepZ;
        person.mesh.position.y-=1.35*impact.fall;
        person.mesh.rotation.z=sideways*1.25*impact.fall;
        person.shadow.position.x+=sideways*.34*impact.fall;
        person.shadow.position.z+=impact.sweepZ;
        if(impact.submerged){person.mesh.visible=false;person.shadow.visible=false;}
      }
      if((shot.id==='rush'||shot.id==='rupture')&&!showRushCharacter(cam.position.z,person.mesh.position.z)){
        person.mesh.visible=false;person.shadow.visible=false;
      }
    });
    const damaged=shot.id==='firehouse'||shot.id==='aftermath';
    const tilt=damaged?smooth((f-1030)/60):0;
    this.firehouse.rotation.z=-.30*tilt;
    this.firehouse.position.x=-14+tilt*1.15;
    this.firehouse.position.y=-.75*tilt;
    const drip=spoonDripAt(f);
    this.spoonStream.position.set(drip.x,drip.topY-drip.length*.5,drip.z);
    this.spoonStream.scale.set(1,drip.length,1);
    this.spoonDrop.position.set(drip.x,drip.dropY,drip.z);
    this.spoonDrop.scale.set(.88,1.16,.88);
    this.tinyTown.visible=shot.id==='physics'&&p>.42;
    this.tinyTown.scale.setScalar(.18+.2*smooth((p-.4)/.6));
    this.fracture.scale.set(1,1,.3+.7*smooth((f-1640)/100));
    return new THREE.Vector3(info.look[0],info.look[1],info.look[2]);
  }
}

