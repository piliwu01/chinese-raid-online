import PlayPanel from './PlayPanel.jsx';
import LuckyPanel from './LuckyPanel.jsx';
import AtmoLayer from './Atmosphere.jsx';
import EncounterIntro from './EncounterIntro.jsx';
import ChapterMap from './ChapterMap.jsx';
import {atmosphere} from './atmosphere.js';
import {chapterById} from '../shared/chapters.js';
import {setFor} from '../shared/play.js';
import SpiritDetail from './SpiritDetail.jsx';
import {REGIONS,ALL_SPIRITS,SPIRIT_BY_ID} from '../shared/catalog.js';
import AiTutor from './AiTutor.jsx';
import {motionFor,idleStyle} from './fx.js';
import SceneBg from './SceneBg.jsx';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { effectiveness } from '../shared/typechart.js';
import DupeChoice from './DupeChoice.jsx';
import BreakBar from './BreakBar.jsx';
import { passiveFor } from '../shared/passives.js';
import ItemShop from './ItemShop.jsx';
import { TrackPlayer, TRACKS } from './bgm.js';
import CompanionPanel from './CompanionPanel';
import {api} from './api.js';
import {canUseSpirit} from '../shared/ownership.js';
import { canCapture, captureSucceeds } from './capture';
import { loadSave, saveProgress, chooseStarter, evolve, partnerFor, familyFor, levelFor, recordAnswer } from './growth';
import QuestionBankPanel from './QuestionBankPanel';
import { AUTO_BANK_ID, DEFAULT_BANK_ID, STORAGE_KEY, validateBank, activeQuestions, drawQuestion, readStoredBanks, writeStoredBanks } from './question-bank';
const browserStorage = () => { try { return window.localStorage; } catch { return null; } };
import { Volume2, VolumeX, Sparkles, RefreshCw, Trophy, Shield, Flame, Droplets, Zap, Leaf, Heart, Search, HelpCircle, ChevronRight, Award, Crosshair, CheckCircle2, XCircle, ArrowLeft, Star, Clock, AlertTriangle, Music2, Music, X, ListChecks, Gift, ShoppingBag, Map as MapIcon } from 'lucide-react';

// ==========================================
// 8-Bit Web Audio 合成音效引擎 (無需外部音訊檔)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, delay = 0) {
    if (!this.enabled) return;
    this.init();
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }, delay);
  }

  tick() {
    this.playTone(800, 'square', 0.05);
  }

  urgentTick() {
    this.playTone(950, 'square', 0.08);
  }

  attack() {
    this.playTone(440, 'square', 0.1);
    this.playTone(220, 'sawtooth', 0.15, 60);
  }

  hit() {
    this.playTone(150, 'triangle', 0.2);
    this.playTone(80, 'sine', 0.25, 40);
  }

  critical() {
    this.playTone(523.25, 'square', 0.08);
    this.playTone(659.25, 'square', 0.08, 70);
    this.playTone(783.99, 'square', 0.12, 140);
    this.playTone(1046.50, 'square', 0.2, 210);
  }

  ballThrow() {
    this.playTone(300, 'sine', 0.1);
    this.playTone(600, 'sine', 0.15, 80);
    this.playTone(900, 'sine', 0.2, 160);
  }

  ballShake() {
    this.playTone(400, 'triangle', 0.08);
    this.playTone(350, 'triangle', 0.1, 90);
  }

  catchSuccess() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 987.77, 1046.50];
    const times = [0, 100, 200, 300, 420, 560];
    notes.forEach((n, i) => this.playTone(n, 'square', 0.18, times[i]));
  }

  crit() {
    this.playTone(1200, 'square', 0.06);
    this.playTone(1800, 'square', 0.08, 60);
    this.playTone(300, 'sawtooth', 0.18, 90);
  }

  weakAlert() {
    this.playTone(660, 'triangle', 0.12);
    this.playTone(880, 'triangle', 0.12, 110);
    this.playTone(660, 'triangle', 0.16, 220);
  }

  faint() {
    this.playTone(400, 'sawtooth', 0.15);
    this.playTone(300, 'sawtooth', 0.15, 120);
    this.playTone(200, 'sawtooth', 0.2, 240);
    this.playTone(120, 'sawtooth', 0.3, 360);
  }

  error() {
    this.playTone(220, 'sawtooth', 0.15);
    this.playTone(180, 'sawtooth', 0.25, 100);
  }
}

const sfx = new SoundFX();

// ==========================================
// 預設與熱門題靈資料庫 (各區域中英名稱與屬性)
// ==========================================
const GENERATIONS = REGIONS;

const POPULAR_SPIRIT = ALL_SPIRITS;

const TYPE_COLORS = {
  normal: { bg: 'bg-stone-500', text: 'text-stone-100', border: 'border-stone-600', zh: '一般' },
  fire: { bg: 'bg-orange-600', text: 'text-orange-100', border: 'border-orange-700', zh: '火' },
  water: { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-700', zh: '水' },
  grass: { bg: 'bg-emerald-600', text: 'text-emerald-100', border: 'border-emerald-700', zh: '草' },
  electric: { bg: 'bg-amber-500', text: 'text-amber-950', border: 'border-amber-600', zh: '雷' },
  ice: { bg: 'bg-cyan-500', text: 'text-cyan-950', border: 'border-cyan-600', zh: '冰' },
  fighting: { bg: 'bg-red-700', text: 'text-red-100', border: 'border-red-800', zh: '格鬥' },
  poison: { bg: 'bg-purple-600', text: 'text-purple-100', border: 'border-purple-700', zh: '毒' },
  ground: { bg: 'bg-yellow-700', text: 'text-yellow-100', border: 'border-yellow-800', zh: '地面' },
  flying: { bg: 'bg-indigo-400', text: 'text-indigo-950', border: 'border-indigo-500', zh: '飛行' },
  psychic: { bg: 'bg-pink-600', text: 'text-pink-100', border: 'border-pink-700', zh: '靈' },
  bug: { bg: 'bg-lime-600', text: 'text-lime-100', border: 'border-lime-700', zh: '蟲' },
  rock: { bg: 'bg-stone-600', text: 'text-stone-100', border: 'border-stone-700', zh: '岩石' },
  ghost: { bg: 'bg-purple-900', text: 'text-purple-100', border: 'border-purple-950', zh: '幽靈' },
  dragon: { bg: 'bg-indigo-700', text: 'text-indigo-100', border: 'border-indigo-800', zh: '龍' },
  dark: { bg: 'bg-zinc-800', text: 'text-zinc-100', border: 'border-zinc-900', zh: '凶煞' },
  steel: { bg: 'bg-slate-500', text: 'text-slate-100', border: 'border-slate-600', zh: '鋼' },
  fairy: { bg: 'bg-rose-400', text: 'text-rose-950', border: 'border-rose-500', zh: '祥瑞' }
};

// ==========================================
// 輔助工具：取得原創題靈角色圖（public/assets/<id>.png）
// ==========================================
const getSpriteUrl = (id) => `./assets/${id}.png`;

const getStaticSpriteFallback = (id) => `./assets/${id}.png`;

// ==========================================
// 數學題目生成器
// ==========================================
const generateMathProblem = (difficulty = 'medium', type = 'attack') => {
  let question = '';
  let answer = 0;
  let options = [];

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  if (difficulty === 'easy') {
    // 基礎加減法 (1~30)
    const op = Math.random() > 0.4 ? '+' : '-';
    if (op === '+') {
      const a = rand(3, 30);
      const b = rand(3, 30);
      question = `${a} + ${b}`;
      answer = a + b;
    } else {
      const a = rand(15, 60);
      const b = rand(2, a - 1);
      question = `${a} - ${b}`;
      answer = a - b;
    }
  } else if (difficulty === 'medium') {
    // 乘除法與雙位數運算
    const mode = rand(1, 3);
    if (mode === 1) {
      // 九九乘法表或二位數乘法
      const a = rand(3, 12);
      const b = rand(3, 12);
      question = `${a} × ${b}`;
      answer = a * b;
    } else if (mode === 2) {
      // 整除法
      const b = rand(3, 9);
      const ans = rand(3, 12);
      const a = b * ans;
      question = `${a} ÷ ${b}`;
      answer = ans;
    } else {
      // 兩位數混合運算
      const a = rand(20, 80);
      const b = rand(15, 60);
      question = `${a} + ${b}`;
      answer = a + b;
    }
  } else if (difficulty === 'hard') {
    // 混合四則運算 (先乘除後加減 / 括號)
    const mode = rand(1, 3);
    if (mode === 1) {
      const a = rand(3, 9);
      const b = rand(3, 8);
      const c = rand(5, 30);
      question = `${a} × ${b} + ${c}`;
      answer = (a * b) + c;
    } else if (mode === 2) {
      const a = rand(30, 80);
      const b = rand(2, 6);
      const c = rand(2, 6);
      question = `${a} - ${b} × ${c}`;
      answer = a - (b * c);
    } else {
      const a = rand(4, 12);
      const b = rand(3, 8);
      const c = rand(2, 5);
      question = `(${a} + ${b}) × ${c}`;
      answer = (a + b) * c;
    }
  } else {
    // 大師級 (Champion)：代數方程式或快速連續運算
    const x = rand(3, 20);
    const m = rand(2, 7);
    const c = rand(4, 25);
    const total = m * x + c;
    question = `${m}x + ${c} = ${total}，求 x = ?`;
    answer = x;
  }

  // 產生 4 個不重複的干擾選項
  const optSet = new Set([answer]);
  while (optSet.size < 4) {
    const delta = rand(-12, 12);
    const wrong = answer + delta;
    if (wrong !== answer && wrong >= 0) {
      optSet.add(wrong);
    } else {
      optSet.add(answer + rand(1, 15) * (Math.random() > 0.5 ? 1 : -1));
    }
  }
  options = Array.from(optSet).sort(() => Math.random() - 0.5);

  return { question, answer, options };
};

// ==========================================
// 主應用程式 Component
// ==========================================
export default function App({cloud,act,user,cloudBanks,refreshBanks,cloudBusy}) {
  // 畫面模式: 'select' (挑選題靈) | 'battle' (對戰) | 'box' (題靈盒)
  const [initialSave] = useState(() => ({growth:cloud.growth,captured:cloud.captured,selected:cloud.selected,notice:""}));
  const combatResult = useRef(null);
  const [retryChoice,setRetryChoice] = useState(null);
  const [growth, setGrowth] = useState(initialSave.growth);
  const growthRef = useRef(growth);
  const answerLock = useRef(false);
  const [saveNotice, setSaveNotice] = useState(initialSave.notice);
  const [battleHint, setBattleHint] = useState(false);
  useEffect(()=>{if(!battleHint)return;const t=setTimeout(()=>setBattleHint(false),4000);return ()=>clearTimeout(t);},[battleHint]);
  const [growthReward, setGrowthReward] = useState('');
  const [view, setView] = useState('select');
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [musicPanel, setMusicPanel] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const questionBanks = cloudBanks;
  const [selectedBankId, setSelectedBankId] = useState(AUTO_BANK_ID);
  const bankChosen = useRef(false);
  useEffect(() => { if (!bankChosen.current && selectedBankId === AUTO_BANK_ID && questionBanks.some(b => b.bankId === DEFAULT_BANK_ID)) setSelectedBankId(DEFAULT_BANK_ID); }, [questionBanks, selectedBankId]);
  const [bankNotice, setBankNotice] = useState('');
  const [questionFeedback, setQuestionFeedback] = useState(null);
  const questionDecks = useRef({});
  const importing = useRef(false);
  const selectedBank = questionBanks.find(bank => bank.bankId === selectedBankId);
  const changeBank = async (id) => { try { await act('/bank/change'); bankChosen.current = true; setSelectedBankId(id); setQuestionFeedback(null); } catch {} };
  const importBanks = async event => {
    const files=Array.from(event.target.files||[]); event.target.value='';
    if(importing.current||!files.length)return; importing.current=true;
    const messages=[];
    try { for(const file of files) { try { if(file.size>5*1024*1024)throw Error('檔案超過 5 MB。');const bank=JSON.parse((await file.text()).replace(/^\uFEFF/,''));const r=await api('/admin/banks',{bank});messages.push(file.name+'：已匯入 '+r.count+' 題'); }catch(e){messages.push(file.name+'：'+e.message);} }await refreshBanks();setBankNotice(messages.join('。')); }finally{importing.current=false;}
  };
  const [activeGen, setActiveGen] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // 玩家與對手
  const [detailSpirit, setDetailSpirit] = useState(null);
  const [playerSpirit, setPlayerSpirit] = useState(initialSave.selected || partnerFor(initialSave.growth) || POPULAR_SPIRIT[0]);
  const [potionNotice,setPotionNotice]=useState('');
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const combatLevel = 25; // Preserve the original battle balance.
  const isGrowingPartner = familyFor(growth)?.some(p => p.id === playerSpirit.id);
  const playerLevel = isGrowingPartner ? levelFor(growth.xp) : combatLevel;

  const [enemySpirit, setEnemySpirit] = useState(POPULAR_SPIRIT[1]); // Pyrelord
  const [enemyHp, setEnemyHp] = useState(120);
  const [enemyMaxHp, setEnemyMaxHp] = useState(120);
  const [enemyLevel, setEnemyLevel] = useState(24);

  // 捕獲清單 (背包/圖鑑)
  const [capturedList, setCapturedList] = useState(initialSave.captured || [POPULAR_SPIRIT[0]]);

  const updateGrowth = next => { growthRef.current=next;setGrowth(next); };
  useEffect(()=>{updateGrowth(cloud.growth);setCapturedList(cloud.captured);setPlayerSpirit(cloud.selected||partnerFor(cloud.growth)||POPULAR_SPIRIT[0]);},[cloud]);
  const selectStarter = async id => {try {const r=await act('/starter',{id});updateGrowth(r.state.growth);setPlayerSpirit(partnerFor(r.state.growth));setGrowthReward('相遇的第一天！一起開始新的旅程。');}catch{}};
  const evolvePartner = async () => {try {const r=await act('/evolve');updateGrowth(r.state.growth);setGrowthReward(r.event.message);sfx.catchSuccess();}catch{}};
  // 對戰狀態
  const [battleState, setBattleState] = useState('ready'); // 'ready', 'playerTurn', 'mathPending', 'animating', 'enemyTurn', 'catching', 'won', 'lost', 'caught'
  const [battleLogs, setBattleLogs] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const [matchupHint, setMatchupHint] = useState(null);
  const [passiveFx, setPassiveFx] = useState(null);
  const [playerShell, setPlayerShell] = useState(0);
  const [brk, setBrk] = useState(null);
  const [boost, setBoost] = useState(0);
  const takeBreak = b => { if (!b) return; setBrk({ weak: b.weak || [], shield: b.shield || 0, maxShield: b.maxShield || 0, broken: !!b.broken, orbs: b.orbs || 0, cards: b.cards || [] }); setBoost(0); };
  const showPassive = (pv) => { if(!pv) return; const fx={key:Date.now(),icon:pv.icon,name:pv.name,text:pv.text}; setPassiveFx(fx); addLog(`${pv.icon} 被動【${pv.name}】發動！${pv.text}`); setTimeout(()=>setPassiveFx(f=>f&&f.key===fx.key?null:f),2200); };
  useEffect(()=>{window.scrollTo(0,0);},[view]);
  useEffect(()=>{const fit=()=>{const w=window.innerWidth,h=window.innerHeight;const mobile=w<=760;const raw=mobile?Math.min(w/390,h/844):Math.min(w/1366,h/768);const s=Math.max(mobile?0.9:0.9,Math.min(mobile?1.15:1.45,raw));document.documentElement.style.setProperty('--bf',s.toFixed(3));};fit();window.addEventListener('resize',fit);return ()=>window.removeEventListener('resize',fit);},[]);
  useEffect(()=>{document.body.classList.add('app-focus');return ()=>document.body.classList.remove('app-focus');},[]);
  useEffect(()=>{document.body.dataset.page=view;const m=document.querySelector('.main-wrap');if(m)m.scrollTop=0;},[view]);
  useEffect(()=>{document.body.classList.toggle('battle-focus',view==='battle');return ()=>document.body.classList.remove('battle-focus');},[view]);
  const [logUnread, setLogUnread] = useState(0);
  useEffect(()=>{if(logOpen)setLogUnread(0);},[logOpen]);
  const [selectedMove, setSelectedMove] = useState(null);
  const [currentMath, setCurrentMath] = useState(null);
  const [mathTimer, setMathTimer] = useState(15);
  const [maxMathTimer, setMaxMathTimer] = useState(15);
  const [winStreak, setWinStreak] = useState(0);

  const trackTheme = view === 'battle' ? (['won','caught','lost'].includes(battleState) ? 'camp' : 'battle') : ['select','chapters'].includes(view) ? 'adventure' : 'camp';
  const trackRef = useRef(null);

  useEffect(() => {
    const tracks = new TrackPlayer();
    trackRef.current = tracks;
    const unlock = async () => { setMusicReady(await tracks.unlock()); };
    const visibility = () => tracks.configure({ hidden: document.hidden });
    const escape = (event) => { if (event.key === 'Escape') setMusicPanel(false); };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('keydown', escape);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('visibilitychange', visibility);
      tracks.dispose();
      trackRef.current = null;
    };
  }, []);

  useEffect(() => {
    trackRef.current?.configure({ enabled: musicOn, volume: musicVolume, theme: trackTheme, hidden: document.hidden });
  }, [musicOn, musicVolume, trackTheme]);

  // 動畫視覺狀態
  const [playerAnim, setPlayerAnim] = useState(''); // 'shake', 'attack', 'faint'
  const [enemyAnim, setEnemyAnim] = useState('');
  const [catchShakeStep, setCatchShakeStep] = useState(0); // 0, 1, 2, 3, 4 (Success)
  const [combo, setCombo] = useState(cloud.combo||0);
  const [chapter, setChapter] = useState(cloud.chapter||1);
  const [battleMeta, setBattleMeta] = useState({scene:'forest',chapter:1,id:'',enemyId:0});
  const [intro, setIntro] = useState(null);
  const [hitFx, setHitFx] = useState(null);
  const atmo = useMemo(()=>atmosphere({enemyId:battleMeta.enemyId,battleId:battleMeta.id,chapter:battleMeta.chapter}),[battleMeta]);
  const place = chapterById(battleMeta.chapter)?.place || '常青之森';
  const [damagePopup, setDamagePopup] = useState(null); // { target: 'enemy'|'player', text: string, type: string }

  // 額外加入的自訂題靈（預設為空）
  const [customSpiritList, setCustomSpiritList] = useState([]);

  // 計時器倒數邏輯
  useEffect(() => {
    let timerId = null;
    if (battleState === 'mathPending' && mathTimer > 0) {
      timerId = setInterval(() => {
        setMathTimer((prev) => prev - 1); // 倒數不發出嘟嘟聲（使用者要求）
      }, 1000);
    } else if (battleState === 'mathPending' && mathTimer === 0 && !answerLock.current) {
      handleAnswerSubmit(null);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [battleState, mathTimer]);

  // 切換音效開關
  useEffect(() => {
    sfx.enabled = soundOn;
  }, [soundOn]);

  // 加入對戰日誌
  const [weakAlert, setWeakAlert] = useState(false);
  const enemyWeak = view==='battle' && canCapture(enemyHp, enemyMaxHp) && !['won','lost','caught','catching'].includes(battleState);
  const enemyEnraged = view==='battle' && enemyHp>0 && enemyMaxHp>0 && enemyHp<=enemyMaxHp/2 && !['won','lost','caught'].includes(battleState);
  const wasWeak = useRef(false);
  const addLog = (text) => {
    setBattleLogs((prev) => [text, ...prev.slice(0, 7)]);
    setLogUnread((n)=>n+1);
  };
  useEffect(() => {
    if (enemyWeak && !wasWeak.current) {
      addLog(`💫 野生的 ${enemySpirit.zhName || enemySpirit.name} 虛弱了！HP 剩 15% 以下，快使用女媧五色石收服牠！`);
      setWeakAlert(true); sfx.weakAlert();
      const t = setTimeout(() => setWeakAlert(false), 4200); wasWeak.current = true; return () => clearTimeout(t);
    }
    if (!enemyWeak) { wasWeak.current = false; setWeakAlert(false); }
  }, [enemyWeak]);


  // 隨機挑選野生地圖對手
  const spawnEnemy = async (chosenId=playerSpirit.id,heal=false) => {
    setBattleState('loading');setEnemyAnim('');setPlayerAnim('');setDamagePopup(null);
    try { const r=await act('/battle/start',{playerId:chosenId,heal,chapter,bankId:selectedBankId});const b=r.state.battle;takeBreak(b);setBattleMeta({scene:b.scene||'forest',chapter:b.chapter||1,id:b.id,enemyId:b.enemy.id});setIntro({enemy:b.enemy,id:b.id});setPlayerSpirit(r.state.selected);
      setEnemySpirit(b.enemy);setEnemyMaxHp(b.maxHp);setEnemyHp(b.hp);setEnemyLevel(b.level);setPlayerHp(b.playerHp);setPlayerMaxHp(b.playerMaxHp);setBattleState('ready');setCatchShakeStep(0);{const lore=SPIRIT_BY_ID.get(b.enemy.id);{setPlayerShell(0);const mu=matchupText(playerSpirit,b.enemy);setMatchupHint(mu?{...mu,key:Date.now()}:null);if(mu)setTimeout(()=>setMatchupHint(h=>h&&h.text===mu.text?null:h),6000);}setBattleLogs([(b.enemy.shiny?'✨ 閃光的 ':'野生的 ')+b.enemy.zhName+' 出現了！'+(b.enemy.shiny?'（極為稀有！）':''),...(matchupText(playerSpirit,b.enemy)?[matchupText(playerSpirit,b.enemy).text]:[]),...(lore?.quote?[`📜〈${lore.source}〉${lore.quote}`]:[]),...(()=>{const a=atmosphere({enemyId:b.enemy.id,battleId:b.id,chapter:b.chapter||1});return a.omen?[`${a.omen.icon} ${b.enemy.zhName}現身，${a.omen.label}隨之而來（原典：${a.omen.why}）`]:[];})()]);}
    } catch {setBattleState('ready');setView('select');}
  };
  const startBattle = async (chosenPlayer=playerSpirit) => {
    if(!growthRef.current.starter){setSaveNotice('先選一位養成夥伴，再一起出發吧！');document.querySelector('[aria-label="夥伴養成"]')?.scrollIntoView({behavior:'smooth'});return;}
    if(!canUseSpirit(cloud,chosenPlayer.id)){setSaveNotice('尚未成功收服這個角色，請先收服再選擇出戰。');return;}setSaveNotice('');setPlayerSpirit(chosenPlayer);setView('battle');window.scrollTo({top:0,behavior:'instant'});await spawnEnemy(chosenPlayer.id,true);
  };

  // 技能定義
  const moves = useMemo(() => {
    const typeInfo = TYPE_COLORS[playerSpirit.type] || TYPE_COLORS.normal;
    return [
      {
        id: 'quick',
        name: '快速電擊 / 衝撞',
        type: 'normal',
        power: '低威力 (20-30)',
        diff: 'easy',
        desc: '難度：初級加減法。出手穩定！',
        color: 'from-amber-400 to-amber-500'
      },
      {
        id: 'special',
        name: `${typeInfo.zh}屬性特攻`,
        type: playerSpirit.type,
        power: '高威力 (45-60)',
        diff: 'medium',
        desc: '難度：中級乘除法。屬性重擊！',
        color: 'from-blue-500 to-indigo-600'
      },
      {
        id: 'critical',
        name: '全力暴擊奧義',
        type: 'fighting',
        power: '超絕大傷害 (75-95)',
        diff: 'hard',
        desc: '難度：混合四則。高風險超高傷害！',
        color: 'from-red-500 to-rose-700'
      },
      {
        id: 'catch',
        name: '女媧五色石 (收服)',
        type: 'catch',
        power: '收服目標',
        diff: 'easy',
        desc: canCapture(enemyHp, enemyMaxHp) ? 'HP 已剩 15% 以下，可以收服！' : 'HP 須剩 15% 以下才能收服。',
        color: 'from-emerald-500 to-teal-600'
      }
    ];
  }, [playerSpirit, enemyHp, enemyMaxHp]);

  // 選擇動作 -> 啟動算術題
  const handleSelectMove = async move => {
    if(!['ready','playerTurn'].includes(battleState)||cloudBusy)return;
    setBattleState('loading');setSelectedMove(move);setQuestionFeedback(null);
    try { const r=await act('/question',{bankId:selectedBankId,move:move.id,boost:move.id==='catch'?0:boost});const q=r.event.question;
      answerLock.current=false;setMaxMathTimer(q.timeLimit);setMathTimer(Math.max(0,Math.ceil((q.expires-Date.now())/1000)));setCurrentMath(q);setBattleState('mathPending');
    } catch {setBattleState('ready');}
  };
  const handleAnswerSubmit = async selectedOption => {
    if(!currentMath||!['mathPending','answerError'].includes(battleState)||answerLock.current)return;
    answerLock.current=true;setBattleState('submitting');
    try {const r=await act('/answer',{questionId:currentMath.id,choice:selectedOption});const e=r.event;if(e.enrageStart)setTimeout(()=>addLog(`🔥 野生的 ${enemySpirit.zhName||enemySpirit.name} 暴走了！之後答錯時的反擊傷害 ×1.5`),1600);if(e.chest)setTimeout(()=>addLog(`🎁 獲得答題寶箱！（${e.chest}）到冒險準備的「山海福運」打開吧。`),2200);if(e.jade)setTimeout(()=>addLog('🟢 答對 20 題，獲得 1 枚玉符！'),2400);if(e.unlocked){setTimeout(()=>addLog(`🗺️ 新篇章解鎖：${e.unlocked.name}「${e.unlocked.place}」！回到冒險準備的山海輿圖就能前往。`),2600);}combatResult.current={...e.combat,combo:e.combo,multiplier:e.multiplier,dupe:e.dupe,effect:e.effect,crit:e.crit};setCombo(e.combo||0);updateGrowth(r.state.growth);takeBreak(r.state.battle);{const k=e.break||{};const nm=enemySpirit.zhName||enemySpirit.name;if(k.boost)setTimeout(()=>addLog(`🔮 投入 ${k.boost} 點靈氣${e.correct?`，傷害 ×${[1,1.5,2,2.5][k.boost]}`:'，可惜答錯，靈氣散去了'}`),300);if(k.wasBroken&&e.correct)setTimeout(()=>addLog(`💥 趁 ${nm} 破盾暈眩，傷害加倍！`),500);if(k.wasBroken&&!e.correct)setTimeout(()=>addLog(`💫 ${nm} 還在暈眩，沒有反擊。`),500);if(k.breakNow)setTimeout(()=>addLog(`🛡️💥 打中弱點，${nm} 的護盾碎了！破盾！下一題傷害 ×2，答錯也不會被反擊。`),700);else if(k.shieldHit)setTimeout(()=>addLog(`🛡️ 打中弱點！${nm} 的護盾剩 ${k.shield} / ${k.maxShield}`),700);}
      setQuestionFeedback({correct:e.correct,question:e.question,answer:e.answerText,explanation:e.explanation,sourceRef:e.sourceRef,bankId:e.bankId,sourceId:e.sourceId});
      setGrowthReward((e.correct?'答對了！':'這次也累積了一次練習。')+' ＋'+e.reward.gained+' XP'+(e.reward.complete?' · 完成一輪，獲得 1 份食物！':''));
      const cb=e.combat||{};setPlayerShell(cb.shell||0);
      if(e.correct){sfx.critical();addLog('答對了！正確答案：'+e.answerText);if(e.passive&&['dangkang','xuangui'].includes(e.passive.id)){setPlayerHp(cb.playerHp);showPassive(e.passive);}if(selectedMove.id==='catch'){if(cb.burn){setEnemyHp(cb.hp);addLog(`🔥 灼燒持續，對手扣 ${cb.burn.damage} HP（剩 ${cb.burn.left} 回合）`);}executeCatchAttempt();}else executePlayerAttack(selectedMove);}
      else{sfx.error();addLog((e.timedOut?'時間到！':'再試一次！')+'正確答案：'+e.answerText);setBattleState('animating');
        if(cb.burn){setEnemyHp(cb.hp);setTimeout(()=>addLog(`🔥 灼燒持續，${enemySpirit.zhName||enemySpirit.name} 扣 ${cb.burn.damage} HP（剩 ${cb.burn.left} 回合）`),400);}
        if(cb.blocked)setTimeout(()=>{const fx={key:Date.now(),icon:'🛡️',name:'玄甲護身',text:`擋下 ${cb.blocked.value} 點反擊`};setPassiveFx(fx);addLog(`🛡️ 玄甲擋下了 ${cb.blocked.value} 點反擊！${cb.blocked.left?`（還能再擋 ${cb.blocked.left} 次）`:'（護盾消失）'}`);setTimeout(()=>setPassiveFx(f=>f&&f.key===fx.key?null:f),2200);},700);
        setTimeout(()=>{if(cb.burn&&cb.hp<=0)handleVictory();else executeEnemyTurn();},1200);}
    }catch {setRetryChoice({choice:selectedOption});setBattleState('answerError');answerLock.current=false;}
  };

  // 玩家執行攻擊
  const executePlayerAttack = (move) => {
    setBattleState('animating');
    setPlayerAnim('translate-x-6 -translate-y-3 scale-105');

    setTimeout(() => {
      setPlayerAnim('');
      setEnemyAnim('animate-bounce brightness-150');

      const baseDmg = combatResult.current.damage;
      const newEnemyHp = combatResult.current.hp;
      setEnemyHp(newEnemyHp);
      sfx.hit();

      const hit=combatResult.current;setDamagePopup({ target: 'enemy', text: `-${baseDmg}`, type: 'player', combo: hit.combo>=3?hit.combo:0, mult: hit.multiplier, effect: hit.effect, crit: hit.crit });
      setHitFx({key:Date.now(),effect:hit.effect,crit:hit.crit,type:playerSpirit.type});setTimeout(()=>setHitFx(null),hit.crit?1100:800);if(hit.crit)sfx.crit?.();
      addLog(`💥 ${playerSpirit.zhName || playerSpirit.name} 使用了【${move.name}】！造成 ${baseDmg} 點傷害！${hit.crit?'⚡暴擊！':''}${hit.effect==='super'?'效果絕佳！':hit.effect==='weak'?'效果不太好…':''}`);
      if(hit.passive&&!['dangkang','xuangui'].includes(hit.passive.id))showPassive(hit.passive);
      if(hit.burn)addLog(`🔥 灼燒持續，${enemySpirit.zhName || enemySpirit.name} 再扣 ${hit.burn.damage} HP（剩 ${hit.burn.left} 回合）`);

      setTimeout(() => {
        setEnemyAnim('');
        setDamagePopup(null);

        if (newEnemyHp <= 0) {
          handleVictory();
        } else {
          executeEnemyTurn();
        }
      }, 1000);
    }, 400);
  };

  // 執行收服邏輯
  const executeCatchAttempt = () => {
    if (!canCapture(enemyHp, enemyMaxHp)) {
      addLog('對手 HP 未符合 15% 以下的條件，無法收服。');
      setBattleState('ready');
      return;
    }
    setBattleState('catching');
    sfx.ballThrow();
    addLog(`🌈 祭出女媧五色石！去吧！`);

    const isSuccess = combatResult.current.caught;

    // 晃動動畫 (1, 2, 3 次)
    setCatchShakeStep(1);
    setTimeout(() => {
      sfx.ballShake();
      setCatchShakeStep(2);
      setTimeout(() => {
        sfx.ballShake();
        setCatchShakeStep(3);
        setTimeout(() => {
          if (isSuccess) {
            sfx.catchSuccess();
            setCatchShakeStep(4); // 捕捉成功
            handleCatchSuccess();
          } else {
            sfx.faint();
            setCatchShakeStep(0);
            addLog(`💨 可惜！野生的 ${enemySpirit.zhName || enemySpirit.name} 掙脫了五色石的封印！`);
            setTimeout(() => {
              executeEnemyTurn();
            }, 1000);
          }
        }, 800);
      }, 800);
    }, 800);
  };

  // 收服成功結算
  const handleCatchSuccess = () => {
    addLog(combatResult.current?.dupe ? `🎴 收服成功！你已經有 ${enemySpirit.zhName || enemySpirit.name}，獲得一張副本卡（共 ${combatResult.current.dupe} 張），可以保留交換或轉化成其他物品。` : `🎉 太棒了！成功收服了野生的 ${enemySpirit.zhName || enemySpirit.name}！已存入圖鑑箱子！`);
    setWinStreak((prev) => prev + 1);
    setBattleState('caught');
  };

  // 玩家戰勝
  const handleVictory = () => {
    sfx.catchSuccess();
    setEnemyAnim('ink-dissolve');
    addLog(`🏆 對手的 ${enemySpirit.zhName || enemySpirit.name} 倒下了！你獲得了勝利！`);
    setWinStreak((prev) => prev + 1);
    setBattleState('won');
  };

  // 對手反擊回合
  const executeEnemyTurn = () => {
    if(!combatResult.current?.enemyDamage){setBattleState('ready');return;}
    setBattleState('enemyTurn');
    addLog(`⚡ 野生的 ${enemySpirit.zhName || enemySpirit.name} 正在凝聚力量進行反擊！`);

    setTimeout(() => {
      setEnemyAnim('-translate-x-6 translate-y-3 scale-105');
      setTimeout(() => {
        setEnemyAnim('');
        setPlayerAnim('animate-bounce brightness-150');

        const enemyDmg = combatResult.current.enemyDamage;
        const newPlayerHp = combatResult.current.playerHp;
        setPlayerHp(newPlayerHp);
        sfx.hit();
        setDamagePopup({ target: 'player', text: `-${enemyDmg}`, type: 'enemy' });
        addLog(`💥 ${enemySpirit.zhName || enemySpirit.name} 反擊命中！受到 ${enemyDmg} 點傷害！`);

        setTimeout(() => {
          setPlayerAnim('');
          setDamagePopup(null);

          if (newPlayerHp <= 0) {
            sfx.faint();
            addLog(`💔 你的 ${playerSpirit.zhName || playerSpirit.name} 眼前一片漆黑...`);
            setWinStreak(0);
            setBattleState('lost');
          } else {
            setBattleState('ready');
          }
        }, 900);
      }, 400);
    }, 1000);
  };

  // 篩選區域題靈
  const ownedIds = useMemo(() => new Set((cloud?.captured||[]).map(p=>p.id)), [cloud?.captured]);
  const filteredSpirit = useMemo(() => {
    return POPULAR_SPIRIT.filter((p) => {
      const matchGen = activeGen === 'all' || (activeGen === 'mine' ? ownedIds.has(p.id) : p.gen === activeGen);
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.zhName.includes(searchQuery);
      return matchGen && matchSearch;
    });
  }, [activeGen, searchQuery, ownedIds]);

  // 搜尋只在本機名冊中篩選（名稱或編號），不連外部服務
  const submitSearch = (e) => { e.preventDefault(); };

  // 計算血條百分比與顏色
  const getHpColor = (current, max) => {
    const ratio = current / max;
    if (ratio > 0.5) return 'bg-emerald-500';
    if (ratio > 0.2) return 'bg-amber-400 animate-pulse';
    return 'bg-red-500 animate-pulse';
  };

  const artwork = (id) => `./assets/${id}.png`;
  const typeLabel = (spirit) => TYPE_COLORS[spirit.type]?.zh || spirit.type;
  const matchupText = (me, foe) => { if(!me||!foe) return null; const e=effectiveness(me.type,foe.type); const mn=me.zhName||me.name, fn=foe.zhName||foe.name, mt=TYPE_COLORS[me.type]?.zh||me.type, ft=TYPE_COLORS[foe.type]?.zh||foe.type;
    if(e.kind==='super') return {kind:'super',text:`🔥 屬性相剋：你的${mn}（${mt}）剋制${fn}（${ft}），攻擊傷害 ×1.25！`};
    if(e.kind==='weak') return {kind:'weak',text:`⚠️ 屬性相剋：${fn}（${ft}）剋制你的${mn}（${mt}），攻擊傷害 ×0.8`};
    return null; };
  const difficultyNames = {easy:'初級冒險者', medium:'精英冒險者', hard:'守關大師', champion:'冒險冠軍'};
  const available = [...customSpiritList.filter(p=>!POPULAR_SPIRIT.some(x=>x.id===p.id)), ...filteredSpirit];
  const busy = !['ready','playerTurn','won','lost','caught'].includes(battleState);
  const renderCard = (spirit, inBox=false) => <button key={spirit.id} className={`spirit-card ${spirit.shiny?'is-shiny-card':''} ${playerSpirit.id===spirit.id?'selected':''} ${canUseSpirit(cloud,spirit.id)?'':'is-locked'} type-${spirit.type}`} onClick={()=>setDetailSpirit(spirit)} aria-pressed={playerSpirit.id===spirit.id&&canUseSpirit(cloud,spirit.id)} aria-label={`查看${spirit.zhName || spirit.name}的大圖${canUseSpirit(cloud,spirit.id)?'':'（尚未收服）'}`}>
    <div className="card-top"><span>No. {String(spirit.id).padStart(3,'0')}</span>{playerSpirit.id===spirit.id ? <CheckCircle2 size={19}/> : <span className="mini-ball"/>}</div>
    <div className="card-image">{spirit.shiny&&<span className="shiny-tag">✨ 閃光</span>}<img className={spirit.shiny?'is-shiny':''} loading="lazy" src={artwork(spirit.id)} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=getStaticSpriteFallback(spirit.id);}} alt={spirit.zhName || spirit.name}/></div>
    <div className="card-name">{spirit.zhName || spirit.name}</div><div className="card-en">{spirit.name}</div><span className={`type-badge type-${spirit.type}`}>{typeLabel(spirit)}</span>
    {cloud.schedule?.nightOnly?.includes(spirit.id)&&<span className="card-time">🌙 夜間限定</span>}{cloud.schedule?.featured?.id===spirit.id&&<span className="card-time is-star">⭐ 本週神獸</span>}{setFor(spirit.id)&&<span className="card-set" title={`集齊「${setFor(spirit.id).name}」4 隻可得稱號「${setFor(spirit.id).title}」`}>🏷 {setFor(spirit.id).name}</span>}
    {SPIRIT_BY_ID.get(spirit.id)?.quote&&<div className="card-lore" title={SPIRIT_BY_ID.get(spirit.id).quote}><span className="lore-seal">{SPIRIT_BY_ID.get(spirit.id).source}</span><p>「{SPIRIT_BY_ID.get(spirit.id).quote}」</p></div>}
    <div className="card-bottom">{!canUseSpirit(cloud,spirit.id)?'🔒 尚未收服 · 點看大圖':playerSpirit.id===spirit.id?'目前出戰夥伴 · 點看大圖':'點看大圖 · 可設為出戰'}<ChevronRight size={14}/></div>
  </button>;
  const hpPanel = (spirit, hp, max, level, enemy=false) => <div className={`hp-panel ${enemy?'enemy-hp':'player-hp'}`}>
    <div className="hp-name"><strong>{spirit.shiny?'✨':''}{spirit.zhName || spirit.name}</strong><span>{!enemy && isGrowingPartner ? '養成 ' : ''}Lv. {level}</span></div><div className="hp-meta"><span className={`type-badge type-${spirit.type}`}>{typeLabel(spirit)}</span>{enemy&&enemyEnraged&&<span className="rage-tag" title="答錯時的反擊傷害 ×1.5">🔥 暴走</span>}{enemy&&enemyWeak&&<span className="weak-tag">💫 虛弱</span>}{!enemy&&playerShell>0&&<span className="shell-tag" title="玄甲護身：可擋下的反擊次數">🛡️ ×{playerShell}</span>}<span>{enemy?'野生神獸':'你的冒險夥伴'}</span></div>
    <div className="hp-track"><span style={{width:`${hp/max*100}%`,background:hp/max>.5?'#4de0a6':hp/max>.2?'#f5cc55':'#ff6a79'}}/></div><div className="hp-numbers"><span>{enemy && canCapture(hp, max)?'可嘗試收服':'HP 生命值'}</span><b>{hp} <small>/ {max}</small></b></div>
  </div>;
  return <div className="app-shell">
    <header className="site-header"><div className="header-inner"><button className="brand" onClick={()=>{if(!busy || view!=='battle')setView('select')}} aria-label="QuizSpirit 首頁"><span className="brand-ball"/><span>QUIZ<span className="yellow">SPIRIT</span><small>題 靈 冒 險</small></span></button>
      <nav aria-label="主要選單" className="page-nav">{[['select','冒險',Crosshair],['chapters','篇章',MapIcon],['partner','夥伴',Heart],['tasks','任務',ListChecks],['lucky','福運',Gift],['shop','商城',ShoppingBag],['box','圖鑑',Award],['battle','對戰場',Zap]].map(([id,label,Icon])=>{const needPartner=!['select','battle'].includes(id)&&!partnerFor(growth);return <button key={id} className={view===id?'active':''} disabled={id==='battle'?false:(view==='battle'&&busy)||needPartner} aria-label={label} title={needPartner?'先選擇專屬夥伴':id==='battle'&&view!=='battle'?'先在冒險選好題靈再開始戰鬥':label} onClick={()=>{if(id==='battle'&&view!=='battle'){setView('select');setBattleHint(true);window.scrollTo({top:0,behavior:'smooth'});return;}setView(id);}}><Icon size={17}/><span>{label}</span>{id==='box'&&<b>{capturedList.length}</b>}</button>;})}</nav>{battleHint&&<div className="battle-hint-toast" role="status">⚔️ 先在「冒險」選好出戰題靈，再按「開始冒險」就會進入對戰場！</div>}
      <div className="audio-controls"><div className="music-control"><button className={`sound-button music-button ${musicOn?'music-enabled':''}`} onClick={()=>setMusicPanel(!musicPanel)} aria-label="配樂設定" aria-expanded={musicPanel} aria-controls="music-settings" title="配樂設定"><Music2 size={19}/>{musicOn&&musicReady&&<span className="music-status-dot"/>}</button>
      {musicPanel && <section id="music-settings" className="music-settings" aria-label="配樂設定面板"><div className="music-settings-heading"><strong><Music size={17}/> 冒險配樂</strong><button className="music-close" aria-label="關閉配樂設定" onClick={()=>setMusicPanel(false)}><X size={17}/></button></div><p className="music-now">{!musicOn?'配樂已暫停':!musicReady?'點擊操作後，音樂就會開始':`正在播放〈${TRACKS[trackTheme]?.title}〉`}</p><button className={`music-toggle ${musicOn?'is-on':''}`} role="switch" aria-checked={musicOn} aria-label="背景配樂" onClick={()=>setMusicOn(!musicOn)}><span>{musicOn?'配樂開啟':'配樂關閉'}</span><span className="toggle-track"><span/></span></button><label className="music-volume-label" htmlFor="music-volume">配樂音量 <b>{Math.round(musicVolume*100)}%</b></label><input id="music-volume" className="music-volume" type="range" min="0" max="100" step="1" value={Math.round(musicVolume*100)} onChange={e=>setMusicVolume(Number(e.target.value)/100)} aria-label="配樂音量"/><small className="music-note">冒險與篇章〈遠古世界〉、養成各頁〈閒適時光〉、對戰〈最終突擊〉、共同討伐魔王〈巨像對決〉，會依場景自動換曲。<br/>右側喇叭可獨立開關遊戲音效。</small></section>}</div>
      <button className="sound-button" onClick={()=>setSoundOn(!soundOn)} aria-label={soundOn?'關閉音效':'開啟音效'} title={soundOn?'關閉音效':'開啟音效'}>{soundOn?<Volume2 size={19}/>:<VolumeX size={19}/>}</button></div>
    </div></header>
    <main className="main-wrap">
      {(view === 'partner' || (view === 'select' && !partnerFor(growth))) && <CompanionPanel cloud={cloud} act={act} bankId={selectedBankId} artwork={artwork} onChoose={selectStarter} onEvolve={evolvePartner} onStart={()=>startBattle(playerSpirit)} notice={saveNotice} reward={growthReward} busy={cloudBusy}/>}
      {view === 'tasks' && partnerFor(growth) && <PlayPanel cloud={cloud} act={act} artwork={artwork} busy={cloudBusy}/>}
      {view === 'lucky' && partnerFor(growth) && <LuckyPanel cloud={cloud} act={act} artwork={artwork} busy={cloudBusy}/>}
      {view === 'shop' && <ItemShop cloud={cloud} act={act} busy={cloudBusy} inRaid={false}/>}
      {view === 'battle' && <div className={`growth-status ${growthReward?'has-reward':''}`} role="status">{partnerFor(growth)?.zhName} · 養成 Lv. {levelFor(growth.xp)} · {growthReward || '答題累積經驗值，回到冒險準備即可查看進化。'}{saveNotice && <p role="alert">{saveNotice}</p>}</div>}
      {view==='select' && partnerFor(growth) && <>
        <div className="page-eyebrow"><span className="live-dot"/> ADVENTURE AWAITS <span className="eyebrow-line"/> 每一道題，都是冒險的開始</div>
        <QuestionBankPanel canImport={user.role==='teacher'} banks={questionBanks} selectedId={selectedBankId} onChange={changeBank} onImport={importBanks} notice={bankNotice}/>
        <section className="hero"><div className="hero-copy"><span className="section-label">115 學年度國中國文 · 300 題大挑戰</span><h1>腦力全開，<br/>冒險<span className="yellow">就位。</span></h1><p>與你的題靈一起迎戰。<br/>用國文發動招式：字音字形、成語、對聯、修辭、課文理解，答對就能重擊對手！</p><button className="primary-button" onClick={()=>startBattle(playerSpirit)}><Crosshair size={21}/>開始冒險<ChevronRight size={20}/></button><div className="hero-hint"><Shield size={14}/> 答題對戰 <span>·</span> 野生收服 <span>·</span> 圖鑑收藏</div></div>
          <div className={`hero-art type-${playerSpirit.type}`}><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="art-index">#{String(playerSpirit.id).padStart(3,'0')}</span><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><img key={playerSpirit.id} className={`hero-spirit hero-idle-${motionFor(playerSpirit.type)}`} src={artwork(playerSpirit.id)} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=getStaticSpriteFallback(playerSpirit.id)}} alt={playerSpirit.zhName || playerSpirit.name}/><div className="partner-tag"><span className="live-dot"/> 目前出戰夥伴</div><div className="hero-name"><h2>{playerSpirit.zhName || playerSpirit.name}</h2><span className={`type-badge type-${playerSpirit.type}`}>{typeLabel(playerSpirit)}</span><span>{isGrowingPartner ? "養成" : "對戰"} Lv. {playerLevel}</span></div></div>
          <aside className="mission-panel"><div className="panel-kicker"><Trophy size={17}/> TRAINER STATUS</div><h3>準備好迎接挑戰？</h3><div className="stats-row"><div><b>{String(winStreak).padStart(2,'0')}</b><span>目前連勝</span></div><div><b>{String(capturedList.length).padStart(2,'0')}</b><span>已收服夥伴</span></div></div><div className="mission-divider"/><div className="mini-heading">你的冒險指南</div><ol className="steps"><li><span>01</span><div><strong>選一位夥伴</strong><small>選擇固定夥伴或已收服角色</small></div></li><li><span>02</span><div><strong>答題，發動招式</strong><small>選擇招式，挑戰國文題目</small></div></li><li><span>03</span><div><strong>收服新朋友</strong><small>對手 HP 剩 15% 以下，再答題收服</small></div></li></ol><div className="mission-tip"><Sparkles size={17}/><span>答錯也沒關係，下個回合再試一次。</span></div></aside>
        </section>
      </>}
      {view==='chapters' && <section className="page-chapters"><ChapterMap chapters={cloud.chapters||[]} schedule={cloud.schedule} current={chapter} busy={cloudBusy} onPick={setChapter}/></section>}
      {view==='battle' && <>
        <div className="active-bank-label">目前題庫：{selectedBank?.title || '自動數學練習'}{selectedBank ? ' · 題庫題型與倒數以匯入資料為準' : ''}</div>
        <div className="battle-heading"><div><span className="section-label">WILD ENCOUNTER</span><h1>{place}<span>{chapterById(battleMeta.chapter)?.name||'野生遭遇戰'} · 野生遭遇戰</span></h1></div><div className="battle-streak"><Trophy size={17}/> {winStreak} 連勝</div></div>
        <div className="battle-layout battle-full"><section className="battle-main"><div className={`arena ${damagePopup?'impact':''} ${hitFx?.crit?'arena-crit':''} ${hitFx?.effect==='super'?'arena-super':''}`}>
          <Forest/><SceneBg name={battleMeta.scene}/><AtmoLayer time={atmo.time} weather={atmo.weather}/><div className="arena-caption"><span className="live-dot"/> {place} · {atmo.timeLabel} · {atmo.weatherLabel} <Leaf size={14}/></div>{intro&&<EncounterIntro enemy={intro.enemy} battleId={intro.id} onDone={()=>setIntro(null)}/>}{combo>=2&&<div className={`combo-badge ${combo>=3?'is-hot':''}`} key={combo} role="status">🔥 <b>{combo}</b> 連擊{combo>=3&&<small>傷害 ×{(1+Math.min(combo,8)*0.1-0.2).toFixed(1)}</small>}</div>}
          {hpPanel(enemySpirit,enemyHp,enemyMaxHp,enemyLevel,true)}{hpPanel(playerSpirit,playerHp,playerMaxHp,playerLevel)}
          <div className="arena-platform enemy-platform"/><div className="arena-platform player-platform"/>
          <div className={`fighter enemy-fighter ${enemyAnim}${enemyWeak?' is-weak':''}${enemyEnraged?' is-enraged':''}`}>{battleState==='won'&&<span className="ink-splash" aria-hidden="true"><i/><i/><i/><i/><i/><i/></span>}{enemyWeak&&<span className="weak-status" aria-hidden="true"><i>★</i><i>★</i><i>★</i><b>💧</b></span>}
            {battleState==='catching'||battleState==='caught'?<div className={`catch-ball step-${catchShakeStep}`}><span/></div>:<img className={`idle-${motionFor(enemySpirit.type)}${enemySpirit.shiny?' is-shiny':''}`} style={idleStyle(enemySpirit.id,'enemy')} src={getSpriteUrl(enemySpirit.id)} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=artwork(enemySpirit.id)}} alt={`野生的${enemySpirit.zhName || enemySpirit.name}`}/>}
          {enemySpirit.shiny&&<span className="shiny-spark" aria-hidden="true"><i/><i/><i/><i/></span>}</div><div className={`fighter player-fighter ${playerAnim}`}><img className={`idle-${motionFor(playerSpirit.type)}${playerSpirit.shiny?' is-shiny':''}`} style={idleStyle(playerSpirit.id,'player')} src={getSpriteUrl(playerSpirit.id,true)} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=artwork(playerSpirit.id)}} alt={`出戰的${playerSpirit.zhName || playerSpirit.name}`}/></div>
          {passiveFx&&<div key={passiveFx.key} className="passive-fx" role="status"><b>{passiveFx.icon} {passiveFx.name}！</b><span>{passiveFx.text}</span></div>}{matchupHint&&battleState!=='won'&&battleState!=='caught'&&<div key={matchupHint.key} className={`matchup-hint hint-${matchupHint.kind}`} role="status">{matchupHint.text}</div>}{weakAlert&&<div className="weak-callout" role="status"><span>💫</span><div><b>{enemySpirit.zhName || enemySpirit.name} 虛弱了！</b><small>HP 剩 15% 以下 · 現在可以使用女媧五色石收服</small></div></div>}{hitFx&&<div key={hitFx.key} className={`hit-fx hit-${hitFx.type} ${hitFx.crit?'is-crit':''} ${hitFx.effect?'eff-'+hitFx.effect:''}`} aria-hidden="true">{Array.from({length:hitFx.crit?14:9},(_,i)=><i key={i} style={{'--a':`${i*(360/(hitFx.crit?14:9))}deg`}}/>)}<b/></div>}{damagePopup && <span className={`damage-popup damage-${damagePopup.target} ${damagePopup.crit?'is-crit':''}`}>{damagePopup.crit&&<em className="crit-label">暴擊！</em>}{damagePopup.effect==='super'&&<em className="eff-label super">效果絕佳！</em>}{damagePopup.effect==='weak'&&<em className="eff-label weak">效果不太好…</em>}{damagePopup.text}{damagePopup.combo>0&&<em className="combo-flame">🔥{damagePopup.combo} 連擊 ×{Number(damagePopup.mult).toFixed(1)}</em>}</span>}
          <div className="arena-bottom-fade"/>
        </div>
        <div className="action-panel">
          {questionFeedback && <div className={`question-feedback ${questionFeedback.correct ? 'correct' : 'incorrect'}`} role="status"><strong>{questionFeedback.correct ? '答對了！' : '一起看解答'}</strong><p>{questionFeedback.question}</p><p>正確答案：{questionFeedback.answer}</p><p>{questionFeedback.explanation}</p><small>來源：{questionFeedback.sourceRef}</small><AiTutor feedback={questionFeedback}/></div>}
          {battleState==='mathPending' && currentMath ? <div className="math-panel"><div className="math-top"><span><Zap size={17}/> 答題，發動{selectedMove?.id==='catch'?'收服':'招式'}</span><strong className={mathTimer<=3?'urgent':''}><Clock size={18}/> {mathTimer} 秒</strong></div><div className="timer-track"><span style={{width:`${mathTimer/maxMathTimer*100}%`,background:mathTimer<=3?'#ff6a79':'#f7d65c'}}/></div><div className={`math-question ${currentMath.optionTexts ? 'bank-stem' : ''}`}>{currentMath.question}{currentMath.optionTexts || currentMath.question.includes('=') ? '' : ' = ?'}</div><div className={`answer-grid ${currentMath.optionTexts ? 'bank-options' : ''}`}>{currentMath.options.map((opt,i)=><button key={i} onClick={()=>handleAnswerSubmit(opt)}><small>{String.fromCharCode(65+i)}</small><b>{currentMath.optionTexts ? currentMath.optionTexts[opt] : opt}</b><ChevronRight size={18}/></button>)}</div><p className="math-footnote">讀清題目，選出正確答案。</p></div> : ['ready','playerTurn'].includes(battleState) ? <><div className="solo-potion"><button disabled={cloudBusy||!['ready','playerTurn'].includes(battleState)||playerHp>=playerMaxHp||!(cloud.bag?.potion>0)} onClick={async()=>{try{const r=await act('/bag/use',{itemId:'potion'});setPlayerHp(r.state.battle.playerHp);setPotionNotice(r.event.message);}catch(e){setPotionNotice(e.message);}}}>💊 使用傷藥（{cloud.bag?.potion||0} 個）</button><span role="status">{potionNotice||'每個回復 30 HP，可連續使用；滿血不消耗。'}</span></div><div className="action-heading"><div><span className="live-dot"/> 你的回合</div><span>選擇招式，用答案發動力量</span></div><BreakBar brk={brk} boost={boost} setBoost={setBoost} disabled={!['ready','playerTurn'].includes(battleState)}/><div className="move-grid">{moves.map((m,i)=><button key={m.id} className={`move-button move-${m.id} ${m.id==='catch'&&canCapture(enemyHp,enemyMaxHp)?'catch-ready':''}`} disabled={m.id==='catch'&&!canCapture(enemyHp,enemyMaxHp)} onClick={()=>handleSelectMove(m)}><span className="move-icon">{[<Zap size={23}/>,<Flame size={23}/>,<Sparkles size={23}/>,<span className="mini-ball"/>][i]}</span><div><strong>{['快速衝擊',`${typeLabel(playerSpirit)}屬性特攻`,'全力暴擊','使用女媧五色石'][i]}{i<3&&(()=>{const k=effectiveness(playerSpirit?.type,enemySpirit?.type).kind;return k?<em className={`type-tag tag-${k}`}>{k==='super'?'剋制 ×1.25':'被剋 ×0.8'}</em>:null;})()}</strong>{(()=>{const c=i<3&&brk?.cards?.find(x=>x.move===m.id)?.category;return c?<span className={`card-cat ${brk.weak.includes(c)&&!brk.broken?'is-weak':''}`}>{c}{brk.weak.includes(c)&&!brk.broken?' · 弱點':''}</span>:null;})()}<small>{selectedBank && i < 3 ? ['簡單題 · 穩定出招','中等題 · 強力一擊','困難題 · 高傷害'][i] : ['加減法 · 穩定出招','乘除與加法 · 強力一擊','混合四則 · 高傷害',canCapture(enemyHp,enemyMaxHp)?'可以收服 · 成功率 92%':'HP 須剩 15% 以下才能收服'][i]}</small></div><ChevronRight size={17}/></button>)}</div></> : ['won','caught','lost'].includes(battleState)?<div className={`result-panel result-${battleState}`}><span className="result-icon">{battleState==='lost'?<Heart size={32}/>:<Trophy size={32}/>}</span><h2>{battleState==='won'?'漂亮的一戰！':battleState==='caught'?'新的冒險夥伴！':'休息一下，再出發。'}</h2><p>{battleState==='caught'&&combatResult.current?.dupe?`你已經有 ${enemySpirit.zhName || enemySpirit.name}，這次得到一張副本卡。`:battleState==='caught'?`${enemySpirit.zhName || enemySpirit.name} 已加入你的圖鑑。`:battleState==='won'?'你的思考，成了最強的力量。':'每一次練習，都讓你更靠近勝利。'}</p>{battleState==='caught'&&combatResult.current?.dupe>0&&<DupeChoice key={enemySpirit.id+'-'+combatResult.current.dupe} id={enemySpirit.id} zhName={enemySpirit.zhName||enemySpirit.name} count={combatResult.current.dupe} act={act} busy={cloudBusy} onDone={()=>{}}/>}<div className="result-actions"><button className="primary-button" onClick={()=>{if(battleState==='lost')startBattle(playerSpirit);else spawnEnemy();}}>{battleState==='lost'?'恢復體力再挑戰':'探索下一場對戰'}<ChevronRight size={18}/></button><button className="secondary-button" onClick={()=>setView('box')}>查看圖鑑</button></div></div>:battleState==='answerError'?<div className="answer-retry"><p>這次作答尚未確認保存，請檢查連線後重試。</p><button className="primary-button" disabled={cloudBusy} onClick={()=>handleAnswerSubmit(retryChoice.choice)}>重試保存這次答案</button></div>:<div className="turn-message" role="status"><span className="loading-orb"/><strong>{battleLogs[0]?.replace(/^[^\u4e00-\u9fff]+/,'') || '對戰進行中…'}</strong></div>}
        </div></section>
        {createPortal(<><button type="button" className={`log-drawer-tab ${logOpen?'is-open':''}`} onClick={()=>setLogOpen(o=>!o)} aria-expanded={logOpen} aria-controls="battle-log-drawer" title={logOpen?'收起戰鬥紀錄':'打開戰鬥紀錄'}><Shield size={18}/><span>戰鬥紀錄</span>{!logOpen&&logUnread>0&&<b className="log-unread">{logUnread>9?'9+':logUnread}</b>}</button>
        <aside id="battle-log-drawer" className={`battle-sidebar log-drawer ${logOpen?'is-open':''}`} aria-hidden={!logOpen}><div className="log-panel"><div className="log-drawer-head"><div className="panel-kicker"><Shield size={17}/> BATTLE LOG</div><button type="button" className="log-drawer-close" onClick={()=>setLogOpen(false)} aria-label="收起戰鬥紀錄">×</button></div><h3>每一回合，都在進步。</h3><div className="battle-logs" aria-live="polite">{battleLogs.map((log,i)=><div key={`${i}-${log}`} className={i===0?'latest':''}><span className="log-dot"/><p>{log.replace(/^[^\u4e00-\u9fff]+/,'')}</p></div>)}</div></div><div className="battle-guide"><HelpCircle size={20}/><h4>冒險者的小提醒</h4><p>{selectedBank ? '目前依匯入題庫出題；若有難度分級，會優先選取對應招式的題目。' : '快速衝擊練加減法，屬性特攻練乘除與加法，全力暴擊挑戰混合四則。'}</p><p>對手 HP 剩餘 15% 以下（含 15%）且尚未倒下，才能使用女媧五色石；答對後有 92% 機率收服。</p></div></aside></>,document.body)}</div>
      </>}
      {view==='box' && <section className="collection"><div className="page-eyebrow"><span className="live-dot"/> YOUR ADVENTURE JOURNAL</div><div className="collection-heading"><div><span className="section-label">每一次相遇，都值得收藏</span><h1>我的夥伴圖鑑<span className="yellow">。</span></h1><p>這些夥伴，見證了你的每一次成長。點選卡片就能更換出戰夥伴。</p></div><div className="collection-count"><Award size={24}/><b>{capturedList.length}</b><span>位冒險夥伴</span></div></div><section className="roster-section"><div className="section-heading"><div><span className="section-label">CHOOSE YOUR PARTNER</span><h2>你的冒險，誰來同行？<span className="count-label">{available.length} 位夥伴</span></h2></div><form className="search-form" onSubmit={submitSearch}><Search size={18}/><input aria-label="搜尋題靈" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="搜尋名稱或圖鑑編號…"/><button type="submit" aria-label="搜尋"><ChevronRight size={18}/></button></form></div>
          <div className="generation-tabs" role="group" aria-label="山海經篇章"><button className={activeGen==='mine'?'selected':''} onClick={()=>setActiveGen('mine')}>已收服<small>{capturedList.length} 隻</small></button><button className={activeGen==='all'?'selected':''} onClick={()=>setActiveGen('all')}>全部篇章</button>{GENERATIONS.map(g=><button key={g.gen} className={activeGen===g.gen?'selected':''} onClick={()=>setActiveGen(g.gen)}>{g.name}<small>{g.gen<=5?'五藏山經':g.gen===6?'海經':'大荒經'}</small></button>)}</div>
          <div className="spirit-grid">{available.map(p=>renderCard(p))}</div>{available.length===0 && <div className="empty-state"><Search size={32}/><h3>這裡還沒有找到夥伴</h3><p>換個區域或名稱，或輸入英文名稱／編號後按右側箭頭搜尋。</p><button className="secondary-button" onClick={()=>{setSearchQuery('');setActiveGen('all')}}>顯示所有夥伴</button></div>}
        </section></section>}
    </main>{detailSpirit&&<SpiritDetail spirit={detailSpirit} typeLabel={typeLabel} usable={canUseSpirit(cloud,detailSpirit.id)} current={playerSpirit.id===detailSpirit.id} onUse={setPlayerSpirit} owned={(cloud?.captured||[]).map(p=>p.id)} schedule={cloud.schedule} dupes={(cloud?.dupes||[]).find(d=>d.id===detailSpirit.id)?.count||0} act={act} busy={cloudBusy} onClose={()=>setDetailSpirit(null)}/>}<footer className="site-footer"><span>QUIZSPIRIT <span className="footer-separator">/</span> 讓思考，成為冒險的力量。</span><small>原創角色教學作品 · 養成與圖鑑登入後自動保存</small></footer>
  </div>;
}

function Forest(){return <svg className="forest" viewBox="0 0 1000 550" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#8bd3be"/><stop offset=".65" stopColor="#cae8af"/><stop offset="1" stopColor="#6eac75"/></linearGradient><linearGradient id="ground" x2="0" y2="1"><stop stopColor="#70b184"/><stop offset="1" stopColor="#164a48"/></linearGradient><radialGradient id="sun"><stop stopColor="#fff5bd" stopOpacity=".7"/><stop offset="1" stopColor="#fff5bd" stopOpacity="0"/></radialGradient></defs><rect width="1000" height="550" fill="url(#sky)"/><circle cx="650" cy="100" r="220" fill="url(#sun)"/><path d="M0 310Q170 205 350 285T750 260T1000 250V550H0" fill="#9bc8a0"/><g fill="#629d88" opacity=".5">{[20,125,240,370,500,650,780,920].map((x,i)=><g key={x}><rect x={x} y={60+i%3*30} width="18" height="300"/><ellipse cx={x+9} cy={90+i%3*30} rx="74" ry="95"/></g>)}</g><path d="M0 355Q250 275 500 330T1000 320V550H0" fill="url(#ground)"/><path d="M600 310Q460 360 570 550H900Q550 380 680 310" fill="#b6c78a" opacity=".25"/><g fill="#286958">{[-50,80,925,1050].map((x,i)=><g key={x}><path d={`M${x} 0L${x+20} 370L${x+65} 370L${x+70} 0Z`} fill="#29554c"/><ellipse cx={x+30} cy={60} rx="150" ry="130"/><ellipse cx={x+90} cy={0} rx="170" ry="120"/></g>)}</g><g fill="#163f3b"><path d="M0 470Q80 420 170 500L220 550H0Z"/><path d="M1000 390Q940 410 880 550H1000Z"/><path d="M30 550L4 435L70 505L65 455L110 540L120 480L160 550Z"/><path d="M900 550L920 480L940 520L980 440L970 530L1000 480V550Z"/></g><g fill="#eaf6b2" opacity=".75"><circle cx="270" cy="220" r="3"/><circle cx="590" cy="120" r="2"/><circle cx="720" cy="280" r="3"/><circle cx="420" cy="340" r="2"/><circle cx="800" cy="180" r="2"/></g></svg>}
