console.log('reby.js loaded');
const socket = io();

// ------------------- ELEMENTS -------------------
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const app = document.getElementById('app');
const heading = document.getElementById('heading');
const messagesDiv = document.querySelector('.messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.querySelector('.typingIndicator');
const membersList = document.getElementById('membersList');
const menuDots = document.getElementById('menuDots');
const menuPopup = document.getElementById('menuPopup');
const createRoomBtn = document.getElementById('createRoom');
const joinRoomBtn = document.getElementById('joinRoom');
const leaveRoomBtn = document.getElementById('leaveRoom');
const toggleMusicBtn = document.getElementById('toggleMusic');

// ------------------- MUSIC -------------------
const playlist = ["https://files.catbox.moe/6ywqzp.mp4","https://files.catbox.moe/hjv93p.mp4"];
let currentTrack = 0;
let musicEnabled = true;
const audioPlayer = new Audio();
audioPlayer.volume = 1.0; audioPlayer.preload="auto";
audioPlayer.addEventListener("ended",()=>{currentTrack=(currentTrack+1)%playlist.length; audioPlayer.src=playlist[currentTrack]; if(musicEnabled) audioPlayer.play().catch(()=>{}); });
function startMusic(){ if(!musicEnabled) return; audioPlayer.src=playlist[currentTrack]; audioPlayer.play().catch(()=>{}); }
function stopMusic(){ audioPlayer.pause(); audioPlayer.currentTime=0; }
if(toggleMusicBtn){ toggleMusicBtn.textContent = musicEnabled?"🎵 Music: ON":"🎵 Music: OFF"; toggleMusicBtn.addEventListener("click",()=>{ musicEnabled=!musicEnabled; toggleMusicBtn.textContent=musicEnabled?"🎵 Music: ON":"🎵 Music: OFF"; if(musicEnabled && currentRoom!=='global') startMusic(); else stopMusic(); }); }

// ------------------- SLIDESHOW -------------------
const privateImages=[
"https://files.catbox.moe/o0pz80.jpg",
"https://files.catbox.moe/4qh6us.jpg",
"https://files.catbox.moe/kgw098.jpg",
"https://files.catbox.moe/fsu3vn.jpg",
"https://files.catbox.moe/zfxeiw.jpg",
"https://files.catbox.moe/8no4gd.jpg",
"https://files.catbox.moe/8ejol5.jpg",
"https://files.catbox.moe/t5jjur.jpg"
];
let slideIndex=0,slideInterval=null,showingA=true;
const slideA=document.getElementById("slide1");
const slideB=document.getElementById("slide2");
function startSlideshow(){ stopSlideshow(); slideA.style.backgroundImage=`url('${privateImages[0]}')`; slideB.style.backgroundImage=`url('${privateImages[1]}')`; slideIndex=1; slideInterval=setInterval(()=>{const next=privateImages[(slideIndex+1)%privateImages.length]; if(showingA){ slideB.style.backgroundImage=`url('${next}')`; slideB.classList.add("top"); slideA.classList.remove("top"); } else { slideA.style.backgroundImage=`url('${next}')`; slideA.classList.add("top"); slideB.classList.remove("top"); } showingA=!showingA; slideIndex=(slideIndex+1)%privateImages.length; },30000);}
function stopSlideshow(){ clearInterval(slideInterval); slideInterval=null; if(slideA) slideA.classList.add("top"); if(slideB) slideB.classList.remove("top"); slideA.style.backgroundImage=""; slideB.style.backgroundImage=""; }

// ------------------- CHAT -------------------
let username=''; let currentRoom='global'; let typingTimer=null;
function showApp(){ document.querySelector('.overlay')?.classList.add('hidden'); app.classList.remove('hidden'); }
function showOverlay(){ document.querySelector('.overlay')?.classList.remove('hidden'); app.classList.add('hidden'); }
function appendMessage(type,payload){ const el=document.createElement('div'); if(type==='system'){ el.className='system wobble'; el.textContent=payload; } else { const me=payload.name===username; el.className=me?'message msg-right':'message msg-left'; el.innerHTML=`<div class="meta">${payload.name}</div><div class="body">${payload.text}</div>`; } messagesDiv.appendChild(el); messagesDiv.scrollTop=messagesDiv.scrollHeight; }

joinBtn.addEventListener('click',()=>{ const v=nameInput.value.trim(); if(!v) return alert('Enter your name'); username=v; localStorage.setItem('chat_name',username); showApp(); socket.emit('joinGlobal',username); });
nameInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter') joinBtn.click(); });

function sendMessage(){ const text=messageInput.value.trim(); if(!text) return; socket.emit('chatMessage',{room:currentRoom,name:username,msg:text}); messageInput.value=''; socket.emit('stopTyping',{name:username,room:currentRoom}); }
sendBtn.addEventListener('click',sendMessage);
messageInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); } });
messageInput.addEventListener('input',()=>{ if(!username) return; socket.emit('typing',{name:username,room:currentRoom}); clearTimeout(typingTimer); typingTimer=setTimeout(()=>socket.emit('stopTyping',{name:username,room:currentRoom}),1200); });

menuDots?.addEventListener('click',(e)=>{ e.stopPropagation(); menuPopup?.classList.toggle('hidden'); });
window.addEventListener('click',(e)=>{ if(!menuPopup?.contains(e.target)&&!menuDots?.contains(e.target)) menuPopup?.classList.add('hidden'); });

createRoomBtn?.addEventListener('click',()=>{ if(!username) return alert('Join first'); socket.emit('createRoom',username); });
joinRoomBtn?.addEventListener('click',()=>{ if(!username) return alert('Join first'); const pin=prompt('Enter 4-digit PIN to join:'); if(pin) socket.emit('joinRoom',{name:username,code:pin.trim()}); });
leaveRoomBtn?.addEventListener('click',()=>{ if(!username) return; socket.emit('leaveRoom',{name:username,room:currentRoom}); currentRoom='global'; heading.textContent='AVARATHAM PARAYUKA POVUKA ✨'; stopSlideshow(); document.body.style.backgroundImage="url('https://files.catbox.moe/3jvej7.jpg')"; musicEnabled=false; stopMusic(); socket.emit('requestActive','global'); socket.emit('clearChat'); });

// ------------------- SOCKET EVENTS -------------------
socket.on('connect',()=>{ console.log('[client] connected',socket.id); showOverlay(); });
socket.on('message',(data)=>{ if(!data) return; if(data.type==='system') appendMessage('system',data.msg); else if(data.type==='chat') appendMessage('chat',{name:data.name,text:data.msg}); });
socket.on('updateMembers',(members)=>{ membersList.innerHTML=''; members.forEach(m=>{ const li=document.createElement('li'); li.innerHTML=`<span class="dot"></span> ${m}`; membersList.appendChild(li); }); });
socket.on('displayTyping',(name)=>{ typingIndicator.textContent=`${name} is typing...`; typingIndicator.classList.add('show'); });
socket.on('hideTyping',()=>{ typingIndicator.classList.remove('show'); typingIndicator.textContent=''; });

socket.on('roomCreated',(code)=>{ alert('Your Room Code: '+code+' ✨'); currentRoom=code; musicEnabled=true; if(toggleMusicBtn) toggleMusicBtn.textContent="🎵 Music: ON"; startMusic(); startSlideshow(); heading.textContent='MOOD ALLEEE'; leaveRoomBtn.classList.remove('hidden'); socket.emit('requestActive',code); socket.emit('clearChat'); });
socket.on('roomJoined',(code)=>{ currentRoom=code; musicEnabled=true; if(toggleMusicBtn) toggleMusicBtn.textContent="🎵 Music: ON"; startMusic(); startSlideshow(); heading.textContent='MOOD ALLEEE'; leaveRoomBtn.classList.remove('hidden'); socket.emit('requestActive',code); socket.emit('clearChat'); });
socket.on('clearChat',()=>{ messagesDiv.innerHTML=''; });
socket.on('debug',(m)=>console.log('[debug]',m));
socket.on('connect_error',(err)=>console.error('connect_error',err));
