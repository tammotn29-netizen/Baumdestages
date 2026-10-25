/* BaumDesTages v0.1: öffentlich lesbare Baum-Community. Ohne Backend ist nur die Demo aktiv. */
const cfg = window.BDT_CONFIG || {};
const configured = Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey);
const state = {
  tab: 'discover', search: '', authMode: 'login', authOpen: false,
  trees: [], user: null, profile: null, sb: null, selected: null,
  comments: [], likes: [], myLike: false, loading: true, saving: false,
  map: null, error: null
};
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shorten = (value, length = 110) => String(value || '').length > length ? String(value).slice(0,length) + '…' : String(value || '');
const demoTrees = [
  {id:'demo-1', common_name:'Stieleiche', species:'Quercus robur', nickname:'Alte Eiche', description:'Beispielbeitrag: So könnte eine Baumgeschichte aussehen.', latitude:52.378,longitude:9.739,profiles:{username:'baumentdecker',display_name:'Baumentdecker'},tree_photos:[],created_at:'2026-10-01T08:00:00Z'},
  {id:'demo-2', common_name:'Küstenmammutbaum', species:'Sequoia sempervirens', nickname:'Grüner Riese', description:'Beispielbeitrag: Entdecke besondere Bäume auf der Karte.', latitude:48.137,longitude:11.576,profiles:{username:'baumfreundin',display_name:'Baumfreundin'},tree_photos:[],created_at:'2026-10-02T08:00:00Z'},
  {id:'demo-3', common_name:'Japanischer Ahorn', species:'Acer palmatum', nickname:'Herbstzauber',description:'Beispielbeitrag: Halte die Geschichte eines Baumes fest.',latitude:50.111,longitude:8.681,profiles:{username:'naturblick',display_name:'Naturblick'},tree_photos:[],created_at:'2026-10-03T08:00:00Z'}
];
const icon = (name) => ({discover:'⌂',map:'◎',create:'＋',profile:'◉'}[name] || '•');
const label = (name) => ({discover:'Entdecken',map:'Baumkarte',create:'Baum eintragen',profile:'Profil'}[name] || name);
function toast(message){const old=$('.toast');if(old)old.remove();const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),4500);}
function photoUrl(tree){
  const path=tree.tree_photos && tree.tree_photos[0] && tree.tree_photos[0].storage_path;
  if(!path || !state.sb)return '';
  const url=state.sb.storage.from('tree-photos').getPublicUrl(path).data.publicUrl;
  try{const parsed=new URL(url);return parsed.protocol==='https:'?url:'';}catch{return '';}
}
function photoMarkup(tree,klass='tree-photo'){
  const url=photoUrl(tree);
  return '<div class="'+klass+'">'+(url?'<img loading="lazy" src="'+escapeHtml(url)+'" alt="Foto: '+escapeHtml(tree.common_name)+'">':'<span class="emoji" aria-hidden="true">🌳</span>')+'</div>';
}
function nav(){
  const items=['discover','map','create','profile'];
  return '<nav class="nav-top" aria-label="Hauptnavigation">'+items.map(n=>'<button class="'+(state.tab===n?'active':'')+'" data-tab="'+n+'">'+label(n)+'</button>').join('')+'</nav>';
}
function bottomNav(){
  return '<nav class="bottom-nav" aria-label="Mobile Navigation">'+['discover','map','create','profile'].map(n=>'<button class="'+(state.tab===n?'active':'')+'" data-tab="'+n+'" aria-label="'+label(n)+'"><span>'+icon(n)+'</span>'+({discover:'Entdecken',map:'Karte',create:'Beitragen',profile:'Profil'}[n])+'</button>').join('')+'</nav>';
}
function treeCard(tree){
  return '<button class="tree-card" data-tree="'+escapeHtml(tree.id)+'" aria-label="'+escapeHtml(tree.common_name)+' ansehen">'+
  photoMarkup(tree)+
  '<div class="tree-body"><span class="small muted">'+escapeHtml(tree.species||'Baumart unbekannt')+'</span><h3>'+escapeHtml(tree.nickname||tree.common_name)+'</h3>'+
  '<p>'+escapeHtml(shorten(tree.description||tree.common_name,95))+'</p><div class="card-meta"><span>📍 '+(Number.isFinite(+tree.latitude)? Number(tree.latitude).toFixed(2)+'°, ':'')+ (Number.isFinite(+tree.longitude)?Number(tree.longitude).toFixed(2)+'°':'')+'</span><span>von @'+escapeHtml(tree.profiles?.username||'Community')+'</span></div></div></button>';
}
function discover(){
  const filtered=state.trees.filter(t=>[t.common_name,t.species,t.nickname,t.description].join(' ').toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
  return '<section class="hero"><div><div class="eyebrow">Entdecken · Bewahren · Teilen</div>'+
   '<h1>Jeder Baum erzählt <em>eine Geschichte.</em></h1><p>Entdecke beeindruckende Bäume auf der ganzen Welt, teile deine Funde und werde Teil einer wachsenden Natur-Community.</p>'+
   '<div class="toolbar"><button class="btn" data-tab="map">🌍 Weltkarte entdecken</button><button class="btn secondary" data-tab="create">＋ Baum eintragen</button></div>'+
   '<div class="statbar"><div><b>'+state.trees.length+'</b><span>'+(configured?'Gefundene Bäume':'Beispielbäume')+'</span></div><div><b>🌿</b><span>Weltweite Community</span></div></div></div>'+
   '<div class="hero-art" aria-hidden="true"><div class="art-pill"><strong>🌳 Baum des Tages</strong>Deine nächste Entdeckung wartet</div></div></section>'+
   (!configured?'<div class="notice warning">Vorschau-Modus: Die gezeigten Bäume sind ausdrücklich erfundene Beispiele. Anmeldung und Upload werden nach Einrichtung des eigenen Backends aktiv.</div>':'')+
   '<div class="section-header"><div><div class="eyebrow">Aus der Community</div><h2 class="section-title">Bäume entdecken</h2></div><input id="search" class="search" aria-label="Bäume suchen" placeholder="🔍 Baumart oder Stichwort suchen" value="'+escapeHtml(state.search)+'"></div>'+
   (filtered.length?'<div class="cards">'+filtered.map(treeCard).join('')+'</div>':'<div class="empty"><b>Noch keine passenden Bäume.</b>Entdecke die Karte oder trage einen neuen Baum ein.</div>');
}
function mapView(){
  return '<section class="section-header"><div><div class="eyebrow">Unser Planet · Unsere Bäume</div><h1 class="section-title">Die Baumkarte</h1></div><button class="btn" data-tab="create">＋ Baum hinzufügen</button></section>'+
   '<div class="map-frame"><div id="world-map" role="application" aria-label="Interaktive Baumkarte"></div><div class="map-overlay"><b>🌳 '+state.trees.length+' Bäume</b>'+(configured?'Gemeinsam entdecken':'Beispieldaten – Vorschau')+'</div></div>'+
   '<p class="muted small">Markierungen öffnen die Baumprofile. Die Karte verwendet in der Entwicklung OpenStreetMap-Kartenkacheln. Für einen großen öffentlichen Betrieb ist ein eigener Kartenanbieter erforderlich.</p>';
}
function createView(){
  if(!configured) return '<section class="panel"><div class="eyebrow">Mitmachen</div><h2>Deinen Baum eintragen</h2><p class="muted">Hier kannst du später Fotos hochladen und neue Bäume veröffentlichen.</p><div class="notice warning">Die App läuft im Vorschau-Modus. Echte Beiträge benötigen ein eingerichtetes BaumDesTages-Backend.</div></section>';
  if(!state.user) return '<section class="panel"><div class="eyebrow">Mitmachen</div><h2>Deinen Baum eintragen</h2><p>Melde dich kostenlos an, um Bäume mit Foto und Standort zu veröffentlichen.</p><button class="btn" id="open-auth">Anmelden oder registrieren</button></section>';
  return '<section class="panel"><div class="eyebrow">Gemeinsam sammeln</div><h2>Neuen Baum eintragen 🌳</h2><p class="muted">Teile deinen Fund mit der Welt. Bis zu fünf optimierte Fotos pro Baum.</p>'+
    '<form id="tree-form"><div class="form-grid">'+
    '<div class="field"><label for="common">Baumname *</label><input id="common" name="common" required maxlength="100" placeholder="z. B. Stieleiche"></div>'+
    '<div class="field"><label for="species">Botanischer Name</label><input id="species" name="species" maxlength="140" placeholder="Quercus robur"></div>'+
    '<div class="field wide"><label for="nickname">Spitzname / Besonderheit</label><input id="nickname" name="nickname" maxlength="100" placeholder="Die 300 Jahre alte Eiche"></div>'+
    '<div class="field wide"><label for="description">Die Geschichte des Baumes</label><textarea id="description" name="description" maxlength="2000" placeholder="Was macht diesen Baum besonders?"></textarea></div>'+
    '<div class="field"><label for="lat">Breitengrad *</label><input type="number" id="lat" name="lat" min="-90" max="90" step="any" required placeholder="52.3759"></div>'+
    '<div class="field"><label for="lng">Längengrad *</label><input type="number" id="lng" name="lng" min="-180" max="180" step="any" required placeholder="9.7320"></div>'+
    '<div class="field wide"><button type="button" id="get-location" class="btn outline">📍 Aktuellen Standort übernehmen</button></div>'+
    '<div class="field wide"><label for="precision">Öffentlich sichtbarer Standort</label><select name="precision" id="precision"><option value="approx">Ungefähr (auf ca. 100 m gerundet) – empfohlen</option><option value="exact">Exakte Koordinaten veröffentlichen</option></select></div>'+
    '<div class="field wide"><label class="drop">📷 Fotos auswählen – JPEG, PNG oder WebP (max. 5)<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple></label><small>Fotos werden im Browser verkleinert und als JPEG gespeichert. Fotos und Standort sind anschließend öffentlich sichtbar.</small></div>'+
    '</div><div class="notice">Bitte nur eigene oder freigegebene Fotos hochladen. Keine Privatgrundstücke ohne Zustimmung dokumentieren. Standortangaben sind auch ohne Anmeldung öffentlich lesbar.</div>'+
    '<button class="btn" type="submit" '+(state.saving?'disabled':'')+'>'+(state.saving?'Wird gespeichert …':'🌳 Baum veröffentlichen')+'</button></form></section>';
}
function profileView(){
  if(!configured)return '<section class="panel"><h2>Dein Profil</h2><div class="notice warning">Registrierung wird aktiviert, sobald die eigene Datenbank eingerichtet ist.</div></section>';
  if(!state.user)return '<section class="panel"><div class="eyebrow">Deine Community</div><h2>Dein BaumDesTages-Profil</h2><p>Registriere dich kostenlos und beginne deine eigene Baumsammlung.</p><button class="btn" id="open-auth">Jetzt anmelden / registrieren</button></section>';
  return '<section class="panel"><div class="profile-head"><div class="avatar">🌿</div><div><div class="eyebrow">Dein Profil</div><h2>'+escapeHtml(state.profile?.display_name || state.profile?.username || 'Baumfreund')+'</h2><span class="muted small">'+escapeHtml(state.user.email||'')+'</span></div></div>'+
    '<form id="profile-form"><div class="form-grid"><div class="field"><label for="username">Benutzername</label><input id="username" name="username" minlength="3" maxlength="24" pattern="[a-z0-9_]+" value="'+escapeHtml(state.profile?.username||'')+'" required></div>'+
    '<div class="field"><label for="display-name">Anzeigename</label><input id="display-name" name="display_name" maxlength="80" value="'+escapeHtml(state.profile?.display_name||'')+'"></div>'+
    '<div class="field wide"><label for="bio">Über mich</label><textarea id="bio" name="bio" maxlength="500">'+escapeHtml(state.profile?.bio||'')+'</textarea></div></div>'+
    '<div class="toolbar"><button class="btn" type="submit">Profil speichern</button><button type="button" class="btn outline" id="logout">Abmelden</button></div></form></section>';
}
function detailView(){
  const t=state.trees.find(x=>x.id===state.selected);
  if(!t)return discover();
  return '<div class="section-header"><button class="btn secondary" id="back">← Zurück</button><span class="muted small">'+(configured?'Community-Beitrag':'Beispielbeitrag')+'</span></div>'+
  '<section class="panel" style="max-width:100%;margin-top:0"><div class="detail-top">'+photoMarkup(t,'detail-photo')+
  '<div><div class="eyebrow">Baumporträt</div><h2>'+escapeHtml(t.nickname||t.common_name)+'</h2><p class="muted"><em>'+escapeHtml(t.species||'Art noch nicht bestimmt')+'</em></p>'+
  '<div class="data-pills"><span>🌳 '+escapeHtml(t.common_name)+'</span><span>📍 '+Number(t.latitude).toFixed(3)+'°, '+Number(t.longitude).toFixed(3)+'°</span></div>'+
  '<p>'+escapeHtml(t.description || 'Für diesen Baum wurde noch keine Geschichte hinterlegt.')+'</p>'+
  '<p class="small muted">Veröffentlicht von @'+escapeHtml(t.profiles?.username||'Community')+'</p>'+
  '<div class="toolbar"><button id="like" class="btn secondary" '+(!state.user?'title="Zum Liken anmelden"':'')+'>♡ '+state.likes.length+' Gefällt mir</button>'+
  '<button id="copy-location" class="btn outline">📍 Koordinaten kopieren</button></div></div></div>'+
  '<div class="section-header"><h2 class="section-title">Kommentare</h2></div>'+
  (state.comments.length?state.comments.map(c=>'<div class="comment"><b>@'+escapeHtml(c.profiles?.username||'Community')+'</b><p>'+escapeHtml(c.body)+'</p></div>').join(''):'<p class="muted">Noch keine Kommentare.</p>')+
  (state.user?'<form id="comment-form"><div class="field"><label for="comment">Kommentar schreiben</label><textarea id="comment" name="body" maxlength="700" required></textarea></div><button class="btn" type="submit">Kommentieren</button></form>':'<p class="small muted">Zum Kommentieren bitte anmelden.</p>')+
  '</section>';
}
function authDialog(){
  if(!state.authOpen)return '';
  return '<div class="overlay" id="auth-overlay"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div class="dialog-top"><h2 id="auth-title">'+(state.authMode==='login'?'Willkommen zurück':'Konto erstellen')+'</h2><button class="ghost" id="close-auth" aria-label="Schließen">✕</button></div>'+
  '<p class="muted small">BaumDesTages – kostenlos dabei sein.</p><form id="auth-form"><div class="field"><label for="email">E-Mail</label><input id="email" name="email" type="email" autocomplete="email" required></div>'+
  '<div class="field"><label for="password">Passwort (mind. 8 Zeichen)</label><input id="password" name="password" type="password" minlength="8" required autocomplete="'+(state.authMode==='login'?'current-password':'new-password')+'"></div>'+
  '<button class="btn" type="submit">'+(state.authMode==='login'?'Anmelden':'Kostenlos registrieren')+'</button></form>'+
  '<p class="small"><button class="ghost" id="switch-auth">'+(state.authMode==='login'?'Noch kein Konto? Registrieren':'Bereits registriert? Anmelden')+'</button></p></div></div>';
}
function render(){
  if(state.map){state.map.remove();state.map=null;}
  let content=state.selected?detailView():state.tab==='discover'?discover():state.tab==='map'?mapView():state.tab==='create'?createView():profileView();
  document.querySelector('#app').innerHTML='<div class="shell"><header><div class="brand"><span class="brand-icon">🌳</span>BaumDesTages</div>'+nav()+
  '<button class="btn secondary" id="header-account">'+(state.user?'Mein Konto':'Anmelden')+'</button></header><main>'+content+'</main></div>'+bottomNav()+authDialog();
  if(!state.selected&&state.tab==='map')setTimeout(setupMap,0);
}
function setupMap(){
  if(!$('#world-map'))return;
  if(!window.L){$('#world-map').innerHTML='<p class="notice warning">Die Kartenbibliothek ist nicht geladen. Bitte die Internetverbindung prüfen.</p>';return;}
  const map=window.L.map('world-map',{zoomControl:true}).setView([50.5,10.4],6);
  state.map=map;
  window.L.tileLayer(cfg.mapTileUrl||'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,attribution:cfg.mapAttribution||'© OpenStreetMap-Mitwirkende'
  }).addTo(map);
  const markers=[];
  for(const t of state.trees){
    if(!Number.isFinite(+t.latitude)||!Number.isFinite(+t.longitude))continue;
    const m=window.L.marker([Number(t.latitude),Number(t.longitude)]).addTo(map);
    m.bindTooltip(escapeHtml(t.nickname||t.common_name));
    m.on('click',()=>openTree(t.id));
    markers.push(m);
  }
  if(markers.length>1)map.fitBounds(window.L.featureGroup(markers).getBounds().pad(.25),{maxZoom:9});
  else if(markers.length===1)map.setView(markers[0].getLatLng(),10);
  setTimeout(()=>map.invalidateSize(),50);
}
async function loadTrees(){
  if(!state.sb){state.trees=demoTrees;return;}
  const {data,error}=await state.sb.from('trees').select('id,owner_id,common_name,species,nickname,description,latitude,longitude,created_at,profiles:owner_id(username,display_name),tree_photos(id,storage_path)').order('created_at',{ascending:false}).limit(150);
  if(error)throw error;
  state.trees=data||[];
}
async function refreshProfile(){
  if(!state.sb||!state.user){state.profile=null;return;}
  const {data,error}=await state.sb.from('profiles').select('*').eq('id',state.user.id).maybeSingle();
  if(error)throw error;
  if(data){state.profile=data;return;}
  const username='baum_'+state.user.id.replace(/-/g,'').slice(0,14);
  const result=await state.sb.from('profiles').upsert({id:state.user.id,username:username,display_name:'Baumfreund'},{onConflict:'id',ignoreDuplicates:true}).select().single();
  if(result.error)throw result.error;
  state.profile=result.data;
}
async function init(){
  try{
    if(configured){
      const module=await import('https://esm.sh/@supabase/supabase-js@2.76.1?bundle');
      state.sb=module.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
      const {data:{session},error}=await state.sb.auth.getSession();
      if(error)throw error;
      state.user=session?.user||null;
      if(state.user)await refreshProfile();
      state.sb.auth.onAuthStateChange((_event,session)=>{
        const newId=session?.user?.id || null;
        if(newId!==state.user?.id){state.user=session?.user||null;setTimeout(async()=>{try{await refreshProfile();render();}catch(e){toast(e.message)}},0);}
      });
    }
    await loadTrees();
  }catch(e){state.error=e.message;toast('Startfehler: '+e.message);}
  state.loading=false;render();
}
async function openTree(id){
  state.selected=id;
  state.comments=[];state.likes=[];
  render();
  if(!state.sb)return;
  try{
    const [c,l]=await Promise.all([
      state.sb.from('comments').select('id,body,created_at,profiles:user_id(username)').eq('tree_id',id).order('created_at',{ascending:false}).limit(50),
      state.sb.from('likes').select('user_id').eq('tree_id',id).limit(10000)
    ]);
    if(c.error)throw c.error;if(l.error)throw l.error;
    state.comments=c.data||[];state.likes=l.data||[];
  }catch(e){toast(e.message);}
  render();
}
function navTo(tab){state.selected=null;state.tab=tab;render();}
async function resizeImage(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Nur JPEG, PNG oder WebP erlaubt.');
  if(file.size>12*1024*1024)throw new Error('Ein Foto überschreitet 12 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Bildverarbeitung nicht verfügbar');
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    let blob;
    for(const quality of [.82,.68,.55,.42]){
      blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
      if(blob&&blob.size<=900000)break;
    }
    if(!blob||blob.size>1000000)throw new Error('Foto kann nicht klein genug komprimiert werden.');
    return blob;
  }finally{bitmap.close();}
}
async function submitTree(form){
  if(!state.sb||!state.user)return toast('Bitte erst anmelden.');
  if(state.saving)return;
  const fd=new FormData(form);
  const lat=Number(fd.get('lat')), lng=Number(fd.get('lng'));
  if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180) return toast('Ungültige Koordinaten.');
  const files=[...form.querySelector('input[type=file]').files];
  if(files.length>5)return toast('Maximal fünf Fotos je Baum.');
  state.saving=true;const submit=form.querySelector('button[type=submit]');submit.disabled=true;submit.textContent='Speichert …';
  try{
    const approximate=fd.get('precision')!=='exact';
    const payload={owner_id:state.user.id,common_name:String(fd.get('common')).trim(),species:String(fd.get('species')).trim()||null,nickname:String(fd.get('nickname')).trim()||null,description:String(fd.get('description')).trim()||null,latitude:approximate?Number(lat.toFixed(3)):lat,longitude:approximate?Number(lng.toFixed(3)):lng,location_precision:approximate?'approximate':'exact'};
    if(!payload.common_name)throw new Error('Bitte einen Baumnamen eingeben.');
    const {data,error}=await state.sb.from('trees').insert(payload).select('id').single();
    if(error)throw error;
    let uploaded=0;
    for(const file of files){
      try{
        const jpg=await resizeImage(file);
        const path=state.user.id+'/'+data.id+'/'+crypto.randomUUID()+'.jpg';
        const upload=await state.sb.storage.from('tree-photos').upload(path,jpg,{contentType:'image/jpeg',upsert:false});
        if(upload.error)throw upload.error;
        const meta=await state.sb.from('tree_photos').insert({tree_id:data.id,user_id:state.user.id,storage_path:path});
        if(meta.error){await state.sb.storage.from('tree-photos').remove([path]);throw meta.error;}
        uploaded++;
      }catch(e){toast('Foto konnte nicht gespeichert werden: '+e.message);}
    }
    await loadTrees();navTo('discover');toast('Baum veröffentlicht! '+uploaded+' von '+files.length+' Fotos gespeichert.');
  }catch(e){toast('Speichern fehlgeschlagen: '+e.message);}
  finally{state.saving=false;if(submit&&submit.isConnected){submit.disabled=false;submit.textContent='🌳 Baum veröffentlichen';}}
}
async function submitAuth(form){
  if(!state.sb)return;
  const fd=new FormData(form),email=String(fd.get('email')).trim(),password=String(fd.get('password'));
  try{
    const response=state.authMode==='login'?await state.sb.auth.signInWithPassword({email,password}):await state.sb.auth.signUp({email,password});
    if(response.error)throw response.error;
    state.authOpen=false;render();
    toast(state.authMode==='login'?'Angemeldet.':'Registrierung gestartet. Prüfe gegebenenfalls dein E-Mail-Postfach.');
  }catch(e){toast(e.message);}
}
async function submitProfile(form){
  const fd=new FormData(form),username=String(fd.get('username')).trim();
  if(!/^[a-z0-9_]{3,24}$/.test(username))return toast('Benutzername: 3–24 Zeichen, Kleinbuchstaben, Ziffern oder _');
  const {error}=await state.sb.from('profiles').update({username,display_name:String(fd.get('display_name')).slice(0,80),bio:String(fd.get('bio')).slice(0,500)}).eq('id',state.user.id);
  if(error)return toast(error.message);
  await refreshProfile();render();toast('Profil aktualisiert.');
}
async function submitComment(form){
  if(!state.user||!state.selected)return;
  const body=String(new FormData(form).get('body')).trim();
  if(!body||body.length>700)return toast('Ungültiger Kommentar.');
  const {error}=await state.sb.from('comments').insert({tree_id:state.selected,user_id:state.user.id,body});
  if(error)return toast(error.message);
  await openTree(state.selected);toast('Kommentar veröffentlicht.');
}
async function toggleLike(){
  if(!state.user){state.authOpen=true;render();return;}
  const liked=state.likes.some(l=>l.user_id===state.user.id);
  const q=liked?state.sb.from('likes').delete().eq('tree_id',state.selected).eq('user_id',state.user.id):
    state.sb.from('likes').insert({tree_id:state.selected,user_id:state.user.id});
  const {error}=await q;if(error)return toast(error.message);
  await openTree(state.selected);
}
document.addEventListener('click',async event=>{
  const tab=event.target.closest('[data-tab]');if(tab){navTo(tab.dataset.tab);return;}
  const tree=event.target.closest('[data-tree]');if(tree){openTree(tree.dataset.tree);return;}
  const button=event.target.closest('button');if(!button)return;
  if(button.id==='back'){state.selected=null;render();}
  if(button.id==='header-account'){if(state.user)navTo('profile');else{state.authOpen=true;render();}}
  if(button.id==='open-auth'){state.authOpen=true;render();}
  if(button.id==='close-auth'){state.authOpen=false;render();}
  if(button.id==='switch-auth'){state.authMode=state.authMode==='login'?'signup':'login';render();}
  if(button.id==='logout'&&state.sb){const {error}=await state.sb.auth.signOut();if(error)toast(error.message);else{state.user=null;state.profile=null;navTo('discover');toast('Abgemeldet.');}}
  if(button.id==='like')toggleLike();
  if(button.id==='get-location')navigator.geolocation?.getCurrentPosition(
    pos=>{const lat=$('#lat'),lng=$('#lng');if(lat&&lng){lat.value=pos.coords.latitude.toFixed(6);lng.value=pos.coords.longitude.toFixed(6);toast('Position übernommen. Standortfreigabe vor dem Veröffentlichen prüfen.');}},
    error=>toast('Standort nicht verfügbar: '+error.message),{enableHighAccuracy:true,timeout:13000});
  if(button.id==='copy-location'){const t=state.trees.find(x=>x.id===state.selected);if(t)navigator.clipboard?.writeText(t.latitude+', '+t.longitude).then(()=>toast('Koordinaten kopiert.')).catch(()=>toast('Kopieren nicht möglich.'));}
});
document.addEventListener('input',e=>{if(e.target.id==='search'){state.search=e.target.value;const field=document.activeElement;const caret=field.selectionStart;render();const newInput=$('#search');if(newInput){newInput.focus();newInput.setSelectionRange(caret,caret);}}});
document.addEventListener('submit',async e=>{
  if(!['tree-form','auth-form','profile-form','comment-form'].includes(e.target.id))return;
  e.preventDefault();
  try{if(e.target.id==='tree-form')await submitTree(e.target);
      if(e.target.id==='auth-form')await submitAuth(e.target);
      if(e.target.id==='profile-form')await submitProfile(e.target);
      if(e.target.id==='comment-form')await submitComment(e.target);}
  catch(error){toast(error.message||'Ein Fehler ist aufgetreten.');}
});
init();
