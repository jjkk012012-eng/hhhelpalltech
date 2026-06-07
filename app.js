(() => {
  'use strict';

  const C = { id:0, name:1, sido:2, sigungu:3, address:4, employees:5, product:6, material:7, size:8, industry:9, category:10, search:11 };
  const fmt = new Intl.NumberFormat('ko-KR');
  const $ = id => document.getElementById(id);
  const manifest = () => window.FR_MANIFEST || { regions:[], total:0 };
  const EMBEDDED_GOOGLE_KEY = 'AIzaSyDYKuHA0iNB-3q0cC1GFBL_4GVirH44DKw';

  const VEHICLES = {
    bike:{ label:'오토바이/소형', base:9000, km:620, minute:100, min:12000, speed:34 },
    damas:{ label:'다마스·라보', base:22000, km:920, minute:170, min:28000, speed:38 },
    '1t':{ label:'1톤 트럭', base:30000, km:1150, minute:210, min:38000, speed:42 },
    '2_5t':{ label:'2.5톤 트럭', base:52000, km:1650, minute:290, min:65000, speed:40 },
    '5t':{ label:'5톤 트럭', base:85000, km:2350, minute:400, min:105000, speed:38 },
    '11t':{ label:'11톤 트럭', base:130000, km:3400, minute:600, min:160000, speed:36 }
  };
  const MODES = {
    delivery:{ label:'공장 → 내 주소 배송', mul:1 },
    oneway:{ label:'내 주소 → 공장 편도', mul:1 },
    roundtrip:{ label:'내 주소 ↔ 공장 왕복', mul:2 }
  };

  const SYN = {
    판금:['판금','절곡','레이저','샤링','철판','스텐','스테인리스','금속판','판제품','함석','브라켓','케이스','콘솔','박판','금속케이스','금속상자'],
    cnc:['cnc','CNC','mct','MCT','머시닝','머시닝센터','선반','밀링','절삭','정밀가공','복합가공','금속가공'],
    금형:['금형','주형','몰드','mold','사출금형','프레스금형','다이'],
    도금:['도금','표면처리','코팅','아노다이징','도장','분체','크롬','니켈','전착'],
    사출:['사출','사출성형','플라스틱사출','고무사출','성형','압출','플라스틱'],
    용접:['용접','제관','철구조물','구조물','금속구조','프레임'],
    알루미늄:['알루미늄','al','AL','비철','압출','다이캐스팅','주조'],
    pcb:['pcb','PCB','인쇄회로','회로기판','SMT','smt','실장','전자부품'],
    배전반:['배전반','제어반','전기제어','자동제어','분전반','수배전반'],
    포장:['포장','박스','골판지','필름','용기','라벨','파렛트']
  };

  const PLACE_HINTS = [
    { names:['동탄','화성시 동탄','동탄신도시'], sido:'경기도', sigungu:'화성시', lat:37.1995, lng:127.0988 },
    { names:['남양주','남양주시','경기도 남양주시'], sido:'경기도', sigungu:'남양주시', lat:37.6360, lng:127.2165 },
    { names:['진접','진접읍','남양주시 진접읍'], sido:'경기도', sigungu:'남양주시', lat:37.7258, lng:127.1891 },
    { names:['오남','오남읍','남양주시 오남읍'], sido:'경기도', sigungu:'남양주시', lat:37.6981, lng:127.2044 },
    { names:['화도','화도읍','마석','남양주시 화도읍'], sido:'경기도', sigungu:'남양주시', lat:37.6529, lng:127.3074 },
    { names:['시화산단','시화공단','정왕동','시흥시 정왕동'], sido:'경기도', sigungu:'시흥시', lat:37.3434, lng:126.7388 },
    { names:['남동공단','남동산단','인천 남동구'], sido:'인천광역시', sigungu:'남동구', lat:37.4077, lng:126.6942 },
    { names:['부산항'], sido:'부산광역시', sigungu:'중구', lat:35.1040, lng:129.0403 },
    { names:['평택항'], sido:'경기도', sigungu:'평택시', lat:36.9655, lng:126.8456 },
    { names:['김해','김해시'], sido:'경상남도', sigungu:'김해시', lat:35.2285, lng:128.8892 }
  ];

  const state = {
    provider: localStorage.getItem('fr10.provider') || 'google',
    googleKey: localStorage.getItem('fr10.googleKey') || EMBEDDED_GOOGLE_KEY,
    naverId: localStorage.getItem('fr10.naverId') || '',
    naverSecret: localStorage.getItem('fr10.naverSecret') || '',
    mapKind: 'leaflet', map: null, markers: [], originMarker: null,
    origin: null, loaded: new Set(), rows: [], candidates: [], selected: null,
    maxGeocode: Number(localStorage.getItem('fr10.maxGeocode') || 20),
    maxDistance: Number(localStorage.getItem('fr10.maxDistance') || 20),
    geocodeCache: readJSON('fr10.geocodeCache', {}), distanceCache: readJSON('fr10.distanceCache', {})
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init(){
    bind();
    initApiDialog();
    await setupMap();
    setStatus(`데이터는 ${fmt.format(manifest().total)}건입니다. 검색할 지역 데이터만 불러오고, API 호출은 상위 ${state.maxGeocode}건으로 제한합니다.`);
    updateSummary('-', 0, 0, '-');
  }

  function bind(){
    $('searchForm').addEventListener('submit', e => { e.preventDefault(); runSearch(); });
    $('sortSelect').addEventListener('change', () => { sortCandidates(); renderResults(); });
    $('modeSelect').addEventListener('change', refreshCosts);
    $('vehicleSelect').addEventListener('change', refreshCosts);
    const apiOpen = $('apiOpen'); if(apiOpen) apiOpen.addEventListener('click', () => $('apiDialog')?.showModal());
    const apiSave = $('apiSave'); if(apiSave) apiSave.addEventListener('click', saveApi);
    const clearCache = $('clearCache'); if(clearCache) clearCache.addEventListener('click', () => { localStorage.removeItem('fr10.geocodeCache'); localStorage.removeItem('fr10.distanceCache'); state.geocodeCache={}; state.distanceCache={}; alert('좌표/거리 캐시를 삭제했습니다.'); });
    document.querySelectorAll('.chip[data-demo-k]').forEach(btn => btn.addEventListener('click', () => {
      $('keywordInput').value = btn.dataset.demoK; $('originInput').value = btn.dataset.demoO; runSearch();
    }));
  }

  function initApiDialog(){
    if(!$('googleKey')) return;
    $('googleKey').value = state.googleKey; $('naverId').value = state.naverId; $('naverSecret').value = state.naverSecret; $('maxGeocode').value = state.maxGeocode; $('maxDistance').value = state.maxDistance;
    const r = document.querySelector(`input[name=provider][value="${state.provider}"]`); if(r) r.checked = true;
  }

  async function saveApi(){
    state.provider = document.querySelector('input[name=provider]:checked')?.value || 'google';
    state.googleKey = $('googleKey').value.trim(); state.naverId = $('naverId').value.trim(); state.naverSecret = $('naverSecret').value.trim();
    state.maxGeocode = clamp(Number($('maxGeocode').value || 20), 5, 80);
    state.maxDistance = clamp(Number($('maxDistance').value || 20), 5, 50);
    localStorage.setItem('fr10.provider', state.provider); localStorage.setItem('fr10.googleKey', state.googleKey); localStorage.setItem('fr10.naverId', state.naverId); localStorage.setItem('fr10.naverSecret', state.naverSecret); localStorage.setItem('fr10.maxGeocode', state.maxGeocode); localStorage.setItem('fr10.maxDistance', state.maxDistance);
    $('apiDialog')?.close(); await setupMap(true); setStatus('지도 설정을 저장했습니다. 다시 검색하면 좌표를 새로 확인합니다.');
  }

  async function setupMap(force=false){
    if(force && state.map){ clearMapDom(); }
    if(state.provider === 'google' && state.googleKey){
      try { await loadGoogle(); initGoogleMap(); return; } catch(e){ console.warn(e); }
    }
    if(state.provider === 'naver' && state.naverId){
      try { await loadNaver(); initNaverMap(); return; } catch(e){ console.warn(e); }
    }
    initLeafletMap();
  }

  function clearMapDom(){ $('map').innerHTML=''; state.map=null; state.markers=[]; state.originMarker=null; }
  function initLeafletMap(){
    state.mapKind='leaflet';
    if(!window.L){ $('mapNote').textContent='지도 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.'; return; }
    state.map = L.map('map', { zoomControl:true }).setView([36.5,127.8],7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap'}).addTo(state.map);
    $('mapNote').textContent='지도와 주소 좌표화를 준비했습니다. 검색 결과 중 좌표 확인된 공장만 지도에 표시합니다.';
  }
  function initGoogleMap(){
    state.mapKind='google';
    state.map = new google.maps.Map($('map'), { center:{lat:36.5,lng:127.8}, zoom:7, mapTypeControl:false, streetViewControl:false, fullscreenControl:false });
    $('mapNote').textContent='Google Maps API 사용 중: 주소 좌표화와 도로 거리/시간 계산을 우선 사용합니다.';
  }
  function initNaverMap(){
    state.mapKind='naver';
    state.map = new naver.maps.Map('map', { center:new naver.maps.LatLng(36.5,127.8), zoom:7 });
    $('mapNote').textContent='Naver Maps API 사용 중: 국내 주소 좌표화를 우선 사용합니다.';
  }
  function loadGoogle(){
    if(window.google?.maps) return Promise.resolve();
    return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(state.googleKey)}&libraries=places`; s.async=true; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); });
  }
  function loadNaver(){
    if(window.naver?.maps) return Promise.resolve();
    return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(state.naverId)}&submodules=geocoder`; s.async=true; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); });
  }

  async function runSearch(){
    const keyword = $('keywordInput').value.trim(); const originText = $('originInput').value.trim();
    if(!keyword){ alert('검색어를 입력하세요. 예: 판금, CNC, 금형'); return; }
    if(!originText){ alert('기준 주소를 입력하세요. 예: 남양주시 진접읍, 동탄 몇 번지'); return; }
    clearResults(); setStatus('지역을 찾고 데이터를 불러오는 중입니다…'); showLoader();
    const region = detectRegion(originText);
    if(!region){
      hideLoader();
      setStatus('주소에서 시군구를 찾지 못했습니다. 예: 남양주시, 화성시 동탄, 시흥시 정왕동처럼 시군구를 포함해 입력해 주세요.');
      renderEmpty('지역을 찾지 못했습니다', '정확하고 빠른 검색을 위해 기준 주소에 시군구를 포함해 주세요.');
      return;
    }
    updateSummary(`${region.sido} ${region.sigungu}`, 0, 0, '-');
    await loadRegion(region.slug);
    const rows = window.FR_SHARDS?.[region.slug] || [];
    state.rows = rows;
    setStatus(`${region.sido} ${region.sigungu} 데이터 ${fmt.format(rows.length)}건에서 '${keyword}' 검색 중…`);
    const origin = await resolveOrigin(originText, region);
    state.origin = origin;
    placeOrigin(origin, originText);
    let candidates = searchRows(rows, keyword).slice(0, 250);
    state.candidates = candidates;
    sortCandidates();
    renderKeywordChips(candidates, keyword);
    renderResults();
    updateSummary(`${region.sido} ${region.sigungu}`, candidates.length, 0, '-');
    if(candidates.length===0){
      setStatus(`'${keyword}' 결과가 없습니다. 생산품/원자재/업종명 기준으로도 검색했습니다. 다른 단어를 입력해 보세요.`); hideLoader(); return;
    }
    setStatus(`${fmt.format(candidates.length)}건을 찾았습니다. 비용 방지를 위해 상위 ${state.maxGeocode}건만 좌표화합니다…`);
    await geocodeTop(candidates.slice(0, state.maxGeocode));
    await computeRoadDistances(state.candidates.filter(c=>c.lat&&c.lng).slice(0,state.maxDistance));
    recomputeCosts(); sortCandidates(); renderResults(); fitMap(); selectCandidate(state.candidates.find(c=>c.lat&&c.lng) || state.candidates[0]);
    const mapped = state.candidates.filter(c=>c.lat&&c.lng).length;
    const cheapest = state.candidates.filter(c=>Number.isFinite(c.cost)).sort((a,b)=>a.cost-b.cost)[0];
    updateSummary(`${region.sido} ${region.sigungu}`, candidates.length, mapped, cheapest ? money(cheapest.cost) : '-');
    setStatus(`${fmt.format(candidates.length)}건 검색 완료. 지도에는 좌표 확인된 ${mapped}건만 표시했습니다.`);
    hideLoader();
  }

  function detectRegion(text){
    const n = normalize(text);
    const hints = PLACE_HINTS.find(p => p.names.some(name => n.includes(normalize(name))));
    if(hints){
      const found = manifest().regions.find(r => r.sido===hints.sido && r.sigungu===hints.sigungu);
      if(found) return { ...found, hint:hints };
    }
    const candidates=[];
    for(const r of manifest().regions){
      const strings=[r.sido+r.sigungu, r.sigungu, ...(r.aliases||[])];
      let best=0;
      for(const s of strings){ const ns=normalize(s); if(ns && n.includes(ns)) best=Math.max(best, ns.length); }
      if(best) candidates.push({ ...r, match:best });
    }
    candidates.sort((a,b)=>b.match-a.match || b.count-a.count);
    return candidates[0] || null;
  }

  function loadRegion(slug){
    if(state.loaded.has(slug) || window.FR_SHARDS?.[slug]) return Promise.resolve();
    return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=`data/regions/${slug}.js`; s.onload=()=>{state.loaded.add(slug); resolve();}; s.onerror=()=>reject(new Error('region load failed')); document.head.appendChild(s); });
  }

  function searchRows(rows, keyword){
    const raw = keyword.trim();
    const base = normalize(raw.replace(/공장|업체|회사|제조|찾아줘|검색/g,'')) || normalize(raw);
    const terms = expandTerms(base, raw);
    const out=[];
    for(const r of rows){
      const sx = r[C.search];
      let score = 0; let reasons=[];
      const name = r[C.name] || '', prod = r[C.product] || '', mat = r[C.material] || '', ind = r[C.industry] || '', cat = r[C.category] || '';
      const exactRaw = raw.replace(/\s+/g,'');
      if(exactRaw && prod.includes(exactRaw)){ score += 70; reasons.push(`생산품 '${exactRaw}' 정확일치`); }
      if(exactRaw && name.includes(exactRaw)){ score += 55; reasons.push(`회사명 '${exactRaw}' 포함`); }
      if(exactRaw && ind.includes(exactRaw)){ score += 45; reasons.push(`업종 '${exactRaw}' 포함`); }
      if(exactRaw && mat.includes(exactRaw)){ score += 35; reasons.push(`원자재 '${exactRaw}' 포함`); }
      if(exactRaw && cat.includes(exactRaw)){ score += 30; reasons.push(`생산품 카테고리 '${exactRaw}' 포함`); }
      if(base && sx.includes(base)){ score += 40; if(!reasons.length) reasons.push(`검색어 '${raw}' 일치`); }
      let synHits=[];
      for(const t of terms.syn){ if(t && sx.includes(t)){ score += 11; synHits.push(t); if(synHits.length>=4) break; } }
      if(synHits.length) reasons.push(`관련어 ${synHits.slice(0,3).join(', ')} 포함`);
      if(score<=0) continue;
      const emp = r[C.employees] || 0; score += Math.min(10, Math.log10(emp+1)*4);
      if((r[C.size]||'').includes('중기업')) score += 3; if((r[C.size]||'').includes('대기업')) score += 6;
      out.push({ row:r, score:Math.round(score), reasons:[...new Set(reasons)].slice(0,4), lat:null, lng:null, km:null, minutes:null, cost:null });
    }
    out.sort((a,b)=>b.score-a.score || (b.row[C.employees]||0)-(a.row[C.employees]||0));
    return out;
  }

  function expandTerms(base, raw){
    const syn = new Set([base]);
    const low = raw.toLowerCase();
    for(const [k,vals] of Object.entries(SYN)){
      if(low.includes(k.toLowerCase()) || normalize(k)===base || vals.some(v=>normalize(v)===base || low.includes(String(v).toLowerCase()))){
        vals.forEach(v=>syn.add(normalize(v)));
      }
    }
    return { base, syn:[...syn].filter(Boolean) };
  }

  async function resolveOrigin(text, region){
    const cached = state.geocodeCache['origin:'+text]; if(cached) return cached;
    let pos = null;
    if(hasGeocoder()) pos = await geocode(text);
    if(!pos && region.hint) pos = { lat:region.hint.lat, lng:region.hint.lng, approx:true };
    if(!pos) pos = { lat:36.5, lng:127.8, approx:true };
    state.geocodeCache['origin:'+text] = pos; saveCache(); return pos;
  }

  function hasGeocoder(){ return (state.mapKind==='google' && window.google?.maps?.Geocoder) || (state.mapKind==='naver' && window.naver?.maps?.Service); }

  function geocode(address){
    const key = 'geo:'+address;
    if(state.geocodeCache[key]) return Promise.resolve(state.geocodeCache[key]);
    if(state.mapKind==='google' && window.google?.maps?.Geocoder){
      return new Promise(resolve => {
        const gc = new google.maps.Geocoder();
        gc.geocode({ address, region:'KR', componentRestrictions:{ country:'KR' } }, (res,status) => {
          if(status==='OK' && res?.[0]){ const loc=res[0].geometry.location; const p={lat:loc.lat(),lng:loc.lng(),provider:'google'}; state.geocodeCache[key]=p; saveCache(); resolve(p); } else resolve(null);
        });
      });
    }
    if(state.mapKind==='naver' && window.naver?.maps?.Service){
      return new Promise(resolve => {
        naver.maps.Service.geocode({ query:address }, (status,response) => {
          if(status===naver.maps.Service.Status.OK && response.v2?.addresses?.[0]){ const a=response.v2.addresses[0]; const p={lat:Number(a.y),lng:Number(a.x),provider:'naver'}; state.geocodeCache[key]=p; saveCache(); resolve(p); } else resolve(null);
        });
      });
    }
    return Promise.resolve(null);
  }

  async function geocodeTop(items){
    clearMarkers();
    const top = items.slice(0, state.maxGeocode);
    for(let i=0;i<top.length;i++){
      const c = top[i];
      const addr = c.row[C.address];
      if(!addr) continue;
      const p = await geocode(addr);
      if(p){ c.lat=p.lat; c.lng=p.lng; addFactoryMarker(c); }
      if(i%4===0){ renderResults(); await sleep(60); }
    }
  }


  async function computeRoadDistances(items){
    if(!state.origin || !items.length) return;
    if(state.mapKind==='google' && window.google?.maps?.DistanceMatrixService){
      const svc = new google.maps.DistanceMatrixService();
      const destinations = items.map(c => ({ lat:c.lat, lng:c.lng }));
      await new Promise(resolve => {
        svc.getDistanceMatrix({
          origins:[{ lat:state.origin.lat, lng:state.origin.lng }],
          destinations,
          travelMode:google.maps.TravelMode.DRIVING,
          unitSystem:google.maps.UnitSystem.METRIC,
          avoidHighways:false,
          avoidTolls:false
        }, (res,status) => {
          if(status==='OK' && res?.rows?.[0]?.elements){
            res.rows[0].elements.forEach((el,i)=>{
              if(el.status==='OK'){
                items[i].roadKm = el.distance.value/1000;
                items[i].roadMinutes = el.duration.value/60;
              }
            });
          }
          resolve();
        });
      });
    }
  }

  function recomputeCosts(){
    const origin = state.origin; if(!origin) return;
    for(const c of state.candidates){
      if(c.lat && c.lng){
        const km = c.roadKm || haversine(origin.lat, origin.lng, c.lat, c.lng) * 1.28;
        c.km = km;
        const v = VEHICLES[$('vehicleSelect').value];
        c.minutes = c.roadMinutes || Math.max(6, (km / v.speed) * 60 + 6);
        c.cost = calcCost(km, c.minutes);
      } else { c.km=null; c.minutes=null; c.cost=null; }
    }
  }
  function refreshCosts(){ recomputeCosts(); sortCandidates(); renderResults(); renderSelected(); const cheapest = state.candidates.filter(c=>Number.isFinite(c.cost)).sort((a,b)=>a.cost-b.cost)[0]; updateSummary($('sumRegion').textContent, state.candidates.length, state.candidates.filter(c=>c.lat&&c.lng).length, cheapest?money(cheapest.cost):'-'); }
  function calcCost(km, minutes){
    const v=VEHICLES[$('vehicleSelect').value], m=MODES[$('modeSelect').value];
    const raw = (v.base + km*v.km + minutes*v.minute) * m.mul;
    return Math.max(v.min, raw);
  }
  function sortCandidates(){
    const s=$('sortSelect').value;
    state.candidates.sort((a,b)=>{
      if(s==='cost') return val(a.cost)-val(b.cost) || b.score-a.score;
      if(s==='time') return val(a.minutes)-val(b.minutes) || b.score-a.score;
      if(s==='emp') return (b.row[C.employees]||0)-(a.row[C.employees]||0) || b.score-a.score;
      return b.score-a.score || val(a.minutes)-val(b.minutes);
    });
  }
  function val(x){ return Number.isFinite(x) ? x : 999999999; }

  function renderResults(){
    const box=$('results');
    const list=state.candidates.slice(0,80);
    if(!list.length){ renderEmpty('검색 결과 없음', '입력한 단어가 생산품, 원자재, 업종명, 회사명에 있는지 확인해 주세요.'); return; }
    box.innerHTML=list.map((c,idx)=>{
      const r=c.row; const active=state.selected===c?' active':'';
      const reasons=(c.reasons||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
      return `<article class="result${active}" data-idx="${idx}">
        <div class="result-top"><h3>${esc(r[C.name] || '회사명 미상')}</h3><span class="badge">추천 ${Math.round(c.score)}점</span></div>
        <p class="meta">${esc(r[C.address])}<br>${esc(r[C.industry])} · 종업원 ${fmt.format(r[C.employees]||0)}명</p>
        <div class="tags"><span class="tag">${esc(r[C.category])}</span>${reasons}</div>
        <div class="cost-line">
          <div><span>거리</span><b>${c.km?c.km.toFixed(1)+'km':'좌표 확인 전'}</b></div>
          <div><span>시간</span><b>${c.minutes?Math.round(c.minutes)+'분':'-'}</b></div>
          <div><span>예상비</span><b>${c.cost?money(c.cost):'-'}</b></div>
        </div>
      </article>`;
    }).join('');
    box.querySelectorAll('.result').forEach(el=>el.addEventListener('click',()=>selectCandidate(list[Number(el.dataset.idx)])));
  }
  function renderEmpty(title, desc){ $('results').innerHTML=`<div class="empty"><b>${esc(title)}</b><br>${esc(desc)}</div>`; }
  function renderKeywordChips(candidates, current){
    const counter = new Map();
    for(const c of candidates.slice(0,120)){
      String(c.row[C.product]||'').split(/[,/·\s()]+/).forEach(w=>{ if(w.length>=2 && w.length<=10 && !normalize(current).includes(normalize(w))) counter.set(w,(counter.get(w)||0)+1); });
    }
    const chips=[...counter.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    $('keywordChips').innerHTML=chips.map(([w,n])=>`<button class="small-chip" data-k="${esc(w)}">${esc(w)} ${n}</button>`).join('');
    $('keywordChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ $('keywordInput').value=b.dataset.k; runSearch(); }));
  }

  function selectCandidate(c){
    state.selected=c; renderResults(); renderSelected();
    if(c?.lat&&c?.lng){ panTo(c.lat,c.lng,15); }
  }
  function renderSelected(){
    const c=state.selected;
    if(!c){ $('selectedName').textContent='공장을 선택하세요'; $('selectedAddress').textContent='검색 결과에서 공장을 누르면 편도·왕복·주문배송 비용을 보여줍니다.'; ['selectedDistance','selectedTime','selectedCost','selectedProduct'].forEach(id=>$(id).textContent='-'); return; }
    const r=c.row; $('selectedName').textContent=r[C.name]||'회사명 미상'; $('selectedAddress').textContent=r[C.address]||'-';
    $('selectedDistance').textContent=c.km?`${c.km.toFixed(1)}km`:'좌표 확인 전'; $('selectedTime').textContent=c.minutes?`${Math.round(c.minutes)}분`:'-'; $('selectedCost').textContent=c.cost?money(c.cost):'-'; $('selectedProduct').textContent=r[C.product]||r[C.category]||'-';
  }

  function placeOrigin(pos, label){
    if(!pos) return;
    if(state.originMarker){ removeMarker(state.originMarker); }
    if(state.mapKind==='google'){
      state.originMarker = new google.maps.Marker({ map:state.map, position:{lat:pos.lat,lng:pos.lng}, title:label, icon:{ path:google.maps.SymbolPath.CIRCLE, scale:9, fillColor:'#155eef', fillOpacity:1, strokeColor:'#fff', strokeWeight:3 }});
      state.map.setCenter({lat:pos.lat,lng:pos.lng}); state.map.setZoom(12);
    } else if(state.mapKind==='naver'){
      state.originMarker = new naver.maps.Marker({ map:state.map, position:new naver.maps.LatLng(pos.lat,pos.lng), title:label }); state.map.setCenter(new naver.maps.LatLng(pos.lat,pos.lng)); state.map.setZoom(12);
    } else if(window.L && state.map){
      state.originMarker = L.marker([pos.lat,pos.lng], { title:label }).addTo(state.map).bindPopup(`<b>기준 위치</b><br>${esc(label)}`); state.map.setView([pos.lat,pos.lng],12);
    }
  }
  function addFactoryMarker(c){
    const r=c.row; const html=`<b>${esc(r[C.name])}</b><br>${esc(r[C.address])}<br>${esc(r[C.product]||r[C.category])}`;
    let m;
    if(state.mapKind==='google'){
      m=new google.maps.Marker({ map:state.map, position:{lat:c.lat,lng:c.lng}, title:r[C.name] }); const iw=new google.maps.InfoWindow({content:html}); m.addListener('click',()=>{iw.open({map:state.map,anchor:m}); selectCandidate(c);});
    } else if(state.mapKind==='naver'){
      m=new naver.maps.Marker({ map:state.map, position:new naver.maps.LatLng(c.lat,c.lng), title:r[C.name] }); const iw=new naver.maps.InfoWindow({content:`<div style="padding:10px">${html}</div>`}); naver.maps.Event.addListener(m,'click',()=>{iw.open(state.map,m); selectCandidate(c);});
    } else if(window.L && state.map){
      m=L.marker([c.lat,c.lng],{title:r[C.name]}).addTo(state.map).bindPopup(html); m.on('click',()=>selectCandidate(c));
    }
    state.markers.push(m);
  }
  function clearMarkers(){ state.markers.forEach(removeMarker); state.markers=[]; }
  function removeMarker(m){ if(!m) return; if(state.mapKind==='google') m.setMap(null); else if(state.mapKind==='naver') m.setMap(null); else if(state.map?.removeLayer) state.map.removeLayer(m); }
  function panTo(lat,lng,zoom){ if(state.mapKind==='google'){ state.map.panTo({lat,lng}); state.map.setZoom(zoom); } else if(state.mapKind==='naver'){ state.map.panTo(new naver.maps.LatLng(lat,lng)); state.map.setZoom(zoom); } else state.map?.setView([lat,lng],zoom); }
  function fitMap(){
    const pts = state.candidates.filter(c=>c.lat&&c.lng).slice(0,state.maxGeocode).map(c=>[c.lat,c.lng]); if(state.origin) pts.push([state.origin.lat,state.origin.lng]); if(!pts.length) return;
    if(state.mapKind==='google'){ const b=new google.maps.LatLngBounds(); pts.forEach(p=>b.extend({lat:p[0],lng:p[1]})); state.map.fitBounds(b); }
    else if(state.mapKind==='naver'){ const b=new naver.maps.LatLngBounds(); pts.forEach(p=>b.extend(new naver.maps.LatLng(p[0],p[1]))); state.map.fitBounds(b); }
    else if(state.map?.fitBounds){ state.map.fitBounds(pts, { padding:[30,30] }); }
  }

  function clearResults(){ state.candidates=[]; state.selected=null; $('results').innerHTML=''; $('keywordChips').innerHTML=''; renderSelected(); clearMarkers(); }
  function showLoader(){ $('results').innerHTML='<div class="loader"></div><div class="empty">검색 중입니다. 지역별 데이터만 불러와 속도를 개선했습니다.</div>'; }
  function hideLoader(){ const l=document.querySelector('.loader'); if(l) l.remove(); }
  function setStatus(t){ $('status').textContent=t; }
  function updateSummary(region, found, mapped, cheapest){ $('sumRegion').textContent=region; $('sumFound').textContent=fmt.format(found||0); $('sumMapped').textContent=fmt.format(mapped||0); $('sumCheapest').textContent=cheapest||'-'; }
  function saveCache(){ try{ localStorage.setItem('fr10.geocodeCache', JSON.stringify(limitObj(state.geocodeCache,2000))); localStorage.setItem('fr10.distanceCache', JSON.stringify(limitObj(state.distanceCache,2000))); }catch(e){} }
  function limitObj(o,n){ const entries=Object.entries(o); return Object.fromEntries(entries.slice(Math.max(0, entries.length-n))); }
  function readJSON(k,f){ try{return JSON.parse(localStorage.getItem(k)||'')||f;}catch{return f;} }
  function normalize(s){ return String(s||'').normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]+/g,''); }
  function esc(s){ return String(s??'').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function haversine(lat1,lng1,lat2,lng2){ const R=6371, toRad=d=>d*Math.PI/180; const dLat=toRad(lat2-lat1), dLng=toRad(lng2-lng1); const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2; return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
  function money(n){ return `${fmt.format(Math.round(n/1000)*1000)}원`; }
  function clamp(n,min,max){ return Math.min(max, Math.max(min, Number.isFinite(n)?n:min)); }
  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
})();
