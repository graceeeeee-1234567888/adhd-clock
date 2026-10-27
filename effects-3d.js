/* Local Three.js toy stage. Its failure never blocks the timer or Canvas effects. */
(() => {
  'use strict';
  window.createGardenStage = function createGardenStage() {
    const T = window.THREE;
    if (!T) return null;
    const canvas = document.createElement('canvas');
    canvas.className = 'toy-stage';
    canvas.setAttribute('aria-hidden', 'true');
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (_) { return null; }
    document.body.appendChild(canvas);
    renderer.setClearColor(0, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new T.Scene();
    const camera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 1800);
    camera.position.z = 800;
    scene.add(new T.HemisphereLight(0xfff9e8, 0x5a755c, 2.6));
    const key = new T.DirectionalLight(0xffe9d2, 3.4);
    key.position.set(-200, 300, 500); scene.add(key);
    const rim = new T.DirectionalLight(0xd5c4ec, 2.2);
    rim.position.set(300, -100, 200); scene.add(rim);
    const geometrySet = new Set(), materialSet = new Set();
    const geo = value => { geometrySet.add(value); return value; };
    const mat = (color, extra = {}) => {
      const value = new T.MeshPhongMaterial({ color, specular: 0xfff7e8, shininess: 90, flatShading: true, ...extra });
      materialSet.add(value); return value;
    };
    const palette = [0x79ad81, 0xd58ab2, 0x8ab3d8, 0xe5c779];
    const skins = palette.map(c => mat(c));
    const pearl = mat(0xfffae7);
    const ball = geo(new T.IcosahedronGeometry(1, 1));
    const stem = geo(new T.BoxGeometry(.19, 1.65, .25));
    const hoop = geo(new T.TorusGeometry(1, .14, 5, 18));
    const starShape = new T.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5 + Math.PI / 2;
      const radius = i % 2 ? .45 : 1;
      if (!i) starShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else starShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    starShape.closePath();
    const starGeo = geo(new T.ExtrudeGeometry(starShape, { depth: .28, bevelEnabled: true, bevelSize: .09, bevelThickness: .09, bevelSegments: 1, steps: 1 }));
    starGeo.center();
    const flagShape = new T.Shape();
    flagShape.moveTo(0, 0); flagShape.lineTo(.64, -.28); flagShape.lineTo(.82, -.75);
    flagShape.lineTo(.4, -.54); flagShape.lineTo(0, -.35); flagShape.closePath();
    const flagGeo = geo(new T.ExtrudeGeometry(flagShape, { depth: .22, bevelEnabled: false, steps: 1 }));
    function note(material) {
      const group = new T.Group();
      const head = new T.Mesh(ball, material); head.scale.set(.6, .38, .32); head.position.set(-.16, -.64, 0); head.rotation.z = .28;
      const stick = new T.Mesh(stem, material); stick.position.set(.33, .12, 0);
      const flag = new T.Mesh(flagGeo, material); flag.position.set(.38, .95, -.1);
      group.add(head, stick, flag); return group;
    }
    const nodes = [];
    const layout = [[.035,.17,0],[.95,.19,1],[.055,.54,2],[.94,.7,0],[.16,.94,1],[.83,.94,2],[.02,.87,3],[.98,.41,3],[.31,.035,1],[.70,.04,0],[.12,.33,3],[.85,.48,3]];
    layout.forEach(([x,y,type],i) => {
      let mesh;
      const skin = skins[i % skins.length];
      if (type === 0) mesh = note(skin);
      else if (type === 1) mesh = new T.Mesh(starGeo, skin);
      else if (type === 2) mesh = new T.Mesh(hoop, skin);
      else {
        mesh = new T.Group();
        mesh.add(new T.Mesh(ball, mat(palette[i % 4], { transparent: true, opacity: .22, depthWrite: false, shininess: 150 })));
        const border = new T.Mesh(hoop, mat(palette[i % 4], { transparent: true, opacity: .65 }));
        border.scale.setScalar(.96); mesh.add(border);
        const glint = new T.Mesh(ball, pearl); glint.scale.set(.13,.2,.05); glint.position.set(-.35,.5,.75); mesh.add(glint);
      }
      scene.add(mesh);
      nodes.push({mesh,x,y,type,phase:i * 1.7,size:type===3 ? 48 + i % 3 * 11 : 25 + i % 4 * 8});
    });
    let width=1,height=1,lost=false;
    const onLost = event => { event.preventDefault(); lost=true; canvas.style.visibility='hidden'; };
    const onRestored = () => { lost=false; canvas.style.visibility='visible'; };
    canvas.addEventListener('webglcontextlost',onLost);
    canvas.addEventListener('webglcontextrestored',onRestored);
    function resize(w,h) {
      width=w;height=h;
      renderer.setSize(w,h,false);
      camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;
      camera.updateProjectionMatrix();
    }
    resize(innerWidth,innerHeight);
    return {
      canvas, resize,
      setVisible(value) { canvas.style.display=value ? '' : 'none'; },
      render(time,pointer,boost,calm) {
        if(lost) return;
        const mobile=width<600;
        nodes.forEach((node,i) => {
          node.mesh.visible=(!mobile || i<8) && (!calm || node.type===3);
          const amplitude=calm?4:14+boost*8;
          const x=(node.x-.5)*width+Math.sin(time*.45+node.phase)*amplitude;
          const y=(.5-node.y)*height+Math.cos(time*.6+node.phase)*amplitude;
          node.mesh.position.set(x,y,Math.sin(time*.3+node.phase)*30);
          const s=node.size*(mobile?.65:1)*(1+boost*.16);
          node.mesh.scale.setScalar(s);
          node.mesh.rotation.set(Math.sin(time*.6+node.phase)*.35,
            time*(calm?.06:.28)+node.phase+(pointer.active?(pointer.x/width-.5)*.3:0),
            Math.sin(time*.4+node.phase)*.3);
        });
        renderer.render(scene,camera);
      },
      dispose() {
        canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);
        geometrySet.forEach(g=>g.dispose());materialSet.forEach(m=>m.dispose());
        renderer.dispose();canvas.remove();
      }
    };
  };
})();
