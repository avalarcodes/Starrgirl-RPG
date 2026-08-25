/* Starrworld Chapter 1 vertical slice. The starter character-controller and cc:* input contract are preserved. */
const StarrworldGame = pc.createScript('starrworldGame');

StarrworldGame.attributes.add('player', { type: 'entity' });
StarrworldGame.attributes.add('cameraEntity', { type: 'entity' });

const SW = {
    states: { TITLE: 'TITLE', GENERAL_SELECTION: 'GENERAL_SELECTION', BRIEFING: 'BRIEFING', PLAYING: 'PLAYING', PUZZLE: 'PUZZLE', RESULTS: 'RESULTS', PAUSED: 'PAUSED', FAILED: 'FAILED', COMING_SOON: 'COMING_SOON' },
    generals: [
        { id: 'starrgirl', displayName: 'Starrgirl', shortTagline: 'The celestial vanguard', factionId: 'starr-vanguard' },
        { id: 'princess-zora', displayName: 'Princess Zora', shortTagline: 'Royal steel, rebel fire', factionId: 'violet-crown' },
        { id: 'norscar', displayName: 'Norscar', shortTagline: 'Every scar remembers', factionId: 'scar-legion' },
        { id: 'cobra', displayName: 'Cobra', shortTagline: 'Strike before warning', factionId: 'serpent-guard' },
        { id: 'katara', displayName: 'Katara', shortTagline: 'Calm beyond the storm', factionId: 'astral-tide' }
    ],
    weapon: { id: 'starr-rifle', displayName: 'Starr Rifle', magazineSize: 30, reserveAmmo: 120, damage: 25, fireRate: 8, reloadTime: 1.65, range: 120 },
    chapter: { id: 'chapter-1', title: 'A Dangerous Mission', enemyCount: 10, fragmentCount: 3 },
    enemySpawns: [[-10,2,-7],[-4,2,-15],[7,2,-12],[13,2,-3],[15,2,9],[5,2,15],[-6,2,16],[-15,2,10],[-17,2,-2],[2,2,-22]],
    fragmentSpawns: [[-13,1.7,-10],[13,1.7,7],[0,1.7,18]]
};

StarrworldGame.prototype.initialize = function () {
    this.app.starrworld = this;
    this.frameworkStartGate = true;
    this.state = SW.states.TITLE;
    this.previousState = null;
    const legacyGeneralId = localStorage.getItem('starrworld.selectedGeneralId') || '';
    this.selectedGeneralId = legacyGeneralId === 'zora' ? 'princess-zora' : legacyGeneralId;
    this.health = 100; this.damageCooldown = 0; this.ammo = SW.weapon.magazineSize; this.reserveAmmo = SW.weapon.reserveAmmo;
    this.eliminations = 0; this.fragments = new Set(); this.enemies = []; this.fragmentEntities = [];
    this.missionStart = 0; this.elapsed = 0; this.reloadRemaining = 0; this.fireCooldown = 0;
    this.debug = new URLSearchParams(location.search).has('debug');
    this.touch = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
    this.stateProbe = new pc.Entity('SW_STATE_BOOT'); this.app.root.addChild(this.stateProbe);
    let currentState = this.state;
    Object.defineProperty(this, 'state', { configurable: true, get: () => currentState, set: value => { currentState = value; this.stateProbe.name = 'SW_STATE_' + value; } });
    this.state = SW.states.TITLE;
    this._buildUI(); this._bindInput(); this._setState(SW.states.TITLE);
    this._onFrameworkDamage = payload => this.damagePlayer(payload?.amount || 0);
    this._onFrameworkState = payload => {
        if (payload?.state === SW.states.PUZZLE) {
            this.state = SW.states.PUZZLE;
            this.player.enabled = false;
            if (document.pointerLockElement) document.exitPointerLock();
        } else if (payload?.state === SW.states.PLAYING && this.state === SW.states.PUZZLE) {
            this.state = SW.states.PLAYING;
            this.player.enabled = true;
        } else if (payload?.state === SW.states.FAILED) {
            this._setState(SW.states.FAILED);
        }
    };
    this._onFrameworkComplete = result => {
        this.eliminations = result?.eliminations || 0;
        const g = SW.generals.find(x => x.id === this.selectedGeneralId);
        this.ui.querySelector('.sw-stats').innerHTML = `<div class="sw-stat">GENERAL <span>${g ? g.displayName : '—'}</span></div><div class="sw-stat">ELIMINATIONS <span>${this.eliminations}</span></div><div class="sw-stat">FRAGMENTS <span>${result?.fragments || 0} / 3</span></div><div class="sw-stat">MISSION TIME <span>${this._time(result?.timeSeconds || 0)}</span></div>`;
        this._setState(SW.states.RESULTS);
    };
    this.app.on('sw:player:damage', this._onFrameworkDamage);
    this.app.on('sw:state:changed', this._onFrameworkState);
    this.app.on('sw:chapter:complete', this._onFrameworkComplete);
};

StarrworldGame.prototype._buildUI = function () {
    const style = document.createElement('style');
    style.textContent = `
      :root{--sw-v:#a855f7;--sw-hi:#d8b4fe;--sw-bg:#07050d;--sw-panel:rgba(10,7,20,.92)}
      #sw-root{position:fixed;inset:0;z-index:40;color:#f7f2ff;font-family:Inter,system-ui,sans-serif;pointer-events:none;letter-spacing:.03em}
      #sw-root *{box-sizing:border-box}.sw-screen{position:absolute;inset:0;display:none;align-items:center;justify-content:center;pointer-events:auto;background:radial-gradient(circle at 50% 35%,rgba(102,35,165,.18),transparent 42%),#07050d;overflow:auto}
      .sw-screen.active{display:flex}.sw-stars{background-image:radial-gradient(#fff 1px,transparent 1px);background-size:67px 67px}.sw-panel{width:min(92vw,900px);padding:clamp(24px,5vw,58px);background:var(--sw-panel);border:1px solid rgba(192,132,252,.26);box-shadow:0 0 45px rgba(126,34,206,.14)}
      .sw-kicker{color:var(--sw-hi);font-size:12px;letter-spacing:.35em;text-transform:uppercase}.sw-title{font-size:clamp(45px,9vw,104px);line-height:.9;margin:14px 0 30px;letter-spacing:.16em;text-shadow:0 0 28px rgba(168,85,247,.5)}
      h2{font-size:clamp(28px,5vw,54px);margin:8px 0 20px}p{line-height:1.65;color:#d8d0e5;max-width:680px}.sw-btn{border:1px solid var(--sw-v);background:rgba(126,34,206,.22);color:white;padding:15px 23px;min-height:52px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}.sw-btn:hover,.sw-btn:focus{background:rgba(147,51,234,.45);outline:2px solid var(--sw-hi)}.sw-btn:disabled{opacity:.35;cursor:not-allowed}
      .sw-generals{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.sw-general{min-height:145px;padding:18px;background:#100b1b;border:1px solid #322542;color:white;cursor:pointer;text-align:left}.sw-general:first-child{grid-column:2/4;min-height:170px;border-color:#684096}.sw-general.selected{border-color:var(--sw-hi);box-shadow:0 0 22px rgba(168,85,247,.35);transform:translateY(-2px)}.sw-general b{display:block;font-size:18px;margin-bottom:10px}.sw-general small{color:#bbaacc}
      .sw-objectives{padding-left:20px;line-height:1.8;color:#d8d0e5}.sw-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px 30px;margin:24px 0}.sw-stat{border-bottom:1px solid #30243d;padding:10px 0}.sw-stat span{float:right;color:var(--sw-hi)}
      #sw-hud{display:none;position:absolute;inset:0;pointer-events:none}.playing #sw-hud,.paused #sw-hud{display:block}.sw-hud-top{position:absolute;top:max(16px,env(safe-area-inset-top));left:max(18px,env(safe-area-inset-left));right:max(18px,env(safe-area-inset-right));display:flex;justify-content:space-between;text-shadow:0 2px 5px #000}.sw-objective{display:none;position:absolute;top:52px;left:50%;transform:translateX(-50%);font-size:12px;letter-spacing:.14em;background:rgba(5,3,10,.65);padding:9px 14px}.sw-crosshair{position:absolute;left:50%;top:50%;width:18px;height:18px;transform:translate(-50%,-50%)}.sw-crosshair:before,.sw-crosshair:after{content:'';position:absolute;background:#fff;box-shadow:0 0 4px #a855f7}.sw-crosshair:before{left:8px;width:2px;height:18px}.sw-crosshair:after{top:8px;width:18px;height:2px}.sw-hit{animation:hit .12s}@keyframes hit{50%{filter:drop-shadow(0 0 6px #f0f);transform:translate(-50%,-50%) scale(1.5)}}
      #sw-mobile{display:none;position:absolute;inset:0;pointer-events:none}.touch.playing #sw-mobile{display:block}.sw-look{position:absolute;right:0;top:0;width:50%;height:100%;pointer-events:auto}.sw-pad{position:absolute;left:max(22px,env(safe-area-inset-left));bottom:max(24px,env(safe-area-inset-bottom));width:130px;height:130px;border-radius:50%;border:1px solid #b78ad8;background:rgba(30,15,45,.22);pointer-events:auto;touch-action:none}.sw-knob{position:absolute;left:43px;top:43px;width:44px;height:44px;border-radius:50%;background:rgba(213,180,254,.4)}.sw-actions{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(2,72px);gap:10px;pointer-events:auto}.sw-action{height:56px;border-radius:30px;background:rgba(76,29,149,.55);border:1px solid #c084fc;color:white;font-size:11px;touch-action:none}.sw-fire{height:72px;font-size:15px}.sw-pause{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));pointer-events:auto}
      #sw-rotate{display:none;position:absolute;inset:0;z-index:30;background:#07050d;align-items:center;justify-content:center;text-align:center;pointer-events:auto}.touch.portrait.playing #sw-rotate{display:flex}.sw-debug{display:none;position:absolute;left:10px;bottom:10px;background:rgba(0,0,0,.78);padding:10px;font:12px monospace;white-space:pre;pointer-events:none}.debug .sw-debug{display:block}.sw-puzzle-pieces{display:flex;gap:12px;margin:25px 0}.sw-piece{flex:1;min-height:110px;border:1px solid #64437c;background:#161022;color:#eee;font-size:20px;cursor:grab}.sw-piece.correct{border-color:#7c3aed;background:#25123b}
      @media(max-width:700px){.sw-panel{padding:22px}.sw-generals{grid-template-columns:1fr 1fr}.sw-general:first-child{grid-column:1/3}.sw-general{min-height:100px}.sw-title{font-size:40px}.sw-stats{grid-template-columns:1fr}.sw-screen{align-items:flex-start;padding:12px 0}}
    `;
    document.head.appendChild(style);
    const root = document.createElement('div'); root.id = 'sw-root'; root.className = (this.touch ? 'touch ' : '') + (this.debug ? 'debug ' : '');
    root.innerHTML = `<section id="sw-title" class="sw-screen sw-stars"><div class="sw-panel"><div class="sw-kicker">Chapter Mode</div><div class="sw-title">STARRWORLD</div><button class="sw-btn" data-go="GENERAL_SELECTION">Enter Starrworld</button></div></section>
      <section id="sw-general" class="sw-screen sw-stars"><div class="sw-panel"><div class="sw-kicker">Choose allegiance</div><h2>SELECT YOUR GENERAL</h2><div class="sw-generals"></div><button id="sw-general-continue" class="sw-btn" disabled>Continue</button></div></section>
      <section id="sw-briefing" class="sw-screen"><div class="sw-panel"><div class="sw-kicker">Chapter 1</div><h2>A Dangerous Mission</h2><p>The Commander-in-Chief has announced that one Starr General will inherit command of Starrworld. Before the first trial can begin, unidentified forces breach a restricted sector. Your General orders you into the area.</p><ol class="sw-objectives"><li>Enter the restricted sector</li><li>Eliminate hostile soldiers</li><li>Recover 3 Starr fragments</li><li>Reconstruct the intercepted message</li></ol><button class="sw-btn" id="sw-begin">Begin Mission</button></div></section>
      <section id="sw-puzzle" class="sw-screen"><div class="sw-panel"><div class="sw-kicker">Reconstruct transmission</div><h2>ORDER THE FRAGMENTS</h2><p>Arrange the recovered signal pieces from first to last.</p><div class="sw-puzzle-pieces"></div><p id="sw-transmission" hidden><b>INTERCEPTED TRANSMISSION</b><br>“THE SUCCESSION WAS KNOWN BEFORE THE COMMANDER ANNOUNCED IT.”</p><button class="sw-btn" id="sw-puzzle-check">Reconstruct</button><button class="sw-btn" id="sw-puzzle-continue" hidden>Continue</button></div></section>
      <section id="sw-results" class="sw-screen sw-stars"><div class="sw-panel"><div class="sw-kicker">Mission complete</div><h2>A DANGEROUS MISSION</h2><div class="sw-stats"></div><button class="sw-btn" id="sw-results-continue">Continue</button> <button class="sw-btn" id="sw-replay">Replay Mission</button></div></section>
      <section id="sw-failed" class="sw-screen"><div class="sw-panel"><div class="sw-kicker">Signal lost</div><h2>MISSION FAILED</h2><button class="sw-btn" id="sw-retry">Retry</button> <button class="sw-btn" data-go="BRIEFING">Return to Briefing</button></div></section>
      <section id="sw-paused" class="sw-screen"><div class="sw-panel"><div class="sw-kicker">Paused</div><h2>STARRWORLD</h2><button class="sw-btn" id="sw-resume">Resume</button> <button class="sw-btn" data-go="BRIEFING">Return to Briefing</button></div></section>
      <section id="sw-coming" class="sw-screen sw-stars"><div class="sw-panel"><div class="sw-kicker">Chapter Select</div><h2>CHAPTER 2 — COMING SOON</h2><p>Replay A Dangerous Mission while the next trial is prepared.</p><button class="sw-btn" id="sw-coming-replay">Replay Chapter 1</button></div></section>
      <div id="sw-hud"><div class="sw-hud-top"><div id="sw-health">HEALTH 100</div><div><span id="sw-fragments">FRAGMENTS 0 / 3</span>&nbsp;&nbsp;<span id="sw-ammo">30 / 120</span></div></div><div class="sw-objective" id="sw-objective"></div><div class="sw-crosshair"></div></div>
      <div id="sw-mobile"><div class="sw-look"></div><div class="sw-pad"><div class="sw-knob"></div></div><div class="sw-actions"><button class="sw-action sw-fire">FIRE</button><button class="sw-action sw-jump">JUMP</button><button class="sw-action sw-reload">RELOAD</button><button class="sw-action sw-interact">INTERACT</button></div><button class="sw-btn sw-pause">Ⅱ</button></div>
      <div id="sw-rotate"><div><h2>ROTATE YOUR DEVICE</h2><p>Starrworld plays best in landscape.</p></div></div><div class="sw-debug"></div>`;
    document.body.appendChild(root); this.ui = root;
    root.querySelector('#sw-fragments').style.display = 'none';
    const list = root.querySelector('.sw-generals');
    SW.generals.forEach(g => { const b=document.createElement('button'); b.className='sw-general'; b.dataset.id=g.id; b.innerHTML=`<b>${g.displayName}</b><small>${g.shortTagline}</small>`; b.onclick=()=>this._selectGeneral(g.id); list.appendChild(b); });
    root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>this._setState(b.dataset.go));
    root.querySelector('#sw-general-continue').onclick=()=>this._setState(SW.states.BRIEFING);
    root.querySelector('#sw-begin').onclick=()=>this.startMission(); root.querySelector('#sw-retry').onclick=()=>this.startMission(); root.querySelector('#sw-replay').onclick=()=>this.startMission(); root.querySelector('#sw-coming-replay').onclick=()=>this.startMission();
    root.querySelector('#sw-resume').onclick=()=>this._setState(SW.states.PLAYING); root.querySelector('#sw-results-continue').onclick=()=>this._setState(SW.states.COMING_SOON);
    root.querySelector('#sw-puzzle-check').onclick=()=>this._checkPuzzle(); root.querySelector('#sw-puzzle-continue').onclick=()=>this.finishMission();
    addEventListener('resize',()=>this._orientation()); this._orientation(); if(this.selectedGeneralId) this._selectGeneral(this.selectedGeneralId);
};

StarrworldGame.prototype._bindInput = function () {
    this._keyDown=e=>{ if(e.code==='F3'){this.debug=!this.debug;this.ui.classList.toggle('debug',this.debug);e.preventDefault();return;} if(e.code==='Escape'){this.togglePause();return;} if(this.state===SW.states.TITLE&&e.code==='Enter'){this._setState(SW.states.GENERAL_SELECTION);return;} if(this.state===SW.states.GENERAL_SELECTION){if(/^Digit[1-5]$/.test(e.code))this._selectGeneral(SW.generals[+e.code.slice(-1)-1].id);if(e.code==='Enter'&&this.selectedGeneralId)this._setState(SW.states.BRIEFING);return;} if(this.state===SW.states.BRIEFING&&e.code==='Enter'){this.startMission();return;} if(this.state!==SW.states.PLAYING)return; if(e.code==='KeyR')this.reload(); if(e.code==='KeyE')this.interact(); };
    this._mouseDown=e=>{ if(e.button===0&&this.state===SW.states.PLAYING&&document.pointerLockElement===this.app.graphicsDevice.canvas)this.fire(); };
    this._debugKeyDown=e=>{
        if(!this.debug)return;
        const debugKey=(e.key||'').toLowerCase();
        const directEncounter=['6','7','8','9'].indexOf(debugKey);
        if(directEncounter>=0&&this.state===SW.states.PLAYING){
            const encounter=this.app.root.findByName(`Encounter0${directEncounter+1}`);
            if(encounter)this.player.rigidbody.teleport(encounter.getPosition());
            return;
        }
        if((e.code==='F4'||debugKey==='n')&&this.state===SW.states.PLAYING){
            this._debugEncounterIndex=((this._debugEncounterIndex??-1)+1)%4;
            const encounter=this.app.root.findByName(`Encounter0${this._debugEncounterIndex+1}`);
            if(encounter)this.player.rigidbody.teleport(encounter.getPosition());
            return;
        }
        if((e.code==='F5'||debugKey==='v')&&this.state===SW.states.PLAYING){
            const zone=this.app.root.findByName('OuterCompoundZone');
            if(zone)this.player.rigidbody.teleport(zone.getPosition());
            return;
        }
        if((e.code==='F7'||debugKey==='f')&&this.state===SW.states.PLAYING){this.fire();return}
        if((e.code==='F8'||debugKey==='k')&&this.state===SW.states.PLAYING){
            this.app.root.findByTag('sw-enemy').forEach(x=>{const soldier=x.script?.swEnemySoldier;if(x.enabled&&soldier?.die)soldier.die()});
            return;
        }
        if((e.code==='F9'||debugKey==='c')&&this.state===SW.states.PLAYING){
            this.app.root.findByTag('sw-fragment').forEach(x=>{const fragment=x.script?.swStarrFragment;if(x.enabled&&fragment?.collect)fragment.collect()});
            return;
        }
        if((e.code==='F10'||debugKey==='p')&&this.state===SW.states.PUZZLE){
            const puzzle=this.app.root.findByName('Systems')?.script?.swSequencePuzzleUi;
            if(puzzle?.config){puzzle.current=[...puzzle.config.solution];puzzle._submit()}
        }
        if(debugKey==='l'&&this.state===SW.states.PLAYING){
            const p=this.player.getPosition().clone();p.y=-20;this.player.rigidbody.teleport(p);
        }
    };
    addEventListener('keydown',this._keyDown); addEventListener('keydown',this._debugKeyDown); addEventListener('mousedown',this._mouseDown);
    const bind=(sel,fn,repeat=false)=>{const el=this.ui.querySelector(sel);let timer;const down=e=>{e.preventDefault();e.stopPropagation();fn();if(repeat)timer=setInterval(fn,1000/SW.weapon.fireRate)};const up=e=>{e.preventDefault();clearInterval(timer)};el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)};
    bind('.sw-fire',()=>this.fire(),true); bind('.sw-jump',()=>{this.app.fire('cc:jump',true);setTimeout(()=>this.app.fire('cc:jump',false),80)}); bind('.sw-reload',()=>this.reload()); bind('.sw-interact',()=>this.interact()); bind('.sw-pause',()=>this.togglePause());
    const pad=this.ui.querySelector('.sw-pad'),knob=pad.querySelector('.sw-knob'); let pid=-1;
    const move=e=>{if(e.pointerId!==pid)return;const r=pad.getBoundingClientRect(),dx=Math.max(-45,Math.min(45,e.clientX-r.left-r.width/2)),dy=Math.max(-45,Math.min(45,e.clientY-r.top-r.height/2));knob.style.transform=`translate(${dx}px,${dy}px)`;this._moveTouch(dx/45,dy/45)};
    pad.onpointerdown=e=>{pid=e.pointerId;pad.setPointerCapture(pid);move(e)};pad.onpointermove=move;pad.onpointerup=pad.onpointercancel=()=>{pid=-1;knob.style.transform='';this._moveTouch(0,0)};
    const look=this.ui.querySelector('.sw-look');let lid=-1,lx=0,ly=0;look.onpointerdown=e=>{lid=e.pointerId;lx=e.clientX;ly=e.clientY;look.setPointerCapture(lid)};look.onpointermove=e=>{if(e.pointerId!==lid)return;this.app.fire('cc:look',(e.clientX-lx)*.65,(e.clientY-ly)*.65);lx=e.clientX;ly=e.clientY};look.onpointerup=look.onpointercancel=()=>lid=-1;
};

StarrworldGame.prototype._moveTouch=function(x,y){this.app.fire('cc:move:left',Math.max(0,-x));this.app.fire('cc:move:right',Math.max(0,x));this.app.fire('cc:move:forward',Math.max(0,-y));this.app.fire('cc:move:backward',Math.max(0,y));};
StarrworldGame.prototype._orientation=function(){this.ui.classList.toggle('portrait',innerHeight>innerWidth)};
StarrworldGame.prototype._selectGeneral=function(id){if(!SW.generals.some(g=>g.id===id))return;this.selectedGeneralId=id;localStorage.setItem('starrworld.selectedGeneralId',id);this.app.swSave?.setSelectedGeneral(id);this.app.fire('sw:general:selected',{generalId:id});this.ui.querySelectorAll('.sw-general').forEach(x=>x.classList.toggle('selected',x.dataset.id===id));this.ui.querySelector('#sw-general-continue').disabled=false;this._hud();};

StarrworldGame.prototype._setState=function(next){const valid=Object.values(SW.states);if(!valid.includes(next))return;this.previousState=this.state;this.state=next;this.ui.className=(this.touch?'touch ':'')+(this.debug?'debug ':'')+(next.toLowerCase()+' ')+(innerHeight>innerWidth?'portrait':'');this.ui.querySelectorAll('.sw-screen').forEach(x=>x.classList.remove('active'));const ids={TITLE:'sw-title',GENERAL_SELECTION:'sw-general',BRIEFING:'sw-briefing',PUZZLE:'sw-puzzle',RESULTS:'sw-results',PAUSED:'sw-paused',FAILED:'sw-failed',COMING_SOON:'sw-coming'};if(ids[next])this.ui.querySelector('#'+ids[next]).classList.add('active');const active=next===SW.states.PLAYING;if(this.player){this.player.enabled=active;if(active&&this.player.rigidbody)this.player.rigidbody.activate();}if(!active&&document.pointerLockElement)document.exitPointerLock();this.app.timeScale=next===SW.states.PAUSED?0:1;this._hud();};

StarrworldGame.prototype._createMissionEntities=function(){
    const mkMat=(name,color,emissive)=>{const m=new pc.StandardMaterial();m.name=name;m.diffuse=new pc.Color(...color);m.emissive=new pc.Color(...(emissive||color));m.emissiveIntensity=emissive?1.2:.1;m.metalness=.15;m.gloss=45;m.update();return m};
    this.enemyMat=mkMat('Enemy Soldier',[.22,.08,.3],[.15,.01,.25]);this.fragmentMat=mkMat('Starr Fragment',[.55,.18,.9],[.5,.08,.9]);
    SW.enemySpawns.forEach((p,i)=>{const e=new pc.Entity('EnemySoldier_'+(i+1));e.addComponent('render',{type:'capsule',material:this.enemyMat});e.addComponent('collision',{type:'capsule',radius:.45,height:1.8});e.setLocalScale(.9,1.8,.9);e.setPosition(...p);e.tags.add('enemy-soldier');e.sw={id:'enemy-'+(i+1),health:100,state:'IDLE',attackTimer:0,counted:false,spawn:new pc.Vec3(...p)};this.app.root.addChild(e);this.enemies.push(e)});
    SW.fragmentSpawns.forEach((p,i)=>{const e=new pc.Entity('StarrFragment_'+(i+1));e.addComponent('render',{type:'cone',material:this.fragmentMat});e.setLocalScale(.55,.8,.55);e.setPosition(...p);e.tags.add('starr-fragment');e.sw={id:'fragment-'+(i+1),baseY:p[1],phase:i*2};this.app.root.addChild(e);this.fragmentEntities.push(e)});
    this._resetEntities();
};

StarrworldGame.prototype._resetEntities=function(){this.enemies.forEach(e=>{e.enabled=true;e.sw.health=100;e.sw.state='IDLE';e.sw.counted=false;e.setPosition(e.sw.spawn)});this.fragmentEntities.forEach(e=>e.enabled=true)};
StarrworldGame.prototype.startMission=function(){this.health=100;this.damageCooldown=0;this.ammo=30;this.reserveAmmo=120;this.eliminations=0;this.fragments.clear();this.reloadRemaining=0;this.fireCooldown=0;this.missionStart=performance.now();this.elapsed=0;this.player.setPosition(-4.04,5,6.53);if(this.player.rigidbody){this.player.rigidbody.linearVelocity=pc.Vec3.ZERO.clone();this.player.rigidbody.angularVelocity=pc.Vec3.ZERO.clone();this.player.rigidbody.teleport(this.player.getPosition())}this._setState(SW.states.PLAYING);this.app.fire('sw:chapter:request-start');this._hud();};

StarrworldGame.prototype.fire=function(){if(this.state!==SW.states.PLAYING||this.reloadRemaining>0||this.fireCooldown>0)return;if(this.ammo<=0){this.reload();return}this.ammo--;this.fireCooldown=1/SW.weapon.fireRate;const from=this.cameraEntity.getPosition(),to=from.clone().add(this.cameraEntity.forward.clone().mulScalar(SW.weapon.range));const hit=this.app.systems.rigidbody.raycastFirst(from,to);if(hit&&hit.entity&&hit.entity.tags.has('enemy-soldier')){const soldier=hit.entity.script?.swEnemySoldier;if(soldier?.takeDamage)soldier.takeDamage(SW.weapon.damage);else{hit.entity.sw.health-=SW.weapon.damage;if(hit.entity.sw.health<=0)this._killEnemy(hit.entity)}this.ui.querySelector('.sw-crosshair').classList.add('sw-hit');setTimeout(()=>this.ui.querySelector('.sw-crosshair').classList.remove('sw-hit'),130)}this.app.fire('sw:hud:ammo',{magazine:this.ammo,reserve:this.reserveAmmo});this._hud();};
StarrworldGame.prototype.reload=function(){if(this.state!==SW.states.PLAYING||this.reloadRemaining>0||this.ammo>=SW.weapon.magazineSize||this.reserveAmmo<=0)return;this.reloadRemaining=SW.weapon.reloadTime;this._hud();};
StarrworldGame.prototype._finishReload=function(){const need=SW.weapon.magazineSize-this.ammo,take=Math.min(need,this.reserveAmmo);this.ammo+=take;this.reserveAmmo-=take;this.reloadRemaining=0;this._hud();};
StarrworldGame.prototype._killEnemy=function(e){if(e.sw.counted)return;e.sw.counted=true;e.sw.state='DEAD';this.eliminations++;this.app.fire('sw:enemy:killed',{encounterId:e._swEncounterId||null,entity:e});e.enabled=false;this._hud();};
StarrworldGame.prototype.damagePlayer=function(amount){if(this.state!==SW.states.PLAYING||this.damageCooldown>0)return;this.damageCooldown=.9;this.health=Math.max(0,this.health-amount);this.app.fire('sw:hud:health',{health:this.health,maxHealth:100});this._hud();if(this.health<=0){const runtime=this.app.root.findByName('Systems')?.script?.swChapterRuntime;if(runtime?.failChapter)runtime.failChapter('player-defeated');else this._setState(SW.states.FAILED)}};
StarrworldGame.prototype.interact=function(){if(this.state!==SW.states.PLAYING)return;this.app.fire('sw:interact')};
StarrworldGame.prototype._collect=function(e){if(this.fragments.has(e.sw.id))return;this.fragments.add(e.sw.id);e.enabled=false;this._hud();this._checkProgress();};
StarrworldGame.prototype._checkProgress=function(){if(this.eliminations===SW.chapter.enemyCount&&this.fragments.size===SW.chapter.fragmentCount)this._openPuzzle();};
StarrworldGame.prototype._openPuzzle=function(){this._setState(SW.states.PUZZLE);const labels=['KNOWN BEFORE','THE SUCCESSION WAS','THE ANNOUNCEMENT'];this.puzzleOrder=[1,0,2];const box=this.ui.querySelector('.sw-puzzle-pieces');box.innerHTML='';this.puzzleOrder.forEach(n=>{const b=document.createElement('button');b.className='sw-piece';b.textContent=labels[n];b.dataset.value=n;b.onclick=()=>{const i=[...box.children].indexOf(b),j=(i+1)%3;box.insertBefore(b,box.children[j]||null)};box.appendChild(b)});this.ui.querySelector('#sw-transmission').hidden=true;this.ui.querySelector('#sw-puzzle-check').hidden=false;this.ui.querySelector('#sw-puzzle-continue').hidden=true;};
StarrworldGame.prototype._checkPuzzle=function(){const values=[...this.ui.querySelectorAll('.sw-piece')].map(x=>+x.dataset.value);if(values.join(',')!=='0,1,2')return;this.ui.querySelectorAll('.sw-piece').forEach(x=>x.classList.add('correct'));this.ui.querySelector('#sw-transmission').hidden=false;this.ui.querySelector('#sw-puzzle-check').hidden=true;this.ui.querySelector('#sw-puzzle-continue').hidden=false;};
StarrworldGame.prototype.finishMission=function(){this.elapsed=(performance.now()-this.missionStart)/1000;const old=JSON.parse(localStorage.getItem('starrworld.progress')||'{}');const data={selectedGeneralId:this.selectedGeneralId,chapter1Complete:true,bestEliminationCount:Math.max(old.bestEliminationCount||0,this.eliminations),bestCompletionTime:old.bestCompletionTime?Math.min(old.bestCompletionTime,this.elapsed):this.elapsed,totalEliminations:(old.totalEliminations||0)+this.eliminations};localStorage.setItem('starrworld.progress',JSON.stringify(data));const g=SW.generals.find(x=>x.id===this.selectedGeneralId);this.ui.querySelector('.sw-stats').innerHTML=`<div class="sw-stat">GENERAL <span>${g?g.displayName:'—'}</span></div><div class="sw-stat">ELIMINATIONS <span>${this.eliminations}</span></div><div class="sw-stat">FRAGMENTS <span>${this.fragments.size} / 3</span></div><div class="sw-stat">MISSION TIME <span>${this._time(this.elapsed)}</span></div>`;this._setState(SW.states.RESULTS);};
StarrworldGame.prototype.togglePause=function(){if(this.state===SW.states.PLAYING)this._setState(SW.states.PAUSED);else if(this.state===SW.states.PAUSED)this._setState(SW.states.PLAYING)};
StarrworldGame.prototype._time=function(s){return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`};
StarrworldGame.prototype._objective=function(){if(this.eliminations<SW.chapter.enemyCount)return `ELIMINATE HOSTILES  ${this.eliminations} / ${SW.chapter.enemyCount}`;if(this.fragments.size<3)return `RECOVER STARR FRAGMENTS  ${this.fragments.size} / 3`;return 'RECONSTRUCT THE INTERCEPTED MESSAGE'};
StarrworldGame.prototype._hud=function(){if(!this.ui)return;this.ui.querySelector('#sw-health').textContent=`HEALTH ${Math.ceil(this.health)}`;this.ui.querySelector('#sw-fragments').textContent=`FRAGMENTS ${this.fragments.size} / 3`;this.ui.querySelector('#sw-ammo').textContent=this.reloadRemaining>0?'RELOADING':`${this.ammo} / ${this.reserveAmmo}`;this.ui.querySelector('#sw-objective').textContent=this._objective();};

StarrworldGame.prototype.update=function(dt){
    if(this.fireCooldown>0)this.fireCooldown-=dt;
    if(this.damageCooldown>0)this.damageCooldown-=dt;
    if(this.reloadRemaining>0){this.reloadRemaining-=dt;if(this.reloadRemaining<=0)this._finishReload()}
    if(this.state!==SW.states.PLAYING)return;
    this.elapsed=(performance.now()-this.missionStart)/1000;
    const pp=this.player.getPosition();
    if(this.debug){
        const runtime=this.app.root.findByName('Systems')?.script?.swChapterRuntime;
        const active=this.app.root.findByTag('sw-enemy').filter(e=>e.enabled).length,g=SW.generals.find(x=>x.id===this.selectedGeneralId);
        const enemyLines=this.app.root.findByTag('sw-enemy').filter(x=>x.enabled&&x.script?.swEnemySoldier).map(x=>{const s=x.script.swEnemySoldier,d=x.getPosition().distance(pp);return `${x.name} | ${x._swEncounterId||'—'} | HP ${Math.ceil(s.health)} | ${s.state} | ${d.toFixed(1)}m`});
        this.ui.querySelector('.sw-debug').textContent=`FPS ${Math.round(1/Math.max(dt,.001))}\nPOS ${pp.x.toFixed(1)}, ${pp.y.toFixed(1)}, ${pp.z.toFixed(1)}\nSTATE ${runtime?.state||this.state}\nOBJECTIVE ${runtime?._currentObjective?.()?.label||''}\nGENERAL ${g?g.displayName:'—'}\nENEMIES ${active}\nELIMINATIONS ${runtime?.stats?.eliminations||0}\nFRAGMENTS ${runtime?.stats?.fragments||0}/3${enemyLines.length?'\n\nACTIVE ENEMIES\n'+enemyLines.join('\n'):''}`
    }
};

StarrworldGame.prototype.destroy=function(){removeEventListener('keydown',this._keyDown);removeEventListener('keydown',this._debugKeyDown);removeEventListener('mousedown',this._mouseDown);this.app.off('sw:player:damage',this._onFrameworkDamage);this.app.off('sw:state:changed',this._onFrameworkState);this.app.off('sw:chapter:complete',this._onFrameworkComplete);this.ui?.remove()};
